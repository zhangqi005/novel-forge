// ===== Data Models =====

export interface Work {
  id: string;
  title: string;
  type: 'novel' | 'short_story';
  genre: string[];
  wordCount: number;
  targetWordCount: number;
  status: 'draft' | 'ongoing' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface Chapter {
  id: string;
  workId: string;
  chapterNumber: number;
  title: string;
  content: Record<string, unknown>; // TipTap JSON
  wordCount: number;
  status: 'outline' | 'draft' | 'revised' | 'done';
  scenes: Scene[];
  plotPoints: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Scene {
  id: string;
  chapterId: string;
  order: number;
  title: string;
  summary: string;
  povCharacterId: string;
  location: string;
  timeline: string;
  plotlineTags: string[];
}

export interface CharacterCard {
  id: string;
  workId: string;
  name: string;
  aliases: string[];
  role: 'protagonist' | 'antagonist' | 'supporting' | 'cameo';
  attributes: {
    age: number;
    gender: string;
    appearance: string;
    personality: string;
    background: string;
    abilities: string[];
    quirks: string[];
  };
  characterArc: string;
  relationships: Relationship[];
  relatedChapterIds: string[];
  avatar?: string;
}

export interface Relationship {
  targetCharacterId: string;
  type: string;
  description: string;
}

export interface OutlineNode {
  id: string;
  workId: string;
  parentId: string | null;
  type: 'volume' | 'chapter' | 'scene';
  title: string;
  summary: string;
  order: number;
  storylines: string[];
  foreshadows: Foreshadow[];
  status: 'planned' | 'writing' | 'done';
}

export interface Foreshadow {
  id: string;
  description: string;
  plantedChapterId: string;
  resolvedChapterId?: string;
  status: 'planted' | 'resolved';
}

export interface Storyline {
  id: string;
  workId: string;
  name: string;
  type: 'main' | 'subplot' | 'romance' | 'mystery' | 'custom';
  color: string;
  description: string;
  nodes: StorylineNode[];
}

export interface StorylineNode {
  id: string;
  chapterId: string;
  description: string;
  order: number;
}

export interface WritingSnapshot {
  id: string;
  chapterId: string;
  content: Record<string, unknown>;
  version: number;
  source: 'manual' | 'ai_generated' | 'ai_revised';
  prompt?: string;
  createdAt: Date;
}

// ===== AI Chat Types =====

export type AIMode = 'inspiration' | 'execution';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
}

export interface AISuggestion {
  id: string;
  originalText: string;
  suggestedText: string;
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'partial';
}

// ===== Multi-Agent Discussion Types =====

export interface AgentPersona {
  id: string;
  name: string;
  emoji: string;
  role: string;
  systemPrompt: string;
  color: string;
}

export interface DiscussionMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: Date;
}

export interface Discussion {
  id: string;
  workId: string;
  topic: string;
  messages: DiscussionMessage[];
  agents: string[]; // agent IDs
}

// ===== Workspace State =====

export type PanelView = 'chapters' | 'characters' | 'outline' | 'storylines' | 'discussion';

export interface WorkspaceState {
  currentWorkId: string | null;
  currentChapterId: string | null;
  leftPanelView: PanelView;
  chatMode: AIMode;
  leftPanelWidth: number;
  rightPanelWidth: number;
}
