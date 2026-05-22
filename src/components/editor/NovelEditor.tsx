'use client';

import { useCallback, useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Typography from '@tiptap/extension-typography';
import { FontSize } from '@tiptap/extension-text-style';
import { Sparkles, Paintbrush, FilePlus2, Scissors, Eye, Bold, Italic, Quote, Camera, Clock, Download, Type } from 'lucide-react';
import VersionHistory from './VersionHistory';
import { useSnapshots } from '@/store/useSnapshots';
import { tiptapToText, tiptapToMarkdown, downloadFile } from '@/lib/export';

export interface NovelEditorHandle {
  replaceTextAt: (from: number, to: number, newText: string) => void;
}

interface NovelEditorProps {
  onAIAction: (action: string, selectedText: string, from: number, to: number) => void;
  chapterId: string | null;
  chapterTitle: string;
  chapterContent: Record<string, unknown> | null;
  onSave: (content: Record<string, unknown>, wordCount: number) => void;
  onContentChange: (text: string) => void;
  onExportAll?: () => void;
}

const NovelEditor = forwardRef<NovelEditorHandle, NovelEditorProps>(function NovelEditor(
  { onAIAction, chapterId, chapterTitle, chapterContent, onSave, onContentChange, onExportAll }, ref
) {
  const [showFloatingMenu, setShowFloatingMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [wordCount, setWordCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');
  const saveSnapshotFn = useSnapshots((s) => s.saveSnapshot);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: '开始书写你的故事... 或选中文字后召唤AI助手 ✨' }),
      Highlight.configure({ multicolor: true }),
      Typography,
      FontSize,
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
          const menuWidth = 320;
          let left = (start.left + end.left) / 2 - editorRect.left - menuWidth / 2;
          left = Math.max(8, Math.min(left, editorRect.width - menuWidth - 8));
          let top = start.top - editorRect.top - 56;
          if (top < 0) top = start.top - editorRect.top + 24;
          setMenuPosition({ top, left });
          setShowFloatingMenu(true);
        }
      } else {
        setShowFloatingMenu(false);
      }
    },
  });

  useImperativeHandle(ref, () => ({
    replaceTextAt: (from: number, to: number, newText: string) => {
      editor?.chain().focus().setTextSelection({ from, to }).insertContent(newText).run();
    },
  }), [editor]);

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

  // Hide floating menu and export menu when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setShowFloatingMenu(false);
        setShowExportMenu(false);
        setShowFontSize(false);
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
    onAIAction(action, selectedText, from, to);
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

  // Save version snapshot
  const handleSaveSnapshot = useCallback(() => {
    if (!editor || !chapterId) return;
    const json = editor.getJSON() as Record<string, unknown>;
    const text = editor.state.doc.textContent.slice(0, 50);
    saveSnapshotFn(chapterId, json, text);
    // Brief flash to confirm
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
  }, [editor, chapterId, saveSnapshotFn]);

  const handleExportTxt = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON() as Record<string, unknown>;
    const text = tiptapToText(json);
    const filename = `${chapterTitle.replace(/[<>:"/\\|?*]/g, '_')}.txt`;
    downloadFile(filename, text, 'text/plain');
    setShowExportMenu(false);
  }, [editor, chapterTitle]);

  const handleExportMarkdown = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON() as Record<string, unknown>;
    const md = tiptapToMarkdown(json);
    const filename = `${chapterTitle.replace(/[<>:"/\\|?*]/g, '_')}.md`;
    downloadFile(filename, md, 'text/markdown');
    setShowExportMenu(false);
  }, [editor, chapterTitle]);

  // Handle restore from version history
  const handleRestore = useCallback((content: Record<string, unknown>) => {
    if (!editor) return;
    editor.commands.setContent(content);
    lastSavedContentRef.current = editor.getHTML();
  }, [editor]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSaveSnapshot();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveNow();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSaveNow, handleSaveSnapshot]);

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
          <button onClick={handleSaveSnapshot} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors" title="保存快照 (Ctrl+Shift+S)">
            <Camera size={12} /> 快照
          </button>
          <button onClick={() => setShowVersionHistory(true)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="版本历史">
            <Clock size={12} /> 历史
          </button>
          <div className="relative">
            <button onClick={() => setShowExportMenu(!showExportMenu)} className="flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors" title="导出">
              <Download size={12} /> 导出
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                <button onClick={handleExportTxt} className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  导出当前章节为 TXT
                </button>
                <button onClick={handleExportMarkdown} className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                  导出当前章节为 Markdown
                </button>
                {onExportAll && (
                  <button onClick={() => { onExportAll(); setShowExportMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-colors border-t border-[var(--border-color)]">
                    导出全部章节为 TXT
                  </button>
                )}
              </div>
            )}
          </div>
          <button onClick={handleSaveNow} className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            Ctrl+S
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)]">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-md transition-colors ${editor.isActive('bold') ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
          title="加粗"
        >
          <Bold size={16} />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-md transition-colors ${editor.isActive('italic') ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
          title="斜体"
        >
          <Italic size={16} />
        </button>
        <span className="w-px h-5 bg-[var(--border-color)] mx-1" />
        {/* Font size selector */}
        <div className="relative">
          <button
            onClick={() => setShowFontSize(!showFontSize)}
            className={`p-1.5 rounded-md transition-colors ${showFontSize ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
            title="字号"
          >
            <Type size={16} />
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg shadow-xl py-1 min-w-[100px] z-50">
              {[
                { label: '小', size: '14px' },
                { label: '默认', size: '16px' },
                { label: '中', size: '20px' },
                { label: '大', size: '24px' },
                { label: '特大', size: '30px' },
              ].map(({ label, size }) => (
                <button
                  key={size}
                  onClick={() => {
                    if (size === '16px') {
                      editor.chain().focus().unsetFontSize().run();
                    } else {
                      editor.chain().focus().setFontSize(size).run();
                    }
                    setShowFontSize(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-tertiary)] transition-colors
                    ${editor.isActive('fontSize', { fontSize: size }) || (size === '16px' && !editor.isActive('fontSize'))
                      ? 'text-[var(--accent)]'
                      : 'text-[var(--text-secondary)]'
                    }`}
                  style={{ fontSize: size }}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="w-px h-5 bg-[var(--border-color)] mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-md transition-colors ${editor.isActive('blockquote') ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
          title="引用"
        >
          <Quote size={16} />
        </button>
        <span className="w-px h-5 bg-[var(--border-color)] mx-1" />
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30"
          title="撤销"
        >
          <span className="text-xs">↩</span>
        </button>
        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30"
          title="重做"
        >
          <span className="text-xs">↪</span>
        </button>
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

      {/* Version History Modal */}
      {chapterId && (
        <VersionHistory
          isOpen={showVersionHistory}
          onClose={() => setShowVersionHistory(false)}
          chapterId={chapterId}
          onRestore={handleRestore}
        />
      )}
    </div>
  );
});

export default NovelEditor;
