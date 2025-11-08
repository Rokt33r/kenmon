import { AsyncLocalStorage } from 'node:async_hooks'
import type { KenmonAdapter, CookieOptions } from 'kenmon'

interface KenmonReactRouterContext {
  request: Request
  responseHeaders: Headers
}

const KENMON_REACT_ROUTER_CONTEXT =
  new AsyncLocalStorage<KenmonReactRouterContext>()

/**
 * Gets the current Kenmon React Router context from AsyncLocalStorage.
 * Internal helper used by the adapter. Not exported.
 */
function getKenmonReactRouterContext(): KenmonReactRouterContext {
  const context = KENMON_REACT_ROUTER_CONTEXT.getStore()
  if (!context) {
    throw new Error(
      'Kenmon React Router context not found. Make sure kenmonReactRouterMiddleware is properly configured in your root.tsx middleware array.',
    )
  }
  return context
}

/**
 * Middleware for Kenmon React Router adapter.
 * Sets up AsyncLocalStorage context for request and response headers.
 * Must be added to the middleware array in root.tsx to use Kenmon with React Router.
 *
 * @example
 * ```typescript
 * // In app/root.tsx
 * import { kenmonReactRouterMiddleware } from '@kenmon/react-router-adapter'
 *
 * export const middleware: Route.MiddlewareFunction[] = [
 *   kenmonReactRouterMiddleware,
 * ]
 * ```
 */
export const kenmonReactRouterMiddleware = async (
  { request }: { request: Request },
  next: () => Promise<Response>,
): Promise<Response> => {
  const responseHeaders = new Headers()

  const response = await KENMON_REACT_ROUTER_CONTEXT.run(
    { request, responseHeaders },
    async () => {
      return await next()
    },
  )

  // Merge any headers that were set during execution into the response
  for (const [key, value] of responseHeaders.entries()) {
    response.headers.append(key, value)
  }

  return response
}

/**
 * React Router adapter for Kenmon authentication.
 * Uses AsyncLocalStorage to access request context for cookie management.
 *
 * @example
 * ```typescript
 * import { KenmonAuthService } from 'kenmon'
 * import { KenmonReactRouterAdapter } from '@kenmon/react-router-adapter'
 *
 * export const auth = new KenmonAuthService({
 *   secret: process.env.SESSION_SECRET,
 *   adapter: new KenmonReactRouterAdapter(),
 *   // ... other options
 * })
 * ```
 */
export class KenmonReactRouterAdapter implements KenmonAdapter {
  async setCookie(
    name: string,
    value: string,
    options?: CookieOptions,
  ): Promise<void> {
    const { responseHeaders } = getKenmonReactRouterContext()

    const cookieParts = [`${name}=${value}`]

    if (options?.httpOnly) cookieParts.push('HttpOnly')
    if (options?.secure) cookieParts.push('Secure')
    if (options?.sameSite) cookieParts.push(`SameSite=${options.sameSite}`)
    if (options?.maxAge) cookieParts.push(`Max-Age=${options.maxAge}`)
    if (options?.path) cookieParts.push(`Path=${options.path}`)

    responseHeaders.append('Set-Cookie', cookieParts.join('; '))
  }

  async getCookie(name: string): Promise<string | undefined> {
    const { request } = getKenmonReactRouterContext()

    const cookieHeader = request.headers.get('Cookie')
    if (!cookieHeader) return undefined

    const cookies = cookieHeader.split(';').map((c) => c.trim())
    const cookie = cookies.find((c) => c.startsWith(`${name}=`))

    return cookie?.split('=')[1]
  }

  async deleteCookie(name: string): Promise<void> {
    const { responseHeaders } = getKenmonReactRouterContext()

    responseHeaders.append('Set-Cookie', `${name}=; Max-Age=0; Path=/`)
  }
}

export { SessionRefresh } from './SessionRefresh'
