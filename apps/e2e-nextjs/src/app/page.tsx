import { auth } from '../lib/auth'

export default async function Home() {
  const verifyResult = await auth.verifySession()
  const userId = verifyResult.success ? verifyResult.data.userId : null

  return (
    <main>
      <p data-testid='session-status'>
        {userId ? `Signed in as ${userId}` : 'Signed out'}
      </p>
    </main>
  )
}
