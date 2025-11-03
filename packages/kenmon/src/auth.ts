import crypto from 'crypto'
import { addSeconds, isAfter } from 'date-fns'
import jwt from 'jsonwebtoken'
import {
  KenmonConfig,
  KenmonAdapter,
  KenmonPreparePayload,
  KenmonAuthenticatePayload,
  KenmonReturnType,
  KenmonSession,
  KenmonStorage,
  KenmonProvider,
} from './types'

import {
  KenmonProviderNotFoundError,
  KenmonPrepareNotSupportedError,
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
  providers: Map<string, KenmonProvider>

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
    this.providers = new Map()
  }

  registerProvider(provider: KenmonProvider): void {
    this.providers.set(provider.type, provider)
  }

  async prepare(payload: KenmonPreparePayload): Promise<KenmonReturnType<any>> {
    const provider = this.providers.get(payload.type)
    if (!provider) {
      return {
        success: false,
        error: new KenmonProviderNotFoundError(payload.type),
      }
    }

    if (!provider.prepare) {
      return {
        success: false,
        error: new KenmonPrepareNotSupportedError(payload.type),
      }
    }

    return provider.prepare(payload)
  }

  async authenticate(
    payload: KenmonAuthenticatePayload,
  ): Promise<KenmonReturnType<KenmonSession>> {
    const provider = this.providers.get(payload.type)
    if (!provider) {
      return {
        success: false,
        error: new KenmonProviderNotFoundError(payload.type),
      }
    }

    // Provider validates credentials and returns identifier
    const result = await provider.authenticate(payload)

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const identifier = result.data

    // Handle based on intent
    if (payload.intent === 'sign-in') {
      // Look up existing user
      const user = await this.storage.getUserByIdentifier(identifier)
      if (!user) {
        return { success: false, error: new KenmonUserNotFoundError() }
      }

      // Create session
      const userId = (user as any).id
      const session = await this.createSession(
        userId,
        payload.ipAddress,
        payload.userAgent,
      )
      return { success: true, data: session }
    } else {
      // sign-up
      // Check if user already exists
      const existingUser = await this.storage.getUserByIdentifier(identifier)
      if (existingUser) {
        return {
          success: false,
          error: new KenmonUserAlreadyExistsError(identifier.value),
        }
      }

      // Create new user
      const user = await this.storage.createUser(identifier, payload.data)

      // Create session
      const session = await this.createSession(
        (user as any).id,
        payload.ipAddress,
        payload.userAgent,
      )
      return { success: true, data: session }
    }
  }

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

  async signOut(): Promise<void> {
    const verifyResult = await this.verifySession()
    if (verifyResult.success) {
      await this.storage.invalidateSession(verifyResult.data.id)
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
