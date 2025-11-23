import { describe, it, expect, beforeEach } from 'vitest'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import {
  KenmonSessionNotFoundError,
  KenmonInvalidSessionError,
  KenmonSessionExpiredError,
} from '../errors'
import { KenmonIdentifier } from '../types'
import { addSeconds } from 'date-fns'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

describe('Session Management', () => {
  let storage: MockStorage
  let adapter: MockAdapter
  let authService: KenmonAuthService<any>

  beforeEach(() => {
    storage = new MockStorage()
    adapter = new MockAdapter()
    authService = new KenmonAuthService({
      secret: 'test-secret',
      storage,
      adapter,
    })
  })

  async function signUpAndCreateSessionWithDefaultTestIdentifier() {
    await storage.createUser(defaultTestIdentifier, {})

    const result = await authService.signIn(defaultTestIdentifier)

    if (!result.success) {
      throw new Error('Failed to create session')
    }

    return result.data
  }

  describe('verifySession()', () => {
    it('should return error when no session cookie exists', async () => {
      const result = await authService.verifySession()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonSessionNotFoundError)
      }
    })

    it('should return error for invalid JWT', async () => {
      await adapter.setCookie('session', 'invalid-jwt-token')

      const result = await authService.verifySession()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })

    it('should verify valid session and update usedAt', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()
      const originalUsedAt = session.usedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      const result = await authService.verifySession()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe(session.id)
        expect(result.data.token).toBe(session.token)
        expect(result.data.invalidated).toBe(false)

        // Check that usedAt was updated in storage
        const storedSession = storage.getSession(session.id)
        expect(storedSession?.usedAt.getTime()).toBeGreaterThan(
          originalUsedAt.getTime(),
        )
      }
    })

    it('should return error for invalidated session', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()
      await storage.invalidateSession(session.id)

      const result = await authService.verifySession()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })

    it('should return error for expired session', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()

      // Manually set session to expired
      await storage.updateSession(session.id, {
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      })

      const result = await authService.verifySession()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonSessionExpiredError)
      }
    })
  })

  describe('refreshSession()', () => {
    it('should return error when no session exists', async () => {
      const result = await authService.refreshSession()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonSessionNotFoundError)
      }
    })

    it('should extend session expiration and update refreshedAt', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()
      const originalExpiresAt = session.expiresAt
      const originalRefreshedAt = session.refreshedAt

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10))

      const result = await authService.refreshSession()

      expect(result.success).toBe(true)

      // Check that session was updated in storage
      const storedSession = storage.getSession(session.id)
      expect(storedSession?.expiresAt.getTime()).toBeGreaterThan(
        originalExpiresAt.getTime(),
      )
      expect(storedSession?.refreshedAt.getTime()).toBeGreaterThan(
        originalRefreshedAt.getTime(),
      )
    })

    it('should not refresh invalid session', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()
      await storage.invalidateSession(session.id)

      const result = await authService.refreshSession()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })
  })

  describe('signOut()', () => {
    it('should invalidate current session and delete cookie', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()

      expect(adapter.hasCookie('session')).toBe(true)

      await authService.signOut()

      // Cookie should be deleted
      expect(adapter.hasCookie('session')).toBe(false)

      // Session should be invalidated
      const storedSession = storage.getSession(session.id)
      expect(storedSession?.invalidated).toBe(true)
      expect(storedSession?.invalidatedAt).toBeInstanceOf(Date)
    })

    it('should invalidate all user sessions when allSessions option is true', async () => {
      // Create first session
      const session1 = await signUpAndCreateSessionWithDefaultTestIdentifier()

      // Clear cookie and create second session for same user
      await adapter.deleteCookie('session')
      const result2 = await authService.signIn(defaultTestIdentifier)
      if (!result2.success) throw new Error('Failed to create second session')
      const session2 = result2.data

      // Sign out with allSessions option
      await authService.signOut({ allSessions: true })

      // Both sessions should be invalidated
      const storedSession1 = storage.getSession(session1.id)
      const storedSession2 = storage.getSession(session2.id)
      expect(storedSession1?.invalidated).toBe(true)
      expect(storedSession2?.invalidated).toBe(true)
    })

    it('should delete cookie even when no valid session exists', async () => {
      await adapter.setCookie('session', 'invalid-token')
      expect(adapter.hasCookie('session')).toBe(true)

      await authService.signOut()

      expect(adapter.hasCookie('session')).toBe(false)
    })
  })

  describe('Session Configuration', () => {
    it('should use custom session TTL', async () => {
      const customTTL = 3600 // 1 hour
      const customAuthService = new KenmonAuthService({
        secret: 'test-secret',
        storage,
        adapter,
        session: { ttl: customTTL },
      })

      await storage.createUser(defaultTestIdentifier, {})

      const result = await customAuthService.signIn(defaultTestIdentifier)

      if (result.success) {
        const now = new Date()
        const expectedExpiry = addSeconds(now, customTTL)
        const timeDiff = Math.abs(
          result.data.expiresAt.getTime() - expectedExpiry.getTime(),
        )
        expect(timeDiff).toBeLessThan(1000) // Within 1 second
      }
    })

    it('should use custom cookie name', async () => {
      const customAuthService = new KenmonAuthService({
        secret: 'test-secret',
        storage,
        adapter,
        session: { cookieName: 'custom_session' },
      })

      await storage.createUser(defaultTestIdentifier, {})

      await customAuthService.signIn(defaultTestIdentifier)

      expect(adapter.hasCookie('custom_session')).toBe(true)
      expect(adapter.hasCookie('session')).toBe(false)
    })
  })
})
