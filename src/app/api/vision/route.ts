import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/app/api/auth/me/route';
import { ensureSchema } from '@/lib/db-setup';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

// POST /api/vision - Analyze images with VLM (Vision Language Model)
export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await ensureSchema();

  const body = await request.json();
  const { prompt, images } = body as { prompt?: string; images?: string[] };

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Missing required parameter: prompt' }, { status: 400 });
  }

  if (!images || !Array.isArray(images) || images.length === 0) {
    return NextResponse.json({ error: 'Missing required parameter: images (array of base64 data URLs)' }, { status: 400 });
  }

  try {
    const zai = await ZAI.create();

    const content = [
      { type: 'text', text: prompt },
      ...images.map((img) => ({ type: 'image_url', image_url: { url: img } })),
    ];

    const response = await zai.chat.completions.createVision({
      messages: [{ role: 'user', content }],
      thinking: { type: 'disabled' },
    });

    const messageContent = response.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      content: messageContent,
    });
  } catch (error) {
    console.error('Vision analysis error:', error);
    return NextResponse.json({ error: 'Vision analysis failed' }, { status: 500 });
  }
}
