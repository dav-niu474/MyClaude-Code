import { NextResponse } from 'next/server'
import { ensureSchema } from '@/lib/db-setup'

export async function POST() {
  try {
    await ensureSchema()
    return NextResponse.json({ success: true, message: 'Database schema initialized' })
  } catch (error) {
    console.error('Setup failed:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to initialize database schema', error: String(error) },
      { status: 500 }
    )
  }
}

export async function GET() {
  return POST()
}
