'use client';

import { useState } from 'react';
import { X, BookOpen, Feather } from 'lucide-react';
import { useWorks } from '@/store/useWorks';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const GENRES = ['仙侠', '玄幻', '科幻', '都市', '悬疑', '言情', '历史', '武侠', '轻小说', '其他'];

export default function NewWorkModal({ isOpen, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'novel' | 'short_story'>('novel');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const createWork = useWorks((s) => s.createWork);

  if (!isOpen) return null;

  const toggleGenre = (g: string) => {
    setSelectedGenres((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    await createWork(title.trim(), type, selectedGenres);
    setIsCreating(false);
    setTitle('');
    setSelectedGenres([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">创建新作品</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">作品名称</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给你的故事取个名字..."
            className="w-full bg-[var(--bg-tertiary)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none ring-1 ring-[var(--border-color)] focus:ring-[var(--accent)] transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>

        {/* Type */}
        <div className="mb-4">
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">作品类型</label>
          <div className="flex gap-2">
            <button
              onClick={() => setType('novel')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-all
                ${type === 'novel'
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              <BookOpen size={16} /> 长篇小说
            </button>
            <button
              onClick={() => setType('short_story')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm transition-all
                ${type === 'short_story'
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
            >
              <Feather size={16} /> 短篇
            </button>
          </div>
        </div>

        {/* Genres */}
        <div className="mb-5">
          <label className="block text-xs text-[var(--text-muted)] mb-1.5">标签 (可多选)</label>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all
                  ${selectedGenres.includes(g)
                    ? 'bg-[var(--accent)] text-black font-medium'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={!title.trim() || isCreating}
          className="w-full py-3 rounded-xl bg-[var(--accent)] text-black font-medium text-sm hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isCreating ? '创建中...' : '开始写作'}
        </button>
      </div>
    </div>
  );
}
