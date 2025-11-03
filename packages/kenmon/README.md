# kenmon

Core authentication service with pluggable providers and adapters.

## Installation

```bash
npm install kenmon
```

## Concepts

**Kenmon** is built around three core abstractions:

- **Providers** - Authentication methods (email OTP, OAuth, etc.)
- **Adapters** - Framework-specific integrations (cookies)
- **Storage** - User and session persistence

## Basic Usage

```typescript
import { KenmonAuthService } from 'kenmon'
import { KenmonEmailOTPProvider } from '@kenmon/email-otp-provider'
import { KenmonNextJSAdapter } from '@kenmon/nextjs-adapter'

// Implement session storage
class MySessionStorage implements KenmonStorage<User> {
  async createUser(identifier: KenmonIdentifier, data: any): Promise<User> {
    /* ... */
  }
  async getUserById(id: string): Promise<User | null> {
    /* ... */
  }
  async getUserByIdentifier(
    identifier: KenmonIdentifier,
  ): Promise<User | null> {
    /* ... */
  }

  async createSession(
    userId,
    token,
    expiresAt,
    ipAddress,
    userAgent,
  ): Promise<KenmonSession> {
    /* ... */
  }
  async getSessionById(sessionId: string): Promise<KenmonSession | null> {
    /* ... */
  }
  async updateSession(
    sessionId: string,
    data: { expiresAt?: Date; refreshedAt?: Date; usedAt?: Date },
  ): Promise<void> {
    /* ... */
  }
  async invalidateSession(sessionId: string): Promise<void> {
    /* ... */
  }
  async invalidateAllUserSessions(userId: string): Promise<void> {
    /* ... */
  }
}

// Implement OTP storage
class MyEmailOTPStorage implements KenmonEmailOTPStorage {
  async createOTP(email, code, expiresAt): Promise<KenmonEmailOTP> {
    /* ... */
  }
  async getOTPById(id: string): Promise<KenmonEmailOTP | null> {
    /* ... */
  }
  async markOTPAsUsed(id: string): Promise<void> {
    /* ... */
  }
}

// Implement mailer
class MyMailer extends KenmonMailer {
  async sendEmail(params: KenmonSendEmailParams): Promise<void> {
    /* ... */
  }
}

// Create auth service
const auth = new KenmonAuthService({
  secret: process.env.SESSION_SECRET,
  storage: new MySessionStorage(),
  adapter: new KenmonNextJSAdapter(),
})

// Register provider
auth.registerProvider(
  new KenmonEmailOTPProvider({
    mailer: new MyMailer(),
    otpStorage: new MyEmailOTPStorage(),
  }),
)
```

## Usage Flow

```typescript
// 1. Prepare (send OTP email)
const prepareResult = await auth.prepare({
  type: 'email-otp',
  intent: 'sign-in',
  data: { email: 'user@example.com' },
})

// 2. Authenticate (verify OTP)
const authResult = await auth.authenticate({
  type: 'email-otp',
  intent: 'sign-in',
  data: { email, otpId, code },
  ipAddress,
  userAgent,
})

if (authResult.success) {
  // Session created automatically
}

// 3. Verify session
const sessionResult = await auth.verifySession()
if (sessionResult.success) {
  const session = sessionResult.data
  // Use session...
}

// 4. Refresh session
const refreshResult = await auth.refreshSession()
if (refreshResult.success) {
  // Session refreshed
}

// 5. Sign out
await auth.signOut()
// Or sign out from all devices
await auth.signOut({ allSessions: true })
```

## Session Schema

The `KenmonSession` interface includes the following fields:

```typescript
interface KenmonSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
  createdAt: Date
  refreshedAt: Date // Updated when session is refreshed
  usedAt: Date // Updated when session is verified
  invalidated: boolean
  invalidatedAt?: Date // Set when session is invalidated
  ipAddress?: string
  userAgent?: string
}
```

## Configuration

```typescript
{
  secret: string,
  storage: KenmonStorage<U>,
  adapter: KenmonAdapter,
  session?: {
    ttl?: number,           // Session lifetime in seconds (default: 14 days)
    cookieName?: string,    // Default: 'session'
    secure?: boolean,
    sameSite?: 'lax' | 'strict' | 'none'
  }
}
```

## See Also

- [Full example](../../apps/nextjs-example) - Complete Next.js implementation with Drizzle
- [@kenmon/nextjs-adapter](../nextjs-adapter) - Next.js framework adapter
- [@kenmon/email-otp-provider](../email-otp-provider) - Email OTP authentication provider
