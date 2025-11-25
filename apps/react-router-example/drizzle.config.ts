import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: '../shared/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ||
      'postgres://kenmon:kenmon_dev_password@localhost:5432/kenmon_dev',
  },
})
