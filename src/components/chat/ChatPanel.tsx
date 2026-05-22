'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@/store/useChat';
import { useWorkspace } from '@/store/useWorkspace';
import { useCharacters } from '@/store/useCharacters';
import { useWorks } from '@/store/useWorks';
import { streamAIResponse } from '@/lib/ai';
import MentionPopover from './MentionPopover';
import { Send, Mic, Sparkles, Wrench, StopCircle, AtSign } from 'lucide-react';

interface ChatPanelProps {
  editorContent?: string;
  selectedText?: string;
}

export default function ChatPanel({ editorContent, selectedText }: ChatPanelProps) {
  const { messages, isStreaming, addMessage, updateLastMessage, setStreaming, setAbortController: storeAbortCtrl } = useChat();
  const { chatMode, setChatMode } = useWorkspace();
  const characters = useCharacters((s) => s.characters);
  const currentChapter = useWorks((s) => s.chapters.find((ch) => ch.id === s.currentChapterId));

  const [input, setInput] = useState('');
  const [showMention, setShowMention] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const contextRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Detect @mention trigger in input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);

    // Check for @mention
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (atMatch) {
      setMentionSearch(atMatch[1]);
      setShowMention(true);
    } else {
      setShowMention(false);
    }
  };

  // Build character context string
  const buildCharacterContext = (): string => {
    const ctxChars: string[] = [];
    contextRef.current.forEach((_, name) => {
      const ch = characters.find((c) => c.name === name);
      if (ch) {
        ctxChars.push(
          `[${ch.name}] 角色:${ch.role}, 年龄:${ch.attributes.age}, 外貌:${ch.attributes.appearance}, 性格:${ch.attributes.personality}, 背景:${ch.attributes.background}, 口头禅:${ch.attributes.quirks.join('、')}`
        );
      }
    });
    return ctxChars.length > 0 ? ctxChars.join('\n') : '';
  };

  const handleMentionSelect = (character: { id: string; name: string; attributes?: { personality: string } }) => {
    // Replace @mention in input
    const cursorPos = inputRef.current?.selectionStart || input.length;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const atIndex = textBefore.lastIndexOf('@');

    if (atIndex !== -1) {
      const newBefore = textBefore.slice(0, atIndex) + `@${character.name} `;
      setInput(newBefore + textAfter);
    }

    // Store character context for AI
    contextRef.current.set(character.name, character.id);

    setShowMention(false);
    setMentionSearch('');
    inputRef.current?.focus();
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput('');
    addMessage('user', text);
    setStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;
    storeAbortCtrl(abortController);

    // Build enriched system prompt
    const charContext = buildCharacterContext();
    let systemPrompt = chatMode === 'inspiration'
      ? '你是"笔灵"，一位AI小说写作助手。当前处于灵感模式。请主动发散创意，提供多个不同的叙事方向。始终用中文回复。'
      : '你是"笔灵"，一位AI小说写作助手。当前处于执行模式。请严格按照指令修改文本，不要添加未要求的内容。始终用中文回复。';

    if (charContext) {
      systemPrompt += `\n\n[已知角色设定]\n${charContext}\n\n请在回复中充分考虑这些角色的设定，确保他们的行为、对话和动机与人设一致。`;
    }

    if (editorContent) {
      systemPrompt += `\n\n[当前章节内容]\n${editorContent.slice(0, 3000)}`;
    }

    if (selectedText) {
      systemPrompt += `\n\n[作者选中的文本（重点关注）]\n${selectedText}`;
    }

    // Build history with current message appended (messages from closure is stale)
    const msgHistory = [
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: text },
    ];

    // Start assistant message
    addMessage('assistant', '');

    let fullResponse = '';

    try {
      const stream = streamAIResponse(msgHistory, systemPrompt, abortController.signal);
      for await (const chunk of stream) {
        if (chunk.type === 'text' && chunk.content) {
          fullResponse += chunk.content;
          updateLastMessage(fullResponse);
        } else if (chunk.type === 'error') {
          updateLastMessage(fullResponse + `\n\n> ⚠️ ${chunk.error}`);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        updateLastMessage(fullResponse + `\n\n> ⚠️ 请求失败: ${(err as Error).message}`);
      }
    } finally {
      setStreaming(false);
      storeAbortCtrl(null);
      abortRef.current = null;
    }
  }, [input, isStreaming, chatMode, messages, editorContent, selectedText, characters, addMessage, updateLastMessage, setStreaming, storeAbortCtrl]);

  const handleStopGeneration = () => {
    if (abortRef.current) abortRef.current.abort();
    setStreaming(false);
    storeAbortCtrl(null);
    abortRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const injectedChars = Array.from(contextRef.current.keys());

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border-l border-[var(--border-color)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--accent)]" />
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI 写作助手</h2>
        </div>
        <div className="flex rounded-lg bg-[var(--bg-tertiary)] p-0.5">
          <button
            onClick={() => setChatMode('execution')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all
              ${chatMode === 'execution'
                ? 'bg-[var(--accent)] text-black font-medium'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Wrench size={12} /> 执行
          </button>
          <button
            onClick={() => setChatMode('inspiration')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs transition-all
              ${chatMode === 'inspiration'
                ? 'bg-[var(--accent)] text-black font-medium'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
          >
            <Sparkles size={12} /> 灵感
          </button>
        </div>
      </div>

      {/* Injected context indicator */}
      {injectedChars.length > 0 && (
        <div className="px-4 py-2 border-b border-[var(--border-color)] bg-[var(--accent-muted)]">
          <div className="flex items-center gap-1.5 text-xs text-[var(--accent)]">
            <AtSign size={12} />
            <span>已注入角色上下文：</span>
            {injectedChars.map((name) => (
              <button
                key={name}
                onClick={() => { contextRef.current.delete(name); setInput((p) => p); }}
                className="px-2 py-0.5 rounded-full bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 transition-colors"
              >
                @{name} ×
              </button>
            ))}
            <span className="text-[var(--text-muted)] ml-1">AI将确保角色行为符合人设</span>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-muted)] flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-[var(--accent)]" />
            </div>
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">开始创作</h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              告诉AI你的想法或修改意见<br />
              输入 <span className="text-[var(--accent)]">@角色名</span> 可注入角色设定<br />
              选中编辑器文字获得精准建议
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-[var(--accent)] text-black'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                }`}
            >
              {msg.role === 'assistant' && msg.content ? (
                <div
                  className="prose prose-sm prose-invert max-w-none [&_strong]:text-[var(--accent)]"
                  dangerouslySetInnerHTML={{
                    __html: msg.content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n\n/g, '<br/><br/>')
                      .replace(/\n/g, '<br/>'),
                  }}
                />
              ) : msg.role === 'assistant' && !msg.content && isStreaming ? (
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border-color)] relative">
        {/* Mention popover */}
        <MentionPopover
          isOpen={showMention}
          search={mentionSearch}
          characters={characters.map((c) => ({
            id: c.id,
            name: c.name,
            role: c.role,
            attributes: c.attributes,
          }))}
          onSelect={handleMentionSelect}
          onClose={() => setShowMention(false)}
          position={{ top: 0, left: 4 }}
        />

        <div className="flex items-end gap-2 bg-[var(--bg-tertiary)] rounded-xl p-2 ring-1 ring-[var(--border-color)] focus-within:ring-[var(--accent)] transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={chatMode === 'inspiration' ? '说说你的想法，AI可以帮你发散... (输入@角色名注入设定)' : '告诉AI如何修改... (输入@角色名注入设定)'}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none outline-none min-h-[40px] max-h-[120px] py-2 px-2"
            rows={1}
            disabled={isStreaming}
          />
          <div className="flex items-center gap-1 pb-1">
            <button className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-colors">
              <Mic size={15} />
            </button>
            {isStreaming ? (
              <button
                onClick={handleStopGeneration}
                className="p-1.5 rounded-md bg-[var(--danger)] text-white hover:opacity-80 transition-opacity"
              >
                <StopCircle size={15} />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-1.5 rounded-md bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
