# React Router Example

Full implementation of Kenmon authentication in a React Router application with PostgreSQL and Drizzle ORM.

## Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- pnpm

## Setup

### 1. Start PostgreSQL Database

From the project root directory, start the PostgreSQL container:

```bash
docker-compose up -d
```

This will start a PostgreSQL 16 container on port 5432 with:

- Database: `kenmon_dev`
- User: `kenmon`
- Password: `kenmon_dev_password`

### 2. Configure Environment Variables

Copy the example environment file and update it with your values:

```bash
cd apps/react-router-example
cp .env.example .env
```

The default `.env` should contain:

```env
DATABASE_URL=postgres://kenmon:kenmon_dev_password@localhost:5432/kenmon_dev
SESSION_SECRET=your-secret-key-here-change-me-in-production
```

### 3. Install Dependencies

```bash
pnpm install
```

### 4. Push Database Schema

Use Drizzle Kit to push the schema to your database:

```bash
pnpm run db:push
```

### 5. Run Development Server

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Database Scripts

- `pnpm run db:push` - Push schema changes directly to database (useful for development)
- `pnpm run db:studio` - Open Drizzle Studio to browse your database

## Database Schema

The application uses the following tables:

### Users

- `id` (UUID, primary key)
- `email` (string, unique)
- `created_at` (timestamp)
- `updated_at` (timestamp)

### Sessions

- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `token` (text)
- `expires_at` (timestamp)
- `invalidated` (boolean)
- `ip_address` (string, optional)
- `user_agent` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `refreshed_at` (timestamp, optional)

### OTPs

- `id` (UUID, primary key)
- `email` (string)
- `code` (string)
- `expires_at` (timestamp)
- `used` (boolean)
- `created_at` (timestamp)

## Key Features

### Middleware Configuration

React Router adapter requires middleware setup for request/response context:

```typescript
// app/root.tsx
import { kenmonReactRouterMiddleware } from '@kenmon/react-router-adapter'

export const middleware: Route.MiddlewareFunction[] = [
  kenmonReactRouterMiddleware,
]
```

**Important:** You must also enable v8_middleware in `react-router.config.ts`:

```typescript
export default {
  future: {
    v8_middleware: true,
  },
}
```

### Session Refresh

Client-side automatic session refresh using the `SessionRefresh` component:

```tsx
// app/root.tsx
import { SessionRefresh } from '@kenmon/react-router-adapter'

;<SessionRefresh method='post' action='/api/refresh' refreshInterval={86400} />
```

The component automatically refreshes sessions based on the configured interval (24 hours by default). The refresh action is defined in `app/routes/api.refresh.tsx`.

### IP Address Tracking

Sessions capture IP address from request headers:

```typescript
// app/lib/auth/utils.ts
export function getIPAddress(headers: Headers): string | undefined {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    undefined
  )
}

// Example usage in route:
import { getRequestMetadata } from '@/lib/auth/utils'
```

### Storage Implementation

Uses shared storage classes from `@shared/storage` for sessions and OTP using Drizzle ORM:

- `DrizzleSessionStorage` - User and session persistence
- `DrizzleEmailOTPStorage` - OTP persistence

See `@shared/storage/drizzleStorage.ts` for the full implementation.

## Project Structure

```
app/
├── routes/           # React Router routes
│   ├── _index.tsx    # Home page
│   ├── login.tsx     # Login page
│   └── api.refresh.tsx # Session refresh action
├── components/       # React components (UI)
├── lib/
│   ├── auth/         # Auth configuration
│   │   ├── auth.ts   # Kenmon setup
│   │   └── utils.ts  # Helper functions
│   ├── db/           # Database setup and schema
│   └── config.ts     # App configuration
└── root.tsx          # Root layout with middleware
```

## Stopping the Database

To stop the PostgreSQL container:

```bash
docker-compose down
```

To stop and remove all data:

```bash
docker-compose down -v
```

## See Also

- [kenmon](../../packages/kenmon) - Core authentication service
- [@kenmon/react-router-adapter](../../packages/react-router-adapter) - React Router adapter
- [@kenmon/email-otp-provider](../../packages/email-otp-provider) - Email OTP provider
