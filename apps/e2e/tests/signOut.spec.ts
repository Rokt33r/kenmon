import { test, expect, type BrowserContext } from '@playwright/test'

const sessionCookieName = '__Host-session'

async function getSessionCookie(context: BrowserContext) {
  const cookies = await context.cookies()
  return cookies.find((cookie) => cookie.name === sessionCookieName)
}

test('sign-out removes the __Host- session cookie from the browser', async ({
  page,
  context,
}) => {
  const sessionStatus = page.getByTestId('session-status')

  await page.goto('/sign-in')
  await expect(sessionStatus).toHaveText(/^Signed in as /)
  const sessionCookie = await getSessionCookie(context)
  expect(sessionCookie).toMatchObject({ secure: true, path: '/' })

  await page.goto('/sign-out')
  await expect(sessionStatus).toHaveText('Signed out')
  expect(await getSessionCookie(context)).toBeUndefined()

  await page.reload()
  await expect(sessionStatus).toHaveText('Signed out')
  expect(await getSessionCookie(context)).toBeUndefined()
})
