# Kenmon

A portable authentication module with pluggable providers and framework adapters.

## Monorepo Structure

### Packages

- **[kenmon](./packages/kenmon)** - Core authentication service
- **[@kenmon/nextjs-adapter](./packages/nextjs-adapter)** - Next.js framework adapter
- **[@kenmon/email-otp-provider](./packages/email-otp-provider)** - Email OTP authentication provider

### Apps

- **[nextjs-example](./apps/nextjs-example)** - Full Next.js implementation example

## Quick Start

```bash
pnpm add kenmon @kenmon/email-otp-provider @kenmon/nextjs-adapter
```

See individual package READMEs for usage details and the [nextjs-example](./apps/nextjs-example) for a complete implementation.

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Clean build artifacts
pnpm run clean
```

## License

MIT
