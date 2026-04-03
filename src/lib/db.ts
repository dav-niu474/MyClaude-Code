import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Support both Vercel Neon Store (data_ prefix) and direct env vars
  const databaseUrl =
    process.env.data_POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL

  const directUrl =
    process.env.data_POSTGRES_URL_NON_POOLING ||
    process.env.DIRECT_URL

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: {
      db: {
        url: databaseUrl || '',
        directUrl: directUrl,
      },
    },
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
