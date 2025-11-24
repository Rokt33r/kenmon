import { describe, it, expect, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { addSeconds } from 'date-fns'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import { KenmonUserNotFoundError } from '../errors'
import { KenmonIdentifier } from '../types'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

const testSecret = 'test-secret'

describe('signIn()', () => {
  let storage: MockStorage
  let adapter: MockAdapter
  let authService: KenmonAuthService<any>

  beforeEach(() => {
    storage = new MockStorage()
    adapter = new MockAdapter()
    authService = new KenmonAuthService({
      secret: testSecret,
      storage,
      adapter,
    })
  })

  describe('Error Cases', () => {
    it('should return error when user does not exist', async () => {
      const result = await authService.signIn(defaultTestIdentifier)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonUserNotFoundError)
      }
    })
  })

  describe('Return Values', () => {
    it('should return userId and mfaEnabled=false when user exists without MFA', async () => {
      const user = await storage.createUser(defaultTestIdentifier, {})

      const result = await authService.signIn(defaultTestIdentifier)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(user.id)
        expect(result.data.mfaEnabled).toBe(false)
      }
    })

    it('should return userId and mfaEnabled=true when user has MFA enabled', async () => {
      const user = await storage.createUser(defaultTestIdentifier, {})
      await storage.enableMfa(user.id)

      const result = await authService.signIn(defaultTestIdentifier)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBe(user.id)
        expect(result.data.mfaEnabled).toBe(true)
      }
    })
  })

  describe('Session Creation', () => {
    it('should create session in storage', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const cookie = await adapter.getCookie('session')
      expect(cookie).toBeDefined()

      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)
      expect(session).toBeDefined()
    })

    it('should set session cookie', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      expect(adapter.hasCookie('session')).toBe(true)
    })

    it('should store session token that matches JWT', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as {
        sessionId: string
        token: string
      }

      const session = await storage.getSessionById(decoded.sessionId)
      expect(session?.token).toBe(decoded.token)
    })

    it('should set session expiration based on default TTL (14 days)', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      const beforeSignIn = new Date()
      await authService.signIn(defaultTestIdentifier)
      const afterSignIn = new Date()

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      const defaultTTL = 14 * 24 * 60 * 60
      const expectedMinExpiry = addSeconds(beforeSignIn, defaultTTL)
      const expectedMaxExpiry = addSeconds(afterSignIn, defaultTTL)

      expect(session!.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry.getTime(),
      )
      expect(session!.expiresAt.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiry.getTime(),
      )
    })

    it('should initialize session timestamps', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      const beforeSignIn = new Date()
      await authService.signIn(defaultTestIdentifier)
      const afterSignIn = new Date()

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      expect(session?.createdAt).toBeInstanceOf(Date)
      expect(session?.refreshedAt).toBeInstanceOf(Date)
      expect(session?.usedAt).toBeInstanceOf(Date)

      expect(session!.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeSignIn.getTime(),
      )
      expect(session!.createdAt.getTime()).toBeLessThanOrEqual(
        afterSignIn.getTime(),
      )
    })

    it('should create unique sessions for multiple signIn calls', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)
      const cookie1 = await adapter.getCookie('session')
      const decoded1 = jwt.verify(cookie1!, testSecret) as {
        sessionId: string
        token: string
      }

      await adapter.deleteCookie('session')
      await authService.signIn(defaultTestIdentifier)
      const cookie2 = await adapter.getCookie('session')
      const decoded2 = jwt.verify(cookie2!, testSecret) as {
        sessionId: string
        token: string
      }

      expect(decoded1.sessionId).not.toBe(decoded2.sessionId)
      expect(decoded1.token).not.toBe(decoded2.token)

      const session1 = await storage.getSessionById(decoded1.sessionId)
      const session2 = await storage.getSessionById(decoded2.sessionId)
      expect(session1).toBeDefined()
      expect(session2).toBeDefined()
    })

    it('should store ipAddress and userAgent from options', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      expect(session?.ipAddress).toBe('127.0.0.1')
      expect(session?.userAgent).toBe('test-agent')
    })
  })

  describe('Token Generation', () => {
    it('should generate unique tokens for each session', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      const tokens = new Set<string>()

      for (let i = 0; i < 10; i++) {
        await adapter.deleteCookie('session')
        await authService.signIn(defaultTestIdentifier)

        const cookie = await adapter.getCookie('session')
        const decoded = jwt.verify(cookie!, testSecret) as { token: string }
        tokens.add(decoded.token)
      }

      expect(tokens.size).toBe(10)
    })

    it('should generate tokens with correct format (64 hex characters)', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as {
        sessionId: string
        token: string
      }
      const session = await storage.getSessionById(decoded.sessionId)

      expect(session?.token).toMatch(/^[0-9a-f]{64}$/)
      expect(session?.token.length).toBe(64)
    })
  })

  describe('Custom Configuration', () => {
    it('should respect custom session TTL', async () => {
      const customTTL = 3600
      const customAuthService = new KenmonAuthService({
        secret: testSecret,
        storage,
        adapter,
        session: { ttl: customTTL },
      })

      await storage.createUser(defaultTestIdentifier, {})

      const beforeSignIn = new Date()
      await customAuthService.signIn(defaultTestIdentifier)
      const afterSignIn = new Date()

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      const expectedMinExpiry = addSeconds(beforeSignIn, customTTL)
      const expectedMaxExpiry = addSeconds(afterSignIn, customTTL)

      expect(session!.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry.getTime(),
      )
      expect(session!.expiresAt.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiry.getTime(),
      )
    })

    it('should use custom cookie name', async () => {
      const customAuthService = new KenmonAuthService({
        secret: testSecret,
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

  describe('Cookie Security', () => {
    it('should set httpOnly flag', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const options = adapter.getCookieOptions('session')
      expect(options?.httpOnly).toBe(true)
    })

    it('should set secure flag when configured', async () => {
      const secureAuthService = new KenmonAuthService({
        secret: testSecret,
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
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const options = adapter.getCookieOptions('session')
      expect(options?.sameSite).toBe('lax')
    })

    it('should allow custom sameSite configuration', async () => {
      const strictAuthService = new KenmonAuthService({
        secret: testSecret,
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
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const options = adapter.getCookieOptions('session')
      expect(options?.path).toBe('/')
    })

    it('should set maxAge to session TTL', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const options = adapter.getCookieOptions('session')
      expect(options?.maxAge).toBe(14 * 24 * 60 * 60)
    })
  })

  describe('JWT Security', () => {
    it('should use HS256 algorithm', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      await authService.signIn(defaultTestIdentifier)

      const cookieValue = await adapter.getCookie('session')
      const decoded = jwt.decode(cookieValue!, { complete: true })
      expect(decoded?.header.alg).toBe('HS256')
    })
  })
})
