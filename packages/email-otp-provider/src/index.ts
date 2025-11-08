import crypto from 'crypto'
import { isAfter, addSeconds } from 'date-fns'
import { z } from 'zod'
import {
  KenmonProvider,
  KenmonPreparePayload,
  KenmonAuthenticatePayload,
  KenmonIdentifier,
  KenmonReturnType,
  KenmonMailer,
  KenmonError,
  KenmonInvalidPayloadError,
} from 'kenmon'
import { generateSignature } from './signature'

// OTP-specific error with reason discriminator
export type KenmonEmailOTPErrorReason =
  | 'not-found'
  | 'expired'
  | 'invalid-code'
  | 'already-used'
  | 'email-mismatch'

export interface KenmonEmailOTP {
  id: string
  email: string
  code: string
  signature: string
  expiresAt: Date
  used: boolean
}

export class KenmonEmailOTPError extends KenmonError {
  readonly reason: KenmonEmailOTPErrorReason

  constructor(reason: KenmonEmailOTPErrorReason) {
    const messages: Record<KenmonEmailOTPErrorReason, string> = {
      'not-found': 'OTP not found',
      expired: 'OTP has expired',
      'invalid-code': 'Invalid OTP code',
      'already-used': 'OTP has already been used',
      'email-mismatch': 'Email does not match OTP',
    }

    super(messages[reason])
    this.name = 'KenmonOTPError'
    this.reason = reason
    Object.setPrototypeOf(this, KenmonEmailOTPError.prototype)
  }
}

// Zod schemas for payload validation
const emailOTPPrepareDataSchema = z.object({
  email: z.email('Invalid email address'),
})

const emailOTPAuthenticateDataSchema = z.object({
  email: z.email('Invalid email address'),
  otpId: z.string().min(1, 'OTP ID is required'),
  code: z.string().min(1, 'OTP code is required'),
})

// OTP Storage interface
export interface KenmonEmailOTPStorage {
  createOTP(
    email: string,
    code: string,
    expiresAt: Date,
    signature: string,
  ): Promise<KenmonEmailOTP>
  getOTPById(id: string): Promise<KenmonEmailOTP | null>
  markOTPAsUsed(id: string): Promise<void>
}

// EmailOTP Provider configuration
export interface KenmonEmailOTPProviderConfig {
  mailer: KenmonMailer
  otpStorage: KenmonEmailOTPStorage
  otp?: {
    ttl?: number // seconds, default 300 (5 minutes)
    length?: number // default 6
  }
  email?: {
    from: string
    subject?: string | ((code: string, signature: string, otpTtl: number) => string)
    textContent?: (code: string, signature: string, otpTtl: number) => string
    htmlContent?: (code: string, signature: string, otpTtl: number) => string
  }
}

export class KenmonEmailOTPProvider extends KenmonProvider {
  readonly type = 'email-otp'

  private mailer: KenmonMailer
  private otpStorage: KenmonEmailOTPStorage
  private otpTtl: number
  private otpLength: number
  private emailFrom: string
  private emailSubject: string | ((code: string, signature: string, otpTtl: number) => string)
  private emailTextContent?: (code: string, signature: string, otpTtl: number) => string
  private emailHtmlContent?: (code: string, signature: string, otpTtl: number) => string

  constructor(config: KenmonEmailOTPProviderConfig) {
    super()
    this.mailer = config.mailer
    this.otpStorage = config.otpStorage
    this.otpTtl = config.otp?.ttl ?? 300 // 5 minutes default
    this.otpLength = config.otp?.length ?? 6
    this.emailFrom = config.email?.from ?? 'noreply@example.com'
    this.emailSubject = config.email?.subject ?? 'Your verification code'
    this.emailTextContent = config.email?.textContent
    this.emailHtmlContent = config.email?.htmlContent
  }

  async prepare(
    payload: KenmonPreparePayload,
  ): Promise<KenmonReturnType<{ otpId: string; signature: string }>> {
    // Validate payload with Zod
    const result = emailOTPPrepareDataSchema.safeParse(payload.data)
    if (!result.success) {
      return {
        success: false,
        error: new KenmonInvalidPayloadError(result.error.issues[0].message),
      }
    }

    const { email } = result.data

    try {
      // Generate OTP code
      const code = this.generateOTPCode()

      // Generate signature
      const signature = generateSignature()

      // Calculate expiry
      const expiresAt = addSeconds(new Date(), this.otpTtl)

      // Store OTP
      const otp = await this.otpStorage.createOTP(email, code, expiresAt, signature)

      // Generate email content
      const subject =
        typeof this.emailSubject === 'function'
          ? this.emailSubject(code, signature, this.otpTtl)
          : this.emailSubject

      const textContent = this.emailTextContent
        ? this.emailTextContent(code, signature, this.otpTtl)
        : `Your verification code is: ${code}\n\nSignature: ${signature}\n\nThis code will expire in ${Math.floor(this.otpTtl / 60)} minutes.`

      const htmlContent = this.emailHtmlContent
        ? this.emailHtmlContent(code, signature, this.otpTtl)
        : `
          <div>
            <p>Your verification code is:</p>
            <h2 style="font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</h2>
            <p><strong>Signature:</strong> ${signature}</p>
            <p>This code will expire in ${Math.floor(this.otpTtl / 60)} minutes.</p>
          </div>
        `

      // Send email
      await this.mailer.sendEmail({
        from: this.emailFrom,
        to: email,
        subject,
        textContent,
        htmlContent,
      })

      return { success: true, data: { otpId: otp.id, signature: otp.signature } }
    } catch (error) {
      return { success: false, error: error as Error }
    }
  }

  async authenticate(
    payload: KenmonAuthenticatePayload,
  ): Promise<KenmonReturnType<KenmonIdentifier>> {
    // Validate payload with Zod
    const result = emailOTPAuthenticateDataSchema.safeParse(payload.data)
    if (!result.success) {
      return {
        success: false,
        error: new KenmonInvalidPayloadError(result.error.issues[0].message),
      }
    }

    const { email, otpId, code } = result.data

    try {
      // Fetch OTP from storage
      const otp = await this.otpStorage.getOTPById(otpId)
      if (!otp) {
        return { success: false, error: new KenmonEmailOTPError('not-found') }
      }

      // Verify OTP belongs to this email
      if (otp.email !== email) {
        return {
          success: false,
          error: new KenmonEmailOTPError('email-mismatch'),
        }
      }

      // Check if OTP has been used
      if (otp.used) {
        return {
          success: false,
          error: new KenmonEmailOTPError('already-used'),
        }
      }

      // Check if OTP has expired
      if (isAfter(new Date(), otp.expiresAt)) {
        return { success: false, error: new KenmonEmailOTPError('expired') }
      }

      // Verify OTP code
      if (otp.code !== code) {
        return {
          success: false,
          error: new KenmonEmailOTPError('invalid-code'),
        }
      }

      // Mark OTP as used
      await this.otpStorage.markOTPAsUsed(otpId)

      // Return identifier
      return {
        success: true,
        data: {
          type: 'email-otp',
          value: email,
        },
      }
    } catch (error) {
      return { success: false, error: error as Error }
    }
  }

  private generateOTPCode(): string {
    const digits = '0123456789'
    let code = ''

    for (let i = 0; i < this.otpLength; i++) {
      code += digits[crypto.randomInt(0, 10)]
    }

    return code
  }
}
