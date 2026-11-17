import { KenmonAuthService, type KenmonIdentifier } from 'kenmon'
import { KenmonReactRouterAdapter } from '@kenmon/react-router-adapter'
import { MemoryStorage } from '@shared/storage/memoryStorage'

/** The one user that the test-only `/sign-in` route signs in. */
export const fixtureIdentifier: KenmonIdentifier = {
  type: 'email',
  value: 'e2e@example.com',
}

export const auth = new KenmonAuthService({
  secret: 'e2e-fixture-secret',
  session: {
    // A `__Host-` cookie needs `Secure`, which Chromium accepts on http://localhost.
    cookieName: '__Host-session',
    secure: true,
  },
  storage: new MemoryStorage(),
  adapter: new KenmonReactRouterAdapter(),
})
