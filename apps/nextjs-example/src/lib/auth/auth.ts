import { KenmonAuthService } from 'kenmon'
import { KenmonEmailOTPProvider } from '@kenmon/email-otp-provider'
import { KenmonNextJSAdapter } from '@kenmon/nextjs-adapter'
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
  new KenmonEmailOTPProvider({
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
