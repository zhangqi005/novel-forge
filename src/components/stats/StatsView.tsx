'use client';

import { useWorks } from '@/store/useWorks';
import { useCharacters } from '@/store/useCharacters';
import { useOutline } from '@/store/useOutline';
import { BarChart3, BookOpen, Users, FileText, Target, TrendingUp } from 'lucide-react';

export default function StatsView() {
  const chapters = useWorks((s) => s.chapters);
  const works = useWorks((s) => s.works);
  const currentWorkId = useWorks((s) => s.currentWorkId);
  const characters = useCharacters((s) => s.characters);
  const outlineNodes = useOutline((s) => s.outlineNodes);

  const currentWork = works.find((w) => w.id === currentWorkId);

  if (!currentWorkId || !currentWork) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">写作统计</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[var(--text-muted)] text-center">请先创建作品</p>
        </div>
      </div>
    );
  }

  const sortedChapters = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const totalChapters = chapters.length;
  const doneChapters = chapters.filter((ch) => ch.status === 'done').length;
  const chapterNodes = outlineNodes.filter((n) => n.type === 'chapter');
  const doneOutlineNodes = chapterNodes.filter((n) => n.status === 'done').length;
  const maxChapterWords = Math.max(...chapters.map((ch) => ch.wordCount), 1);

  const stats = [
    { label: '总字数', value: totalWords.toLocaleString(), icon: <FileText size={16} />, color: 'var(--accent)' },
    { label: '章节数', value: `${totalChapters} 章`, icon: <BookOpen size={16} />, color: 'var(--info)' },
    { label: '角色数', value: `${characters.length} 个`, icon: <Users size={16} />, color: '#6eb5c9' },
    { label: '大纲节点', value: `${outlineNodes.length} 个`, icon: <Target size={16} />, color: '#8ac96e' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">写作统计</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Top stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="bg-[var(--bg-tertiary)] rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-1.5">
                <span style={{ color: s.color }}>{s.icon}</span>
                <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="text-xl font-semibold text-[var(--text-primary)]">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-[var(--accent)]" />
            <span className="text-xs font-medium text-[var(--text-secondary)]">写作进度</span>
          </div>

          <div className="space-y-1 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">章节完成</span>
              <span className="text-[var(--text-primary)]">
                {doneChapters}/{totalChapters} 章
                {totalChapters > 0 && ` (${Math.round((doneChapters / totalChapters) * 100)}%)`}
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all"
                style={{ width: `${totalChapters > 0 ? (doneChapters / totalChapters) * 100 : 0}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">大纲完成</span>
              <span className="text-[var(--text-primary)]">
                {doneOutlineNodes}/{chapterNodes.length} 节点
                {chapterNodes.length > 0 && ` (${Math.round((doneOutlineNodes / chapterNodes.length) * 100)}%)`}
              </span>
            </div>
            <div className="h-2 bg-[var(--bg-primary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--success)] rounded-full transition-all"
                style={{ width: `${chapterNodes.length > 0 ? (doneOutlineNodes / chapterNodes.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Per-chapter word count bars */}
        {sortedChapters.length > 0 && (
          <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-[var(--accent)]" />
              <span className="text-xs font-medium text-[var(--text-secondary)]">每章字数分布</span>
            </div>
            <div className="space-y-2">
              {sortedChapters.map((ch) => (
                <div key={ch.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--text-muted)] w-14 truncate flex-shrink-0" title={ch.title}>
                    {ch.title}
                  </span>
                  <div className="flex-1 h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${maxChapterWords > 0 ? (ch.wordCount / maxChapterWords) * 100 : 0}%`,
                        backgroundColor: ch.status === 'done' ? 'var(--success)' :
                          ch.status === 'revised' ? 'var(--accent)' : 'var(--info)',
                        minWidth: ch.wordCount > 0 ? '4px' : '0',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] w-12 text-right flex-shrink-0">
                    {ch.wordCount.toLocaleString()}字
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Genre & type */}
        <div className="bg-[var(--bg-tertiary)] rounded-xl p-4">
          <div className="text-xs text-[var(--text-muted)] mb-2">作品信息</div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full text-xs bg-[var(--accent-muted)] text-[var(--accent)]">
              {currentWork.type === 'novel' ? '长篇小说' : '短篇'}
            </span>
            {currentWork.genre.map((g) => (
              <span key={g} className="px-2.5 py-1 rounded-full text-xs bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                {g}
              </span>
            ))}
          </div>
          {currentWork.targetWordCount > 0 && (
            <div className="mt-3 flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">目标字数</span>
              <span className="text-[var(--text-primary)]">
                {totalWords.toLocaleString()} / {currentWork.targetWordCount.toLocaleString()} 字
                ({Math.round((totalWords / currentWork.targetWordCount) * 100)}%)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
