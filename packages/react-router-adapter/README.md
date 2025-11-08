# @kenmon/react-router-adapter

React Router framework adapter for Kenmon.

## Installation

```bash
npm install @kenmon/react-router-adapter
```

## Usage

### 1. Add middleware to root.tsx

```typescript
import { kenmonReactRouterMiddleware } from '@kenmon/react-router-adapter'
import type { Route } from './+types/root'

export const middleware: Route.MiddlewareFunction[] = [
  kenmonReactRouterMiddleware,
]
```

### 2. Configure the adapter

```typescript
import { KenmonReactRouterAdapter } from '@kenmon/react-router-adapter'
import { KenmonAuthService } from 'kenmon'

const auth = new KenmonAuthService({
  secret: process.env.SESSION_SECRET,
  adapter: new KenmonReactRouterAdapter(),
  storage: /* your storage implementation */
})
```

## What it does

Provides React Router-specific implementations for:

- **Middleware**: Sets up AsyncLocalStorage context for request/response access
- **Cookie management**: Server-side cookie operations via request context
- **SSR support**: Handles cookies during server-side rendering
- **SessionRefresh component**: Automatic session renewal

The middleware must be configured in your root route to enable the adapter to access request and response headers throughout your application.

## SessionRefresh Component

The `SessionRefresh` component automatically refreshes user sessions in the background, keeping users logged in without interruption.

### Setup

**Step 1: Enable v8_middleware in react-router.config.ts**

This is **required** for the middleware to work:

```typescript
// react-router.config.ts
import type { Config } from '@react-router/dev/config'

export default {
  future: {
    v8_middleware: true,
  },
} satisfies Config
```

**Step 2: Configure middleware in app/root.tsx**

```typescript
// app/root.tsx
import { kenmonReactRouterMiddleware } from '@kenmon/react-router-adapter'
import type { Route } from './+types/root'

export const middleware: Route.MiddlewareFunction[] = [
  kenmonReactRouterMiddleware,
]
```

**Step 3: Create a route action**

Create a route file with an action that refreshes the session. You can choose any path (e.g., `app/routes/api.refresh.tsx`):

```typescript
// app/routes/api.refresh.tsx
import { auth } from '~/lib/auth/auth' // Your Kenmon instance

export async function action() {
  const result = await auth.refreshSession()

  if (!result.success) {
    return { success: false, error: result.error.message }
  }

  return { success: true }
}
```

**Step 4: Register the route in app/routes.ts**

```typescript
// app/routes.ts
import { type RouteConfig } from '@react-router/dev/routes'

export default [
  // ... other routes
  { path: '/api/refresh', file: 'routes/api.refresh.tsx' },
] satisfies RouteConfig
```

**Step 5: Add SessionRefresh to your root layout**

```typescript
// app/root.tsx
import { SessionRefresh } from '@kenmon/react-router-adapter'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <SessionRefresh
          method="post"
          action="/api/refresh"
          refreshInterval={86400} // 24 hours in seconds
        />
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
```

### Props

- `action` (required): The route path where your refresh action is defined (must match the path in routes.ts)
- `method` (optional): HTTP method to use. Default: 'post'
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

### Troubleshooting

**Error: "Kenmon React Router context not found"**

- Make sure `v8_middleware: true` is set in react-router.config.ts
- Verify that `kenmonReactRouterMiddleware` is exported in app/root.tsx

**404 errors when refreshing**

- Check that the route path is registered in app/routes.ts
- Ensure the `action` prop matches the path in routes.ts

## See Also

- [kenmon](../kenmon) - Core authentication service
- [react-router-example](../../apps/react-router-example) - Full implementation example
