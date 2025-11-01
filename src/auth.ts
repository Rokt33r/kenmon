import * as crypto from 'crypto'

import { addSeconds, isAfter, differenceInSeconds } from 'date-fns'
import * as jwt from 'jsonwebtoken'

import {
  KenmonConfig,
  KenmonFrameworkAdapter,
  KenmonPreparationPayload,
  KenmonSession,
  KenmonSignInPayload,
  KenmonSignUpPayload,
  KenmonStorage,
} from './types'

const defaultSessionCookieName = 'session'

export class KenmonAuthService<U> {
  secret: string
  session: {
    ttl: number
    refreshInterval: number
    cookieName: string
    secure: boolean
    sameSite: 'lax' | 'strict' | 'none'
  }

  storage: KenmonStorage<U>
  framework: KenmonFrameworkAdapter

  constructor(config: KenmonConfig<U>) {
    this.secret = config.secret
    this.session = {
      ttl: config.session?.ttl ?? 14 * 24 * 60 * 60,
      refreshInterval: config.session?.refreshInterval ?? 1 * 24 * 60 * 60,
      cookieName: config.session?.cookieName ?? 'session',
      secure: config.session?.secure ?? process.env.NODE_ENV === 'production',
      sameSite: config.session?.sameSite ?? 'lax',
    }

    this.storage = config.storage
    this.framework = config.framework
  }

  async prepare(payload: KenmonPreparationPayload) {}

  async signIn(payload: KenmonSignInPayload) {}

  async signUp(payload: KenmonSignUpPayload) {}

  async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<KenmonSession> {
    const token = this.generateSessionToken()
    const expiresAt = addSeconds(new Date(), this.session.ttl)

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

  async verifySession(): Promise<KenmonSession | null> {
    const cookieValue = await this.framework.getCookie(
      this.session.cookieName || defaultSessionCookieName,
    )

    if (!cookieValue) return null

    try {
      const decoded = jwt.verify(cookieValue, this.secret) as {
        sessionId: string
        token: string
      }

      const session = await this.storage.getSessionById(decoded.sessionId)
      if (!session || session.token !== decoded.token || session.invalidated)
        return null

      if (isAfter(new Date(), session.expiresAt)) {
        return null
      }

      return session
    } catch {
      return null
    }
  }

  needsRefresh(updatedAt: Date): boolean {
    const sessionAge = differenceInSeconds(new Date(), updatedAt)
    return sessionAge > this.session.refreshInterval
  }

  async refreshSession(sessionId: string): Promise<void> {
    const now = new Date()
    const newExpiresAt = addSeconds(now, this.session.ttl)
    const newToken = this.generateSessionToken()

    await this.storage.updateSession(sessionId, {
      token: newToken,
      expiresAt: newExpiresAt,
    })

    await this.setSessionCookie(sessionId, newToken)
  }

  async signOut(): Promise<void> {
    const session = await this.verifySession()
    if (session != null) {
      await this.storage.invalidateSession(session.id)
    }
    await this.framework.deleteCookie(
      this.session.cookieName || defaultSessionCookieName,
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

    const jwtToken = jwt.sign(payload, this.secret, {
      algorithm: 'HS256',
    })

    await this.framework.setCookie(
      this.session.cookieName || defaultSessionCookieName,
      jwtToken,
      {
        httpOnly: true,
        secure: this.session.secure ?? process.env.NODE_ENV === 'production',
        sameSite: this.session.sameSite || 'lax',
        maxAge: this.session.ttl,
        path: '/',
      },
    )
  }

  private generateSessionToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }
}
