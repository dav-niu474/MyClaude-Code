import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '../auth/me/route';
import { ensureSchema } from '@/lib/db-setup';

// GET /api/sessions - List all sessions for current user
export async function GET(request: Request) {
  await ensureSchema();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await db.session.findMany({
    where: { userId: user.userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      model: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { messages: true }
      }
    }
  });

  return NextResponse.json({ sessions });
}

// POST /api/sessions - Create a new session
export async function POST(request: Request) {
  await ensureSchema();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, model, systemPrompt } = body;

  const session = await db.session.create({
    data: {
      userId: user.userId,
      title: title || 'New Chat',
      model: model || 'default',
      systemPrompt: systemPrompt || null,
    }
  });

  return NextResponse.json({ session }, { status: 201 });
}

// DELETE /api/sessions - Delete a session
export async function DELETE(request: Request) {
  await ensureSchema();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id');

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

  await db.session.delete({ where: { id: sessionId } });

  return NextResponse.json({ success: true });
}

// PATCH /api/sessions - Update a session (rename, change model, etc.)
export async function PATCH(request: Request) {
  await ensureSchema();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { id, title, model, systemPrompt } = body;

  if (!id) {
    return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
  }

  // Verify ownership
  const session = await db.session.findFirst({
    where: { id, userId: user.userId }
  });

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (model !== undefined) updateData.model = model;
  if (systemPrompt !== undefined) updateData.systemPrompt = systemPrompt;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const updatedSession = await db.session.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ session: updatedSession });
}
