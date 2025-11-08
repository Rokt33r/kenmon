import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '../../lib/auth/auth'
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

    const result = await auth.prepare({
      type: 'email-otp',
      intent: 'sign-up',
      data: { email },
    })

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

    // Extract IP address and user agent from request headers
    const { ipAddress, userAgent } = await getRequestMetadata()

    const result = await auth.authenticate({
      type: 'email-otp',
      intent: 'sign-up',
      data: { email, otpId, code },
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      redirect(
        `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent(result.error.message)}`,
      )
    }

    // Success! Redirect to home
    revalidatePath('/')
    redirect('/')
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

                <p className='text-sm text-center text-muted-foreground'>
                  Already have an account?{' '}
                  <Link href='/signin' className='text-primary hover:underline'>
                    Sign In
                  </Link>
                </p>
              </form>
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
