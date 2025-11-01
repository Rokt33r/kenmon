'use client'

import {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from 'react'

interface AuthContextType {
  user: any | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signOut: async () => {},
})

interface AuthProviderProps<U> {
  children: ReactNode
  user: U | null
  config: {
    session: {
      refreshInterval: number
    }
  }
  lastRefreshTimeKey?: string
}

const defaultLastRefreshTimeKey = 'auth:last_refresh_time'

export function AuthProvider<U>({
  children,
  user,
  config,
  lastRefreshTimeKey = defaultLastRefreshTimeKey,
}: AuthProviderProps<U>) {
  const isRefreshing = useRef(false)
  const refreshInterval = config.session.refreshInterval

  const shouldRefreshSession = useCallback(
    (intervalSeconds: number): boolean => {
      const lastRefreshStr = localStorage.getItem(lastRefreshTimeKey)
      if (!lastRefreshStr) {
        return true // No previous refresh recorded
      }

      const lastRefreshTime = parseInt(lastRefreshStr, 10)
      const currentTime = Date.now()
      const secondsSinceLastRefresh = (currentTime - lastRefreshTime) / 1000

      return secondsSinceLastRefresh >= intervalSeconds
    },
    [lastRefreshTimeKey],
  )

  const updateLastSessionTokenRefreshTime = useCallback((): void => {
    localStorage.setItem(lastRefreshTimeKey, Date.now().toString())
  }, [lastRefreshTimeKey])

  const clearLastSessionTokenRefreshTime = useCallback((): void => {
    localStorage.removeItem(lastRefreshTimeKey)
  }, [lastRefreshTimeKey])

  useEffect(() => {
    const handleFocus = () => {
      if (
        user &&
        !isRefreshing.current &&
        shouldRefreshSession(refreshInterval)
      ) {
        isRefreshing.current = true

        fetch('/auth/refresh', { method: 'POST' })
          .then((res) => {
            if (res.ok) {
              updateLastSessionTokenRefreshTime()
            }
          })
          .catch((error) => {
            console.error('Error refreshing session:', error)
          })
          .finally(() => {
            isRefreshing.current = false
          })
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [
    user,
    refreshInterval,
    shouldRefreshSession,
    updateLastSessionTokenRefreshTime,
  ])

  const signOut = useCallback(async () => {
    clearLastSessionTokenRefreshTime()
    await fetch('/auth/signout', { method: 'POST' })
  }, [clearLastSessionTokenRefreshTime])

  const contextValue: AuthContextType = {
    user,
    signOut,
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
