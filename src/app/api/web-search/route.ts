import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/auth/me/route';
import { ensureSchema } from '@/lib/db-setup';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

// POST /api/web-search - Proxy web search requests
export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  const body = await request.json();
  const { query, num } = body as { query?: string; num?: number };

  if (!query || typeof query !== 'string') {
    return NextResponse.json({ error: 'Missing required parameter: query' }, { status: 400 });
  }

  const searchNum = typeof num === 'number' ? Math.min(Math.max(num, 1), 10) : 5;

  try {
    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', {
      query,
      num: searchNum,
    });

    return NextResponse.json({
      success: true,
      query,
      count: Array.isArray(results) ? results.length : 0,
      results: results || [],
    });
  } catch (error) {
    console.error('Web search error:', error);
    return NextResponse.json({ error: 'Web search failed' }, { status: 500 });
  }
}
