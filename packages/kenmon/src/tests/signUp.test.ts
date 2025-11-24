import { describe, it, expect, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { addSeconds } from 'date-fns'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import { KenmonUserAlreadyExistsError } from '../errors'
import { KenmonIdentifier } from '../types'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

const testSecret = 'test-secret'

describe('signUp()', () => {
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
    it('should return error when user already exists', async () => {
      await storage.createUser(defaultTestIdentifier, {})

      const result = await authService.signUp(defaultTestIdentifier, {})

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonUserAlreadyExistsError)
        expect(result.error.message).toContain(defaultTestIdentifier.value)
      }
    })
  })

  describe('User Creation', () => {
    it('should create user in storage', async () => {
      await authService.signUp(defaultTestIdentifier, { name: 'Test User' })

      const user = await storage.getUserByIdentifier(defaultTestIdentifier)
      expect(user).toBeDefined()
      expect(user?.email).toBe(defaultTestIdentifier.value)
    })

    it('should apply user data from second parameter', async () => {
      await authService.signUp(defaultTestIdentifier, { name: 'Test User' })

      const user = await storage.getUserByIdentifier(defaultTestIdentifier)
      expect((user as any).name).toBe('Test User')
    })

    it('should apply initialUserData from options', async () => {
      await authService.signUp(
        defaultTestIdentifier,
        { name: 'Test User' },
        {
          initialUserData: { role: 'admin' },
        },
      )

      const user = await storage.getUserByIdentifier(defaultTestIdentifier)
      expect((user as any).name).toBe('Test User')
      expect((user as any).role).toBe('admin')
    })

    it('should create user with mfaEnabled=false by default', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const user = await storage.getUserByIdentifier(defaultTestIdentifier)
      expect(user?.mfaEnabled).toBe(false)
    })
  })

  describe('Return Values', () => {
    it('should return userId on successful signup', async () => {
      const result = await authService.signUp(defaultTestIdentifier, {})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBeDefined()

        const user = await storage.getUserByIdentifier(defaultTestIdentifier)
        expect(result.data.userId).toBe(user?.id)
      }
    })
  })

  describe('Session Creation', () => {
    it('should create session in storage', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const cookie = await adapter.getCookie('session')
      expect(cookie).toBeDefined()

      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)
      expect(session).toBeDefined()
    })

    it('should set session cookie', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      expect(adapter.hasCookie('session')).toBe(true)
    })

    it('should set mfaEnabled=false in session', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      expect(session?.mfaEnabled).toBe(false)
    })

    it('should set session expiration based on default TTL (14 days)', async () => {
      const beforeSignUp = new Date()
      await authService.signUp(defaultTestIdentifier, {})
      const afterSignUp = new Date()

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      const defaultTTL = 14 * 24 * 60 * 60
      const expectedMinExpiry = addSeconds(beforeSignUp, defaultTTL)
      const expectedMaxExpiry = addSeconds(afterSignUp, defaultTTL)

      expect(session!.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry.getTime(),
      )
      expect(session!.expiresAt.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiry.getTime(),
      )
    })

    it('should store ipAddress and userAgent from options', async () => {
      await authService.signUp(defaultTestIdentifier, {}, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      expect(session?.ipAddress).toBe('127.0.0.1')
      expect(session?.userAgent).toBe('test-agent')
    })

    it('should store session token that matches JWT', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as {
        sessionId: string
        token: string
      }

      const session = await storage.getSessionById(decoded.sessionId)
      expect(session?.token).toBe(decoded.token)
    })

    it('should initialize session timestamps', async () => {
      const beforeSignUp = new Date()
      await authService.signUp(defaultTestIdentifier, {})
      const afterSignUp = new Date()

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      expect(session?.createdAt).toBeInstanceOf(Date)
      expect(session?.refreshedAt).toBeInstanceOf(Date)
      expect(session?.usedAt).toBeInstanceOf(Date)

      expect(session!.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeSignUp.getTime(),
      )
      expect(session!.createdAt.getTime()).toBeLessThanOrEqual(
        afterSignUp.getTime(),
      )
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

      const beforeSignUp = new Date()
      await customAuthService.signUp(defaultTestIdentifier, {})
      const afterSignUp = new Date()

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.verify(cookie!, testSecret) as { sessionId: string }
      const session = await storage.getSessionById(decoded.sessionId)

      const expectedMinExpiry = addSeconds(beforeSignUp, customTTL)
      const expectedMaxExpiry = addSeconds(afterSignUp, customTTL)

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

      await customAuthService.signUp(defaultTestIdentifier, {})

      expect(adapter.hasCookie('custom_session')).toBe(true)
      expect(adapter.hasCookie('session')).toBe(false)
    })
  })

  describe('Cookie Security', () => {
    it('should set httpOnly flag', async () => {
      await authService.signUp(defaultTestIdentifier, {})

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

      await secureAuthService.signUp(defaultTestIdentifier, {})

      const options = adapter.getCookieOptions('session')
      expect(options?.secure).toBe(true)
    })

    it('should set sameSite to lax by default', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const options = adapter.getCookieOptions('session')
      expect(options?.sameSite).toBe('lax')
    })

    it('should set cookie path to root', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const options = adapter.getCookieOptions('session')
      expect(options?.path).toBe('/')
    })

    it('should set maxAge to session TTL', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const options = adapter.getCookieOptions('session')
      expect(options?.maxAge).toBe(14 * 24 * 60 * 60)
    })
  })
})
