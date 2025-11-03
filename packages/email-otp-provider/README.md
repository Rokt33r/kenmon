# @kenmon/email-otp-provider

Email OTP authentication provider for Kenmon.

## Installation

```bash
npm install @kenmon/email-otp-provider
```

## Usage

```typescript
import { KenmonEmailOTPProvider } from '@kenmon/email-otp-provider'

auth.registerProvider(
  new KenmonEmailOTPProvider({
    mailer: new MyMailer(),
    otpStorage: new MyOTPStorage(),
    otp: {
      ttl: 300, // 5 minutes
      length: 6,
    },
    email: {
      from: 'noreply@example.com',
      subject: 'Your verification code',
    },
  }),
)
```

## Configuration

### `mailer` (required)

**You must implement this yourself.** Instance of `KenmonMailer` for sending emails via your email service (SendGrid, AWS SES, etc.).

```typescript
class MyMailer extends KenmonMailer {
  async sendEmail(params: {
    from: string
    to: string | string[]
    subject: string
    textContent?: string
    htmlContent?: string
  }): Promise<void> {
    // Send via your email service
  }
}
```

### `otpStorage` (required)

**You must implement this yourself.** Implementation of `KenmonEmailOTPStorage` for OTP persistence in your database.

```typescript
class MyOTPStorage implements KenmonEmailOTPStorage {
  async createOTP(
    email: string,
    code: string,
    expiresAt: Date,
  ): Promise<KenmonEmailOTP> {
    // Save OTP to database and return it
  }

  async getOTPById(id: string): Promise<KenmonEmailOTP | null> {
    // Fetch OTP from database by ID
  }

  async markOTPAsUsed(id: string): Promise<void> {
    // Mark OTP as used in database
  }
}
```

### `otp` (optional)

- `ttl` - OTP lifetime in seconds (default: 300)
- `length` - OTP code length (default: 6)

### `email` (optional)

- `from` - Sender email address (default: 'noreply@example.com')
- `subject` - Email subject (string or function)
- `textContent` - Plain text email body (function)
- `htmlContent` - HTML email body (function)

### Custom Email Content

You can customize email content using generator functions:

```typescript
new KenmonEmailOTPProvider({
  mailer: new MyMailer(),
  otpStorage: new MyOTPStorage(),
  email: {
    from: 'auth@example.com',
    subject: (code: string, ttl: number) => `Your code: ${code}`,
    textContent: (code: string, ttl: number) =>
      `Code: ${code}\nExpires in ${ttl}s`,
    htmlContent: (code: string, ttl: number) =>
      `<h1>${code}</h1><p>Expires: ${ttl}s</p>`,
  },
})
```

## See Also

- [kenmon](../kenmon) - Core authentication service
- [nextjs-example](../../apps/nextjs-example) - Full implementation with Drizzle
