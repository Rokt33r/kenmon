import { describe, it, expect, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import {
  KenmonSessionNotFoundError,
  KenmonInvalidSessionError,
  KenmonSessionExpiredError,
} from '../errors'
import { KenmonIdentifier } from '../types'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

const testSecret = 'test-secret'

describe('verifySession()', () => {
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

    it('should return error for invalidated session', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')

      await storage.invalidateSession(verifyResult1.data.id)

      const result = await authService.verifySession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })

    it('should return error for expired session', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')

      await storage.updateSession(verifyResult1.data.id, {
        expiresAt: new Date(Date.now() - 1000),
      })

      const result = await authService.verifySession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonSessionExpiredError)
      }
    })

    it('should reject JWT signed with wrong secret', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const cookie = await adapter.getCookie('session')
      const decoded = jwt.decode(cookie!) as any

      const tamperedToken = jwt.sign(decoded, 'wrong-secret', {
        algorithm: 'HS256',
      })

      await adapter.setCookie('session', tamperedToken)

      const result = await authService.verifySession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })

    it('should reject JWT with mismatched session token', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')

      const tamperedPayload = {
        sessionId: verifyResult1.data.id,
        token: '0'.repeat(64),
      }

      const tamperedToken = jwt.sign(tamperedPayload, testSecret, {
        algorithm: 'HS256',
      })

      await adapter.setCookie('session', tamperedToken)

      const result = await authService.verifySession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })
  })

  describe('Success Cases', () => {
    it('should verify valid session', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const result = await authService.verifySession()

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBeDefined()
        expect(result.data.userId).toBeDefined()
        expect(result.data.expiresAt).toBeInstanceOf(Date)
        expect(result.data.refreshedAt).toBeInstanceOf(Date)
        expect(result.data.createdAt).toBeInstanceOf(Date)
        expect(result.data.mfaVerified).toBe(false)
        expect(result.data.mfaEnabled).toBe(false)
      }
    })

    it('should return safe session info only', async () => {
      const user = await storage.createUser(defaultTestIdentifier, {})
      await authService.signIn(defaultTestIdentifier)

      const result = await authService.verifySession()

      expect(result.success).toBe(true)
      if (result.success) {
        // Safe fields
        expect(result.data.userId).toBe(user.id)
        expect(result.data.expiresAt).toBeInstanceOf(Date)
        expect(result.data.createdAt).toBeInstanceOf(Date)
        expect(result.data.refreshedAt).toBeInstanceOf(Date)
        expect(result.data.mfaVerified).toBeDefined()
        expect(result.data.mfaEnabled).toBeDefined()

        // Sensitive fields should not be exposed
        expect((result.data as any).token).toBeUndefined()
        expect((result.data as any).usedAt).toBeUndefined()
        expect((result.data as any).invalidated).toBeUndefined()
        expect((result.data as any).ipAddress).toBeUndefined()
        expect((result.data as any).userAgent).toBeUndefined()
      }
    })
  })

  describe('Session Updates', () => {
    it('should update usedAt timestamp', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const result1 = await authService.verifySession()
      if (!result1.success) throw new Error('Setup failed')

      const storedSession1 = await storage.getSessionById(result1.data.id)
      const originalUsedAt = storedSession1!.usedAt

      await new Promise((resolve) => setTimeout(resolve, 10))

      await authService.verifySession()

      const storedSession2 = await storage.getSessionById(result1.data.id)
      expect(storedSession2?.usedAt.getTime()).toBeGreaterThan(
        originalUsedAt.getTime(),
      )
    })

    it('should update usedAt on multiple verify calls', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const result1 = await authService.verifySession()
      if (!result1.success) throw new Error('Setup failed')
      const sessionId = result1.data.id

      const storedSession1 = await storage.getSessionById(sessionId)

      await new Promise((resolve) => setTimeout(resolve, 10))
      await authService.verifySession()
      const storedSession2 = await storage.getSessionById(sessionId)

      await new Promise((resolve) => setTimeout(resolve, 10))
      await authService.verifySession()
      const storedSession3 = await storage.getSessionById(sessionId)

      expect(storedSession2?.usedAt.getTime()).toBeGreaterThan(
        storedSession1!.usedAt.getTime(),
      )
      expect(storedSession3?.usedAt.getTime()).toBeGreaterThan(
        storedSession2!.usedAt.getTime(),
      )
    })
  })

  describe('Session Expiration', () => {
    it('should enforce expiration at exact boundary', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')

      const pastTime = new Date(Date.now() - 1)
      await storage.updateSession(verifyResult1.data.id, {
        expiresAt: pastTime,
      })

      const result = await authService.verifySession()
      expect(result.success).toBe(false)
    })
  })

  describe('Session Invalidation', () => {
    it('should prevent session reuse after invalidation', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      let result = await authService.verifySession()
      expect(result.success).toBe(true)

      if (result.success) {
        await storage.invalidateSession(result.data.id)
      }

      result = await authService.verifySession()
      expect(result.success).toBe(false)

      result = await authService.verifySession()
      expect(result.success).toBe(false)
    })
  })
})
