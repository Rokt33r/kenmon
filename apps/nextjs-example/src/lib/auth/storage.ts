import { eq, and } from 'drizzle-orm'
import { db } from '../db'
import { users, userIdentifiers, sessions, otps } from '../db/schema'
import { KenmonStorage, KenmonSession, KenmonIdentifier } from 'kenmon'
import {
  KenmonEmailOTPStorage,
  KenmonEmailOTP,
} from '@kenmon/email-otp-provider'

interface User {
  id: string
  createdAt: Date
  updatedAt: Date
}

export class DrizzleSessionStorage implements KenmonStorage<User> {
  // User operations
  async createUser(identifier: KenmonIdentifier, data: any): Promise<User> {
    // Create user
    const [user] = await db.insert(users).values({}).returning()

    // Create identifier entry
    await db.insert(userIdentifiers).values({
      userId: user.id,
      type: identifier.type,
      value: identifier.value,
      data: identifier.data,
    })

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

  async getUserByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<User | null> {
    const result = await db.query.userIdentifiers.findFirst({
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
      refreshedAt: session.refreshedAt,
      usedAt: session.usedAt,
      invalidated: session.invalidated,
      invalidatedAt: session.invalidatedAt,
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
      refreshedAt: session.refreshedAt,
      usedAt: session.usedAt,
      invalidated: session.invalidated,
      invalidatedAt: session.invalidatedAt,
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
    }
  }

  async updateSession(
    sessionId: string,
    data: { expiresAt?: Date; refreshedAt?: Date; usedAt?: Date },
  ): Promise<void> {
    await db.update(sessions).set(data).where(eq(sessions.id, sessionId))
  }

  async invalidateSession(sessionId: string): Promise<void> {
    await db
      .update(sessions)
      .set({
        invalidated: true,
        invalidatedAt: new Date(),
      })
      .where(eq(sessions.id, sessionId))
  }

  async invalidateAllUserSessions(userId: string): Promise<void> {
    await db
      .update(sessions)
      .set({
        invalidated: true,
        invalidatedAt: new Date(),
      })
      .where(eq(sessions.userId, userId))
  }
}

export class DrizzleEmailOTPStorage implements KenmonEmailOTPStorage {
  async createOTP(
    email: string,
    code: string,
    expiresAt: Date,
  ): Promise<KenmonEmailOTP> {
    const [otp] = await db
      .insert(otps)
      .values({
        email,
        code,
        expiresAt,
        used: false,
      })
      .returning()

    return otp
  }

  async getOTPById(id: string): Promise<KenmonEmailOTP | null> {
    const [otp] = await db.select().from(otps).where(eq(otps.id, id)).limit(1)
    return otp || null
  }

  async markOTPAsUsed(id: string): Promise<void> {
    await db.update(otps).set({ used: true }).where(eq(otps.id, id))
  }
}
