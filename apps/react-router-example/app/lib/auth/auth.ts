import { KenmonAuthService } from 'kenmon'
import { KenmonReactRouterAdapter } from '@kenmon/react-router-adapter'
import { config } from '../config'
import { DrizzleSessionStorage } from '@shared/storage/drizzleStorage'
import { db } from '../db'

export const auth = new KenmonAuthService({
  secret: config.sessionSecret,
  session: {},
  adapter: new KenmonReactRouterAdapter(),
  storage: new DrizzleSessionStorage(db),
})
