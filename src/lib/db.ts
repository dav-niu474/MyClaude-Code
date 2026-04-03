import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function getDatabaseUrl() {
  // Vercel Neon Store integration injects data_ prefixed env vars
  const neonPrismaUrl = process.env.data_POSTGRES_PRISMA_URL
  const neonNonPooling = process.env.data_POSTGRES_URL_NON_POOLING
  const directUrl = process.env.DIRECT_URL

  // For Neon, prefer non-pooled connection (better for Prisma)
  if (neonPrismaUrl) return neonPrismaUrl
  if (neonNonPooling) return neonNonPooling

  // Fallback to standard DATABASE_URL (local development)
  return process.env.DATABASE_URL || ''
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasourceUrl: getDatabaseUrl(),
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
