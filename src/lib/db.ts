import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure DATABASE_URL is set
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db