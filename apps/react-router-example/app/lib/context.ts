import { AsyncLocalStorage } from 'node:async_hooks'
import type { Route } from '../+types/root'

interface KenmonReactRouterContext {
  request: Request
  responseHeaders: Headers
}

const KENMON_REACT_ROUTER_CONTEXT = new AsyncLocalStorage<KenmonReactRouterContext>()

/**
 * Middleware for Kenmon React Router adapter.
 * Sets up AsyncLocalStorage context for request and response headers.
 * Must be added to the middleware array in root.tsx to use Kenmon with React Router.
 */
export const kenmonReactRouterMiddleware: Route.MiddlewareFunction = async ({ request }, next) => {
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
 * Gets the current Kenmon React Router context from AsyncLocalStorage.
 * Must be called within kenmonReactRouterMiddleware execution context.
 */
export function getKenmonReactRouterContext(): KenmonReactRouterContext {
  const context = KENMON_REACT_ROUTER_CONTEXT.getStore()
  if (!context) {
    throw new Error(
      'Kenmon React Router context not found. Make sure kenmonReactRouterMiddleware is properly configured.',
    )
  }
  return context
}
