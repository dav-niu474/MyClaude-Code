import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/app/api/auth/me/route';
import { ensureSchema } from '@/lib/db-setup';

export const dynamic = 'force-dynamic';

// POST /api/workspace/upload - Upload files via JSON
export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  try {
    const body = await request.json();
    const { files, sessionId } = body as {
      files: Array<{ path: string; content: string; language?: string }>;
      sessionId?: string;
    };

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'No files provided. Send { files: [{ path, content, language? }] }' }, { status: 400 });
    }

    // Verify session ownership if sessionId is provided
    if (sessionId) {
      const session = await db.session.findFirst({
        where: { id: sessionId, userId: user.userId },
      });
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
    }

    const results: Array<{
      path: string;
      fileName: string;
      status: 'created' | 'updated';
      size: number;
    }> = [];

    for (const file of files) {
      if (!file.path || typeof file.path !== 'string') continue;
      if (file.content === undefined || file.content === null) continue;

      // Normalize path
      const normalizedPath = file.path.replace(/^\/+/, '').replace(/\/+/g, '/');
      const fileName = normalizedPath.split('/').pop() || normalizedPath;
      const contentStr = String(file.content);
      const size = Buffer.byteLength(contentStr, 'utf-8');

      // Infer language if not provided
      const ext = normalizedPath.split('.').pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
        php: 'php', swift: 'swift', kt: 'kotlin', c: 'c', cpp: 'cpp',
        h: 'c', hpp: 'cpp', cs: 'csharp', sql: 'sql', html: 'html',
        css: 'css', scss: 'scss', json: 'json', yaml: 'yaml', yml: 'yaml',
        xml: 'xml', md: 'markdown', sh: 'bash', bash: 'bash', graphql: 'graphql',
        vue: 'vue', svelte: 'svelte',
      };
      const language = file.language || (ext ? langMap[ext] || null : null);

      // Check if file already exists
      const existing = await db.workspaceFile.findFirst({
        where: { userId: user.userId, path: normalizedPath },
      });

      if (existing) {
        await db.workspaceFile.update({
          where: { id: existing.id },
          data: {
            content: contentStr,
            size,
            language: language || existing.language,
            sessionId: sessionId || existing.sessionId,
          },
        });
        results.push({ path: normalizedPath, fileName, status: 'updated', size });
      } else {
        await db.workspaceFile.create({
          data: {
            userId: user.userId,
            sessionId: sessionId || null,
            path: normalizedPath,
            fileName,
            content: contentStr,
            language: language || null,
            size,
          },
        });
        results.push({ path: normalizedPath, fileName, status: 'created', size });
      }
    }

    return NextResponse.json({
      success: true,
      uploaded: results.length,
      files: results,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload files' }, { status: 500 });
  }
}

// GET /api/workspace/files - List all files for the current user
export async function GET(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');

  try {
    const whereClause: Record<string, unknown> = { userId: user.userId };
    if (sessionId) {
      whereClause.sessionId = sessionId;
    }

    const files = await db.workspaceFile.findMany({
      where: whereClause,
      orderBy: { path: 'asc' },
      select: {
        id: true,
        path: true,
        fileName: true,
        language: true,
        size: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      count: files.length,
      files,
    });
  } catch (error) {
    console.error('List files error:', error);
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 });
  }
}
