# Kenmon Next.js Example

This is an example Next.js application demonstrating the Kenmon authentication library with PostgreSQL and Drizzle ORM.

## Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- npm or yarn

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
cd examples/nextjs
cp .env.example .env
```

The default `.env` should contain:

```env
DATABASE_URL=postgres://kenmon:kenmon_dev_password@localhost:5432/kenmon_dev
SESSION_SECRET=your-secret-key-here-change-me-in-production
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Push Database Schema

Use Drizzle Kit to push the schema to your database:

```bash
npm run db:push
```

Alternatively, you can generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Scripts

- `npm run db:generate` - Generate migration files from schema
- `npm run db:migrate` - Run migrations
- `npm run db:push` - Push schema changes directly to database (useful for development)
- `npm run db:studio` - Open Drizzle Studio to browse your database

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

### OTPs

- `id` (UUID, primary key)
- `email` (string)
- `code` (string)
- `expires_at` (timestamp)
- `used` (boolean)
- `created_at` (timestamp)

## Stopping the Database

To stop the PostgreSQL container:

```bash
docker-compose down
```

To stop and remove all data:

```bash
docker-compose down -v
```
