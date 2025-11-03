'use server'

import { auth } from './auth'

/**
 * Server action to refresh the current session.
 *
 * Updates the session expiry. Timing logic is handled
 * by the SessionRefresh component on the client side.
 *
 * @returns Object with success status and optional error message
 */
export async function refreshSession(): Promise<{
  success: boolean
  error?: string
}> {
  const result = await auth.refreshSession()

  if (!result.success) {
    return { success: false, error: result.error.message }
  }

  return { success: true }
}
