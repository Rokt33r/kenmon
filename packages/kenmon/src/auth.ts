import crypto from 'crypto'
import { addSeconds, isAfter } from 'date-fns'
import jwt from 'jsonwebtoken'
import {
  KenmonConfig,
  KenmonAdapter,
  KenmonReturnType,
  KenmonSession,
  KenmonStorage,
  KenmonIdentifier,
  KenmonSignInOptions,
  KenmonSignUpOptions,
} from './types'

import {
  KenmonUserNotFoundError,
  KenmonUserAlreadyExistsError,
  KenmonSessionNotFoundError,
  KenmonInvalidSessionError,
  KenmonSessionExpiredError,
} from './errors'

const defaultSessionCookieName = 'session'

export class KenmonAuthService<U> {
  secret: string
  session: {
    ttl: number
    cookieName: string
    secure: boolean
    sameSite: 'lax' | 'strict' | 'none'
  }

  storage: KenmonStorage<U>
  adapter: KenmonAdapter

  constructor(config: KenmonConfig<U>) {
    this.secret = config.secret
    this.session = {
      ttl: config.session?.ttl ?? 14 * 24 * 60 * 60,
      cookieName: config.session?.cookieName ?? 'session',
      secure: config.session?.secure ?? process.env.NODE_ENV === 'production',
      sameSite: config.session?.sameSite ?? 'lax',
    }

    this.storage = config.storage
    this.adapter = config.adapter
  }

  async signIn(
    identifier: KenmonIdentifier,
    options?: KenmonSignInOptions,
  ): Promise<KenmonReturnType<KenmonSession>> {
    // Look up existing user
    const user = await this.storage.getUserByIdentifier(identifier)
    if (!user) {
      return { success: false, error: new KenmonUserNotFoundError() }
    }

    // TODO: Check if user requires MFA
    const mfaRequired = false // Placeholder for future MFA logic

    // Create session
    const userId = (user as any).id
    const session = await this.createSession(
      userId,
      false, // mfaVerified is false by default as per user instruction
      options?.ipAddress,
      options?.userAgent,
    )
    return { success: true, data: session }
  }

  async signUp(
    identifier: KenmonIdentifier,
    data: any,
    options?: KenmonSignUpOptions,
  ): Promise<KenmonReturnType<KenmonSession>> {
    // Check if user already exists
    const existingUser = await this.storage.getUserByIdentifier(identifier)
    if (existingUser) {
      return {
        success: false,
        error: new KenmonUserAlreadyExistsError(identifier.value),
      }
    }

    // Create new user
    const user = await this.storage.createUser(identifier, {
      ...data,
      ...options?.initialUserData,
    })

    // Create session
    const session = await this.createSession(
      (user as any).id,
      false, // mfaVerified is false by default
      options?.ipAddress,
      options?.userAgent,
    )
    return { success: true, data: session }
  }

  async createSession(
    userId: string,
    mfaVerified: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<KenmonSession> {
    const token = this.generateSessionToken()
    const expiresAt = addSeconds(new Date(), this.session.ttl)

    const session = await this.storage.createSession(
      userId,
      token,
      expiresAt,
      mfaVerified,
      ipAddress,
      userAgent,
    )

    await this.setSessionCookie(session.id, session.token)

    return session
  }

  async verifySession(): Promise<KenmonReturnType<KenmonSession>> {
    const cookieValue = await this.adapter.getCookie(
      this.session.cookieName || defaultSessionCookieName,
    )

    if (!cookieValue) {
      return { success: false, error: new KenmonSessionNotFoundError() }
    }

    try {
      const decoded = jwt.verify(cookieValue, this.secret) as {
        sessionId: string
        token: string
      }

      const session = await this.storage.getSessionById(decoded.sessionId)
      if (!session || session.token !== decoded.token || session.invalidated) {
        return { success: false, error: new KenmonInvalidSessionError() }
      }

      if (isAfter(new Date(), session.expiresAt)) {
        return { success: false, error: new KenmonSessionExpiredError() }
      }

      // Update usedAt timestamp
      await this.storage.updateSession(session.id, {
        usedAt: new Date(),
      })

      return { success: true, data: session }
    } catch {
      return { success: false, error: new KenmonInvalidSessionError() }
    }
  }

  async refreshSession(): Promise<KenmonReturnType<void>> {
    const verifyResult = await this.verifySession()
    if (!verifyResult.success) {
      return { success: false, error: verifyResult.error }
    }

    const session = verifyResult.data
    const now = new Date()
    const newExpiresAt = addSeconds(now, this.session.ttl)

    await this.storage.updateSession(session.id, {
      expiresAt: newExpiresAt,
      refreshedAt: now,
    })

    await this.setSessionCookie(session.id, session.token)

    return { success: true, data: undefined }
  }

  async signOut(options?: { allSessions?: boolean }): Promise<void> {
    const verifyResult = await this.verifySession()
    if (verifyResult.success) {
      if (options?.allSessions) {
        await this.storage.invalidateAllUserSessions(verifyResult.data.userId)
      } else {
        await this.storage.invalidateSession(verifyResult.data.id)
      }
    }
    await this.adapter.deleteCookie(
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

    await this.adapter.setCookie(
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
