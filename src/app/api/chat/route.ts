import { db } from '@/lib/db';
import { getUserFromRequest } from '../auth/me/route';
import { ensureSchema } from '@/lib/db-setup';
import ZAI from 'z-ai-web-dev-sdk';
import { buildAgentSystemPrompt, parseToolCall, generateToolCallId } from '@/lib/agent/tools';
import { executeTool } from '@/lib/agent/tool-executor';

export const dynamic = 'force-dynamic';

const MAX_AGENT_ITERATIONS = 10;

export async function POST(request: Request) {
  const user = getUserFromRequest(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  await ensureSchema();

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

  // Create SSE stream with agent loop
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      const agentContext = {
        userId: user.userId,
        sessionId,
      };

      try {
        const zai = await ZAI.create();

        // Build initial messages array
        const systemPrompt = buildAgentSystemPrompt();
        const conversationHistory = session.messages.map(m => ({
          role: m.role as 'user' | 'assistant' | 'system',
          content: m.content
        }));

        // We'll manage a working set of messages for the agent loop
        // These include the system prompt + conversation history + current turn
        const agentMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: message },
        ];

        let iteration = 0;

        while (iteration < MAX_AGENT_ITERATIONS) {
          iteration++;
          console.log(`[Agent] Iteration ${iteration}/${MAX_AGENT_ITERATIONS}`);

          // Call LLM
          const completion = await zai.chat.completions.create({
            messages: agentMessages,
            thinking: { type: 'disabled' }
          });

          const response = completion.choices[0]?.message?.content || '';
          if (!response) {
            // Empty response - break
            break;
          }

          // Check if the response is a tool call
          // The LLM may produce text before the tool call JSON on the same response
          // We need to handle this: extract any text before the JSON, check if the last line is a tool call

          const lines = response.split('\n');
          let textBefore = '';
          let toolCallLine = '';

          // Find if the last non-empty line is a tool call JSON
          for (let i = lines.length - 1; i >= 0; i--) {
            const trimmedLine = lines[i].trim();
            if (!trimmedLine) continue;
            
            const parsed = parseToolCall(trimmedLine);
            if (parsed) {
              toolCallLine = trimmedLine;
              // Everything before this line is text
              textBefore = lines.slice(0, i).join('\n').trim();
              break;
            }
          }

          if (toolCallLine) {
            // This is a tool call
            const toolCall = parseToolCall(toolCallLine);
            if (!toolCall) {
              // Shouldn't happen but handle gracefully
              break;
            }

            // Stream any text before the tool call
            if (textBefore) {
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'delta', content: textBefore + '\n' })}\n\n`
              ));
              fullResponse += textBefore + '\n';
            }

            // Stream tool_call event
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'tool_call', id: toolCall.id, name: toolCall.name, arguments: toolCall.arguments })}\n\n`
            ));

            // Execute the tool
            const result = await executeTool(toolCall, agentContext);

            // Stream tool_result event
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ type: 'tool_result', id: result.callId, name: result.name, success: result.success, content: result.content })}\n\n`
            ));

            // Add to agent messages for context
            agentMessages.push({ role: 'assistant', content: response });
            agentMessages.push({
              role: 'user',
              content: `Tool result for ${result.name}:\n${result.success ? 'Success' : 'Error'}:\n${result.content}\n\nYou may now call another tool or provide your final response to the user.`
            });

            // Continue the loop - the agent will see the tool result and decide what to do next
            continue;
          }

          // This is a final text response (no tool call detected)
          // Stream the response word by word for a nice streaming effect
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

          // Update session title if it's still default
          if (session.title === 'New Chat') {
            const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
            await db.session.update({
              where: { id: sessionId },
              data: { title }
            });
          }

          // Break - we got our final response
          break;
        }

        // Handle case where we hit max iterations
        if (iteration >= MAX_AGENT_ITERATIONS) {
          const timeoutMsg = '\n\n[I reached the maximum number of tool calls. Please ask me to continue if needed.]';
          fullResponse += timeoutMsg;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'delta', content: timeoutMsg })}\n\n`
          ));
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'done', content: fullResponse })}\n\n`
          ));

          // Save to database
          await db.message.create({
            data: {
              sessionId,
              role: 'assistant',
              content: fullResponse
            }
          });
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Agent error:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: `Agent error: ${errorMsg}` })}\n\n`
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
