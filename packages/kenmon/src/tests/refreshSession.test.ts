import { describe, it, expect, beforeEach } from 'vitest'
import { addSeconds } from 'date-fns'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import {
  KenmonSessionNotFoundError,
  KenmonInvalidSessionError,
} from '../errors'
import { KenmonIdentifier } from '../types'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

const testSecret = 'test-secret'

describe('refreshSession()', () => {
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
    it('should return error when no session exists', async () => {
      const result = await authService.refreshSession()

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonSessionNotFoundError)
      }
    })

    it('should not refresh invalid session', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult = await authService.verifySession()
      if (!verifyResult.success) throw new Error('Setup failed')

      await storage.invalidateSession(verifyResult.data.id)

      const result = await authService.refreshSession()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonInvalidSessionError)
      }
    })
  })

  describe('Success Cases', () => {
    it('should extend session expiration', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')
      const originalExpiresAt = verifyResult1.data.expiresAt

      await new Promise((resolve) => setTimeout(resolve, 10))

      const result = await authService.refreshSession()
      expect(result.success).toBe(true)

      const storedSession = await storage.getSessionById(verifyResult1.data.id)
      expect(storedSession?.expiresAt.getTime()).toBeGreaterThan(
        originalExpiresAt.getTime(),
      )
    })

    it('should update refreshedAt timestamp', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')
      const originalRefreshedAt = verifyResult1.data.refreshedAt

      await new Promise((resolve) => setTimeout(resolve, 10))

      await authService.refreshSession()

      const storedSession = await storage.getSessionById(verifyResult1.data.id)
      expect(storedSession?.refreshedAt.getTime()).toBeGreaterThan(
        originalRefreshedAt.getTime(),
      )
    })

    it('should extend expiration by configured TTL', async () => {
      const customTTL = 3600
      const customAuthService = new KenmonAuthService({
        secret: testSecret,
        storage,
        adapter,
        session: { ttl: customTTL },
      })

      await customAuthService.signUp(defaultTestIdentifier, {})

      const beforeRefresh = new Date()
      await customAuthService.refreshSession()
      const afterRefresh = new Date()

      const verifyResult = await customAuthService.verifySession()
      if (!verifyResult.success) throw new Error('Verification failed')

      const expectedMinExpiry = addSeconds(beforeRefresh, customTTL)
      const expectedMaxExpiry = addSeconds(afterRefresh, customTTL)

      expect(verifyResult.data.expiresAt.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiry.getTime(),
      )
      expect(verifyResult.data.expiresAt.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiry.getTime(),
      )
    })

    it('should set session cookie with same session', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')
      const originalSessionId = verifyResult1.data.id

      await authService.refreshSession()

      const verifyResult2 = await authService.verifySession()
      if (!verifyResult2.success) throw new Error('Verification failed')

      expect(verifyResult2.data.id).toBe(originalSessionId)
    })

    it('should handle multiple refresh calls', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')
      const sessionId = verifyResult1.data.id

      const storedSession1 = await storage.getSessionById(sessionId)

      await new Promise((resolve) => setTimeout(resolve, 10))
      await authService.refreshSession()
      const storedSession2 = await storage.getSessionById(sessionId)

      await new Promise((resolve) => setTimeout(resolve, 10))
      await authService.refreshSession()
      const storedSession3 = await storage.getSessionById(sessionId)

      expect(storedSession2?.expiresAt.getTime()).toBeGreaterThan(
        storedSession1!.expiresAt.getTime(),
      )
      expect(storedSession3?.expiresAt.getTime()).toBeGreaterThan(
        storedSession2!.expiresAt.getTime(),
      )
    })
  })
})
