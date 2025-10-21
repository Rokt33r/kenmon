# Kenmon

A secure, portable authentication module. Framework-agnostic core with Next.js integration.

## Installation

```bash
npm install kenmon
# or
yarn add kenmon
# or
pnpm add kenmon
```

## Quick Start

### 1. Core Setup

```typescript
import { AuthService } from 'kenmon'

// Implement required interfaces
class MyAuthStorage implements AuthStorage {
  // Implement all required methods
  async createUser(email: string): Promise<User> {
    /* ... */
  }
  async getUserByEmail(email: string): Promise<User | null> {
    /* ... */
  }
  // ... other methods
}

class MyEmailProvider implements EmailProvider {
  async sendOTP(email: string, code: string): Promise<void> {
    // Send email with OTP code
  }
}

class MyFrameworkAdapter implements FrameworkAdapter {
  async setCookie(
    name: string,
    value: string,
    options?: CookieOptions,
  ): Promise<void> {
    /* ... */
  }
  async getCookie(name: string): Promise<string | undefined> {
    /* ... */
  }
  // ... other methods
}

// Create auth service
const authService = new AuthService(
  new MyAuthStorage(),
  new MyEmailProvider(),
  new MyFrameworkAdapter(),
  {
    jwt: {
      secret: 'your-secret-key',
      algorithm: 'HS256',
    },
    session: {
      ttl: 86400, // 24 hours
      refreshInterval: 3600, // 1 hour
      cookieName: 'session',
    },
    otp: {
      ttl: 300, // 5 minutes
      length: 20,
    },
  },
)
```

### 2. Next.js Integration

```typescript
// lib/auth.ts
import { AuthService } from 'kenmon'
import { NextJSFrameworkAdapter } from 'kenmon/nextjs'

export const authService = new AuthService(
  new DrizzleAuthStorage(), // Your storage implementation
  new SESEmailProvider(), // Your email implementation
  new NextJSFrameworkAdapter(),
  authConfig,
)
```

```typescript
// app/auth/[...auth]/route.ts
import { createAuthRouteHandler } from 'kenmon/nextjs'
import { authService } from '@/lib/auth'

const handler = createAuthRouteHandler(authService)
export { handler as POST }
```

```tsx
// app/layout.tsx
import { AuthProvider } from 'kenmon/nextjs/client'
import { authService, verifyAuthenticatedUser } from '@/lib/auth'

export default async function RootLayout({ children }) {
  const user = await verifyAuthenticatedUser()

  return (
    <html>
      <body>
        <AuthProvider user={user} config={authService.config}>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

```tsx
// components/SignInForm.tsx
import { useAuth } from 'kenmon/nextjs/client'

