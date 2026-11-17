import { defineConfig, devices } from '@playwright/test'

const reactRouterPort = 5391
const nextjsPort = 5392

export default defineConfig({
  testDir: './tests',
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  projects: [
    {
      name: 'react-router',
      // Chromium accepts `Secure` cookies on http://localhost, so the
      // `__Host-session` cookie works with no TLS certificate.
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${reactRouterPort}`,
      },
    },
    {
      name: 'nextjs',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: `http://localhost:${nextjsPort}`,
      },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter e2e-react-router exec react-router dev --port ${reactRouterPort} --strictPort`,
      url: `http://localhost:${reactRouterPort}`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `pnpm --filter e2e-nextjs exec next dev --webpack --port ${nextjsPort}`,
      url: `http://localhost:${nextjsPort}`,
      reuseExistingServer: !process.env.CI,
    },
  ],
})
