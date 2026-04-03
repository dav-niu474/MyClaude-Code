import { db } from '@/lib/db';
import { getUserFromRequest } from '../auth/me/route';
import ZAI from 'z-ai-web-dev-sdk';

const DEFAULT_SYSTEM_PROMPT = `You are Claude Code, an AI-powered coding assistant. You help users with:
- Writing and editing code
- Debugging and fixing errors
- Explaining code and concepts
- Architectural decisions
- File operations and project management

You are running inside the MyClaude Code platform. Be helpful, concise, and provide code examples when relevant.
Always format code blocks with the appropriate language identifier.`;

export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();
  const { sessionId, message } = body;

  if (!sessionId || !message) {
    return new Response(JSON.stringify({ error: 'Session ID and message are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Verify session ownership
  const session = await db.session.findFirst({
    where: { id: sessionId, userId: user.userId },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });

  if (!session) {
    return new Response(JSON.stringify({ error: 'Session not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Save user message
  await db.message.create({
    data: {
      sessionId,
      role: 'user',
      content: message
    }
  });

  // Build message history for LLM
  const systemPrompt = session.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const conversationHistory = session.messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content
  }));

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory,
    { role: 'user' as const, content: message }
  ];

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';

      try {
        const zai = await ZAI.create();

        const completion = await zai.chat.completions.create({
          messages,
          thinking: { type: 'disabled' }
        });

        const response = completion.choices[0]?.message?.content || '';

        // Simulate streaming by sending chunks
        const words = response.split(' ');
        for (let i = 0; i < words.length; i++) {
          const chunk = i === 0 ? words[i] : ' ' + words[i];
          fullResponse += chunk;

          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`
          ));

          // Small delay for streaming effect
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Send done event
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`
        ));

        // Save assistant message to database
        await db.message.create({
          data: {
            sessionId,
            role: 'assistant',
            content: fullResponse
          }
        });

        // Update session title based on first user message if it's still "New Chat"
        if (session.title === 'New Chat') {
          const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
          await db.session.update({
            where: { id: sessionId },
            data: { title }
          });
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Chat error:', error);
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: 'Failed to generate response' })}\n\n`
        ));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}
