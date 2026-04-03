import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { audio } = await request.json();

    if (!audio || typeof audio !== 'string') {
      return NextResponse.json({ error: 'Audio data is required' }, { status: 400 });
    }

    // Strip data URL prefix if present (e.g. "data:audio/webm;base64,")
    const base64Audio = audio.includes(',')
      ? audio.split(',')[1]
      : audio;

    const zai = await ZAI.create();
    const response = await zai.audio.asr.create({
      file_base64: base64Audio,
    });

    const text = response?.text || '';

    if (!text) {
      return NextResponse.json({ error: 'Could not transcribe audio' }, { status: 400 });
    }

    return NextResponse.json({ success: true, text });
  } catch (error: unknown) {
    console.error('ASR error:', error);
    const message = error instanceof Error ? error.message : 'Failed to transcribe audio';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
