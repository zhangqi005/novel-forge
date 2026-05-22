'use client';

import { useState } from 'react';
import { useSnapshots } from '@/store/useSnapshots';
import { X, Clock, RotateCcw, Trash2, Eye, ChevronLeft } from 'lucide-react';
import type { WritingSnapshot } from '@/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  chapterId: string;
  onRestore: (content: Record<string, unknown>) => void;
}

export default function VersionHistory({ isOpen, onClose, chapterId, onRestore }: Props) {
  const getSnapshots = useSnapshots((s) => s.getSnapshots);
  const deleteSnapshot = useSnapshots((s) => s.deleteSnapshot);
  const [previewId, setPreviewId] = useState<string | null>(null);

  if (!isOpen) return null;

  const snapshots = getSnapshots(chapterId);
  const preview = previewId ? snapshots.find((s) => s.id === previewId) : null;

  const extractText = (content: Record<string, unknown>): string => {
    try {
      const doc = content as { content?: Array<{ content?: Array<{ text?: string }> }> };
      return doc.content?.map((p) =>
        p.content?.map((t) => t.text || '').join('') || ''
      ).join('\n').slice(0, 3000) || '(空内容)';
    } catch {
      return '(无法解析)';
    }
  };

  const handleRestore = (snapshot: WritingSnapshot) => {
    onRestore(snapshot.content);
    onClose();
  };

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl w-full max-w-2xl max-h-[80vh] mx-4 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            {preview ? (
              <button onClick={() => setPreviewId(null)} className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                <ChevronLeft size={18} />
              </button>
            ) : (
              <Clock size={18} className="text-[var(--accent)]" />
            )}
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {preview ? `版本 ${preview.version}` : '版本历史'}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {preview ? (
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {formatTime(preview.createdAt)}
                    {preview.prompt && ` · ${preview.prompt}`}
                  </div>
                </div>
                <button
                  onClick={() => handleRestore(preview)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-black text-sm font-medium hover:bg-[var(--accent-hover)] transition-colors"
                >
                  <RotateCcw size={14} /> 恢复此版本
                </button>
              </div>
              <div className="bg-[var(--bg-primary)] rounded-xl p-4 text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap font-[var(--editor-font)] max-h-[50vh] overflow-y-auto">
                {extractText(preview.content)}
              </div>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
                <Clock size={22} className="text-[var(--text-muted)]" />
              </div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">暂无版本快照</h3>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                点击编辑器顶部的"保存快照"按钮<br />或按 Ctrl+Shift+S 保存当前版本
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-color)]">
              {snapshots.map((sn) => (
                <div
                  key={sn.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">版本 {sn.version}</span>
                      <span className="text-xs text-[var(--text-muted)]">{formatTime(sn.createdAt)}</span>
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                      {sn.prompt || extractText(sn.content).slice(0, 80)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <button
                      onClick={() => setPreviewId(sn.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      title="预览"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      onClick={() => handleRestore(sn)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      title="恢复"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <button
                      onClick={() => deleteSnapshot(chapterId, sn.id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--danger)] hover:bg-[var(--bg-tertiary)] transition-colors"
                      title="删除"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
