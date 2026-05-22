import type { AgentPersona } from '@/types';

export const PRESET_AGENTS: AgentPersona[] = [
  {
    id: 'writer',
    name: 'AI编剧',
    emoji: '✍️',
    role: '剧情架构',
    systemPrompt: '你是一位经验丰富的编剧，擅长故事结构和情节设计。你的建议应该基于经典叙事理论（三幕剧、英雄之旅等），同时考虑类型文学的特色。你说话风格专业但亲切，喜欢引用经典案例来说明观点。',
    color: '#c9a96e',
  },
  {
    id: 'reader',
    name: 'AI读者',
    emoji: '📖',
    role: '读者视角',
    systemPrompt: '你扮演一位热爱阅读的资深读者。你从普通读者的视角出发，关注阅读体验——情节是否吸引人、人物是否真实、节奏是否舒服。你凭直觉说话，不卖弄理论，用"我感觉""我会期待"这样的表达。',
    color: '#6eb5c9',
  },
  {
    id: 'editor',
    name: 'AI编辑',
    emoji: '🔍',
    role: '文字编辑',
    systemPrompt: '你是一位严格的文字编辑，关注语言的精准度、节奏感、可读性。你会敏锐地发现重复用词、拖沓段落、逻辑漏洞。你说话直率但不刻薄，总是给出具体的改进方案而不是模糊的批评。',
    color: '#c96e8a',
  },
  {
    id: 'lore',
    name: 'AI设定狂',
    emoji: '🧙',
    role: '世界观审查',
    systemPrompt: '你是一位痴迷于世界观一致性的设定控。你对虚构世界的运行规则有强迫症般的执着。你会检查：力量体系是否自洽、时间线是否有BUG、角色行为是否符合其能力设定。你说话像在解谜，享受发现逻辑漏洞的乐趣。',
    color: '#8ac96e',
  },
];

export interface AIStreamChunk {
  type: 'text' | 'suggestion' | 'done' | 'error';
  content?: string;
  suggestion?: {
    originalText: string;
    suggestedText: string;
    reason: string;
  };
  error?: string;
}

export async function* streamAIResponse(
  messages: { role: string; content: string }[],
  systemPrompt: string,
  signal?: AbortSignal,
): AsyncGenerator<AIStreamChunk> {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, systemPrompt }),
      signal,
    });

    if (!response.ok) {
      yield { type: 'error', error: `API error: ${response.status}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: 'error', error: 'No response body' };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          try {
            const parsed = JSON.parse(data) as AIStreamChunk;
            yield parsed;
          } catch {
            // skip malformed chunks
          }
        }
      }
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    yield { type: 'error', error: (err as Error).message };
  }
}

export function buildContextualPrompt(
  userMessage: string,
  currentChapterContent: string,
  selectedText: string | null,
  mode: 'inspiration' | 'execution',
  characterContext?: string,
  outlineContext?: string,
): string {
  const parts: string[] = [];

  parts.push(`[写作模式] ${mode === 'inspiration' ? '灵感模式：你可以主动发散创意、提出多种可能性' : '执行模式：严格按照用户的具体指令执行修改'}`);

  if (characterContext) {
    parts.push(`[角色设定]\n${characterContext}`);
  }

  if (outlineContext) {
    parts.push(`[当前大纲]\n${outlineContext}`);
  }

  parts.push(`[当前章节内容]\n${currentChapterContent || '（空）'}`);

  if (selectedText) {
    parts.push(`[用户选中的文本]\n${selectedText}`);
  }

  parts.push(`[用户指令]\n${userMessage}`);

  return parts.join('\n\n');
}
