import type { Route } from './+types/api.refresh'
import { auth } from '@/lib/auth/auth'

export async function action() {
  const result = await auth.refreshSession()

  if (!result.success) {
    return { success: false, error: result.error.message }
  }

  return { success: true }
}
