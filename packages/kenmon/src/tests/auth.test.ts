import { describe, it, expect, beforeEach } from 'vitest'
import { KenmonAuthService } from '../auth'
import { MockStorage, MockAdapter, MockProvider } from './helpers/mocks'
import {
  KenmonProviderNotFoundError,
  KenmonPrepareNotSupportedError,
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
  let provider: MockProvider

  beforeEach(() => {
    storage = new MockStorage()
    adapter = new MockAdapter()
    authService = new KenmonAuthService({
      secret: 'test-secret',
      storage,
      adapter,
    })
    provider = new MockProvider()
    authService.registerProvider(provider)
  })

  describe('Provider Registration', () => {
    it('should register and retrieve provider', () => {
      const customProvider = new MockProvider()
      authService.registerProvider(customProvider)
      expect(authService.providers.get('mock')).toBe(customProvider)
    })
  })

  describe('prepare()', () => {
    it('should return error when provider not found', async () => {
      const result = await authService.prepare({
        type: 'nonexistent',
        intent: 'sign-in',
        data: {},
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonProviderNotFoundError)
        expect(result.error.message).toContain('nonexistent')
      }
    })

    it('should return error when provider does not support prepare', async () => {
      const providerWithoutPrepare = new MockProvider({
        prepareSupported: false,
      })
      authService.registerProvider(providerWithoutPrepare)

      const result = await authService.prepare({
        type: 'mock',
        intent: 'sign-in',
        data: {},
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonPrepareNotSupportedError)
      }
    })

    it('should successfully call provider prepare', async () => {
      const preparePayload = {
        type: 'mock',
        intent: 'sign-in' as const,
        data: { email: 'test@example.com' },
      }

      const result = await authService.prepare(preparePayload)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(preparePayload)
      }
    })
  })

  describe('authenticate() - Sign In Flow', () => {
    it('should return error when provider not found', async () => {
      const result = await authService.authenticate({
        type: 'nonexistent',
        intent: 'sign-in',
        data: {},
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonProviderNotFoundError)
      }
    })

    it('should return error when user does not exist (sign-in)', async () => {
      const result = await authService.authenticate({
        type: 'mock',
        intent: 'sign-in',
        data: { identifier: defaultTestIdentifier },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonUserNotFoundError)
      }
    })

    it('should create session when user exists (sign-in)', async () => {
      // Create user first
      await storage.createUser(defaultTestIdentifier, {})

      // Attempt sign-in
      const result = await authService.authenticate({
        type: 'mock',
        intent: 'sign-in',
        data: { identifier: defaultTestIdentifier },
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
        expect(adapter.hasCookie('session')).toBe(true)
      }
    })

    it('should propagate provider authentication failure', async () => {
      provider.setShouldFailAuth(true)

      const result = await authService.authenticate({
        type: 'mock',
        intent: 'sign-in',
        data: { identifier: defaultTestIdentifier },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.message).toBe('Authentication failed')
      }
    })
  })

  describe('authenticate() - Sign Up Flow', () => {
    it('should create user and session (sign-up)', async () => {
      const result = await authService.authenticate({
        type: 'mock',
        intent: 'sign-up',
        data: { identifier: defaultTestIdentifier, name: 'Test User' },
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.userId).toBeDefined()
        expect(result.data.token).toBeDefined()
        expect(result.data.expiresAt).toBeInstanceOf(Date)

        // Verify user was created
        const user = await storage.getUserByIdentifier(defaultTestIdentifier)
        expect(user).toBeDefined()
        expect(user?.email).toBe(defaultTestIdentifier.value)
      }
    })

    it('should return error when user already exists (sign-up)', async () => {
      // Create user first
      await storage.createUser(defaultTestIdentifier, {})

      // Attempt sign-up with same identifier
      const result = await authService.authenticate({
        type: 'mock',
        intent: 'sign-up',
        data: { identifier: defaultTestIdentifier },
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBeInstanceOf(KenmonUserAlreadyExistsError)
        expect(result.error.message).toContain(defaultTestIdentifier.value)
      }
    })
  })
})
