import { Link, redirect, useSearchParams, Form } from 'react-router'
import type { Route } from './+types/signup'
import { auth } from '@/lib/auth/auth'
import { emailOTPAuthenticator } from '@/lib/auth/authenticators/emailOtp'
import { getRequestMetadata } from '@/lib/auth/utils'
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useState } from 'react'

export async function loader() {
  // Check if already authenticated
  const verifyResult = await auth.verifySession()
  if (verifyResult.success) {
    throw redirect('/')
  }

  return null
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData()
  const intent = formData.get('intent') as string

  if (intent === 'sendOTP') {
    const email = formData.get('email') as string

    if (!email) {
      throw redirect(`/signup?error=${encodeURIComponent('Email is required')}`)
    }

    const result = await emailOTPAuthenticator.sendOTP(email)

    if (!result.success) {
      console.error(result.error)
      throw redirect(
        `/signup?error=${encodeURIComponent(result.error.message)}`,
      )
    }

    throw redirect(
      `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${result.data.otpId}&signature=${encodeURIComponent(result.data.signature)}`,
    )
  }

  if (intent === 'verifyOTP') {
    const email = formData.get('email') as string
    const otpId = formData.get('otpId') as string
    const code = formData.get('code') as string

    if (!email || !otpId || !code) {
      throw redirect(
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
      throw redirect(
        `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent(otpResult.error.message)}`,
      )
    }

    const identifier = otpResult.data // { type: 'email-otp', value: email }

    // Extract IP address and user agent from request headers
    const { ipAddress, userAgent } = getRequestMetadata(request)

    // Sign up with the verified identifier
    const signUpResult = await auth.signUp(
      identifier,
      {}, // User data (empty for now)
      { ipAddress, userAgent },
    )

    if (!signUpResult.success) {
      throw redirect(
        `/signup?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent(signUpResult.error.message)}`,
      )
    }

    // Success! Redirect to home
    throw redirect('/')
  }

  throw redirect('/signup')
}

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const step = searchParams.get('step') || 'email'
  const email = searchParams.get('email') || ''
  const otpId = searchParams.get('otpId') || ''
  const signature = searchParams.get('signature') || ''
  const error = searchParams.get('error') || ''
  const [otpValue, setOtpValue] = useState('')

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
              <Form method='post' className='space-y-4'>
                <input type='hidden' name='intent' value='sendOTP' />

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
                  <Link to='/signin' className='text-primary hover:underline'>
                    Sign In
                  </Link>
                </p>
              </Form>
            ) : (
              /* Step 2: OTP Verification */
              <Form method='post' className='space-y-4'>
                <input type='hidden' name='intent' value='verifyOTP' />
                <input type='hidden' name='email' value={email} />
                <input type='hidden' name='otpId' value={otpId} />

                {signature && (
                  <div className='rounded-lg border bg-muted p-4 text-center'>
                    <p className='text-sm text-muted-foreground mb-1'>
                      Signature
                    </p>
                    <p className='font-semibold text-lg'>{signature}</p>
                    <p className='text-xs text-muted-foreground mt-1'>
                      Verify this matches the signature in your email
                    </p>
                  </div>
                )}

                <div className='space-y-2'>
                  <Label htmlFor='code'>Verification Code</Label>
                  <div className='flex justify-center'>
                    <InputOTP
                      maxLength={6}
                      value={otpValue}
                      onChange={setOtpValue}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <input type='hidden' name='code' value={otpValue} />
                </div>

                {error && (
                  <div className='text-sm text-destructive'>{error}</div>
                )}

                <div className='flex gap-2'>
                  <Button asChild variant='outline' className='flex-1'>
                    <Link to='/signup'>Back</Link>
                  </Button>
                  <Button type='submit' className='flex-1'>
                    Verify & Sign Up
                  </Button>
                </div>
              </Form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
