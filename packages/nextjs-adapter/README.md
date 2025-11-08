# @kenmon/nextjs-adapter

Next.js framework adapter for Kenmon.

## Installation

```bash
npm install @kenmon/nextjs-adapter
```

## Usage

```typescript
import { KenmonNextJSAdapter } from '@kenmon/nextjs-adapter'
import { KenmonAuthService } from 'kenmon'

const auth = new KenmonAuthService({
  secret: process.env.SESSION_SECRET,
  adapter: new KenmonNextJSAdapter(),
  storage: /* your storage implementation */
})
```

## What it does

Provides Next.js-specific implementations for:

- Cookie management (using `next/headers`)
- Server-side cookie operations
- SessionRefresh component for automatic session renewal

## SessionRefresh Component

The `SessionRefresh` component automatically refreshes user sessions in the background, keeping users logged in without interruption.

### Setup

**Step 1: Create a server action**

Create a server action file in your app (e.g., `src/lib/auth/actions.ts`):

```typescript
'use server'

import { auth } from './auth' // Your Kenmon instance

export async function refreshSession() {
  const result = await auth.refreshSession()

  if (!result.success) {
    return { success: false, error: result.error.message }
  }

  return { success: true }
}
```

**Step 2: Add SessionRefresh to your root layout**

```typescript
// src/app/layout.tsx
import { SessionRefresh } from '@kenmon/nextjs-adapter'
import { refreshSession } from '@/lib/auth/actions'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <SessionRefresh
          refreshAction={refreshSession}
          refreshInterval={86400} // 24 hours in seconds
        />
        {children}
      </body>
    </html>
  )
}
```

### Props

- `refreshAction` (required): The server action that refreshes the session
- `refreshInterval` (optional): Time in seconds before a session needs refresh. Default: 86400 (24 hours)
- `storageKey` (optional): localStorage key to store the last refresh timestamp. Default: 'session_last_refresh'

### How it works

The component:
- Checks if the session needs refreshing:
  - Every 15 minutes
  - When the window regains focus
  - When the tab becomes visible again
- Refreshes the session only if `refreshInterval` seconds have passed since the last refresh
- Uses localStorage to track the last refresh time
- Renders nothing to the DOM (invisible component)

## See Also

- [kenmon](../kenmon) - Core authentication service
- [nextjs-example](../../apps/nextjs-example) - Full implementation example
