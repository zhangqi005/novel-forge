'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { Sparkles, Paintbrush, FilePlus2, Scissors, Eye, Bold, Italic, Quote, Heading2 } from 'lucide-react';

interface NovelEditorProps {
  onAIAction: (action: string, selectedText: string) => void;
  chapterId: string | null;
  chapterTitle: string;
  chapterContent: Record<string, unknown> | null;
  onSave: (content: Record<string, unknown>, wordCount: number) => void;
  onContentChange: (text: string) => void;
}

export default function NovelEditor({ onAIAction, chapterId, chapterTitle, chapterContent, onSave, onContentChange }: NovelEditorProps) {
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: '开始书写你的故事... 或选中文字后召唤AI助手 ✨' }),
      Highlight.configure({ multicolor: true }),
      Typography,
    ],
    content: '',
    editorProps: {
      attributes: { class: 'prose prose-invert max-w-none focus:outline-none' },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.state.doc.textContent;
      const words = text.replace(/\s/g, '').length;
      setWordCount(words);
      onContentChange(text);

      // Mark unsaved
      if (html !== lastSavedContentRef.current) {
        setSaveStatus('unsaved');

        // Debounce save: 2s after last keystroke
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          const json = editor.getJSON() as Record<string, unknown>;
          lastSavedContentRef.current = html;
          setSaveStatus('saving');
          onSave(json, words);
          setTimeout(() => setSaveStatus('saved'), 400);
        }, 2000);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        const view = editor.view;
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        const editorRect = editorRef.current?.getBoundingClientRect();
        if (editorRect) {
          setMenuPosition({
            top: start.top - editorRect.top - 50,
            left: (start.left + end.left) / 2 - editorRect.left - 150,
          });
          setShowFloatingMenu(true);
        }
      } else {
        setShowFloatingMenu(false);
      }
    },
  });

  // Load chapter content when chapterId changes
  useEffect(() => {
    if (!editor) return;
    const content = chapterContent && Object.keys(chapterContent).length > 0
      ? chapterContent
      : null;

    if (content) {
      editor.commands.setContent(content);
    } else {
      editor.commands.setContent(`<h2>${chapterTitle}</h2><p></p>`);
    }
    // Reset save state
    lastSavedContentRef.current = editor.getHTML();
    setSaveStatus('saved');
    setWordCount(editor.state.doc.textContent.replace(/\s/g, '').length);
  }, [chapterId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup save timer
  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, []);

  // Hide floating menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setShowFloatingMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleAIAction = useCallback((action: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    if (!selectedText && action !== 'discuss') return;
    onAIAction(action, selectedText);
    setShowFloatingMenu(false);
  }, [editor, onAIAction]);

  // Force save now
  const handleSaveNow = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON() as Record<string, unknown>;
    const words = editor.state.doc.textContent.replace(/\s/g, '').length;
    lastSavedContentRef.current = editor.getHTML();
    setSaveStatus('saving');
    onSave(json, words);
    setTimeout(() => setSaveStatus('saved'), 400);
  }, [editor, onSave]);

  // Keyboard shortcut: Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveNow();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNow]);

  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[var(--text-muted)]">加载编辑器...</span>
        </div>
      </div>
    );
  }

  const saveStatusDisplay = {
    saved: <span className="text-xs text-[var(--success)] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />已保存</span>,
    saving: <span className="text-xs text-[var(--accent)] flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />保存中...</span>,
    unsaved: <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 cursor-pointer" onClick={handleSaveNow}><span className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]" />未保存 (点击保存)</span>,
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-[var(--text-primary)]">{chapterTitle}</span>
          <span className="text-xs text-[var(--text-muted)]">{wordCount.toLocaleString()}字</span>
        </div>
        <div className="flex items-center gap-2">
          {saveStatusDisplay[saveStatus]}
          <button onClick={handleSaveNow} className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Ctrl+S
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto relative" ref={editorRef}>
        {showFloatingMenu && (
          <div
            className="absolute z-50 floating-menu animate-in fade-in slide-in-from-top-2 duration-150"
            style={{ top: menuPosition.top, left: menuPosition.left }}
          >
            <button onClick={() => handleAIAction('polish')}>
              <Paintbrush size={14} /> 润色
            </button>
            <button onClick={() => handleAIAction('expand')}>
              <FilePlus2 size={14} /> 扩写
            </button>
            <button onClick={() => handleAIAction('shorten')}>
              <Scissors size={14} /> 精简
            </button>
            <button onClick={() => handleAIAction('rewrite')}>
              <Sparkles size={14} /> 换个写法
            </button>
            <button onClick={() => handleAIAction('discuss')}>
              <Eye size={14} /> 给建议
            </button>
          </div>
        )}

        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
