'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOutline } from '@/store/useOutline';
import { useWorks } from '@/store/useWorks';
import {
  Plus, ChevronRight, ChevronDown, Trash2, Edit3,
  BookOpen, FileText, Layout, Check, X
} from 'lucide-react';
import type { OutlineNode } from '@/types';

const typeLabels: Record<string, string> = { volume: '卷', chapter: '章', scene: '场景' };
const typeIcons: Record<string, React.ReactNode> = { volume: <BookOpen size={13} />, chapter: <FileText size={13} />, scene: <Layout size={13} /> };
const statusColors: Record<string, string> = { planned: 'var(--text-muted)', writing: 'var(--accent)', done: 'var(--success)' };
const statusLabels: Record<string, string> = { planned: '计划', writing: '写作中', done: '已完成' };

export default function OutlineView() {
  const { outlineNodes, storylines, selectedNodeId, loadOutlines, loadStorylines, selectNode, addNode, updateNode, removeNode } = useOutline();
  const currentWorkId = useWorks((s) => s.currentWorkId);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editStatus, setEditStatus] = useState<OutlineNode['status']>('planned');

  useEffect(() => {
    if (currentWorkId) {
      loadOutlines(currentWorkId);
      loadStorylines(currentWorkId);
    }
  }, [currentWorkId, loadOutlines, loadStorylines]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = async (parentId: string | null, type: OutlineNode['type']) => {
    if (!currentWorkId) return;
    const node = await addNode(currentWorkId, parentId, type);
    if (parentId) setExpandedIds((prev) => new Set(prev).add(parentId));
    // Start editing the new node
    setEditTitle(node.title);
    setEditSummary('');
    setEditStatus('planned');
    setEditingId(node.id);
  };

  const startEdit = (node: OutlineNode) => {
    setEditTitle(node.title);
    setEditSummary(node.summary);
    setEditStatus(node.status);
    setEditingId(node.id);
  };

  const saveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    const node = outlineNodes.find((n) => n.id === editingId);
    if (!node) return;
    await updateNode({ ...node, title: editTitle.trim(), summary: editSummary.trim(), status: editStatus });
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const getChildren = (parentId: string | null): OutlineNode[] => {
    return outlineNodes
      .filter((n) => n.parentId === parentId)
      .sort((a, b) => a.order - b.order);
  };

  const countByStatus = (status: OutlineNode['status']): number => {
    return outlineNodes.filter((n) => n.status === status && n.type === 'chapter').length;
  };

  const totalChapters = outlineNodes.filter((n) => n.type === 'chapter').length;
  const doneChapters = countByStatus('done');
  const progress = totalChapters > 0 ? Math.round((doneChapters / totalChapters) * 100) : 0;

  const renderNode = (node: OutlineNode, depth: number = 0) => {
    const isExpanded = expandedIds.has(node.id);
    const children = getChildren(node.id);
    const hasChildren = children.length > 0;
    const isEditing = editingId === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1.5 py-1.5 px-2 mx-2 rounded-md cursor-pointer transition-colors group
            ${selectedNodeId === node.id ? 'bg-[var(--accent-muted)]' : 'hover:bg-[var(--bg-tertiary)]'}`}
          style={{ paddingLeft: `${8 + depth * 18}px` }}
          onClick={() => selectNode(node.id)}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="p-0.5 text-[var(--text-muted)]">
              {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          ) : (
            <span className="w-[18px]" />
          )}
          <span className="text-[var(--text-muted)]">{typeIcons[node.type]}</span>

          {isEditing ? (
            <div className="flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="flex-1 bg-[var(--bg-tertiary)] rounded px-2 py-0.5 text-sm text-[var(--text-primary)] outline-none ring-1 ring-[var(--accent)]"
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                autoFocus
              />
              <button onClick={saveEdit} className="p-1 rounded text-[var(--success)]"><Check size={13} /></button>
              <button onClick={cancelEdit} className="p-1 rounded text-[var(--text-muted)]"><X size={13} /></button>
            </div>
          ) : (
            <>
              <span className="text-sm text-[var(--text-primary)] flex-1 truncate">{node.title}</span>
              <span className="text-[10px] text-[var(--text-muted)] hidden group-hover:inline mr-1">{statusLabels[node.status]}</span>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[node.status] }} />
            </>
          )}

          {!isEditing && (
            <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
              <button onClick={(e) => { e.stopPropagation(); startEdit(node); }} className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <Edit3 size={11} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); handleAdd(node.id, 'chapter'); }}
                className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--accent)]" title="添加子节点">
                <Plus size={11} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); removeNode(node.id); }}
                className="p-0.5 rounded text-[var(--text-muted)] hover:text-[var(--danger)]">
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Edit detail panel */}
        {isEditing && (
          <div className="mx-4 mb-2 p-3 bg-[var(--bg-tertiary)] rounded-lg" style={{ marginLeft: `${24 + depth * 18}px` }}>
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              placeholder="添加摘要..."
              rows={2}
              className="w-full bg-[var(--bg-primary)] rounded-md px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none resize-none mb-2"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--text-muted)]">状态:</span>
              {(['planned', 'writing', 'done'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setEditStatus(s)}
                  className={`px-2 py-0.5 rounded-full text-[10px] transition-all
                    ${editStatus === s
                      ? 'text-white font-medium'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  style={{ backgroundColor: editStatus === s ? statusColors[s] : 'var(--bg-primary)' }}
                >
                  {statusLabels[s]}
                </button>
              ))}
            </div>
          </div>
        )}

        {hasChildren && isExpanded && children.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!currentWorkId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">大纲</h2>
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
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">大纲</h2>
        <div className="flex items-center gap-0.5">
          <button onClick={() => handleAdd(null, 'volume')} className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="添加卷">
            <BookOpen size={14} />
          </button>
          <button onClick={() => handleAdd(null, 'chapter')} className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors" title="添加章节">
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {outlineNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
              <BookOpen size={18} className="text-[var(--text-muted)]" />
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              点击上方按钮创建大纲<br />
              支持卷 → 章 → 场景三层结构
            </p>
          </div>
        ) : (
          getChildren(null).map((node) => renderNode(node))
        )}
      </div>

      {/* Progress bar */}
      {totalChapters > 0 && (
        <div className="px-4 py-3 border-t border-[var(--border-color)] space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-muted)]">进度</span>
            <span className="text-[var(--text-primary)] font-medium">{doneChapters}/{totalChapters} 章 · {progress}%</span>
          </div>
          <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--accent)] rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
