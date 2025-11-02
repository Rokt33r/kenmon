import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '../../lib/auth/auth'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; email?: string; otpId?: string; error?: string }>
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
      redirect(
        `/signin?error=${encodeURIComponent(result.error.message)}`,
      )
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
    <div className='flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
      <main className='w-full max-w-md px-6 py-12'>
        <div className='p-8 border border-zinc-200 rounded-lg dark:border-zinc-800 bg-white dark:bg-black'>
          <h1 className='text-2xl font-bold mb-6'>Sign In</h1>

          {step === 'email' ? (
            /* Step 1: Email Input */
            <form action={sendOTP} className='space-y-4'>
              <div>
                <label
                  htmlFor='email'
                  className='block text-sm font-medium mb-2'
                >
                  Email Address
                </label>
                <input
                  type='email'
                  id='email'
                  name='email'
                  defaultValue={email}
                  placeholder='you@example.com'
                  className='w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900'
                  required
                />
              </div>

              {error && (
                <div className='text-sm text-red-600 dark:text-red-400'>
                  {error}
                </div>
              )}

              <button
                type='submit'
                className='w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
              >
                Send Verification Code
              </button>

              <p className='text-sm text-center text-zinc-600 dark:text-zinc-400'>
                Don't have an account?{' '}
                <Link href='/signup' className='text-blue-600 hover:underline'>
                  Sign Up
                </Link>
              </p>
            </form>
          ) : (
            /* Step 2: OTP Verification */
            <div>
              <div className='mb-4 text-sm text-zinc-600 dark:text-zinc-400'>
                Enter the verification code sent to{' '}
                <strong className='text-zinc-900 dark:text-zinc-100'>
                  {email}
                </strong>
              </div>

              <form action={verifyOTP} className='space-y-4'>
                <input type='hidden' name='email' value={email} />
                <input type='hidden' name='otpId' value={otpId} />

                <div>
                  <label
                    htmlFor='code'
                    className='block text-sm font-medium mb-2'
                  >
                    Verification Code
                  </label>
                  <input
                    type='text'
                    id='code'
                    name='code'
                    placeholder='000000'
                    maxLength={6}
                    pattern='[0-9]{6}'
                    className='w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-zinc-900 text-center text-2xl tracking-widest'
                    required
                    autoComplete='one-time-code'
                  />
                </div>

                {error && (
                  <div className='text-sm text-red-600 dark:text-red-400'>
                    {error}
                  </div>
                )}

                <div className='flex gap-2'>
                  <Link
                    href='/signin'
                    className='flex-1 px-4 py-2 text-center border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors'
                  >
                    Back
                  </Link>
                  <button
                    type='submit'
                    className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                  >
                    Verify & Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
