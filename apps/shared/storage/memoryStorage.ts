import type { KenmonIdentifier, KenmonSession, KenmonStorage } from 'kenmon'

export interface MemoryUser {
  id: string
}

interface MemoryStore {
  users: Map<string, MemoryUser>
  userIdsByIdentifier: Map<string, string>
  sessions: Map<string, KenmonSession>
}

const globalForStore = globalThis as typeof globalThis & {
  __kenmonMemoryStore?: MemoryStore
}

/**
 * Returns the store that every `MemoryStorage` shares. The store lives on
 * `globalThis`, so a module reload in a dev server keeps the sessions.
 */
function getStore(): MemoryStore {
  globalForStore.__kenmonMemoryStore ??= {
    users: new Map(),
    userIdsByIdentifier: new Map(),
    sessions: new Map(),
  }
  return globalForStore.__kenmonMemoryStore
}

function getIdentifierKey(identifier: KenmonIdentifier): string {
  return `${identifier.type}:${identifier.value}`
}

/**
 * In-memory `KenmonStorage` for test fixture apps. It keeps no data after the
 * process stops.
 */
export class MemoryStorage implements KenmonStorage<MemoryUser> {
  async createUser(identifier: KenmonIdentifier): Promise<MemoryUser> {
    const { users, userIdsByIdentifier } = getStore()
    const user = { id: crypto.randomUUID() }
    users.set(user.id, user)
    userIdsByIdentifier.set(getIdentifierKey(identifier), user.id)
    return user
  }

  async getUserById(id: string): Promise<MemoryUser | null> {
    return getStore().users.get(id) ?? null
  }

  async getUserAuthInfoByIdentifier(identifier: KenmonIdentifier) {
    const userId = getStore().userIdsByIdentifier.get(
      getIdentifierKey(identifier),
    )
    return userId ? { userId, mfaEnabled: false } : null
  }

  async enableMfa(): Promise<void> {}

  async disableMfa(): Promise<void> {}

  async createSession(
    data: Parameters<KenmonStorage<MemoryUser>['createSession']>[0],
  ): Promise<KenmonSession> {
    const now = new Date()
    const session: KenmonSession = {
      id: crypto.randomUUID(),
      createdAt: now,
      refreshedAt: now,
      usedAt: now,
      invalidated: false,
      ...data,
    }
    getStore().sessions.set(session.id, session)
    return session
  }

  async getSessionById(sessionId: string): Promise<KenmonSession | null> {
    return getStore().sessions.get(sessionId) ?? null
  }

  async updateSession(
    sessionId: string,
    data: Partial<KenmonSession>,
  ): Promise<void> {
    const session = getStore().sessions.get(sessionId)
    if (session) Object.assign(session, data)
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      invalidated: true,
      invalidatedAt: new Date(),
    })
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    for (const session of getStore().sessions.values()) {
      if (session.userId === userId) {
        await this.invalidateSession(session.id)
      }
    }
  }
}
