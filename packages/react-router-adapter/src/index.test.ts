import { describe, it, expect, beforeEach } from 'vitest'
import {
  KenmonAuthService,
  type KenmonIdentifier,
  type KenmonSession,
  type KenmonStorage,
} from 'kenmon'
import { KenmonReactRouterAdapter, kenmonReactRouterMiddleware } from './index'

interface TestUser {
  id: string
}

class MemoryStorage implements KenmonStorage<TestUser> {
  private users = new Map<string, TestUser>()
  private userIdsByIdentifier = new Map<string, string>()
  private sessions = new Map<string, KenmonSession>()

  async createUser(identifier: KenmonIdentifier): Promise<TestUser> {
    const user = { id: `user-${this.users.size + 1}` }
    this.users.set(user.id, user)
    this.userIdsByIdentifier.set(
      `${identifier.type}:${identifier.value}`,
      user.id,
    )
    return user
  }

  async getUserById(id: string): Promise<TestUser | null> {
    return this.users.get(id) ?? null
  }

  async getUserAuthInfoByIdentifier(identifier: KenmonIdentifier) {
    const userId = this.userIdsByIdentifier.get(
      `${identifier.type}:${identifier.value}`,
    )
    return userId ? { userId, mfaEnabled: false } : null
  }

  async enableMfa(): Promise<void> {}

  async disableMfa(): Promise<void> {}

  async createSession(
    data: Parameters<KenmonStorage<TestUser>['createSession']>[0],
  ): Promise<KenmonSession> {
    const now = new Date()
    const session: KenmonSession = {
      id: `session-${this.sessions.size + 1}`,
      createdAt: now,
      refreshedAt: now,
      usedAt: now,
      invalidated: false,
      ...data,
    }
    this.sessions.set(session.id, session)
    return session
  }

  async getSessionById(sessionId: string): Promise<KenmonSession | null> {
    return this.sessions.get(sessionId) ?? null
  }

  async updateSession(
    sessionId: string,
    data: Partial<KenmonSession>,
  ): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (session) Object.assign(session, data)
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      invalidated: true,
      invalidatedAt: new Date(),
    })
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        await this.invalidateSession(session.id)
      }
    }
  }
}

const identifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

/** Runs `action` inside the middleware, as a React Router request would. */
async function runRequest(
  action: () => Promise<unknown>,
  cookie?: string,
): Promise<Response> {
  const request = new Request('http://localhost/', {
    headers: cookie ? { Cookie: cookie } : {},
  })
  return kenmonReactRouterMiddleware({ request }, async () => {
    await action()
    return new Response(null)
  })
}

describe('KenmonReactRouterAdapter', () => {
  let storage: MemoryStorage
  let auth: KenmonAuthService<TestUser>

  beforeEach(() => {
    storage = new MemoryStorage()
    auth = new KenmonAuthService({
      secret: 'test-secret',
      session: { cookieName: '__Host-session', secure: true },
      storage,
      adapter: new KenmonReactRouterAdapter(),
    })
  })

  it('writes Secure and Path=/ in the clear header of a __Host- cookie', async () => {
    const signInResponse = await runRequest(() => auth.signUp(identifier, {}))
    const [setHeader] = signInResponse.headers.getSetCookie()

    expect(setHeader).toMatch(/^__Host-session=[^;]+; /)
    expect(setHeader).toContain('; HttpOnly; Secure; SameSite=lax;')
    expect(setHeader).toContain(`; Max-Age=${14 * 24 * 60 * 60}; Path=/`)

    const sessionCookie = setHeader.split(';')[0]
    const signOutResponse = await runRequest(
      () => auth.signOut(),
      sessionCookie,
    )

    expect(signOutResponse.headers.getSetCookie()).toEqual([
      '__Host-session=; HttpOnly; Secure; SameSite=lax; Max-Age=0; Path=/',
    ])
    // The adapter read the request cookie, so sign-out found the session row.
    expect((await storage.getSessionById('session-1'))?.invalidated).toBe(true)
  })
})
