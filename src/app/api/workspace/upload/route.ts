import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/app/api/auth/me/route';
import { ensureSchema } from '@/lib/db-setup';

export const dynamic = 'force-dynamic';

// POST /api/workspace/upload - Multipart form data upload endpoint
// This handles file uploads from the browser's FormData API
export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  try {
    const formData = await request.formData();
    const sessionId = formData.get('sessionId') as string | null;

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

    // Process all uploaded files
    const files = formData.getAll('files') as File[];
    const basePath = (formData.get('basePath') as string) || '';

    for (const file of files) {
      const contentStr = await file.text();
      const normalizedBasePath = basePath.replace(/^\/+/, '').replace(/\/+/, '/');

      // Build file path
      let filePath = file.name;
      if (normalizedBasePath) {
        filePath = `${normalizedBasePath}/${file.name}`;
      }

      const fileName = file.name;
      const size = Buffer.byteLength(contentStr, 'utf-8');

      // Infer language from extension
      const ext = filePath.split('.').pop()?.toLowerCase();
      const langMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
        py: 'python', rs: 'rust', go: 'go', java: 'java', rb: 'ruby',
        php: 'php', swift: 'swift', kt: 'kotlin', c: 'c', cpp: 'cpp',
        h: 'c', hpp: 'cpp', cs: 'csharp', sql: 'sql', html: 'html',
        css: 'css', scss: 'scss', json: 'json', yaml: 'yaml', yml: 'yaml',
        xml: 'xml', md: 'markdown', sh: 'bash', bash: 'bash', graphql: 'graphql',
        vue: 'vue', svelte: 'svelte',
      };
      const language = ext ? langMap[ext] || null : null;

      // Check if file already exists
      const existing = await db.workspaceFile.findFirst({
        where: { userId: user.userId, path: filePath },
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
        results.push({ path: filePath, fileName, status: 'updated', size });
      } else {
        await db.workspaceFile.create({
          data: {
            userId: user.userId,
            sessionId: sessionId || null,
            path: filePath,
            fileName,
            content: contentStr,
            language: language || null,
            size,
          },
        });
        results.push({ path: filePath, fileName, status: 'created', size });
      }
    }

    // Also handle JSON body upload via a 'json' field
    const jsonBody = formData.get('json') as string | null;
    if (jsonBody) {
      try {
        const parsed = JSON.parse(jsonBody) as Array<{ path: string; content: string; language?: string }>;
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (!item.path || item.content === undefined) continue;

            const normalizedPath = item.path.replace(/^\/+/, '').replace(/\/+/g, '/');
            const fileName = normalizedPath.split('/').pop() || normalizedPath;
            const contentStr = String(item.content);
            const size = Buffer.byteLength(contentStr, 'utf-8');

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
            const language = item.language || (ext ? langMap[ext] || null : null);

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
        }
      } catch {
        // JSON parse failed, skip this field
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
