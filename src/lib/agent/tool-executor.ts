// Tool Executors - Implementation for each tool the AI agent can use

import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import type { ToolCall, ToolResult } from './tools';
import { generateToolCallId } from './tools';

interface ExecutorContext {
  userId: string;
  sessionId?: string;
}

// Compute a simple diff between old and new content
function computeDiff(oldContent: string, newContent: string, path: string): string {
  if (!oldContent) {
    return `+ Created file: ${path} (${newContent.split('\n').length} lines)`;
  }
  if (oldContent === newContent) {
    return `No changes made to ${path}`;
  }

  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  let diff = `--- ${path} (modified)\n`;
  const maxDiff = 20; // Limit diff output
  let changes = 0;

  for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
    if (changes >= maxDiff) {
      diff += `... (${Math.abs(oldLines.length - newLines.length)} more lines changed)\n`;
      break;
    }
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine !== newLine) {
      if (oldLine !== undefined) {
        diff += `- ${oldLine}\n`;
      }
      if (newLine !== undefined) {
        diff += `+ ${newLine}\n`;
      }
      changes++;
    }
  }

  return diff;
}

// Infer language from file path
function inferLanguage(path: string): string | null {
  const ext = path.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    rb: 'ruby',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    r: 'r',
    sql: 'sql',
    html: 'html',
    css: 'css',
    scss: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    md: 'markdown',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    dockerfile: 'dockerfile',
    graphql: 'graphql',
    vue: 'vue',
    svelte: 'svelte',
  };
  return ext ? langMap[ext] || null : null;
}

// Normalize path: ensure leading slash is consistent
function normalizePath(path: string): string {
  // Remove leading slash for consistency, ensure no double slashes
  return path.replace(/^\/+/, '').replace(/\/+/g, '/');
}

// Extract filename from path
function extractFileName(path: string): string {
  const normalized = normalizePath(path);
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

// Execute web search tool
async function executeWebSearch(
  call: ToolCall,
  _ctx: ExecutorContext
): Promise<ToolResult> {
  const { query, num } = call.arguments as { query?: string; num?: number };

  if (!query || typeof query !== 'string') {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: query',
    };
  }

  try {
    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', {
      query,
      num: typeof num === 'number' ? Math.min(Math.max(num, 1), 10) : 5,
    });

    // Format search results
    if (!Array.isArray(results) || results.length === 0) {
      return {
        callId: call.id,
        name: call.name,
        success: true,
        content: 'No results found for the search query.',
      };
    }

    const formatted = results
      .slice(0, 10)
      .map(
        (r: { name?: string; url?: string; snippet?: string; rank?: number }, i: number) =>
          `${i + 1}. **${r.name || 'Untitled'}**\n   URL: ${r.url || 'N/A'}\n   ${r.snippet || 'No description available'}`
      )
      .join('\n\n');

    return {
      callId: call.id,
      name: call.name,
      success: true,
      content: `Found ${results.length} results:\n\n${formatted}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: `Web search failed: ${message}`,
    };
  }
}

// Execute file_read tool
async function executeFileRead(
  call: ToolCall,
  ctx: ExecutorContext
): Promise<ToolResult> {
  const { path } = call.arguments as { path?: string };

  if (!path || typeof path !== 'string') {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: path',
    };
  }

  const normalizedPath = normalizePath(path);

  try {
    const file = await db.workspaceFile.findFirst({
      where: {
        userId: ctx.userId,
        path: normalizedPath,
      },
    });

    if (!file) {
      return {
        callId: call.id,
        name: call.name,
        success: false,
        content: `File not found: ${normalizedPath}`,
      };
    }

    const lines = file.content.split('\n').length;
    return {
      callId: call.id,
      name: call.name,
      success: true,
      content: `File: ${file.path}\nLanguage: ${file.language || 'unknown'}\nSize: ${file.size} bytes, ${lines} lines\n\n${file.content}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: `Failed to read file: ${message}`,
    };
  }
}

// Execute file_write tool
async function executeFileWrite(
  call: ToolCall,
  ctx: ExecutorContext
): Promise<ToolResult> {
  const { path, content } = call.arguments as { path?: string; content?: string };

  if (!path || typeof path !== 'string') {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: path',
    };
  }
  if (content === undefined || content === null) {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: content',
    };
  }

  const normalizedPath = normalizePath(path);
  const fileName = extractFileName(path);
  const language = inferLanguage(path);
  const contentStr = String(content);
  const size = Buffer.byteLength(contentStr, 'utf-8');

  try {
    // Check if file already exists
    const existing = await db.workspaceFile.findFirst({
      where: {
        userId: ctx.userId,
        path: normalizedPath,
      },
    });

    if (existing) {
      // Update existing file
      await db.workspaceFile.update({
        where: { id: existing.id },
        data: {
          content: contentStr,
          size,
          language: language || existing.language,
          sessionId: ctx.sessionId || existing.sessionId,
        },
      });

      const diff = computeDiff(existing.content, contentStr, normalizedPath);
      return {
        callId: call.id,
        name: call.name,
        success: true,
        content: `Updated file: ${normalizedPath}\n\n${diff}`,
      };
    } else {
      // Create new file
      await db.workspaceFile.create({
        data: {
          userId: ctx.userId,
          sessionId: ctx.sessionId || null,
          path: normalizedPath,
          fileName,
          content: contentStr,
          language: language || null,
          size,
        },
      });

      const lines = contentStr.split('\n').length;
      return {
        callId: call.id,
        name: call.name,
        success: true,
        content: `Created file: ${normalizedPath} (${lines} lines, ${size} bytes)\nLanguage: ${language || 'auto-detected'}`,
      };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: `Failed to write file: ${message}`,
    };
  }
}

