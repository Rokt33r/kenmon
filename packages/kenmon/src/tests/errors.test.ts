import { describe, it, expect } from 'vitest'
import {
  KenmonError,
  KenmonInvalidPayloadError,
  KenmonUserNotFoundError,
  KenmonUserAlreadyExistsError,
  KenmonSessionNotFoundError,
  KenmonInvalidSessionError,
  KenmonSessionExpiredError,
} from '../errors'

describe('Error Classes', () => {
  describe('KenmonError', () => {
    it('should create error with correct message and name', () => {
      const error = new KenmonError('Test error')
      expect(error.message).toBe('Test error')
      expect(error.name).toBe('KenmonError')
      expect(error instanceof Error).toBe(true)
      expect(error instanceof KenmonError).toBe(true)
    })
  })

  describe('KenmonInvalidPayloadError', () => {
    it('should create error with custom message', () => {
      const error = new KenmonInvalidPayloadError('Invalid email format')
      expect(error.message).toBe('Invalid email format')
      expect(error.name).toBe('KenmonInvalidPayloadError')
      expect(error instanceof KenmonError).toBe(true)
      expect(error instanceof KenmonInvalidPayloadError).toBe(true)
    })
  })

  describe('KenmonUserNotFoundError', () => {
    it('should create error with default message', () => {
      const error = new KenmonUserNotFoundError()
      expect(error.message).toBe('User not found')
      expect(error.name).toBe('KenmonUserNotFoundError')
      expect(error instanceof KenmonError).toBe(true)
      expect(error instanceof KenmonUserNotFoundError).toBe(true)
    })
  })

  describe('KenmonUserAlreadyExistsError', () => {
    it('should create error with identifier in message', () => {
      const error = new KenmonUserAlreadyExistsError('email:test@example.com')
      expect(error.message).toBe(
        'User with email:test@example.com already exists',
      )
      expect(error.name).toBe('KenmonUserAlreadyExistsError')
      expect(error instanceof KenmonError).toBe(true)
      expect(error instanceof KenmonUserAlreadyExistsError).toBe(true)
    })
  })

  describe('KenmonSessionNotFoundError', () => {
    it('should create error with default message', () => {
      const error = new KenmonSessionNotFoundError()
      expect(error.message).toBe('No session cookie found')
      expect(error.name).toBe('KenmonSessionNotFoundError')
      expect(error instanceof KenmonError).toBe(true)
      expect(error instanceof KenmonSessionNotFoundError).toBe(true)
    })
  })

  describe('KenmonInvalidSessionError', () => {
    it('should create error with default message', () => {
      const error = new KenmonInvalidSessionError()
      expect(error.message).toBe('Invalid session')
      expect(error.name).toBe('KenmonInvalidSessionError')
      expect(error instanceof KenmonError).toBe(true)
      expect(error instanceof KenmonInvalidSessionError).toBe(true)
    })
  })

  describe('KenmonSessionExpiredError', () => {
    it('should create error with default message', () => {
      const error = new KenmonSessionExpiredError()
      expect(error.message).toBe('Session expired')
      expect(error.name).toBe('KenmonSessionExpiredError')
      expect(error instanceof KenmonError).toBe(true)
      expect(error instanceof KenmonSessionExpiredError).toBe(true)
    })
  })
})
