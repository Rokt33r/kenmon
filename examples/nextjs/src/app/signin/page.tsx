import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '../../lib/auth/auth'
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

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{
    step?: string
    email?: string
    otpId?: string
    error?: string
  }>
}) {
  const params = await searchParams
  const step = params.step || 'email'
  const email = params.email || ''
  const otpId = params.otpId || ''
  const error = params.error || ''

  // Check if already authenticated
  const session = await auth.verifySession()
  if (session) {
    redirect('/')
  }

  // Server action to send OTP
  async function sendOTP(formData: FormData) {
    'use server'

    const email = formData.get('email') as string

    if (!email) {
      redirect(`/signin?error=${encodeURIComponent('Email is required')}`)
    }

    const result = await auth.prepare({
      type: 'email-otp',
      intent: 'sign-in',
      data: { email },
    })

    if (!result.success) {
      console.error(result.error)
      redirect(`/signin?error=${encodeURIComponent(result.error.message)}`)
    }

    redirect(
      `/signin?step=otp&email=${encodeURIComponent(email)}&otpId=${result.data.otpId}`,
    )
  }

  // Server action to verify OTP and sign in
  async function verifyOTP(formData: FormData) {
    'use server'

    const email = formData.get('email') as string
    const otpId = formData.get('otpId') as string
    const code = formData.get('code') as string

    if (!email || !otpId || !code) {
      redirect(
        `/signin?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent('All fields are required')}`,
      )
    }

    const result = await auth.authenticate({
      type: 'email-otp',
      intent: 'sign-in',
      data: { email, otpId, code },
    })

    if (!result.success) {
      redirect(
        `/signin?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent(result.error.message)}`,
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
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              {step === 'email'
                ? 'Sign in to your existing account'
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
                  Don't have an account?{' '}
                  <Link href='/signup' className='text-primary hover:underline'>
                    Sign Up
                  </Link>
                </p>
              </form>
            ) : (
              /* Step 2: OTP Verification */
              <form action={verifyOTP} className='space-y-4'>
                <input type='hidden' name='email' value={email} />
                <input type='hidden' name='otpId' value={otpId} />

                <div className='space-y-2'>
                  <Label htmlFor='code'>Verification Code</Label>
                  <Input
                    type='text'
                    id='code'
                    name='code'
                    placeholder='000000'
                    maxLength={6}
                    pattern='[0-9]{6}'
                    className='text-center text-2xl tracking-widest'
                    required
                    autoComplete='one-time-code'
                  />
                </div>

                {error && (
                  <div className='text-sm text-destructive'>{error}</div>
                )}

                <div className='flex gap-2'>
                  <Button asChild variant='outline' className='flex-1'>
                    <Link href='/signin'>Back</Link>
                  </Button>
                  <Button type='submit' className='flex-1'>
                    Verify & Sign In
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
