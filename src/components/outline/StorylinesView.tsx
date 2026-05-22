'use client';

import { useState, useEffect } from 'react';
import { useOutline } from '@/store/useOutline';
import { useWorks } from '@/store/useWorks';
import { Plus, Circle, Trash2, Edit3, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import type { Storyline, StorylineNode } from '@/types';

const PRESET_COLORS = ['#c9a96e', '#e0556a', '#6eb5c9', '#5ec49e', '#c96e8a', '#8ac96e', '#6e8ac9', '#c9b36e'];
const typeLabels: Record<string, string> = { main: '主线', subplot: '支线', romance: '感情线', mystery: '暗线', custom: '自定义' };
const typeOptions = Object.entries(typeLabels);

export default function StorylinesView() {
  const { storylines, loadStorylines, addStoryline, updateStoryline, removeStoryline } = useOutline();
  const currentWorkId = useWorks((s) => s.currentWorkId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Storyline>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkId) loadStorylines(currentWorkId);
  }, [currentWorkId, loadStorylines]);

  const handleAdd = async () => {
    if (!currentWorkId) return;
    const sl = await addStoryline(currentWorkId);
    setEditData(sl);
    setEditingId(sl.id);
  };

  const startEdit = (sl: Storyline) => {
    setEditData({ ...sl });
    setEditingId(sl.id);
  };

  const saveEdit = async () => {
    if (!editingId || !editData.name?.trim()) return;
    await updateStoryline(editData as Storyline);
    setEditingId(null);
    setEditData({});
  };

  const cancelEdit = () => { setEditingId(null); setEditData({}); };

  const handleAddNode = async (sl: Storyline) => {
    const newNode: StorylineNode = {
      id: crypto.randomUUID(),
      chapterId: '',
      description: '新节点',
      order: sl.nodes.length,
    };
    const updated = { ...sl, nodes: [...sl.nodes, newNode] };
    await updateStoryline(updated);
  };

  const handleUpdateNode = async (sl: Storyline, nodeId: string, description: string) => {
    const updated = {
      ...sl,
      nodes: sl.nodes.map((n) => n.id === nodeId ? { ...n, description } : n),
    };
    await updateStoryline(updated);
  };

  const handleDeleteNode = async (sl: Storyline, nodeId: string) => {
    const updated = { ...sl, nodes: sl.nodes.filter((n) => n.id !== nodeId) };
    await updateStoryline(updated);
  };

  if (!currentWorkId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">故事线</h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-[var(--text-muted)] text-center">请先创建作品</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">故事线</h2>
        <button onClick={handleAdd} className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-3">
        {storylines.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
              <Circle size={18} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">点击 + 创建故事线<br />追踪主线、感情线、暗线等</p>
          </div>
        )}

        {storylines.map((sl) => (
          editingId === sl.id ? (
            /* Edit form */
            <div key={sl.id} className="rounded-xl p-4" style={{ background: `${sl.color}10`, border: `1px solid ${sl.color}30` }}>
              <div className="space-y-3">
                <input
                  value={editData.name || ''}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="故事线名称"
                  className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none ring-1 ring-[var(--border-color)] focus:ring-[var(--accent)]"
                  autoFocus
                />
                <div className="flex gap-1.5 flex-wrap">
                  {typeOptions.map(([key, label]) => (
                    <button key={key} onClick={() => setEditData({ ...editData, type: key as Storyline['type'] })}
                      className={`px-3 py-1 rounded-full text-[10px] transition-all
                        ${editData.type === key ? 'text-white' : 'text-[var(--text-muted)] bg-[var(--bg-primary)]'}`}
                      style={{ backgroundColor: editData.type === key ? sl.color : undefined }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button key={c} onClick={() => setEditData({ ...editData, color: c })}
                      className="w-6 h-6 rounded-full transition-transform"
                      style={{ backgroundColor: c, transform: editData.color === c ? 'scale(1.2)' : 'scale(1)', boxShadow: editData.color === c ? `0 0 8px ${c}` : 'none' }} />
                  ))}
                </div>
                <textarea
                  value={editData.description || ''}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  placeholder="描述这条故事线的走向..."
                  rows={2}
                  className="w-full bg-[var(--bg-primary)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-medium"><Check size={12} />保存</button>
                  <button onClick={cancelEdit} className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] text-[var(--text-muted)] text-xs"><X size={12} /></button>
                </div>
              </div>
            </div>
          ) : (
            /* Display card */
            <div key={sl.id}>
              <button
                onClick={() => setExpandedId(expandedId === sl.id ? null : sl.id)}
                className="w-full rounded-xl p-4 transition-all text-left"
                style={{ background: `${sl.color}10`, border: `1px solid ${sl.color}20` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Circle size={10} style={{ color: sl.color, fill: sl.color }} />
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{sl.name}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: sl.color, background: `${sl.color}20` }}>
                    {typeLabels[sl.type]}
                  </span>
                </div>
                {sl.description && (
                  <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">{sl.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[var(--text-muted)]">{sl.nodes.length} 个节点</span>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); startEdit(sl); }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                      <Edit3 size={11} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); removeStoryline(sl.id); }}
                      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--danger)]">
                      <Trash2 size={11} />
                    </button>
                    {sl.nodes.length > 0 && (
                      expandedId === sl.id ? <ChevronDown size={14} className="text-[var(--text-muted)]" /> : <ChevronRight size={14} className="text-[var(--text-muted)]" />
                    )}
                  </div>
                </div>
              </button>

              {/* Expanded nodes */}
              {expandedId === sl.id && sl.nodes.length > 0 && (
                <div className="mt-2 ml-6 pl-4 border-l-2 space-y-2 py-2" style={{ borderColor: sl.color + '40' }}>
                  {sl.nodes.map((node, i) => (
                    <div key={node.id} className="relative pl-4 group">
                      <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: sl.color }} />
                      <div className="flex items-start gap-2">
                        <input
                          value={node.description}
                          onChange={(e) => handleUpdateNode(sl, node.id, e.target.value)}
                          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none border-b border-transparent hover:border-[var(--border-color)] focus:border-[var(--accent)] transition-colors pb-0.5"
                        />
                        <button onClick={() => handleDeleteNode(sl, node.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all mt-0.5">
                          <X size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <button onClick={() => handleAddNode(sl)}
                    className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors pl-4 pt-1">
                    <Plus size={10} /> 添加节点
                  </button>
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  );
}
