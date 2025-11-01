export const config = {
  sessionSecret: assertNonEmpty(process.env.SESSION_SECRET),
  databaseUrl: assertNonEmpty(process.env.DATABASE_URL),
  mailerSes: {
    region: process.env.MAILER_SES_REGION,
    accessKeyId: process.env.MAILER_SES_ACCESS_KEY_ID,
    secretAccessKey: process.env.MAILER_SES_SECRET_ACCESS_KEY,
  },
}

function assertNonEmpty(value: string | undefined): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error('Invalid value')
  }
  return value
}
