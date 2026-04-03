import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '../auth/me/route';

// GET /api/messages?sessionId=xxx - Get all messages for a session
export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  // Verify ownership
  const session = await db.session.findFirst({
    where: { id: sessionId, userId: user.userId }
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const messages = await db.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      metadata: true,
      createdAt: true
    }
  });

  return NextResponse.json({ messages });
}
