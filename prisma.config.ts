import { config } from 'dotenv'

// Load environment variables
config()

export default {
  migrations: {
    seed: 'tsx prisma/seed-admin-only.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
}
