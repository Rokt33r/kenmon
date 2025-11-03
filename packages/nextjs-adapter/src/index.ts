import { cookies } from 'next/headers'
import { KenmonAdapter, CookieOptions } from 'kenmon'

export class KenmonNextJSAdapter implements KenmonAdapter {
  async setCookie(
    name: string,
    value: string,
    options?: CookieOptions,
  ): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.set(name, value, {
      httpOnly: options?.httpOnly,
      secure: options?.secure,
      sameSite: options?.sameSite,
      maxAge: options?.maxAge,
      path: options?.path,
    })
  }

  async getCookie(name: string): Promise<string | undefined> {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(name)
    return cookie?.value
  }

  async deleteCookie(name: string): Promise<void> {
    const cookieStore = await cookies()
    cookieStore.delete(name)
  }
}
