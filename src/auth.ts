import * as crypto from 'crypto'

import { addSeconds, isAfter, differenceInSeconds } from 'date-fns'
import * as jwt from 'jsonwebtoken'

import {
  AuthStorage,
  EmailProvider,
  FrameworkAdapter,
  AuthConfig,
  User,
  Session,
} from './types'

const defaultSessionCookieName = 'session'

export class AuthService {
  constructor(
    private storage: AuthStorage,
    private email: EmailProvider,
    private framework: FrameworkAdapter,
    public config: AuthConfig,
  ) {}

  async sendOTP(email: string): Promise<string> {
    const code = this.generateOTPCode(this.config.otp.length || 20)
    const expiresAt = addSeconds(new Date(), this.config.otp.ttl)

    const otp = await this.storage.createOTP(email, code, expiresAt)
    await this.email.sendOTP(email, code)

    return otp.id
  }

  async verifyOTPAndSignIn(
    otpId: string,
    email: string,
    code: string,
  ): Promise<User | null> {
    const otp = await this.storage.verifyOTP(otpId, email, code)
    if (!otp) return null

    const user = await this.storage.getUserByEmail(otp.email)
    if (!user) {
      throw new Error('No user found for this email')
    }
    await this.createSession(user.id)

    return user
  }

  async verifyOTPAndSignUp(
    otpId: string,
    email: string,
    code: string,
  ): Promise<User | null> {
    const otp = await this.storage.verifyOTP(otpId, email, code)
    if (!otp) return null

    const existingUser = await this.storage.getUserByEmail(otp.email)
    if (existingUser) {
      throw new Error('Email is already taken')
    }

    const user = await this.storage.createUser(otp.email)
    await this.createSession(user.id)

    return user
  }

  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session> {
    const token = this.generateSessionToken()
    const expiresAt = addSeconds(new Date(), this.config.session.ttl)

    const session = await this.storage.createSession(
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    )

    await this.setSessionCookie(session.id, session.token)

    return session
  }

  async verifySession(): Promise<{
    user: User
    session: {
      id: string
      createdAt: Date
      updatedAt: Date
      expiresAt: Date
    }
  } | null> {
    const cookieValue = await this.framework.getCookie(
      this.config.session.cookieName || defaultSessionCookieName,
    )

    if (!cookieValue) return null

    try {
      const decoded = jwt.verify(cookieValue, this.config.jwt.secret) as {
        sessionId: string
        token: string
      }

      const session = await this.storage.getSessionById(decoded.sessionId)
      if (!session || session.token !== decoded.token || session.invalidated)
        return null

      if (isAfter(new Date(), session.expiresAt)) {
        return null
      }

      const user = await this.storage.getUserById(session.userId)
      if (!user) return null

      return {
        user,
        session: {
          id: session.id,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
          expiresAt: session.expiresAt,
        },
      }
    } catch {
      return null
    }
  }

  needsRefresh(updatedAt: Date): boolean {
    const sessionAge = differenceInSeconds(new Date(), updatedAt)
    return sessionAge > this.config.session.refreshInterval
  }

  async refreshSession(sessionId: string): Promise<void> {
    const now = new Date()
    const newExpiresAt = addSeconds(now, this.config.session.ttl)
    const newToken = this.generateSessionToken()

    await this.storage.updateSession(sessionId, {
      token: newToken,
      expiresAt: newExpiresAt,
    })

    await this.setSessionCookie(sessionId, newToken)
  }

  async signOut(): Promise<void> {
    const result = await this.verifySession()
    if (result) {
      await this.storage.invalidateSession(result.session.id)
    }
    await this.framework.deleteCookie(
      this.config.session.cookieName || defaultSessionCookieName,
    )
  }

  private async setSessionCookie(
    sessionId: string,
    token: string,
  ): Promise<void> {
    const payload = {
      sessionId,
      token,
    }

    const jwtToken = jwt.sign(payload, this.config.jwt.secret, {
      algorithm: (this.config.jwt.algorithm as jwt.Algorithm) || 'HS256',
    })

    await this.framework.setCookie(
      this.config.session.cookieName || defaultSessionCookieName,
      jwtToken,
      {
        httpOnly: true,
        secure:
          this.config.session.secure ?? process.env.NODE_ENV === 'production',
        sameSite: this.config.session.sameSite || 'lax',
        maxAge: this.config.session.ttl,
        path: '/',
      },
    )
  }

  private generateOTPCode(length: number): string {
    const chars =
      '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
    let code = ''
    for (let i = 0; i < length; i++) {
      code += chars[crypto.randomInt(0, chars.length)]
    }
    return code
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}
