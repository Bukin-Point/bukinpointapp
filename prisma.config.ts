import { config } from 'dotenv'

// Load environment variables
config()

export default {
  datasource: {
    url: process.env.DATABASE_URL || '',
  },
}
