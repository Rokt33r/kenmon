import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/auth'
import { googleOAuthAuthenticator } from '@/lib/auth/authenticators/google'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/signin?error=Missing parameters', request.url),
    )
  }

  // Verify callback and get user identifier
  const result = await googleOAuthAuthenticator.verifyCallback(code, state)

  if (!result.success) {
    console.error(result.error)
    return NextResponse.redirect(
      new URL(
        `/signin?error=${encodeURIComponent(result.error.message)}`,
        request.url,
      ),
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
      return NextResponse.redirect(
        new URL(
          `/signin?error=${encodeURIComponent(signInResult.error.message)}`,
          request.url,
        ),
      )
    }
  } else {
    const signUpResult = await auth.signUp(
      identifier,
      {},
      { ipAddress, userAgent },
    )
    if (!signUpResult.success) {
      return NextResponse.redirect(
        new URL(
          `/signup?error=${encodeURIComponent(signUpResult.error.message)}`,
          request.url,
        ),
      )
    }
  }

  return NextResponse.redirect(new URL('/', request.url))
}
