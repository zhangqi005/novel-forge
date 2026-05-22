import { streamAIResponse } from './ai';
import type { OutlineNode, Storyline, Foreshadow } from '@/types';

interface ExtractedOutline {
  outlineNodes: {
    title: string;
    type: 'volume' | 'chapter' | 'scene';
    parentTitle: string | null;
    summary: string;
    status: 'planned' | 'writing' | 'done';
    storylines: string[];
    foreshadows: { description: string; plantedChapterTitle: string }[];
  }[];
  storylines: {
    name: string;
    type: 'main' | 'subplot' | 'romance' | 'mystery' | 'custom';
    description: string;
  }[];
}

export async function extractOutlineFromChapters(
  chaptersText: string,
  existingOutlineTitles: string[],
  existingStorylineNames: string[],
): Promise<ExtractedOutline | null> {
  const systemPrompt = `你是一位专业的小说编辑，擅长分析小说结构并整理大纲。

请分析以下小说内容，整理出大纲结构和故事线。

【已有大纲节点标题】${existingOutlineTitles.join('、') || '（空）'}
【已有故事线】${existingStorylineNames.join('、') || '（空）'}

【任务规则】
1. 为每个章节创建大纲节点，提取1-2句摘要（概括该章主要情节）
2. 如果章节数≥5，尝试将章节分组为"卷"，卷作为父节点
3. 识别贯穿多章的故事线（主线、支线、感情线等）
4. 识别文本中已埋下的伏笔
5. 已有的大纲节点和故事线不要重复创建
6. 只基于文本中实际存在的内容，不要编造

请只返回JSON，不要任何markdown标记或其他文字：
{
  "outlineNodes": [
    {
      "title": "节点标题（应与章节标题一致）",
      "type": "volume|chapter|scene",
      "parentTitle": "父节点标题或null",
      "summary": "该章节的情节摘要，1-2句话",
      "status": "writing",
      "storylines": ["所属故事线名称"],
      "foreshadows": [
        { "description": "伏笔描述", "plantedChapterTitle": "埋设该伏笔的章节标题" }
      ]
    }
  ],
  "storylines": [
    { "name": "故事线名称", "type": "main|subplot|romance|mystery|custom", "description": "故事线简介" }
  ]
}`;

  let fullResponse = '';
  try {
    const stream = streamAIResponse(
      [{ role: 'user', content: chaptersText.slice(0, 12000) }],
      systemPrompt,
    );

    for await (const chunk of stream) {
      if (chunk.type === 'text' && chunk.content) {
        fullResponse += chunk.content;
      }
    }
  } catch {
    return null;
  }

  try {
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.outlineNodes && Array.isArray(parsed.outlineNodes)) {
        return parsed;
      }
    }
    return null;
  } catch {
    console.error('Failed to parse outline extraction JSON:', fullResponse.slice(0, 500));
    return null;
  }
}
