import { Link, redirect, Form } from 'react-router'
import type { Route } from './+types/home'
import { auth } from '@/lib/auth/auth'
import { db } from '@/lib/db'
import { userIdentifiers } from '@shared/db/schema'
import { eq } from 'drizzle-orm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'React Router Demo App' },
    { name: 'description', content: 'React Router with Kenmon authentication' },
  ]
}

export async function loader() {
  // Check authentication status
  const verifyResult = await auth.verifySession()

  // Fetch user identifiers if authenticated
  let identifiers: Array<{ type: string; value: string }> = []
  const session = verifyResult.success ? verifyResult.data : null

  if (session) {
    identifiers = await db
      .select({
        type: userIdentifiers.type,
        value: userIdentifiers.value,
      })
      .from(userIdentifiers)
      .where(eq(userIdentifiers.userId, session.userId))
  }

  return {
    session,
    identifiers,
  }
}

export async function action() {
  // Handle sign-out
  await auth.signOut()
  return redirect('/')
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { session, identifiers } = loaderData

  return (
    <div className='flex min-h-screen items-center justify-center bg-background'>
      <main className='w-full max-w-3xl px-6 py-12'>
        <h1 className='text-3xl font-bold mb-8'>React Router Demo App</h1>

        {session ? (
          /* Authenticated UI */
          <div className='space-y-6'>
            <Card>
              <CardHeader>
                <CardTitle>User Information</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-sm'>
                  <span className='font-medium'>User ID:</span>{' '}
                  <code className='bg-muted px-2 py-1 rounded text-xs'>
                    {session.userId}
                  </code>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Identifiers</CardTitle>
              </CardHeader>
              <CardContent>
                {identifiers.length > 0 ? (
                  <ul className='space-y-2'>
                    {identifiers.map((identifier, idx) => (
                      <li key={idx} className='flex items-center gap-2 text-sm'>
                        <span className='font-medium capitalize'>
                          {identifier.type}:
                        </span>
                        <code className='bg-muted px-2 py-1 rounded text-xs'>
                          {identifier.value}
                        </code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className='text-sm text-muted-foreground'>
                    No identifiers found
                  </p>
                )}
              </CardContent>
            </Card>

            <Form method='post'>
              <Button type='submit' variant='destructive' className='w-full'>
                Sign Out
              </Button>
            </Form>
          </div>
        ) : (
          /* Unauthenticated UI - Links to Sign In/Sign Up */
          <div className='space-y-6'>
            <p className='text-muted-foreground'>
              Welcome! Please sign in or create an account to continue.
            </p>

            <div className='flex gap-4'>
              <Button asChild variant='outline' className='flex-1'>
                <Link to='/signin'>Sign In</Link>
              </Button>
              <Button asChild className='flex-1'>
                <Link to='/signup'>Sign Up</Link>
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
