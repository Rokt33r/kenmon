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

## See Also

- [kenmon](../kenmon) - Core authentication service
- [nextjs-example](../../apps/nextjs-example) - Full implementation example
