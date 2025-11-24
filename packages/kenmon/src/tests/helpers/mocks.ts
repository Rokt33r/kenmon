import {
  KenmonStorage,
  KenmonAdapter,
  KenmonSession,
  KenmonIdentifier,
  CookieOptions,
} from '../../types'

// Mock User type for testing
export interface MockUser {
  id: string
  email?: string
  createdAt: Date
}

// Mock Storage Implementation
export class MockStorage implements KenmonStorage<MockUser> {
  private users: Map<string, MockUser> = new Map()
  private sessions: Map<string, KenmonSession> = new Map()
  private identifiers: Map<string, string> = new Map() // identifier key -> userId

  private getIdentifierKey(identifier: KenmonIdentifier): string {
    return `${identifier.type}:${identifier.value}`
  }

  async createUser(identifier: KenmonIdentifier, data: any): Promise<MockUser> {
    const userId = `user-${Date.now()}-${Math.random()}`
    const user: MockUser = {
      id: userId,
      email: identifier.type === 'email' ? identifier.value : undefined,
      createdAt: new Date(),
      ...data,
    }
    this.users.set(userId, user)
    this.identifiers.set(this.getIdentifierKey(identifier), userId)
    return user
  }

  async getUserById(id: string): Promise<MockUser | null> {
    return this.users.get(id) || null
  }

  async getUserByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<MockUser | null> {
    const userId = this.identifiers.get(this.getIdentifierKey(identifier))
    if (!userId) return null
    return this.getUserById(userId)
  }

  async getUserAuthInfoByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<{ userId: string; mfaRequired: boolean } | null> {
    const userId = this.identifiers.get(this.getIdentifierKey(identifier))
    if (!userId) return null
    return { userId, mfaRequired: false }
  }

  async createSession({
    userId,
    token,
    expiresAt,
    mfaVerified,
    mfaRequired,
    ipAddress,
    userAgent,
  }: {
    userId: string
    token: string
    expiresAt: Date
    mfaVerified: boolean
    mfaRequired: boolean
    ipAddress?: string
    userAgent?: string
  }): Promise<KenmonSession> {
    const sessionId = `session-${Date.now()}-${Math.random()}`
    const now = new Date()
    const session: KenmonSession = {
      id: sessionId,
      userId,
      token,
      expiresAt,
      createdAt: now,
      refreshedAt: now,
      usedAt: now,
      invalidated: false,
      ipAddress,
      userAgent,
      mfaVerified,
      mfaRequired,
    }
    this.sessions.set(sessionId, session)
    return session
  }

  async getSessionById(sessionId: string): Promise<KenmonSession | null> {
    return this.sessions.get(sessionId) || null
  }

  async updateSession(
    sessionId: string,
    data: {
      expiresAt?: Date
      refreshedAt?: Date
      usedAt?: Date
      mfaVerified?: boolean
    },
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      Object.assign(session, data)
    }
  }

  async invalidateSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.invalidated = true
      session.invalidatedAt = new Date()
    }
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        session.invalidated = true
        session.invalidatedAt = new Date()
      }
    }
  }

  // Helper methods for testing
  clear() {
    this.users.clear()
    this.sessions.clear()
    this.identifiers.clear()
  }

  getSession(sessionId: string): KenmonSession | undefined {
    return this.sessions.get(sessionId)
  }
}

// Mock Adapter Implementation
export class MockAdapter implements KenmonAdapter {
  private cookies: Map<string, string> = new Map()
  private cookieOptions: Map<string, CookieOptions> = new Map()

  async setCookie(
    name: string,
    value: string,
    options?: CookieOptions,
  ): Promise<void> {
    this.cookies.set(name, value)
    if (options) {
      this.cookieOptions.set(name, options)
    }
  }

  async getCookie(name: string): Promise<string | undefined> {
    return this.cookies.get(name)
  }

  async deleteCookie(name: string): Promise<void> {
    this.cookies.delete(name)
    this.cookieOptions.delete(name)
  }

  // Helper methods for testing
  clear() {
    this.cookies.clear()
    this.cookieOptions.clear()
  }

  hasCookie(name: string): boolean {
    return this.cookies.has(name)
  }

  getCookieOptions(name: string): CookieOptions | undefined {
    return this.cookieOptions.get(name)
  }
}
