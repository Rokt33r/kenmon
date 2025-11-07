import { KenmonAuthService } from 'kenmon'
import { KenmonEmailOTPProvider } from '@kenmon/email-otp-provider'
import { KenmonNextJSAdapter } from '@kenmon/nextjs-adapter'
import { config } from '../config'
import {
  DrizzleSessionStorage,
  DrizzleEmailOTPStorage,
} from '@shared/storage/drizzleStorage'
import { MockMailer } from '@shared/mailers/mockMailer'
import { db } from '../db'

export const auth = new KenmonAuthService({
  secret: config.sessionSecret,
  session: {},
  adapter: new KenmonNextJSAdapter(),
  storage: new DrizzleSessionStorage(db),
})

auth.registerProvider(
  new KenmonEmailOTPProvider({
    mailer: new MockMailer(),
    otpStorage: new DrizzleEmailOTPStorage(db),
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
