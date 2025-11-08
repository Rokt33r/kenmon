import { KenmonAuthService } from 'kenmon'
import { KenmonEmailOTPProvider } from '@kenmon/email-otp-provider'
import { KenmonReactRouterAdapter } from '@kenmon/react-router-adapter'
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
  adapter: new KenmonReactRouterAdapter(),
  storage: new DrizzleSessionStorage(db),
})

auth.registerProvider(
  new KenmonEmailOTPProvider({
    mailer: new MockMailer(),
    otpStorage: new DrizzleEmailOTPStorage(db),
    otpTtl: 300,
    otpLength: 6,
    emailFrom: 'noreply@kenmon.dev',
  }),
)
