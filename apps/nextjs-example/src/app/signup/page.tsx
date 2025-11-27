import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '../../lib/auth/auth'
import { emailOTPAuthenticator } from '../../lib/auth/authenticators/emailOtp'
import { googleOAuthAuthenticator } from '../../lib/auth/authenticators/google'
import { getRequestMetadata } from '../../lib/auth/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SignupOTPForm } from '@/components/signup-otp-form'
import { GoogleLogo } from '@/components/google-logo'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{
    step?: string
    email?: string
    otpId?: string
    signature?: string
    error?: string
  }>
}) {
  const params = await searchParams
  const step = params.step || 'email'
  const email = params.email || ''
  const otpId = params.otpId || ''
  const signature = params.signature || ''
  const error = params.error || ''

  // Check if already authenticated
  const verifyResult = await auth.verifySession()
  if (verifyResult.success) {
    redirect('/')
  }

  // Server action to send OTP
  async function sendOTP(formData: FormData) {
    'use server'

    const email = formData.get('email') as string

    if (!email) {
      redirect(`/signup?error=${encodeURIComponent('Email is required')}`)
    }

    const result = await emailOTPAuthenticator.sendOTP(email)

    if (!result.success) {
      console.error(result.error)
      redirect(`/signup?error=${encodeURIComponent(result.error.message)}`)
    }

    redirect(
      `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${result.data.otpId}&signature=${encodeURIComponent(result.data.signature)}`,
    )
  }

  // Server action to verify OTP and create account
  async function verifyOTP(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const otpId = formData.get('otpId') as string
    const code = formData.get('code') as string

    if (!email || !otpId || !code) {
      redirect(
        `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent('All fields are required')}`,
      )
    }

    // Verify OTP first
    const otpResult = await emailOTPAuthenticator.verifyOTP({
      email,
      otpId,
      code,
    })

    if (!otpResult.success) {
      redirect(
        `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent(otpResult.error.message)}`,
      )
    }

    const identifier = otpResult.data // { type: 'email-otp', value: email }

    // Extract IP address and user agent from request headers
    const { ipAddress, userAgent } = await getRequestMetadata()

    // Sign up with the verified identifier
    const signUpResult = await auth.signUp(
      identifier,
      {}, // User data (empty for now)
      { ipAddress, userAgent },
    )

    if (!signUpResult.success) {
      redirect(
        `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent(signUpResult.error.message)}`,
      )
    }

    // Success! Redirect to home
    revalidatePath('/')
    redirect('/')
  }

  // Server action to sign up with Google
  async function signUpWithGoogle() {
    'use server'

    const authUrl = googleOAuthAuthenticator.getAuthUrl('sign-up')
    redirect(authUrl)
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <main className='w-full max-w-md px-6 py-12'>
        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              {step === 'email'
                ? 'Create a new account with your email'
                : `Enter the code sent to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              /* Step 1: Email Input */
              <>
                <form action={sendOTP} className='space-y-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email Address</Label>
                    <Input
                      type='email'
                      id='email'
                      name='email'
                      defaultValue={email}
                      placeholder='you@example.com'
                      required
                    />
                  </div>

                  {error && (
                    <div className='text-sm text-destructive'>{error}</div>
                  )}

                  <Button type='submit' className='w-full'>
                    Send Verification Code
                  </Button>
                </form>

                <div className='relative my-6'>
                  <div className='absolute inset-0 flex items-center'>
                    <span className='w-full border-t' />
                  </div>
                  <div className='relative flex justify-center text-xs uppercase'>
                    <span className='bg-background px-2 text-muted-foreground'>
                      Or continue with
                    </span>
                  </div>
                </div>

                <form action={signUpWithGoogle}>
                  <Button type='submit' variant='outline' className='w-full'>
                    <GoogleLogo className='mr-2 h-4 w-4' />
                    Sign up with Google
                  </Button>
                </form>

                <p className='text-sm text-center text-muted-foreground mt-4'>
                  Already have an account?{' '}
                  <Link href='/signin' className='text-primary hover:underline'>
                    Sign In
                  </Link>
                </p>
              </>
            ) : (
              /* Step 2: OTP Verification */
              <SignupOTPForm
                email={email}
                otpId={otpId}
                signature={signature}
                error={error}
                verifyOTP={verifyOTP}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
