export type KenmonReturnType<D> =
  | { success: true; data: D }
  | { success: false; error: Error }

export interface KenmonIdentifier {
  type: string
  value: string
  data?: any
}

export interface KenmonSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  refreshedAt: Date
  usedAt: Date
  invalidated: boolean
  invalidatedAt?: Date
  ipAddress?: string
  userAgent?: string
  mfaVerified: boolean
  mfaEnabled: boolean
}

export interface KenmonSignInOptions {
  ipAddress?: string
  userAgent?: string
}

export interface KenmonSignUpOptions {
  ipAddress?: string
  userAgent?: string
  initialUserData?: any
}

export interface KenmonConfig<U> {
  secret: string
  session?: {
    ttl?: number // seconds
    cookieName?: string
    secure?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
  }
  otp?: {
    ttl?: number // seconds
    length?: number
  }
  storage: KenmonStorage<U>
  adapter: KenmonAdapter
}

// Storage interface
export interface KenmonStorage<U> {
  // User operations
  createUser(identifier: KenmonIdentifier, data: any): Promise<U>
  getUserById(id: string): Promise<U | null>
  getUserAuthInfoByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<{ userId: string; mfaEnabled: boolean } | null>
  enableMfa(userId: string): Promise<void>
  disableMfa(userId: string): Promise<void>
  // Session operations
  createSession(data: {
    userId: string
    token: string
    expiresAt: Date
    mfaEnabled: boolean
    mfaVerified: boolean
    ipAddress?: string
    userAgent?: string
  }): Promise<KenmonSession>
  getSessionById(sessionId: string): Promise<KenmonSession | null>
  updateSession(
    sessionId: string,
    data: {
      expiresAt?: Date
      refreshedAt?: Date
      usedAt?: Date
      mfaVerified?: boolean
    },
  ): Promise<void>
  invalidateSession(sessionId: string): Promise<void>
  invalidateAllUserSessions(userId: string): Promise<void>
}

export interface KenmonSendEmailParams {
  from: string
  to: string | string[]
  subject: string
  textContent?: string
  htmlContent?: string
}

// Email provider interface
export abstract class KenmonMailer {
  abstract sendEmail(params: KenmonSendEmailParams): Promise<void>
}

// Framework adapter interface
export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'lax' | 'strict' | 'none'
  maxAge?: number
  path?: string
}

export interface KenmonAdapter {
  setCookie(name: string, value: string, options?: CookieOptions): Promise<void>
  getCookie(name: string): Promise<string | undefined>
  deleteCookie(name: string): Promise<void>
}
