import { NextResponse, type NextRequest } from 'next/server'
import { auth, fixtureIdentifier } from '../../lib/auth'

/** Test-only route: signs in the fixture user with no OTP. */
export async function GET(request: NextRequest) {
  const signInResult = await auth.signIn(fixtureIdentifier)
  if (!signInResult.success) {
    await auth.signUp(fixtureIdentifier, {})
  }
  return NextResponse.redirect(new URL('/', request.url))
}
