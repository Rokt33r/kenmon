export type KenmonReturnType<D> =
  | { error: Error; data: null }
  | { error: null; data: D }

export interface KenmonIdentifier {
  type: string
  value: string
}

export interface KenmonSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
  invalidated: boolean
  ipAddress?: string
  userAgent?: string
}

export interface KenmonPreparePayload {
  type: string
  intent: 'sign-up' | 'sign-in'
  data: any
}

export interface KenmonAuthenticatePayload {
  type: string
  intent: 'sign-up' | 'sign-in'
  data: any
}

export interface KenmonConfig<U> {
  secret: string
  session?: {
    ttl?: number // seconds
    refreshInterval?: number // seconds
    cookieName?: string
    secure?: boolean
    sameSite?: 'lax' | 'strict' | 'none'
  }
  otp?: {
    ttl?: number // seconds
    length?: number
  }
  storage: KenmonStorage<U>
  framework: KenmonFrameworkAdapter
}

// Storage interface
export interface KenmonStorage<U> {
  // User operations
  createUser(identifier: KenmonIdentifier, data: any): Promise<U>
  getUserById(id: string): Promise<U | null>
  getUserByIdentifier(identifier: KenmonIdentifier): Promise<U | null>

  // Session operations
  createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<KenmonSession>
  getSessionById(sessionId: string): Promise<KenmonSession | null>
  updateSession(
    sessionId: string,
    data: { token: string; expiresAt: Date },
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

export interface KenmonFrameworkAdapter {
  setCookie(name: string, value: string, options?: CookieOptions): Promise<void>
  getCookie(name: string): Promise<string | undefined>
  deleteCookie(name: string): Promise<void>
  redirect(url: string): Promise<void>
}

export interface OTP {
  id: string
  email: string
  code: string
  expiresAt: Date
  used: boolean
}

export abstract class KenmonAuthProvider {
  abstract readonly type: string

  prepare?(payload: KenmonPreparePayload): Promise<KenmonReturnType<any>>

  abstract authenticate(
    payload: KenmonAuthenticatePayload,
  ): Promise<KenmonIdentifier>
}
