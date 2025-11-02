'use server'

import { auth } from './auth'

/**
 * Server action to refresh the current session if needed.
 *
 * This checks if the session needs refreshing based on the configured
 * refresh interval, and updates the session token and expiry if needed.
 *
 * @returns Object with success status and optional error message
 */
export async function refreshSession(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Get current session
    const session = await auth.verifySession()

    if (!session) {
      return { success: false, error: 'No active session' }
    }

    // Check if session needs refresh
    if (!auth.needsRefresh(session.updatedAt)) {
      return { success: true }
    }

    // Refresh the session
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
