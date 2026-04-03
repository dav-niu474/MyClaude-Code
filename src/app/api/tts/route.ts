import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { text, voice, speed } = await request.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    // TTS max 1024 characters
    const truncatedText = text.trim().substring(0, 1024);

    const zai = await ZAI.create();
    const response = await zai.audio.tts.create({
      input: truncatedText,
      voice: voice || 'tongtong',
      speed: speed || 1.0,
      response_format: 'wav',
      stream: false,
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(arrayBuffer));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: unknown) {
    console.error('TTS error:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate speech';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
