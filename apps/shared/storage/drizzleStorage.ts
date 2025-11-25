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

  async getUserAuthInfoByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<{ userId: string; mfaEnabled: boolean } | null> {
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

    if (!result?.user) return null

    return {
      userId: result.user.id,
      mfaEnabled: result.user.mfaEnabled,
    }
  }

  async enableMfa(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ mfaEnabled: true, updatedAt: new Date() })
      .where(eq(users.id, userId))
  }

  async disableMfa(userId: string): Promise<void> {
    await this.db
      .update(users)
      .set({ mfaEnabled: false, updatedAt: new Date() })
      .where(eq(users.id, userId))
  }

  // Session operations
  async createSession(data: {
    userId: string
    token: string
    expiresAt: Date
    mfaEnabled: boolean
    mfaVerified: boolean
    ipAddress?: string
    userAgent?: string
  }): Promise<KenmonSession> {
    const [session] = await this.db
      .insert(sessions)
      .values({
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
        mfaEnabled: data.mfaEnabled,
        mfaVerified: data.mfaVerified,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
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
      mfaEnabled: session.mfaEnabled,
      mfaVerified: session.mfaVerified,
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
      mfaEnabled: session.mfaEnabled,
      mfaVerified: session.mfaVerified,
    }
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
    const [otp] = await this.db
      .select()
      .from(otps)
      .where(eq(otps.id, id))
      .limit(1)
    return otp || null
  }

  async markOTPAsUsed(id: string): Promise<void> {
    await this.db.update(otps).set({ used: true }).where(eq(otps.id, id))
  }
}
