import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { auth } from '../lib/auth/auth'
import { db } from '../lib/db'
import { userIdentifiers } from '../lib/db/schema'
import { eq } from 'drizzle-orm'

export default async function Home() {
  // Check authentication status
  const session = await auth.verifySession()

  // Fetch user identifiers if authenticated
  let identifiers: Array<{ type: string; value: string }> = []

  if (session) {
    identifiers = await db
      .select({
        type: userIdentifiers.type,
        value: userIdentifiers.value,
      })
      .from(userIdentifiers)
      .where(eq(userIdentifiers.userId, session.userId))
  }

  // Server action for sign-out
  async function handleSignOut() {
    'use server'
    await auth.signOut()
    revalidatePath('/')
  }

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
      <main className='flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start'>
        <div className='w-full'>
          <h1 className='text-3xl font-bold mb-8'>Next.js Demo App</h1>

          {session ? (
            /* Authenticated UI */
            <div className='space-y-6'>
              <div className='p-6 border border-zinc-200 rounded-lg dark:border-zinc-800'>
                <h2 className='text-xl font-semibold mb-4'>User Information</h2>
                <div className='space-y-2'>
                  <p className='text-sm'>
                    <span className='font-medium'>User ID:</span>{' '}
                    <code className='bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded text-xs'>
                      {session.userId}
                    </code>
                  </p>
                </div>
              </div>

              <div className='p-6 border border-zinc-200 rounded-lg dark:border-zinc-800'>
                <h2 className='text-xl font-semibold mb-4'>User Identifiers</h2>
                {identifiers.length > 0 ? (
                  <ul className='space-y-2'>
                    {identifiers.map((identifier, idx) => (
                      <li
                        key={idx}
                        className='flex items-center gap-2 text-sm'
                      >
                        <span className='font-medium capitalize'>
                          {identifier.type}:
                        </span>
                        <code className='bg-zinc-100 dark:bg-zinc-900 px-2 py-1 rounded text-xs'>
                          {identifier.value}
                        </code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-sm text-zinc-500'>No identifiers found</p>
                )}
              </div>

              <form action={handleSignOut}>
                <button
                  type='submit'
                  className='w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors'
                >
                  Sign Out
                </button>
              </form>
            </div>
          ) : (
            /* Unauthenticated UI - Links to Sign In/Sign Up */
            <div className='space-y-6'>
              <p className='text-zinc-600 dark:text-zinc-400'>
                Welcome! Please sign in or create an account to continue.
              </p>

              <div className='flex gap-4'>
                <Link
                  href='/signin'
                  className='flex-1 px-4 py-2 text-center border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors'
                >
                  Sign In
                </Link>
                <Link
                  href='/signup'
                  className='flex-1 px-4 py-2 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
