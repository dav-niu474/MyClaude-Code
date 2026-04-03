import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Helper to get current user from request
function getUserFromRequest(request: Request): { userId: string; email: string } | null {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
    if (payload.exp && payload.exp < Date.now()) return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

export { getUserFromRequest };

export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUser = await db.user.findUnique({
    where: { id: user.userId },
    select: { id: true, email: true, name: true, avatarUrl: true, createdAt: true }
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ user: dbUser });
}
