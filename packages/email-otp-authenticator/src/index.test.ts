import { describe, it, expect, beforeEach, vi } from 'vitest'
import { KenmonEmailOTPAuthenticator, KenmonEmailOTPStorage } from './index'
import { KenmonMailer } from 'kenmon'

// Mock dependencies
class MockMailer implements KenmonMailer {
  async sendEmail(params: any): Promise<void> {
    // Mock implementation
  }
}

class MockOTPStorage implements KenmonEmailOTPStorage {
  private otps = new Map<string, any>()

  async createOTP(email: string, code: string, expiresAt: Date, signature: string) {
    const id = 'otp-' + Math.random().toString(36).slice(2, 9)
    const otp = { id, email, code, expiresAt, signature, used: false }
    this.otps.set(id, otp)
    return otp
  }

  async getOTPById(id: string) {
    return this.otps.get(id) || null
  }

  async markOTPAsUsed(id: string) {
    const otp = this.otps.get(id)
    if (otp) {
      otp.used = true
    }
  }
}

describe('KenmonEmailOTPAuthenticator', () => {
  let authenticator: KenmonEmailOTPAuthenticator
  let mailer: MockMailer
  let storage: MockOTPStorage

  beforeEach(() => {
    mailer = new MockMailer()
    storage = new MockOTPStorage()
    authenticator = new KenmonEmailOTPAuthenticator({
      mailer,
      otpStorage: storage,
      emailFrom: 'noreply@example.com',
    })
  })

  it('should send OTP successfully', async () => {
    const spy = vi.spyOn(mailer, 'sendEmail')
    const result = await authenticator.sendOTP('test@example.com')

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.otpId).toBeDefined()
      expect(result.data.signature).toBeDefined()
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        to: 'test@example.com',
        from: 'noreply@example.com',
      }))
    }
  })

  it('should verify OTP successfully', async () => {
    // Send OTP first
    const sendResult = await authenticator.sendOTP('test@example.com')
    if (!sendResult.success) throw new Error('Failed to send OTP')

    const { otpId } = sendResult.data
    
    // Get the code from storage (since we can't easily intercept it from mailer spy without more setup)
    const otp = await storage.getOTPById(otpId)
    const code = otp.code

    // Verify
    const result = await authenticator.verifyOTP({
      email: 'test@example.com',
      otpId,
      code,
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.type).toBe('email')
      expect(result.data.value).toBe('test@example.com')
    }
  })

  it('should fail verification with wrong code', async () => {
    const sendResult = await authenticator.sendOTP('test@example.com')
    if (!sendResult.success) throw new Error('Failed to send OTP')

    const { otpId } = sendResult.data

    const result = await authenticator.verifyOTP({
      email: 'test@example.com',
      otpId,
      code: 'wrong-code',
    })

    expect(result.success).toBe(false)
  })
})
