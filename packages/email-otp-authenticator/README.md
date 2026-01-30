# @kenmon/email-otp-authenticator

Email OTP authenticator for Kenmon.

## Installation

```bash
npm install @kenmon/email-otp-authenticator
```

## Usage

```typescript
import { KenmonEmailOTPAuthenticator } from '@kenmon/email-otp-authenticator'

const emailOTP = new KenmonEmailOTPAuthenticator({
  mailer: new MyMailer(),
  otpStorage: new MyOTPStorage(),
  otpTtl: 300, // 5 minutes (optional)
  otpLength: 6, // (optional)
  emailFrom: 'noreply@example.com',
})

// Send OTP
const result = await emailOTP.sendOTP('user@example.com')
if (result.success) {
  const { otpId, signature } = result.data
  // Show signature to user for verification
}

// Verify OTP
const verifyResult = await emailOTP.verifyOTP({
  email: 'user@example.com',
  otpId: 'otp-id-from-send',
  code: '123456',
})
if (verifyResult.success) {
  const identifier = verifyResult.data // { type: 'email-otp', value: 'user@example.com' }
}
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
    signature: string,
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

### `emailFrom` (required)

Sender email address.

### `otpTtl` (optional)

OTP lifetime in seconds. Default: 300 (5 minutes)

### `otpLength` (optional)

OTP code length. Default: 6

### `emailSubject` (optional)

Function to generate email subject: `(code: string, signature: string, otpTtl: number) => string`

### `emailTextContent` (optional)

Function to generate plain text email body: `(code: string, signature: string, otpTtl: number) => string`

### `emailHtmlContent` (optional)

Function to generate HTML email body: `(code: string, signature: string, otpTtl: number) => string`

### Custom Email Content

You can customize email content using generator functions:

```typescript
new KenmonEmailOTPAuthenticator({
  mailer: new MyMailer(),
  otpStorage: new MyOTPStorage(),
  emailFrom: 'auth@example.com',
  emailSubject: (code, signature, otpTtl) => `Your code: ${code}`,
  emailTextContent: (code, signature, otpTtl) =>
    `Code: ${code}\nSignature: ${signature}\nExpires in ${otpTtl}s`,
  emailHtmlContent: (code, signature, otpTtl) =>
    `<h1>${code}</h1><p>Signature: ${signature}</p><p>Expires: ${otpTtl}s</p>`,
})
```

## See Also

- [kenmon](../kenmon) - Core authentication service
- [nextjs-example](../../apps/nextjs-example) - Full implementation with Drizzle
