import { redirect } from 'react-router'
import type { Route } from './+types/auth.callback.google'
import { auth } from '@/lib/auth/auth'
import { googleOAuthAuthenticator } from '@/lib/auth/authenticators/google'

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) {
    throw redirect('/signin?error=Missing parameters')
  }

  // Verify callback and get user identifier
  const result = await googleOAuthAuthenticator.verifyCallback(code, state)

  if (!result.success) {
    console.error(result.error)
    throw redirect(
      `/signin?error=${encodeURIComponent(result.error.message)}`,
    )
  }

  const { intent, identifier } = result.data

  // Extract IP address and user agent from request headers
  const ipAddress = request.headers.get('x-forwarded-for') || undefined
  const userAgent = request.headers.get('user-agent') || undefined

  // Sign in or sign up based on intent
  if (intent === 'sign-in') {
    const signInResult = await auth.signIn(identifier, { ipAddress, userAgent })
    if (!signInResult.success) {
      throw redirect(
        `/signin?error=${encodeURIComponent(signInResult.error.message)}`,
      )
    }
  } else {
    const signUpResult = await auth.signUp(
      identifier,
      {},
      { ipAddress, userAgent },
    )
    if (!signUpResult.success) {
      throw redirect(
        `/signup?error=${encodeURIComponent(signUpResult.error.message)}`,
      )
    }
  }

  throw redirect('/')
}
