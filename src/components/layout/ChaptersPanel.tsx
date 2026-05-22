'use client';

import { useWorks } from '@/store/useWorks';
import { Plus, MoreHorizontal, GripVertical, Trash2 } from 'lucide-react';
import { useState, useCallback } from 'react';

export default function ChaptersPanel() {
  const { chapters, currentChapterId, currentWorkId, createChapter, deleteChapter, setCurrentChapter, works, reorderChapters } = useWorks();
  const currentWork = works.find((w) => w.id === currentWorkId);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [dragChapterId, setDragChapterId] = useState<string | null>(null);
  const [dragOverChapterId, setDragOverChapterId] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<'above' | 'below'>('below');

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  const handleAddChapter = async () => {
    if (!currentWorkId || !newTitle.trim()) return;
    await createChapter(currentWorkId, newTitle.trim());
    setNewTitle('');
    setIsAdding(false);
  };

  const handleQuickAdd = async () => {
    if (!currentWorkId) return;
    const chapter = await createChapter(currentWorkId, `第${chapters.length + 1}章`);
    setCurrentChapter(chapter.id);
  };

  const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);

  const handleDragStart = useCallback((e: React.DragEvent, chapterId: string) => {
    e.dataTransfer.setData('text/plain', chapterId);
    e.dataTransfer.effectAllowed = 'move';
    setDragChapterId(chapterId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, chapterId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverChapterId(chapterId);
    setDragPosition(e.clientY < midY ? 'above' : 'below');
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverChapterId(null);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    if (!draggedId || draggedId === targetId) {
      setDragChapterId(null);
      setDragOverChapterId(null);
      return;
    }

    const targetIndex = sortedChapters.findIndex((ch) => ch.id === targetId);
    const newIndex = dragPosition === 'above' ? targetIndex : targetIndex + 1;

    await reorderChapters(draggedId, newIndex);
    setDragChapterId(null);
    setDragOverChapterId(null);
  }, [sortedChapters, dragPosition, reorderChapters]);

  const handleDragEnd = useCallback(() => {
    setDragChapterId(null);
    setDragOverChapterId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">章节目录</h2>
        <button
          onClick={handleQuickAdd}
          disabled={!currentWorkId}
          className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
        >
          <Plus size={16} />
        </button>
      </div>

      {!currentWorkId ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[var(--text-muted)] text-center">
            点击左侧 + 创建你的第一个作品
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-2">
          {sortedChapters.map((ch) => {
            const isDragging = dragChapterId === ch.id;
            const isDragOver = dragOverChapterId === ch.id;
            return (
            <div key={ch.id}>
              {isDragOver && dragPosition === 'above' && (
                <div className="mx-4 h-0.5 bg-[var(--accent)] rounded-full" />
              )}
              <button
                draggable
                onDragStart={(e) => handleDragStart(e, ch.id)}
                onDragOver={(e) => handleDragOver(e, ch.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, ch.id)}
                onDragEnd={handleDragEnd}
                onClick={() => setCurrentChapter(ch.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group
                  ${currentChapterId === ch.id
                    ? 'bg-[var(--accent-muted)] border-r-2 border-[var(--accent)]'
                    : 'hover:bg-[var(--bg-tertiary)] border-r-2 border-transparent'
                  }
                  ${isDragging ? 'opacity-40' : ''}
                  ${isDragOver && dragPosition === 'below' ? 'ring-2 ring-[var(--accent)]' : ''}
                `}
              >
              <GripVertical size={14} className="text-[var(--text-muted)] flex-shrink-0 cursor-grab active:cursor-grabbing" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[var(--text-primary)] truncate">{ch.title}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--text-muted)]">{ch.wordCount}字</span>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    ch.status === 'done' ? 'bg-[var(--success)]' :
                    ch.status === 'revised' ? 'bg-[var(--accent)]' :
                    ch.status === 'draft' ? 'bg-[var(--info)]' :
                    'bg-[var(--text-muted)]'
                  }`} />
                </div>
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); deleteChapter(ch.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-tertiary)] transition-all cursor-pointer"
              >
                <Trash2 size={14} />
              </span>
            </button>
            </div>
            );
          })}

          {/* Add chapter inline */}
          {isAdding ? (
            <div className="px-4 py-2">
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddChapter(); if (e.key === 'Escape') setIsAdding(false); }}
                placeholder="章节名称..."
                className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none ring-1 ring-[var(--accent)]"
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full flex items-center gap-2 px-6 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
            >
              <Plus size={14} /> 添加章节
            </button>
          )}
        </div>
      )}

      <div className="px-4 py-3 border-t border-[var(--border-color)]">
        <div className="text-xs text-[var(--text-muted)]">
          总字数 <span className="text-[var(--text-primary)] font-medium">{totalWords.toLocaleString()}</span>
          {currentWork && (
            <>
              <span className="mx-2">·</span>
              {currentWork.genre.slice(0, 2).join('·')}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
