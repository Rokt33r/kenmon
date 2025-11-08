import { useEffect, useRef } from 'react'
import { useFetcher } from 'react-router'

const CHECK_INTERVAL = 15 * 60 * 1000 // 15 minutes in milliseconds
const DEBOUNCE_DELAY = 1000 // 1 second - prevent duplicate calls

interface SessionRefreshProps {
  /**
   * The route path where the refresh action is defined.
   * This must match the path in your routes.ts configuration.
   *
   * @example '/api/refresh'
   * @example '/auth/refresh'
   * @example '/_action/session'
   */
  action: string
  /**
   * HTTP method to use for the refresh request.
   * Default: 'post'
   */
  method?: 'get' | 'post' | 'put' | 'patch' | 'delete'
  /**
   * Time in seconds before a session needs refresh.
   * Should match the refreshInterval configured in your auth service.
   * Default: 86400 (24 hours)
   */
  refreshInterval?: number
  /**
   * localStorage key to store the last refresh timestamp.
   * Default: 'session_last_refresh'
   */
  storageKey?: string
}

/**
 * Client component that automatically refreshes the user's session.
 *
 * This component should be placed in the root layout to ensure session
 * refresh works across all pages. It monitors window focus and tab visibility,
 * and periodically checks if the session needs to be refreshed.
 *
 * The component is invisible and renders nothing to the DOM.
 *
 * **Important Prerequisites:**
 * 1. Enable v8_middleware in react-router.config.ts
 * 2. Configure kenmonReactRouterMiddleware in app/root.tsx
 * 3. Create a route action that calls auth.refreshSession()
 * 4. Register the route in app/routes.ts
 *
 * @example
 * ```tsx
 * // 1. react-router.config.ts
 * export default {
 *   future: {
 *     v8_middleware: true,
 *   },
 * }
 *
 * // 2. app/root.tsx
 * import { kenmonReactRouterMiddleware } from '@kenmon/react-router-adapter'
 * export const middleware = [kenmonReactRouterMiddleware]
 *
 * // 3. app/routes/api.refresh.tsx
 * import { auth } from '~/lib/auth/auth'
 * export async function action() {
 *   const result = await auth.refreshSession()
 *   if (!result.success) {
 *     return { success: false, error: result.error.message }
 *   }
 *   return { success: true }
 * }
 *
 * // 4. app/routes.ts
 * export default [
 *   { path: '/api/refresh', file: 'routes/api.refresh.tsx' },
 * ] satisfies RouteConfig
 *
 * // 5. app/root.tsx (in your layout)
 * import { SessionRefresh } from '@kenmon/react-router-adapter'
 * <SessionRefresh method="post" action="/api/refresh" refreshInterval={86400} />
 * ```
 */
export function SessionRefresh({
  action,
  method = 'post',
  refreshInterval = 86400, // Default: 24 hours
  storageKey = 'session_last_refresh',
}: SessionRefreshProps) {
  const fetcher = useFetcher()
  const refreshIntervalRef = useRef(refreshInterval)
  const storageKeyRef = useRef(storageKey)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update refs when props change
  useEffect(() => {
    refreshIntervalRef.current = refreshInterval
    storageKeyRef.current = storageKey
  }, [refreshInterval, storageKey])

  const checkAndRefresh = async () => {
    const lastRefreshStr = localStorage.getItem(storageKeyRef.current)
    const now = Date.now()

    // If no last refresh recorded, set it to now (first time)
    if (!lastRefreshStr) {
      localStorage.setItem(storageKeyRef.current, now.toString())
      return
    }

    const lastRefresh = parseInt(lastRefreshStr, 10)
    const timeSinceRefresh = (now - lastRefresh) / 1000 // Convert to seconds

    // Check if refresh interval has passed
    if (timeSinceRefresh >= refreshIntervalRef.current) {
      // Use fetcher to call the refresh action
      fetcher.submit(
        {},
        {
          method,
          action,
        },
      )

      // Update localStorage with current timestamp
      localStorage.setItem(storageKeyRef.current, now.toString())

      console.log('Refreshing session...')
    }
  }

  const debouncedCheckAndRefresh = () => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      checkAndRefresh()
    }, DEBOUNCE_DELAY)
  }

  useEffect(() => {
    // Check on mount
    checkAndRefresh()

    // Set up periodic check every 15 minutes
    const intervalId = setInterval(checkAndRefresh, CHECK_INTERVAL)

    // Set up window focus listener
    const handleFocus = () => {
      debouncedCheckAndRefresh()
    }

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        debouncedCheckAndRefresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      clearInterval(intervalId)
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps - we use refs for dynamic values

  return null
}
