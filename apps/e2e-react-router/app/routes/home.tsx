import type { Route } from './+types/home'
import { auth } from '../auth'

export async function loader() {
  const verifyResult = await auth.verifySession()
  return { userId: verifyResult.success ? verifyResult.data.userId : null }
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main>
      <p data-testid='session-status'>
        {loaderData.userId ? `Signed in as ${loaderData.userId}` : 'Signed out'}
      </p>
    </main>
  )
}
