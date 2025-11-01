import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users, sessions } from '../db/schema'
import {
  KenmonStorage,
  KenmonSession,
  KenmonSignUpPayload,
} from '../../../../../src/types'

interface User {
  id: string
  email: string
  createdAt: Date
  updatedAt: Date
}

export class KenmonDrizzleStorage implements KenmonStorage<User> {
  // User operations
  async createUser(
    id: string,
    signUpPayload: KenmonSignUpPayload,
  ): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        id,
        email: signUpPayload.data.email,
      })
      .returning()

    return user
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return user || null
  }

  // Session operations
  async createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<KenmonSession> {
    const [session] = await db
      .insert(sessions)
      .values({
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
        invalidated: false,
      })
      .returning()

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      invalidated: session.invalidated,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
    }
  }

  async getSessionById(sessionId: string): Promise<KenmonSession | null> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)

    if (!session) return null

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      invalidated: session.invalidated,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
    }
  }

  async updateSession(
    sessionId: string,
    data: { token: string; expiresAt: Date },
  ): Promise<void> {
    await db
      .update(sessions)
      .set({
        token: data.token,
        expiresAt: data.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({
        invalidated: true,
        updatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await db
      .update(sessions)
      .set({
        invalidated: true,
        updatedAt: new Date(),
      })
      .where(eq(sessions.userId, userId))
  }
}
