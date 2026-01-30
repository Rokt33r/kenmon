# kenmon

Core authentication service with pluggable authenticators and adapters.

## Installation

```bash
npm install kenmon
```

## Concepts

**Kenmon** is built around three core abstractions:

- **Authenticators** - Authentication methods (email OTP, OAuth, etc.)
- **Adapters** - Framework-specific integrations (cookies)
- **Storage** - User and session persistence

## Basic Usage

```typescript
import { KenmonAuthService } from 'kenmon'
import { KenmonEmailOTPAuthenticator } from '@kenmon/email-otp-authenticator'
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

// Create authenticator
const emailOTP = new KenmonEmailOTPAuthenticator({
  mailer: new MyMailer(),
  otpStorage: new MyEmailOTPStorage(),
  emailFrom: 'noreply@example.com',
})
```

## Usage Flow

```typescript
// 1. Send OTP email
const sendResult = await emailOTP.sendOTP('user@example.com')
if (!sendResult.success) {
  // Handle error
}
const { otpId, signature } = sendResult.data

// 2. Verify OTP and sign in
const verifyResult = await emailOTP.verifyOTP({ email, otpId, code })
if (!verifyResult.success) {
  // Handle error
}

// 3. Sign in with the verified identifier
const signInResult = await auth.signIn(verifyResult.data, { ipAddress, userAgent })
if (signInResult.success) {
  // Session created automatically
}

// 4. Verify session
const sessionResult = await auth.verifySession()
if (sessionResult.success) {
  const session = sessionResult.data
  // Use session...
}

// 5. Refresh session
const refreshResult = await auth.refreshSession()
if (refreshResult.success) {
  // Session refreshed
}

// 6. Sign out
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
- [@kenmon/email-otp-authenticator](../email-otp-authenticator) - Email OTP authenticator
