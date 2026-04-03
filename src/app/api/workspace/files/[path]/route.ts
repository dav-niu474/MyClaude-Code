import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/app/api/auth/me/route';
import { ensureSchema } from '@/lib/db-setup';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ path: string }>;
}

// GET /api/workspace/files/[path] - Read a specific file
export async function GET(request: Request, { params }: RouteParams) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  const { path } = await params;
  const decodedPath = decodeURIComponent(path);
  const normalizedPath = decodedPath.replace(/^\/+/, '').replace(/\/+/g, '/');

  try {
    const file = await db.workspaceFile.findFirst({
      where: { userId: user.userId, path: normalizedPath },
      select: {
        id: true,
        path: true,
        fileName: true,
        content: true,
        language: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      file,
    });
  } catch (error) {
    console.error('Read file error:', error);
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}

// DELETE /api/workspace/files/[path] - Delete a specific file
export async function DELETE(request: Request, { params }: RouteParams) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  const { path } = await params;
  const decodedPath = decodeURIComponent(path);
  const normalizedPath = decodedPath.replace(/^\/+/, '').replace(/\/+/g, '/');

  try {
    const file = await db.workspaceFile.findFirst({
      where: { userId: user.userId, path: normalizedPath },
    });

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await db.workspaceFile.delete({
      where: { id: file.id },
    });

    return NextResponse.json({
      success: true,
      deleted: normalizedPath,
    });
  } catch (error) {
    console.error('Delete file error:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
