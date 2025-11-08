import { eq, and } from 'drizzle-orm'
import { users, userIdentifiers, sessions, otps } from '../db/schema'
import type { KenmonStorage, KenmonSession, KenmonIdentifier } from 'kenmon'
import type {
  KenmonEmailOTPStorage,
  KenmonEmailOTP,
} from '@kenmon/email-otp-provider'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

interface User {
  id: string
  createdAt: Date
  updatedAt: Date
}

export class DrizzleSessionStorage implements KenmonStorage<User> {
  constructor(private db: PostgresJsDatabase<typeof import('../db/schema')>) {}

  // User operations
  async createUser(identifier: KenmonIdentifier, data: any): Promise<User> {
    // Create user
    const [user] = await this.db.insert(users).values({}).returning()

    // Create identifier entry
    await this.db.insert(userIdentifiers).values({
      userId: user.id,
      type: identifier.type,
      value: identifier.value,
      data: identifier.data,
    })

    return user
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
    return user || null
  }

  async getUserByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<User | null> {
    const result = await this.db.query.userIdentifiers.findFirst({
      where: (userIdentifiers, { eq, and }) =>
        and(
          eq(userIdentifiers.type, identifier.type),
          eq(userIdentifiers.value, identifier.value),
        ),
      with: {
        user: true,
      },
    })

    return result?.user || null
  }

  // Session operations
  async createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<KenmonSession> {
    const [session] = await this.db
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
      refreshedAt: session.refreshedAt,
      usedAt: session.usedAt,
      invalidated: session.invalidated,
      invalidatedAt: session.invalidatedAt ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
    }
  }

  async getSessionById(sessionId: string): Promise<KenmonSession | null> {
    const [session] = await this.db
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
      refreshedAt: session.refreshedAt,
      usedAt: session.usedAt,
      invalidated: session.invalidated,
      invalidatedAt: session.invalidatedAt ?? undefined,
      ipAddress: session.ipAddress ?? undefined,
      userAgent: session.userAgent ?? undefined,
    }
  }

  async updateSession(
    sessionId: string,
    data: { expiresAt?: Date; refreshedAt?: Date; usedAt?: Date },
  ): Promise<void> {
    await this.db.update(sessions).set(data).where(eq(sessions.id, sessionId))
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        invalidated: true,
        invalidatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await this.db
      .update(sessions)
      .set({
        invalidated: true,
        invalidatedAt: new Date(),
      })
      .where(eq(sessions.userId, userId))
  }
}

export class DrizzleEmailOTPStorage implements KenmonEmailOTPStorage {
  constructor(private db: PostgresJsDatabase<typeof import('../db/schema')>) {}

  async createOTP(
    email: string,
    code: string,
    expiresAt: Date,
    signature: string,
  ): Promise<KenmonEmailOTP> {
    const [otp] = await this.db
      .insert(otps)
      .values({
        email,
        code,
        signature,
        expiresAt,
        used: false,
      })
      .returning()

    return otp
  }

  async getOTPById(id: string): Promise<KenmonEmailOTP | null> {
    const [otp] = await this.db.select().from(otps).where(eq(otps.id, id)).limit(1)
    return otp || null
  }

  async markOTPAsUsed(id: string): Promise<void> {
    await this.db.update(otps).set({ used: true }).where(eq(otps.id, id))
  }
}
