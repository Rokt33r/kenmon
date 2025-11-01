import { KenmonAuthService } from '../../../../../src/auth'
import { NextJSFrameworkAdapter } from '../../../../../src/nextjs/framework'
import { config } from '../config'
import { KenmonDrizzleStorage } from './storage'

export const auth = new KenmonAuthService({
  secret: config.sessionSecret,
  session: {},
  framework: new NextJSFrameworkAdapter(),
  storage: new KenmonDrizzleStorage(),
})