export function SignInForm() {
  const { user, signOut } = useAuth()

  if (user) {
    return (
      <div>
        Welcome {user.email}!<button onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  // Your sign-in form
  return <form>{/* ... */}</form>
}
```

## API Reference

### Core Classes

#### `AuthService`

The main authentication service class.

```typescript
class AuthService {
  constructor(
    storage: AuthStorage,
    email: EmailProvider,
    framework: FrameworkAdapter,
    config: AuthConfig,
  )

  // Send OTP to email
  async sendOTP(email: string): Promise<string>

  // Verify OTP and sign in existing user
  async verifyOTPAndSignIn(
    otpId: string,
    email: string,
    code: string,
  ): Promise<User | null>

  // Verify OTP and create new user
  async verifyOTPAndSignUp(
    otpId: string,
    email: string,
    code: string,
  ): Promise<User | null>

  // Verify current session
  async verifySession(): Promise<{
    user: User
    session: { id: string; createdAt: Date; updatedAt: Date; expiresAt: Date }
  } | null>

  // Check if session needs refresh
  needsRefresh(updatedAt: Date): boolean

  // Refresh session
  async refreshSession(sessionId: string): Promise<Session>

  // Sign out user
  async signOut(): Promise<void>
}
```

### Interfaces

#### `AuthStorage`

Implement this interface to provide data persistence.

```typescript
interface AuthStorage {
  // User operations
  createUser(email: string): Promise<User>
  getUserById(id: string): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>

  // Session operations
  createSession(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Session>
  getSessionById(sessionId: string): Promise<Session | null>
  updateSessionExpiry(sessionId: string, expiresAt: Date): Promise<void>
  invalidateSession(sessionId: string): Promise<void>
  invalidateUserSessions(userId: string): Promise<void>

  // OTP operations
  createOTP(email: string, code: string, expiresAt: Date): Promise<OTP>
  verifyOTP(otpId: string, email: string, code: string): Promise<OTP | null>
}
```

#### `EmailProvider`

Implement this interface to send OTP emails.

```typescript
interface EmailProvider {
  sendOTP(email: string, code: string): Promise<void>
}
```

#### `FrameworkAdapter`

Implement this interface for framework-specific operations.

```typescript
interface FrameworkAdapter {
  setCookie(name: string, value: string, options?: CookieOptions): Promise<void>
  getCookie(name: string): Promise<string | undefined>
  deleteCookie(name: string): Promise<void>
  redirect(url: string): Promise<void>
}
```

### Configuration

```typescript
interface AuthConfig {
  jwt: {
    secret: string
    algorithm?: Algorithm // Default: 'HS256'
  }
  session: {
    ttl: number // Session lifetime in seconds
    refreshInterval: number // Refresh interval in seconds
    cookieName?: string // Default: 'session'
    secure?: boolean // HTTPS only
    sameSite?: 'lax' | 'strict' | 'none'
  }
  otp: {
    ttl: number // OTP lifetime in seconds
    length?: number // OTP code length (default: 20)
  }
}
```

### Next.js Components

#### `AuthProvider`

React context provider for authentication state.

```tsx
interface AuthProviderProps {
  children: ReactNode
  user: User | null
  config: AuthConfig
  lastRefreshTimeKey?: string // Custom localStorage key
}
```

#### `useAuth` Hook

```typescript
interface AuthContextType {
  user: User | null
  signOut: () => Promise<void>
}

const { user, signOut } = useAuth()
```

### Route Handler

The `createAuthRouteHandler` creates a Next.js route handler that supports:

- `POST /auth/refresh` - Refresh session
- `POST /auth/signout` - Sign out user

## Security Features

### Multi-layer Verification

OTP verification requires all three parameters:

- **OTP ID**: Unique identifier from database
- **Email**: Must match the OTP record
- **Code**: The actual OTP code

### Session Security

- JWT-based sessions with configurable algorithms
- Automatic session refresh
- Secure cookie settings
- Session invalidation support

## Examples

### Basic Email/OTP Flow

```typescript
// 1. Send OTP
const otpId = await authService.sendOTP('user@example.com')

// 2. User receives email and enters code
// 3. Verify OTP (for sign-in)
const user = await authService.verifyOTPAndSignIn(
  otpId,
  'user@example.com',
  'ABC123',
)

// Or verify OTP (for sign-up)
const newUser = await authService.verifyOTPAndSignUp(
  otpId,
  'user@example.com',
  'ABC123',
)
```

### Session Management

```typescript
// Check current session
const session = await authService.verifySession()

// Refresh if needed
if (session && authService.needsRefresh(session.session)) {
  await authService.refreshSession(session.session)
}

// Sign out
await authService.signOut()
```

### Custom Storage Example (Drizzle)

```typescript
import { eq, and } from 'drizzle-orm'
import { AuthStorage, User, Session, OTP } from 'kenmon'

class DrizzleAuthStorage implements AuthStorage {
  async createUser(email: string): Promise<User> {
    const [user] = await db.insert(users).values({ email }).returning()
    return {
      id: user.id.toString(),
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }
  }

  async verifyOTP(
    otpId: string,
    email: string,
    code: string,
  ): Promise<OTP | null> {
    const [otp] = await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.id, parseInt(otpId)),
          eq(otps.email, email),
          eq(otps.token, code),
          eq(otps.used, false),
        ),
      )
      .limit(1)

    if (!otp || isAfter(new Date(), otp.expiresAt)) {
      return null
    }

    await db
      .update(otps)
      .set({ used: true, updatedAt: new Date() })
      .where(eq(otps.id, otp.id))

    return {
      id: otp.id.toString(),
      email: otp.email,
      code: otp.token,
      expiresAt: otp.expiresAt,
      used: true,
    }
  }

  // ... implement other methods
}
```

## Building and Publishing

```bash
# Build for production
npm run build

# Clean build artifacts
npm run clean

# Publish to npm
npm publish
```

## License

MIT
