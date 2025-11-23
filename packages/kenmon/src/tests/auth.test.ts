import { describe, it, expect, beforeEach } from 'vitest'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter } from './helpers/mocks'
import {
  KenmonUserNotFoundError,
  KenmonUserAlreadyExistsError,
} from '../errors'
import { KenmonIdentifier } from '../types'

const defaultTestIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'test@example.com',
}

describe('Authentication Flows', () => {
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

  describe('signIn()', () => {
    it('should return error when user does not exist', async () => {
      const result = await authService.signIn(defaultTestIdentifier)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonUserNotFoundError)
      }
    })

    it('should create session when user exists', async () => {
      // Create user first
      await storage.createUser(defaultTestIdentifier, {})

      // Attempt sign-in
      const result = await authService.signIn(defaultTestIdentifier, {
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBeDefined()
        expect(result.data.token).toBeDefined()
        expect(result.data.expiresAt).toBeInstanceOf(Date)
        expect(result.data.ipAddress).toBe('127.0.0.1')
        expect(result.data.userAgent).toBe('test-agent')
        expect(result.data.invalidated).toBe(false)
        // MFA is not required by default in this mock setup, so verified should be false
        expect(result.data.mfaVerified).toBe(false)
        expect(adapter.hasCookie('session')).toBe(true)
      }
    })
  })

  describe('signUp()', () => {
    it('should create user and session', async () => {
      const result = await authService.signUp(
        defaultTestIdentifier,
        { name: 'Test User' },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'test-agent',
        },
      )

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBeDefined()
        expect(result.data.token).toBeDefined()
        expect(result.data.expiresAt).toBeInstanceOf(Date)
        expect(result.data.mfaVerified).toBe(false) // Default for new signup is false based on plan/code

        // Verify user was created
        const user = await storage.getUserByIdentifier(defaultTestIdentifier)
        expect(user).toBeDefined()
        expect(user?.email).toBe(defaultTestIdentifier.value)
      }
    })

    it('should return error when user already exists', async () => {
      // Create user first
      await storage.createUser(defaultTestIdentifier, {})

      // Attempt sign-up with same identifier
      const result = await authService.signUp(defaultTestIdentifier, {})

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonUserAlreadyExistsError)
        expect(result.error.message).toContain(defaultTestIdentifier.value)
      }
    })
  })
})
