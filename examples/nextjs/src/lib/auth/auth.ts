import { KenmonAuthService } from '../../../../../src/auth'
import { EmailOTPAuthProvider } from '../../../../../src/providers/emailOTP'
import { KenmonNextJSAdapter } from '../../../../../src/nextjs/adapter'
import { config } from '../config'
import { KenmonDrizzleStorage } from './storage'
import { MockMailer } from './mockMailer'

const storage = new KenmonDrizzleStorage()

export const auth = new KenmonAuthService({
  secret: config.sessionSecret,
  session: {},
  adapter: new KenmonNextJSAdapter(),
  storage,
})

auth.registerProvider(
  new EmailOTPAuthProvider({
    mailer: new MockMailer(),
    otpStorage: storage,
    otp: {
      ttl: 300,
      length: 6,
    },
    email: {
      from: 'noreply@kenmon.dev',
      subject: 'Your verification code',
    },
  }),
)
