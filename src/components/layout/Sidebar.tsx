'use client';

import { useWorkspace } from '@/store/useWorkspace';
import { useWorks } from '@/store/useWorks';
import type { PanelView } from '@/types';
import {
  BookOpen, Users, ListTree, GitBranch, MessageSquare, Plus, Settings, Library, BarChart3, ChevronDown, Download, Trash2
} from 'lucide-react';
import { useState, useCallback } from 'react';
import { downloadFile } from '@/lib/export';

function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]" onClick={onCancel}>
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl p-5 mx-4 shadow-2xl max-w-xs w-full" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-[var(--text-primary)] mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm hover:text-[var(--text-primary)] transition-colors">取消</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-lg bg-[var(--danger)] text-white text-sm hover:opacity-80 transition-colors">删除</button>
        </div>
      </div>
    </div>
  );
}

const navItems: { view: PanelView; label: string; icon: React.ReactNode }[] = [
  { view: 'chapters', label: '章节目录', icon: <BookOpen size={18} /> },
  { view: 'characters', label: '角色卡', icon: <Users size={18} /> },
  { view: 'outline', label: '大纲', icon: <ListTree size={18} /> },
  { view: 'storylines', label: '故事线', icon: <GitBranch size={18} /> },
  { view: 'discussion', label: '灵感讨论', icon: <MessageSquare size={18} /> },
  { view: 'stats', label: '写作统计', icon: <BarChart3 size={18} /> },
];

interface SidebarProps {
  onNewWork: () => void;
}

export default function Sidebar({ onNewWork }: SidebarProps) {
  const { leftPanelView, setLeftPanelView } = useWorkspace();
  const works = useWorks((s) => s.works);
  const currentWorkId = useWorks((s) => s.currentWorkId);
  const setCurrentWork = useWorks((s) => s.setCurrentWork);
  const loadChapters = useWorks((s) => s.loadChapters);
  const allChapters = useWorks((s) => s.chapters);
  const deleteWork = useWorks((s) => s.deleteWork);
  const currentWork = works.find((w) => w.id === currentWorkId);
  const [showWorksMenu, setShowWorksMenu] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const setCurrentChapter = useWorks((s) => s.setCurrentChapter);

  const handleWorkSelect = async (workId: string) => {
    setCurrentWork(workId);
    await loadChapters(workId);
    // Auto-select the latest (last) chapter after loading
    const chapters = useWorks.getState().chapters;
    if (chapters.length > 0) {
      setCurrentChapter(chapters[chapters.length - 1].id);
    }
    setShowWorksMenu(false);
  };

  const handleBackup = useCallback(async () => {
    if (!currentWorkId || !currentWork) return;
    const backup = {
      work: currentWork,
      chapters: allChapters,
      exportedAt: new Date().toISOString(),
    };
    const json = JSON.stringify(backup, null, 2);
    const filename = `${currentWork.title.replace(/[<>:"/\\|?*]/g, '_')}_备份.json`;
    downloadFile(filename, json, 'application/json');
  }, [currentWorkId, currentWork, allChapters]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)]">
      {/* Logo */}
      <div className="flex items-center justify-center py-4 border-b border-[var(--border-color)]">
        <span className="text-xl" title="笔灵">🔮</span>
      </div>

      {/* Works section */}
      <div className="p-2 border-b border-[var(--border-color)] space-y-1.5">
        {currentWork ? (
          <>
            <button
              onClick={() => setShowWorksMenu(!showWorksMenu)}
              className="w-full flex flex-col items-center gap-0.5 text-xs text-[var(--text-primary)] px-1 py-1.5 rounded-md hover:bg-[var(--bg-tertiary)] transition-colors"
              title={currentWork.title}
            >
              <Library size={15} className="flex-shrink-0 text-[var(--accent)]" />
              <span className="w-full text-center font-medium leading-tight break-all text-[11px]">{currentWork.title}</span>
              <ChevronDown size={10} className={`flex-shrink-0 text-[var(--text-muted)] transition-transform ${showWorksMenu ? 'rotate-180' : ''}`} />
            </button>
            <div className="text-[10px] text-[var(--text-muted)] text-center leading-tight px-0.5">
              {currentWork.type === 'novel' ? '长篇' : '短篇'}{currentWork.genre.length > 0 && `·${currentWork.genre[0]}`}
            </div>

            {/* Works dropdown menu */}
            {showWorksMenu && (
              <div className="absolute left-[68px] top-[100px] bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl shadow-2xl p-2 min-w-[180px] z-50">
                <div className="text-[10px] text-[var(--text-muted)] px-2 py-1 uppercase tracking-wider">切换作品</div>
                {works.map((w) => (
                  <div key={w.id} className="group/item flex items-center">
                    <button
                      onClick={() => handleWorkSelect(w.id)}
                      className={`flex-1 text-left px-3 py-2 rounded-lg text-xs transition-colors
                        ${w.id === currentWorkId
                          ? 'bg-[var(--accent-muted)] text-[var(--accent)] font-medium'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                        }`}
                    >
                      <div className="truncate">{w.title}</div>
                      <div className="text-[var(--text-muted)] mt-0.5 flex items-center gap-1">
                        <span>{w.genre.slice(0, 2).join('·') || '未分类'}</span>
                        <span>·</span>
                        <span>{w.type === 'novel' ? '长篇' : '短篇'}</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(w.id); }}
                      className="opacity-0 group-hover/item:opacity-100 p-1.5 mr-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)] transition-all flex-shrink-0"
                      title="删除作品"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                <div className="border-t border-[var(--border-color)] mt-1 pt-1 space-y-0.5">
                  <button
                    onClick={() => { onNewWork(); setShowWorksMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <Plus size={12} /> 新建作品
                  </button>
                  <button
                    onClick={handleBackup}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <Download size={12} /> 备份当前作品
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <button
            onClick={onNewWork}
            className="w-full flex flex-col items-center gap-1 py-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <Plus size={16} />
            <span>新建</span>
          </button>
        )}

        {/* Always visible new work button */}
        {currentWork && (
          <button
            onClick={onNewWork}
            className="w-full flex items-center justify-center gap-1 py-1 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
          >
            <Plus size={12} />
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

      {/* Delete confirmation */}
      {deleteConfirmId && (
        <ConfirmDialog
          message={`确定要删除作品"${works.find((w) => w.id === deleteConfirmId)?.title || ''}"吗？该作品的所有章节和相关数据将被永久删除。`}
          onConfirm={async () => {
            await deleteWork(deleteConfirmId);
            setDeleteConfirmId(null);
            setShowWorksMenu(false);
          }}
          onCancel={() => setDeleteConfirmId(null)}
        />
      )}
    </div>
  );
}
