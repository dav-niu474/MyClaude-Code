// AI Agent Tool System - Tool definitions for Claude Code agent

export interface ToolParameterDef {
  type: string;
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameterDef>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  callId: string;
  name: string;
  success: boolean;
  content: string;
  error?: string;
}

// All available tools
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'web_search',
    description:
      'Search the web for current information, news, documentation, or any publicly available content.',
    parameters: {
      query: {
        type: 'string',
        description: 'The search query string',
        required: true,
      },
      num: {
        type: 'number',
        description: 'Number of results to return (1-10, default 5)',
        required: false,
      },
    },
  },
  {
    name: 'file_read',
    description:
      'Read the content of a file from the user workspace. Returns the file content and metadata.',
    parameters: {
      path: {
        type: 'string',
        description: 'The file path to read (e.g., "src/index.ts", "README.md")',
        required: true,
      },
    },
  },
  {
    name: 'file_write',
    description:
      'Create a new file or completely overwrite an existing file in the user workspace. Use this to create or update files with new content.',
    parameters: {
      path: {
        type: 'string',
        description: 'The file path to write (e.g., "src/components/App.tsx")',
        required: true,
      },
      content: {
        type: 'string',
        description: 'The full content to write to the file',
        required: true,
      },
    },
  },
  {
    name: 'file_edit',
    description:
      'Edit a file by searching for an exact text match and replacing it. This is safer than file_write for small changes because it preserves the rest of the file.',
    parameters: {
      path: {
        type: 'string',
        description: 'The file path to edit',
        required: true,
      },
      old_string: {
        type: 'string',
        description: 'The exact text to find in the file (must match exactly, including whitespace)',
        required: true,
      },
      new_string: {
        type: 'string',
        description: 'The replacement text',
        required: true,
      },
    },
  },
  {
    name: 'file_list',
    description:
      'List all files in the user workspace. Returns a tree-structured list of files with their paths, sizes, and languages.',
    parameters: {},
  },
  {
    name: 'code_analyze',
    description:
      'Analyze a piece of code and provide a detailed explanation. Useful for understanding complex code, finding bugs, or getting suggestions.',
    parameters: {
      code: {
        type: 'string',
        description: 'The code to analyze',
        required: true,
      },
      language: {
        type: 'string',
        description: 'The programming language of the code (e.g., "typescript", "python", "rust")',
        required: false,
      },
    },
  },
];

// Build the tool definitions section of the system prompt
export function buildToolPromptSection(): string {
  let section = '## Available Tools\n\n';

  for (const tool of TOOL_DEFINITIONS) {
    section += `### ${tool.name}\n${tool.description}\nParameters: `;
    const params = Object.entries(tool.parameters)
      .map(([key, param]) => {
        let desc = `"${key}": "${param.type} - ${param.description}"`;
        if (param.required) desc += ' (required)';
        return desc;
      })
      .join(', ');
    section += `{${params}}\n\n`;
  }

  return section;
}

// Parse tool call from LLM response
// LLM responds with: {"tool": "tool_name", "arguments": {...}}
export function parseToolCall(text: string): ToolCall | null {
  const trimmed = text.trim();

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.tool && typeof parsed.tool === 'string') {
      const toolDef = TOOL_DEFINITIONS.find((t) => t.name === parsed.tool);
      if (toolDef) {
        return {
          id: `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
          name: parsed.tool,
          arguments: parsed.arguments || {},
        };
      }
    }
  } catch {
    // Not valid JSON, not a tool call
  }

  return null;
}

// Generate a unique tool call ID
export function generateToolCallId(): string {
  return `call_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

// Validate tool call arguments against definition
export function validateToolCall(
  name: string,
  arguments_: Record<string, unknown>
): string | null {
  const toolDef = TOOL_DEFINITIONS.find((t) => t.name === name);
  if (!toolDef) return `Unknown tool: ${name}`;

  for (const [paramName, paramDef] of Object.entries(toolDef.parameters)) {
    if (paramDef.required && (arguments_[paramName] === undefined || arguments_[paramName] === null)) {
      return `Missing required parameter: ${paramName}`;
    }
  }

  return null; // No validation errors
}

// Build the system prompt for the agent
export function buildAgentSystemPrompt(): string {
  return `You are Claude Code, an AI coding assistant that can use tools to help users. You have access to a workspace where you can read, write, and edit files, search the web, and analyze code.

${buildToolPromptSection()}
## Response Format

IMPORTANT: You MUST follow this format exactly.

When you need to use a tool, respond with ONLY a JSON object on its own line (nothing else on that line):
{"tool": "tool_name", "arguments": {...}}

For example, to search the web:
{"tool": "web_search", "arguments": {"query": "Next.js 15 features", "num": 5}}

To read a file:
{"tool": "file_read", "arguments": {"path": "src/index.ts"}}

When you are done using tools and want to respond to the user with your final answer, write your response as normal text (NOT as JSON). The system will detect that it's not a tool call and present it to the user.

IMPORTANT RULES:
1. Only call ONE tool at a time per response
2. After receiving tool results, you may call more tools or give your final answer
3. Always explain what you're doing before calling a tool - write a brief description, then on the NEXT line put the tool call JSON
4. When writing code, ALWAYS use the file_write tool to save it to the workspace
5. When making small edits, use file_edit instead of file_write
6. Always use the exact file path the user specifies
7. If a tool fails, explain the error and try a different approach
8. Be thorough and complete in your responses
9. Format code blocks with appropriate language identifiers when responding to the user

EXAMPLE INTERACTION:
User: "Create a React component that says hello"
Assistant: I'll create a React component for you.
{"tool": "file_write", "arguments": {"path": "Hello.tsx", "content": "export default function Hello() {\\n  return <h1>Hello World!</h1>;\\n}"}}
[system provides tool result]
Assistant: I've created the \`Hello.tsx\` component. Here's what it does:...`;
}
