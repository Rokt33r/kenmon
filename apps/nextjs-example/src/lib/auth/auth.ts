import { KenmonAuthService } from 'kenmon'
import { KenmonNextJSAdapter } from '@kenmon/nextjs-adapter'
import { config } from '../config'
import { DrizzleSessionStorage } from '@shared/storage/drizzleStorage'
import { db } from '../db'

export const auth = new KenmonAuthService({
  secret: config.sessionSecret,
  session: {},
  adapter: new KenmonNextJSAdapter(),
  storage: new DrizzleSessionStorage(db),
})
