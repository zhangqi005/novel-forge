'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import LeftPanel from '@/components/layout/LeftPanel';
import PanelResizer from '@/components/layout/PanelResizer';
import NovelEditor from '@/components/editor/NovelEditor';
import type { NovelEditorHandle } from '@/components/editor/NovelEditor';
import ChatPanel from '@/components/chat/ChatPanel';
import NewWorkModal from '@/components/common/NewWorkModal';
import { useWorkspace } from '@/store/useWorkspace';
import { useChat } from '@/store/useChat';
import { useWorks } from '@/store/useWorks';
import { streamAIResponse } from '@/lib/ai';
import { tiptapToText, downloadFile } from '@/lib/export';

export default function Home() {
  const {
    leftPanelWidth, setLeftPanelWidth,
    rightPanelWidth, setRightPanelWidth,
    chatMode,
  } = useWorkspace();
  const { messages, addMessage, setStreaming, setAbortController, updateLastMessage, setEditContext } = useChat();
  const workspace = useWorks();
  const abortRef = useRef<AbortController | null>(null);
  const editorRef = useRef<NovelEditorHandle>(null);
  const [editorContent, setEditorContent] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null);
  const [showNewWork, setShowNewWork] = useState(false);

  const currentChapter = workspace.chapters.find((ch) => ch.id === workspace.currentChapterId);

  // Load works on mount
  useEffect(() => {
    workspace.loadWorks();
  }, []);

  // Load chapters when work changes
  useEffect(() => {
    if (workspace.currentWorkId) {
      workspace.loadChapters(workspace.currentWorkId);
    }
  }, [workspace.currentWorkId]);

  const handleAIAction = useCallback(async (action: string, text: string, from: number, to: number) => {
    const actionLabels: Record<string, string> = {
      polish: '润色', expand: '扩写', shorten: '精简',
      rewrite: '换个写法', discuss: '给建议',
    };

    const actionPrompts: Record<string, string> = {
      polish: '请对以下文本进行润色，提升语言表现力，增加感官细节，优化句式节奏。先简要说明改动（1-2句），然后将润色后的完整文本放在 ``` 代码块中：',
      expand: '请对以下文本进行扩写，增加环境描写、内心活动和细节层次，在不改变原意的前提下扩展到约2倍长度。先简要说明（1-2句），然后将扩写后的完整文本放在 ``` 代码块中：',
      shorten: '请精简以下文本，去除冗余修饰，合并重复表达，在保留核心信息的前提下减少约30%字数。将精简后的完整文本放在 ``` 代码块中：',
      rewrite: '请用完全不同的语言风格重写以下文本。提供两个版本：一种偏诗意（多用比喻意象），一种偏干脆（短句为主节奏快）。每个版本分别放在单独的 ``` 代码块中：',
      discuss: '请对以下文本给出具体的修改建议，包括节奏、角色动机、语言表现、是否有埋伏笔的机会等方面：',
    };

    const prompt = actionPrompts[action] || actionPrompts.discuss;
    const userMsg = text
      ? `${prompt}\n\n---\n${text}\n---`
      : `请对当前章节内容给出【${actionLabels[action] || action}】建议`;

    if (text) {
      setSelectedText(text);
      setSelectedRange({ from, to });
      setEditContext({ originalText: text, action });
    }

    addMessage('user', userMsg);
    setStreaming(true);

    const abortController = new AbortController();
    abortRef.current = abortController;
    setAbortController(abortController);

    addMessage('assistant', '');

    const systemPrompt = chatMode === 'inspiration'
      ? '你是"笔灵"，一位AI小说写作助手。请主动发散创意，提供多种叙事思路。始终用中文回复。'
      : '你是"笔灵"，一位AI小说写作助手。请严格执行用户的修改指令，只做被要求的改动。始终用中文回复。';

    const msgHistory = [
      ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMsg },
    ];

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
      setAbortController(null);
      abortRef.current = null;
    }
  }, [chatMode, messages, addMessage, setStreaming, setAbortController, updateLastMessage]);

  const handleEditorContent = useCallback((html: string) => {
    setEditorContent(html.replace(/<[^>]*>/g, ''));
  }, []);

  const handleChapterSave = useCallback((content: Record<string, unknown>, wordCount: number) => {
    if (workspace.currentChapterId) {
      workspace.updateChapterContent(workspace.currentChapterId, content, wordCount);
    }
  }, [workspace.currentChapterId, workspace.updateChapterContent]);

  const handleApplyEdit = useCallback((newText: string) => {
    if (!selectedRange) return;
    editorRef.current?.replaceTextAt(selectedRange.from, selectedRange.to, newText);
    setSelectedText('');
    setSelectedRange(null);
  }, [selectedRange]);

  const handleCompareEdit = useCallback((newText: string) => {
    if (!selectedRange) return;
    editorRef.current?.insertComparison(selectedRange.to, newText);
    setSelectedText('');
    setSelectedRange(null);
  }, [selectedRange]);

  const handleExportAll = useCallback(() => {
    const chapters = workspace.chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
    const workTitle = workspace.works.find((w) => w.id === workspace.currentWorkId)?.title || '作品';
    const lines: string[] = [];
    lines.push(`# ${workTitle}\n`);
    for (const ch of chapters) {
      const text = tiptapToText(ch.content);
      lines.push(`## ${ch.title}\n`);
      lines.push(text);
      lines.push('');
    }
    const filename = `${workTitle.replace(/[<>:"/\\|?*]/g, '_')}.txt`;
    downloadFile(filename, lines.join('\n'), 'text/plain');
  }, [workspace.chapters, workspace.works, workspace.currentWorkId]);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      <div className="w-[64px] flex-shrink-0">
        <Sidebar onNewWork={() => setShowNewWork(true)} />
      </div>

      <div style={{ width: leftPanelWidth }} className="flex-shrink-0 h-full">
        <LeftPanel />
      </div>

      <PanelResizer direction="horizontal" onResize={(delta) => setLeftPanelWidth(leftPanelWidth + delta)} />

      <div className="flex-1 flex flex-col min-w-0 h-full">
        <NovelEditor
          ref={editorRef}
          onAIAction={handleAIAction}
          chapterId={workspace.currentChapterId}
          chapterTitle={currentChapter?.title || '未选择章节'}
          chapterContent={currentChapter?.content || null}
          onSave={handleChapterSave}
          onContentChange={handleEditorContent}
          onExportAll={handleExportAll}
        />
      </div>

      <PanelResizer direction="horizontal" onResize={(delta) => setRightPanelWidth(rightPanelWidth - delta)} />

      <div style={{ width: rightPanelWidth }} className="flex-shrink-0 h-full">
        <ChatPanel editorContent={editorContent} selectedText={selectedText} onApplyEdit={handleApplyEdit} onCompareEdit={handleCompareEdit} />
      </div>

      <NewWorkModal isOpen={showNewWork} onClose={() => setShowNewWork(false)} />
    </div>
  );
}
