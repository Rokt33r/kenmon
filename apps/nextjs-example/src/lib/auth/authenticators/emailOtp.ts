import { KenmonEmailOTPAuthenticator } from '@kenmon/email-otp-provider'
import { DrizzleEmailOTPStorage } from '@shared/storage/drizzleStorage'
import { MockMailer } from '@shared/mailers/mockMailer'
import { db } from '../../db'

export const emailOTPAuthenticator = new KenmonEmailOTPAuthenticator({
  mailer: new MockMailer(),
  otpStorage: new DrizzleEmailOTPStorage(db),
  otpTtl: 300,
  otpLength: 6,
  emailFrom: 'noreply@kenmon.dev',
})
