import { NextRequest } from 'next/server';

const DEEPSEEK_BASE = 'https://api.deepseek.com/v1';

const SYSTEM_PROMPT = `你是"笔灵"，一位专业的AI小说写作助手。你的核心职责是帮助作者完成小说创作，而非替代作者。

## 工作模式
- **执行模式**：严格遵循用户的具体指令修改文本。只做被要求的事，不要随意添加内容。
- **灵感模式**：当用户需要创意时，主动提供多种可能性，从不同角度给出建议。

## 核心规则
1. 始终用中文回复
2. 如果用户选定了具体文本让你修改，聚焦于那段文本，给出修改后的版本和修改理由
3. 如果是灵感/建议类请求，给出2-4个具体的、不同的方向，而非模糊的泛泛而谈
4. 回答要有结构层次，便于作者快速浏览和决策
5. 对于写作技巧类问题，可以引用经典叙事理论，但不要掉书袋
6. 保持鼓励和支持的语气，作者可能正处于创作瓶颈期

## 回复格式
- 修改类：先展示修改结果，再简要说明修改了什么
- 建议类：用编号或加粗标题区分不同方向
- 分析类：先说总体判断，再分点展开`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, systemPrompt } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid request: messages required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;

    if (!apiKey) {
      return handleSimulatedResponse();
    }

    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

    const formattedMessages = [
      { role: 'system', content: systemPrompt || SYSTEM_PROMPT },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
        content: msg.content,
      })),
    ];

    const response = await fetch(`${DEEPSEEK_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        max_tokens: 4096,
        temperature: 0.8,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('DeepSeek API error:', response.status, errorText);
      return new Response(JSON.stringify({ error: `DeepSeek API错误 ${response.status}: ${errorText}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stream the response back as SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
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
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;

              const data = trimmed.slice(6);
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  const chunk = { type: 'text', content: delta };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                }
              } catch {
                // skip unparseable chunks
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}\n\n`));
          controller.close();
        }
      },
      cancel() {
        // Client disconnected
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('AI API error:', error);
    return new Response(JSON.stringify({ error: '服务暂时不可用，请稍后重试' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Fallback when no API key is configured
function handleSimulatedResponse(): Response {
  const SIMULATED_RESPONSE = `好的，我已经理解了你的需求。让我从几个角度来分析：

**1. 情节结构方面**
当前章节的节奏控制得很好，开篇的悬念设置到位。建议在中间部分增加一个小转折，让读者的预期落空，增强阅读张力。

**2. 角色刻画**
主要角色的性格特征需要通过更多细节来展现。目前是"告诉"读者角色是什么样的人，建议改为"展示"——通过动作、对话、内心活动来呈现。

**3. 语言表现**
文字流畅，但可以增加一些独特的比喻和意象，让文本更有个人风格。建议在关键场景中使用更具画面感的描述。

> ⚡ *这是模拟响应。要获得真实的AI写作助手体验，请在 \`.env.local\` 中设置 \`DEEPSEEK_API_KEY\`。*`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const chars = SIMULATED_RESPONSE.split('');
      for (let i = 0; i < chars.length; i += 3) {
        await new Promise((resolve) => setTimeout(resolve, 15 + Math.random() * 30));
        const chunk = { type: 'text', content: chars.slice(i, i + 3).join('') };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
