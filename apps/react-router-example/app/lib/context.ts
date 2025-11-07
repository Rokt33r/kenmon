import { AsyncLocalStorage } from 'node:async_hooks'

interface RequestContext {
  request: Request
  responseHeaders: Headers
}

const REQUEST_CONTEXT = new AsyncLocalStorage<RequestContext>()

/**
 * Provides request context through AsyncLocalStorage for the duration of the callback.
 * Response headers set during execution will be automatically merged into the response.
 */
export async function provideRequestContext(
  request: Request,
  cb: () => Promise<Response>,
): Promise<Response> {
  const responseHeaders = new Headers()

  const response = await REQUEST_CONTEXT.run(
    { request, responseHeaders },
    async () => {
      return await cb()
    },
  )

  // Merge any headers that were set during execution into the response
  for (const [key, value] of responseHeaders.entries()) {
    response.headers.append(key, value)
  }

  return response
}

/**
 * Gets the current request context from AsyncLocalStorage.
 * Must be called within a provideRequestContext() execution context.
 */
export function getRequestContext(): RequestContext {
  const context = REQUEST_CONTEXT.getStore()
  if (!context) {
    throw new Error(
      'Request context not found. Make sure middleware is properly configured.',
    )
  }
  return context
}
