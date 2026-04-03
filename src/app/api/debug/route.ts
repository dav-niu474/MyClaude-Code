import { NextResponse } from 'next/server'

export async function GET() {
  const dbUrl = process.env.data_POSTGRES_PRISMA_URL || 'NOT_SET'
  const nonPool = process.env.data_POSTGRES_URL_NON_POOLING || 'NOT_SET'
  const poolUrl = process.env.data_POSTGRES_URL || 'NOT_SET'
  const dataDbUrl = process.env.data_DATABASE_URL || 'NOT_SET'
  const dbUrlStd = process.env.DATABASE_URL || 'NOT_SET'
  const jwt = process.env.JWT_SECRET ? 'SET' : 'NOT_SET'

  return NextResponse.json({
    data_POSTGRES_PRISMA_URL: dbUrl ? `${dbUrl.substring(0, 20)}...` : dbUrl,
    data_POSTGRES_URL_NON_POOLING: nonPool ? `${nonPool.substring(0, 20)}...` : nonPool,
    data_POSTGRES_URL: poolUrl ? `${poolUrl.substring(0, 20)}...` : poolUrl,
    data_DATABASE_URL: dataDbUrl ? `${dataDbUrl.substring(0, 20)}...` : dataDbUrl,
    DATABASE_URL: dbUrlStd,
    JWT_SECRET: jwt,
  })
}
