import { describe, it, expect, beforeEach } from 'vitest'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import { KenmonIdentifier } from '../types'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

const testSecret = 'test-secret'

describe('signOut()', () => {
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

  describe('Single Session Invalidation', () => {
    it('should invalidate current session', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      const verifyResult = await authService.verifySession()
      if (!verifyResult.success) throw new Error('Setup failed')
      const sessionId = verifyResult.data.id

      await authService.signOut()

      const storedSession = await storage.getSessionById(sessionId)
      expect(storedSession?.invalidated).toBe(true)
      expect(storedSession?.invalidatedAt).toBeInstanceOf(Date)
    })

    it('should delete session cookie', async () => {
      await authService.signUp(defaultTestIdentifier, {})

      expect(adapter.hasCookie('session')).toBe(true)

      await authService.signOut()

      expect(adapter.hasCookie('session')).toBe(false)
    })

    it('should delete cookie even without valid session', async () => {
      await adapter.setCookie('session', 'invalid-token')
      expect(adapter.hasCookie('session')).toBe(true)

      await authService.signOut()

      expect(adapter.hasCookie('session')).toBe(false)
    })
  })

  describe('All Sessions Invalidation', () => {
    it('should invalidate all user sessions when allSessions=true', async () => {
      // Create first session
      await authService.signUp(defaultTestIdentifier, {})
      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')
      const session1Id = verifyResult1.data.id

      // Create second session for same user
      await adapter.deleteCookie('session')
      await authService.signIn(defaultTestIdentifier)
      const verifyResult2 = await authService.verifySession()
      if (!verifyResult2.success) throw new Error('Setup failed')
      const session2Id = verifyResult2.data.id

      // Sign out with allSessions option
      await authService.signOut({ allSessions: true })

      // Both sessions should be invalidated
      const storedSession1 = await storage.getSessionById(session1Id)
      const storedSession2 = await storage.getSessionById(session2Id)
      expect(storedSession1?.invalidated).toBe(true)
      expect(storedSession2?.invalidated).toBe(true)
    })

    it('should not invalidate other users sessions', async () => {
      // Create session for first user
      await authService.signUp(defaultTestIdentifier, {})
      const verifyResult1 = await authService.verifySession()
      if (!verifyResult1.success) throw new Error('Setup failed')
      const session1Id = verifyResult1.data.id

      // Create session for second user
      const otherIdentifier: KenmonIdentifier = {
        type: 'email',
        value: 'other@example.com',
      }
      await adapter.deleteCookie('session')
      await authService.signUp(otherIdentifier, {})
      const verifyResult2 = await authService.verifySession()
      if (!verifyResult2.success) throw new Error('Setup failed')
      const session2Id = verifyResult2.data.id

      // Sign out first user with allSessions
      await adapter.deleteCookie('session')
      await authService.signIn(defaultTestIdentifier)
      await authService.signOut({ allSessions: true })

      // Only first user's session should be invalidated
      const storedSession1 = await storage.getSessionById(session1Id)
      const storedSession2 = await storage.getSessionById(session2Id)
      expect(storedSession1?.invalidated).toBe(true)
      expect(storedSession2?.invalidated).toBe(false)
    })
  })

  describe('Custom Configuration', () => {
    it('should delete custom named cookie', async () => {
      const customAuthService = new KenmonAuthService({
        secret: testSecret,
        storage,
        adapter,
        session: { cookieName: 'custom_session' },
      })

      await customAuthService.signUp(defaultTestIdentifier, {})

      expect(adapter.hasCookie('custom_session')).toBe(true)

      await customAuthService.signOut()

      expect(adapter.hasCookie('custom_session')).toBe(false)
    })
  })
})
