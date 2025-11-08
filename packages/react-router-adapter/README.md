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

The middleware must be configured in your root route to enable the adapter to access request and response headers throughout your application.

## See Also

- [kenmon](../kenmon) - Core authentication service
- [react-router-example](../../apps/react-router-example) - Full implementation example
