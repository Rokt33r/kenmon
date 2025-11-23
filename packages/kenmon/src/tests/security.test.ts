import { describe, it, expect, beforeEach } from 'vitest'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import { KenmonInvalidSessionError } from '../errors'
import { KenmonIdentifier } from '../types'
import jwt from 'jsonwebtoken'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

describe('Security Tests', () => {
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

  describe('Token Generation', () => {
    it('should generate unique session tokens', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      const tokens = new Set<string>()

      // Create multiple sessions
      for (let i = 0; i < 10; i++) {
        await adapter.deleteCookie('session')
        const result = await authService.signIn(defaultTestIdentifier)

        if (result.success) {
          tokens.add(result.data.token)
        }
      }

      // All tokens should be unique
      expect(tokens.size).toBe(10)
    })

    it('should generate tokens with correct format (64 hex characters)', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()

      expect(session.token).toMatch(/^[0-9a-f]{64}$/)
      expect(session.token.length).toBe(64)
    })
  })

  describe('JWT Token Security', () => {
    it('should reject tampered JWT tokens', async () => {
      await signUpAndCreateSessionWithDefaultTestIdentifier()

      const cookieValue = await adapter.getCookie('session')
      expect(cookieValue).toBeDefined()

      // Decode and tamper with the JWT
      const decoded = jwt.decode(cookieValue!) as any
      const tamperedPayload = {
        ...decoded,
        sessionId: 'tampered-session-id',
      }

      // Re-sign with a different secret
      const tamperedToken = jwt.sign(tamperedPayload, 'wrong-secret', {
        algorithm: 'HS256',
      })

      // Replace cookie with tampered token
      await adapter.setCookie('session', tamperedToken)

      // Verification should fail
      const result = await authService.verifySession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })

    it('should reject JWT with mismatched session token', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()

      const cookieValue = await adapter.getCookie('session')
      expect(cookieValue).toBeDefined()

      // Create a new JWT with correct sessionId but wrong token
      const tamperedPayload = {
        sessionId: session.id,
        token: '0'.repeat(64), // Different token
      }

      const tamperedToken = jwt.sign(tamperedPayload, 'test-secret', {
        algorithm: 'HS256',
      })

      // Replace cookie with tampered token
      await adapter.setCookie('session', tamperedToken)

      // Verification should fail
      const result = await authService.verifySession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })

    it('should use HS256 algorithm for JWT signing', async () => {
      await signUpAndCreateSessionWithDefaultTestIdentifier()

      const cookieValue = await adapter.getCookie('session')
      expect(cookieValue).toBeDefined()

      const decoded = jwt.decode(cookieValue!, { complete: true })
      expect(decoded?.header.alg).toBe('HS256')
    })
  })

  describe('Cookie Security', () => {
    it('should set httpOnly flag on session cookie', async () => {
      await signUpAndCreateSessionWithDefaultTestIdentifier()

      const options = adapter.getCookieOptions('session')
      expect(options?.httpOnly).toBe(true)
    })

    it('should set secure flag based on configuration', async () => {
      const secureAuthService = new KenmonAuthService({
        secret: 'test-secret',
        storage,
        adapter,
        session: { secure: true },
      })

      await storage.createUser(defaultTestIdentifier, {})
      await secureAuthService.signIn(defaultTestIdentifier)

      const options = adapter.getCookieOptions('session')
      expect(options?.secure).toBe(true)
    })

    it('should set sameSite to lax by default', async () => {
      await signUpAndCreateSessionWithDefaultTestIdentifier()

      const options = adapter.getCookieOptions('session')
      expect(options?.sameSite).toBe('lax')
    })

    it('should allow custom sameSite configuration', async () => {
      const strictAuthService = new KenmonAuthService({
        secret: 'test-secret',
        storage,
        adapter,
        session: { sameSite: 'strict' },
      })

      await storage.createUser(defaultTestIdentifier, {})
      await strictAuthService.signIn(defaultTestIdentifier)

      const options = adapter.getCookieOptions('session')
      expect(options?.sameSite).toBe('strict')
    })

    it('should set cookie path to root', async () => {
      await signUpAndCreateSessionWithDefaultTestIdentifier()

      const options = adapter.getCookieOptions('session')
      expect(options?.path).toBe('/')
    })

    it('should set maxAge to session TTL', async () => {
      await signUpAndCreateSessionWithDefaultTestIdentifier()

      const options = adapter.getCookieOptions('session')
      expect(options?.maxAge).toBe(14 * 24 * 60 * 60) // Default TTL
    })
  })

  describe('Session Expiration', () => {
    it('should enforce session expiration at exact boundary', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()

      // Set session to expire in the past
      const pastTime = new Date(Date.now() - 1)
      await storage.updateSession(session.id, {
        expiresAt: pastTime,
      })

      const result = await authService.verifySession()
      expect(result.success).toBe(false)
    })

    it('should not invalidate session before expiration', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()

      // Set session to expire in the future
      const futureTime = new Date(Date.now() + 10000)
      await storage.updateSession(session.id, {
        expiresAt: futureTime,
      })

      const result = await authService.verifySession()
      expect(result.success).toBe(true)
    })
  })

  describe('Session Invalidation', () => {
    it('should reject invalidated sessions', async () => {
      const session = await signUpAndCreateSessionWithDefaultTestIdentifier()

      await storage.invalidateSession(session.id)

      const result = await authService.verifySession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })

    it('should prevent session reuse after invalidation', async () => {
      await signUpAndCreateSessionWithDefaultTestIdentifier()

      // First verify works
      let result = await authService.verifySession()
      expect(result.success).toBe(true)

      if (result.success) {
        // Invalidate
        await storage.invalidateSession(result.data.id)
      }

      // Second verify should fail
      result = await authService.verifySession()
      expect(result.success).toBe(false)

      // Third verify should still fail (no reuse)
      result = await authService.verifySession()
      expect(result.success).toBe(false)
    })
  })
})
