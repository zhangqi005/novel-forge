'use client';

import { useState } from 'react';
import { useDiscussion } from '@/store/useDiscussion';
import { useWorks } from '@/store/useWorks';
import { PRESET_AGENTS, streamAIResponse } from '@/lib/ai';
import { Plus, Send, Users, Sparkles } from 'lucide-react';

export default function DiscussionView() {
  const {
    discussions, currentDiscussionId, activeAgents,
    createDiscussion, selectDiscussion, addMessage, toggleAgent,
    isGenerating, setGenerating,
  } = useDiscussion();
  const currentWorkId = useWorks((s) => s.currentWorkId);

  const [topicInput, setTopicInput] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const currentDiscussion = discussions.find((d) => d.id === currentDiscussionId);

  const handleCreate = () => {
    const topic = topicInput.trim();
    if (!topic || !currentWorkId) return;
    createDiscussion(currentWorkId, topic);
    setTopicInput('');
    setMessageInput('');
  };

  const handleUserMessage = async () => {
    const text = messageInput.trim();
    if (!text || !currentDiscussionId || isGenerating) return;
    addMessage(currentDiscussionId, 'user', text);
    setMessageInput('');
    setGenerating(true);

    const activeAgentList = activeAgents;

    try {
      // Call each agent in parallel for their perspective
      const agentPromises = activeAgentList.map(async (agent) => {
        try {
          const messages = [
            { role: 'user', content: `讨论话题：${text}\n\n请从你（${agent.name}）的专业角度出发，给出你的分析和建议。保持你的角色风格。` },
          ];

          let fullResponse = '';
          const stream = streamAIResponse(messages, agent.systemPrompt);

          for await (const chunk of stream) {
            if (chunk.type === 'text' && chunk.content) {
              fullResponse += chunk.content;
            }
          }

          if (fullResponse && currentDiscussionId) {
            addMessage(currentDiscussionId, agent.id, fullResponse);
          }
        } catch {
          // Fallback for individual agent failures
          if (currentDiscussionId) {
            addMessage(currentDiscussionId, agent.id, '抱歉，我暂时无法参与这个讨论。请稍后重试。');
          }
        }
      });

      await Promise.all(agentPromises);
    } catch {
      // Overall error handling
    } finally {
      setGenerating(false);
    }
  };

  const getAgent = (id: string) => {
    if (id === 'user') return { name: '作者', emoji: '✍️', color: 'var(--accent)' };
    return PRESET_AGENTS.find((a) => a.id === id) || { name: '未知', emoji: '❓', color: 'var(--text-muted)' };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">灵感讨论室</h2>
      </div>

      {!currentWorkId ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[var(--text-muted)] text-center">请先创建作品</p>
        </div>
      ) : !currentDiscussion ? (
        <div className="flex-1 overflow-y-auto">
          {/* Agent selector */}
          <div className="p-3 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-1.5 mb-2">
              <Users size={14} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)]">参与讨论的AI</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_AGENTS.map((agent) => {
                const isActive = activeAgents.some((a) => a.id === agent.id);
                return (
                  <button
                    key={agent.id}
                    onClick={() => toggleAgent(agent.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs transition-all
                      ${isActive
                        ? 'ring-1 text-[var(--text-primary)]'
                        : 'text-[var(--text-muted)] opacity-50 hover:opacity-80'
                      }`}
                    style={{
                      backgroundColor: isActive ? `${agent.color}20` : 'var(--bg-tertiary)',
                      borderColor: isActive ? agent.color : 'transparent',
                    }}
                  >
                    <span>{agent.emoji}</span>
                    <span>{agent.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* New discussion input */}
          <div className="p-4">
            <label className="text-xs text-[var(--text-muted)] mb-2 block">讨论话题</label>
            <div className="flex gap-2">
              <input
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="例如：主角发现师父是真正的反派..."
                className="flex-1 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none ring-1 ring-[var(--border-color)] focus:ring-[var(--accent)] transition-all"
              />
              <button
                onClick={handleCreate}
                disabled={!topicInput.trim() || !currentWorkId}
                className="px-4 rounded-lg bg-[var(--accent)] text-black font-medium text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                开始
              </button>
            </div>
          </div>

          {/* Past discussions */}
          {discussions.length > 0 && (
            <div className="px-3 pb-3">
              <div className="text-xs text-[var(--text-muted)] mb-2 px-1">历史讨论</div>
              <div className="space-y-1">
                {discussions.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => selectDiscussion(d.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <div className="text-sm text-[var(--text-primary)] truncate">{d.topic}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{d.messages.length} 条讨论</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Active Discussion */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-[var(--border-color)]">
            <button
              onClick={() => selectDiscussion(null)}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← 返回
            </button>
            <div className="text-sm font-medium text-[var(--text-primary)] truncate flex-1 text-center mx-2">
              {currentDiscussion?.topic}
            </div>
            <div className="flex items-center gap-1.5">
              {activeAgents.map((a) => (
                <span key={a.id} className="text-sm">{a.emoji}</span>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {currentDiscussion?.messages.map((msg) => {
              const agent = getAgent(msg.agentId);
              const isUser = msg.agentId === 'user';
              return (
                <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-xl px-3 py-2.5
                    ${isUser
                      ? 'bg-[var(--accent)] text-black'
                      : 'bg-[var(--bg-tertiary)]'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{agent.emoji}</span>
                        <span className="text-xs font-medium" style={{ color: agent.color }}>{agent.name}</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed text-[var(--text-primary)]">{msg.content}</p>
                  </div>
                </div>
              );
            })}
            {isGenerating && (
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-[var(--text-muted)] ml-1">
                  {activeAgents.map((a) => a.name).join('、')} 正在思考...
                </span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-[var(--border-color)]">
            <div className="flex gap-2">
              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUserMessage()}
                placeholder="提出你的想法，让AI们一起讨论..."
                className="flex-1 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none ring-1 ring-[var(--border-color)] focus:ring-[var(--accent)] transition-all"
              />
              <button
                onClick={handleUserMessage}
                disabled={!messageInput.trim() || isGenerating}
                className="px-3 rounded-lg bg-[var(--accent)] text-black hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
