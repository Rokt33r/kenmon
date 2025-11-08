import type { KenmonAdapter, CookieOptions } from 'kenmon'
import { getKenmonReactRouterContext } from '../context'

/**
 * React Router adapter for Kenmon authentication.
 * Uses AsyncLocalStorage to access request context for cookie management.
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
