import { Link, redirect, useSearchParams, Form } from 'react-router'
import type { Route } from './+types/signin'
import { auth } from '~/lib/auth/auth'
import { getRequestMetadata } from '~/lib/auth/utils'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

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
      throw redirect(`/signin?error=${encodeURIComponent('Email is required')}`)
    }

    const result = await auth.prepare({
      type: 'email-otp',
      intent: 'sign-in',
      data: { email },
    })

    if (!result.success) {
      console.error(result.error)
      throw redirect(`/signin?error=${encodeURIComponent(result.error.message)}`)
    }

    throw redirect(
      `/signin?step=otp&email=${encodeURIComponent(email)}&otpId=${result.data.otpId}`,
    )
  }

  if (intent === 'verifyOTP') {
    const email = formData.get('email') as string
    const otpId = formData.get('otpId') as string
    const code = formData.get('code') as string

    if (!email || !otpId || !code) {
      throw redirect(
        `/signin?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent('All fields are required')}`,
      )
    }

    // Extract IP address and user agent from request headers
    const { ipAddress, userAgent } = getRequestMetadata(request)

    const result = await auth.authenticate({
      type: 'email-otp',
      intent: 'sign-in',
      data: { email, otpId, code },
      ipAddress,
      userAgent,
    })

    if (!result.success) {
      throw redirect(
        `/signin?step=otp&email=${encodeURIComponent(email)}&otpId=${otpId}&error=${encodeURIComponent(result.error.message)}`,
      )
    }

    // Success! Redirect to home
    throw redirect('/')
  }

  throw redirect('/signin')
}

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const step = searchParams.get('step') || 'email'
  const email = searchParams.get('email') || ''
  const otpId = searchParams.get('otpId') || ''
  const error = searchParams.get('error') || ''

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
                  Don't have an account?{' '}
                  <Link to='/signup' className='text-primary hover:underline'>
                    Sign Up
                  </Link>
                </p>
              </Form>
            ) : (
              /* Step 2: OTP Verification */
              <Form method='post' className='space-y-4'>
                <input type='hidden' name='intent' value='verifyOTP' />
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
                    <Link to='/signin'>Back</Link>
                  </Button>
                  <Button type='submit' className='flex-1'>
                    Verify & Sign In
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
