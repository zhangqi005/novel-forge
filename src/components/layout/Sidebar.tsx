'use client';

import { useWorkspace } from '@/store/useWorkspace';
import { useWorks } from '@/store/useWorks';
import type { PanelView } from '@/types';
import {
  BookOpen, Users, ListTree, GitBranch, MessageSquare, Plus, Settings, Library
} from 'lucide-react';

const navItems: { view: PanelView; label: string; icon: React.ReactNode }[] = [
  { view: 'chapters', label: '章节目录', icon: <BookOpen size={18} /> },
  { view: 'characters', label: '角色卡', icon: <Users size={18} /> },
  { view: 'outline', label: '大纲', icon: <ListTree size={18} /> },
  { view: 'storylines', label: '故事线', icon: <GitBranch size={18} /> },
  { view: 'discussion', label: '灵感讨论', icon: <MessageSquare size={18} /> },
];

interface SidebarProps {
  onNewWork: () => void;
}

export default function Sidebar({ onNewWork }: SidebarProps) {
  const { leftPanelView, setLeftPanelView, currentWorkId } = useWorkspace();
  const works = useWorks((s) => s.works);
  const setCurrentWork = useWorks((s) => s.setCurrentWork);
  const loadChapters = useWorks((s) => s.loadChapters);
  const currentWork = works.find((w) => w.id === currentWorkId);

  const handleWorkSelect = async (workId: string) => {
    setCurrentWork(workId);
    await loadChapters(workId);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)]">
      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-[var(--border-color)]">
        <span className="text-xl" title="笔灵">🔮</span>
      </div>

      {/* Works dropdown */}
      <div className="p-2 border-b border-[var(--border-color)]">
        {currentWork ? (
          <div className="relative group">
            <button
              className="w-full text-xs text-[var(--text-secondary)] truncate px-1 py-1 hover:text-[var(--text-primary)] transition-colors"
              title={currentWork.title}
            >
              <Library size={16} className="mx-auto mb-0.5" />
              <span className="block text-center truncate">{currentWork.title}</span>
            </button>
            {/* Mini works list on hover */}
            <div className="absolute left-full top-0 ml-1 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-lg shadow-xl p-1.5 min-w-[140px] hidden group-hover:block z-40">
              {works.map((w) => (
                <button
                  key={w.id}
                  onClick={() => handleWorkSelect(w.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors
                    ${w.id === currentWorkId ? 'bg-[var(--accent-muted)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}
                >
                  <div className="truncate">{w.title}</div>
                  <div className="text-[var(--text-muted)] mt-0.5">{w.genre.join('·') || '未分类'}</div>
                </button>
              ))}
              <button
                onClick={onNewWork}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors mt-1"
              >
                <Plus size={12} /> 新建作品
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onNewWork}
            className="w-full flex flex-col items-center gap-1 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <Plus size={16} />
            <span>新建</span>
          </button>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-3 px-2 space-y-0.5">
        {navItems.map((item) => (
          <button
            key={item.view}
            onClick={() => setLeftPanelView(item.view)}
            className={`w-full flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-xs transition-all duration-150
              ${leftPanelView === item.view
                ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            title={item.label}
          >
            {item.icon}
            <span className="text-[10px] leading-none">{item.label.slice(0, 2)}</span>
          </button>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-2 border-t border-[var(--border-color)]">
        <button className="w-full flex flex-col items-center gap-1 px-1 py-2.5 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors">
          <Settings size={16} />
          <span className="text-[10px]">设置</span>
        </button>
      </div>
    </div>
  );
}
