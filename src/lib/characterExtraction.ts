import { streamAIResponse } from './ai';
import type { CharacterCard } from '@/types';

interface ExtractedCharacter {
  name: string;
  aliases?: string[];
  role?: string;
  age?: number;
  gender?: string;
  appearance?: string;
  personality?: string;
  background?: string;
  abilities?: string[];
  quirks?: string[];
  characterArc?: string;
  relationships?: { targetName: string; type: string; description: string }[];
}

export async function extractCharactersFromChapters(
  chaptersText: string,
  existingCharacters: CharacterCard[],
): Promise<ExtractedCharacter[]> {
  const existingNames = existingCharacters.map((c) => c.name).join('、');

  const systemPrompt = `你是一位专业的小说编辑，擅长从文本中提取角色信息。
请仔细阅读以下小说内容，提取其中出现的所有角色的信息。

【重要规则】
1. 只提取文本中明确提到的信息，不要推测或编造
2. 如果某项信息在文本中没有提及，该字段留空字符串或省略
3. 已有角色：${existingNames || '（无）'}
4. 对于已有角色，也要提取文本中提及的所有信息（包括已知道的）
5. 对于文本中出现的所有有名有姓或频繁出现的角色，都要提取

请只返回JSON数组，不要任何markdown标记或其他文字：
[
  {
    "name": "角色名",
    "aliases": ["别名或称呼"],
    "role": "protagonist|antagonist|supporting|cameo",
    "age": 数字或省略,
    "gender": "男|女|其他",
    "appearance": "从文本中提取的外貌描述原文",
    "personality": "从文本中提取的性格描述原文",
    "background": "从文本中提取的背景信息原文",
    "abilities": ["能力列表"],
    "quirks": ["口头禅", "习惯动作"],
    "characterArc": "从文本中推断的人物成长方向",
    "relationships": [
      { "targetName": "另一个角色名", "type": "家人|朋友|恋人|仇敌|师徒|同门|盟友|其他", "description": "从文本提取的关系描述" }
    ]
  }
]`;

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
    return [];
  }

  try {
    const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch {
    console.error('Failed to parse character extraction JSON:', fullResponse.slice(0, 500));
    return [];
  }
}