// Execute file_edit tool
async function executeFileEdit(
  call: ToolCall,
  ctx: ExecutorContext
): Promise<ToolResult> {
  const { path, old_string, new_string } = call.arguments as {
    path?: string;
    old_string?: string;
    new_string?: string;
  };

  if (!path || typeof path !== 'string') {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: path',
    };
  }
  if (!old_string || typeof old_string !== 'string') {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: old_string',
    };
  }
  if (new_string === undefined || new_string === null) {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: new_string',
    };
  }

  const normalizedPath = normalizePath(path);

  try {
    const file = await db.workspaceFile.findFirst({
      where: {
        userId: ctx.userId,
        path: normalizedPath,
      },
    });

    if (!file) {
      return {
        callId: call.id,
        name: call.name,
        success: false,
        content: `File not found: ${normalizedPath}`,
      };
    }

    // Check if old_string exists in file
    const index = file.content.indexOf(old_string);
    if (index === -1) {
      return {
        callId: call.id,
        name: call.name,
        success: false,
        content: `Could not find the specified text in ${normalizedPath}. Make sure the old_string matches exactly (including whitespace and line breaks).`,
      };
    }

    // Count occurrences
    let count = 0;
    let pos = 0;
    while ((pos = file.content.indexOf(old_string, pos)) !== -1) {
      count++;
      pos += old_string.length;
    }

    // Replace first occurrence only
    const newContent = file.content.replace(old_string, String(new_string));
    const newSize = Buffer.byteLength(newContent, 'utf-8');

    await db.workspaceFile.update({
      where: { id: file.id },
      data: {
        content: newContent,
        size: newSize,
      },
    });

    const diff = computeDiff(file.content, newContent, normalizedPath);
    return {
      callId: call.id,
      name: call.name,
      success: true,
      content: `Edited file: ${normalizedPath} (replaced ${count > 1 ? `first of ${count} occurrences` : '1 occurrence'})\n\n${diff}`,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: `Failed to edit file: ${message}`,
    };
  }
}

// Execute file_list tool
async function executeFileList(
  call: ToolCall,
  ctx: ExecutorContext
): Promise<ToolResult> {
  try {
    const files = await db.workspaceFile.findMany({
      where: { userId: ctx.userId },
      orderBy: { path: 'asc' },
      select: {
        path: true,
        fileName: true,
        language: true,
        size: true,
        updatedAt: true,
      },
    });

    if (files.length === 0) {
      return {
        callId: call.id,
        name: call.name,
        success: true,
        content: 'Workspace is empty. No files found.',
      };
    }

    // Build tree structure
    const tree: Record<string, string[]> = {};
    for (const file of files) {
      const parts = file.path.split('/');
      if (parts.length > 1) {
        const dir = parts.slice(0, -1).join('/');
        if (!tree[dir]) tree[dir] = [];
        tree[dir].push(file.fileName);
      } else {
        if (!tree['.']) tree['.'] = [];
        tree['.'].push(file.fileName);
      }
    }

    // Build tree output
    let output = `Workspace (${files.length} files):\n\n`;
    const dirs = Object.keys(tree).sort();
    for (const dir of dirs) {
      if (dir === '.') {
        output += '/ (root)\n';
      } else {
        output += `├── ${dir}/\n`;
      }
      for (const fileName of tree[dir].sort()) {
        const file = files.find((f) => f.fileName === fileName && (dir === '.' ? !f.path.includes('/') : f.path.startsWith(dir + '/')));
        const sizeStr = file ? ` (${file.size} bytes)` : '';
        const langStr = file?.language ? ` [${file.language}]` : '';
        output += `│   ├── ${fileName}${langStr}${sizeStr}\n`;
      }
    }

    return {
      callId: call.id,
      name: call.name,
      success: true,
      content: output.trim(),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: `Failed to list files: ${message}`,
    };
  }
}

// Execute code_analyze tool
async function executeCodeAnalyze(
  call: ToolCall,
  _ctx: ExecutorContext
): Promise<ToolResult> {
  const { code, language } = call.arguments as { code?: string; language?: string };

  if (!code || typeof code !== 'string') {
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: 'Missing required parameter: code',
    };
  }

  const langStr = language ? ` (${language})` : '';

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are a code analysis expert. Analyze the following code${langStr} and provide:
1. A brief summary of what the code does
2. Key observations (patterns, potential issues, suggestions)
3. Any bugs or improvements you notice

Be concise but thorough. Use markdown formatting.`,
        },
        {
          role: 'user',
          content: `Analyze this code${langStr}:\n\n\`\`\`${language || ''}\n${code}\n\`\`\``,
        },
      ],
    });

    const analysis = completion.choices[0]?.message?.content || 'No analysis available.';

    return {
      callId: call.id,
      name: call.name,
      success: true,
      content: analysis,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      callId: call.id,
      name: call.name,
      success: false,
      content: `Code analysis failed: ${message}`,
    };
  }
}

// Main tool executor - routes to the correct handler
export async function executeTool(
  toolCall: ToolCall,
  ctx: ExecutorContext
): Promise<ToolResult> {
  const executors: Record<
    string,
    (call: ToolCall, ctx: ExecutorContext) => Promise<ToolResult>
  > = {
    web_search: executeWebSearch,
    file_read: executeFileRead,
    file_write: executeFileWrite,
    file_edit: executeFileEdit,
    file_list: executeFileList,
    code_analyze: executeCodeAnalyze,
  };

  const executor = executors[toolCall.name];
  if (!executor) {
    return {
      callId: toolCall.id,
      name: toolCall.name,
      success: false,
      content: `Unknown tool: ${toolCall.name}`,
    };
  }

  return executor(toolCall, ctx);
}
