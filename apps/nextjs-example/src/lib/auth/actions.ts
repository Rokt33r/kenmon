'use server'

import { auth } from './auth'

/**
 * Server action to refresh the current session.
 *
 * Updates the session token and expiry. Timing logic is handled
 * by the SessionRefresh component on the client side.
 *
 * @returns Object with success status and optional error message
 */
export async function refreshSession(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const session = await auth.verifySession()

    if (!session) {
      return { success: false, error: 'No active session' }
    }

    await auth.refreshSession(session.id)

    return { success: true }
  } catch (error) {
    console.error('Failed to refresh session:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
