import { redirect } from 'react-router'
import { auth, fixtureIdentifier } from '../auth'

/** Test-only route: signs in the fixture user with no OTP. */
export async function loader() {
  const signInResult = await auth.signIn(fixtureIdentifier)
  if (!signInResult.success) {
    await auth.signUp(fixtureIdentifier, {})
  }
  return redirect('/')
}
