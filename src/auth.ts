import crypto from 'crypto'
import { addSeconds, isAfter, differenceInSeconds } from 'date-fns'
import jwt from 'jsonwebtoken'
import {
  KenmonConfig,
  KenmonFrameworkAdapter,
  KenmonPreparePayload,
  KenmonReturnType,
  KenmonSession,
  KenmonStorage,
  KenmonAuthProvider,
} from './types'

import {
  KenmonProviderNotFoundError,
  KenmonPrepareNotSupportedError,
  KenmonUserNotFoundError,
  KenmonUserAlreadyExistsError,
} from './errors'

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
  providers: Map<string, KenmonAuthProvider>

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
    this.providers = new Map()
  }

  registerProvider(provider: KenmonAuthProvider): void {
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

  async signIn(
    type: string,
    data: any,
  ): Promise<KenmonReturnType<KenmonSession>> {
    const provider = this.providers.get(type)
    if (!provider) {
      return { success: false, error: new KenmonProviderNotFoundError(type) }
    }

    // Provider validates credentials and returns identifier
    const result = await provider.authenticate({
      type,
      intent: 'sign-in',
      data,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const identifier = result.data

    // Look up existing user
    const user = await this.storage.getUserByIdentifier(identifier)
    if (!user) {
      return { success: false, error: new KenmonUserNotFoundError() }
    }

    // Create session
    const userId = (user as any).id
    const session = await this.createSession(userId)
    return { success: true, data: session }
  }

  async signUp(
    type: string,
    data: any,
  ): Promise<KenmonReturnType<KenmonSession>> {
    const provider = this.providers.get(type)
    if (!provider) {
      return { success: false, error: new KenmonProviderNotFoundError(type) }
    }

    // Provider validates credentials and returns identifier
    const result = await provider.authenticate({
      type,
      intent: 'sign-up',
      data,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    const identifier = result.data

    // Check if user already exists
    const existingUser = await this.storage.getUserByIdentifier(identifier)
    if (existingUser) {
      return {
        success: false,
        error: new KenmonUserAlreadyExistsError(identifier.value),
      }
    }

    // Create new user
    const user = await this.storage.createUser(identifier, data)

    // Create session
    const session = await this.createSession((user as any).id)
    return { success: true, data: session }
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
