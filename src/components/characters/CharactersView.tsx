'use client';

import { useState, useEffect } from 'react';
import { useCharacters } from '@/store/useCharacters';
import { useWorks } from '@/store/useWorks';
import { Plus, Search, User, Heart, Swords, Users2, Save, X, Link2, Sparkles } from 'lucide-react';
import { tiptapToText } from '@/lib/export';
import type { CharacterCard } from '@/types';

const roleLabels: Record<string, string> = { protagonist: '主角', antagonist: '反派', supporting: '配角', cameo: '客串' };
const roleColors: Record<string, string> = { protagonist: 'var(--accent)', antagonist: 'var(--danger)', supporting: 'var(--info)', cameo: 'var(--text-muted)' };
const roleIcons: Record<string, React.ReactNode> = { protagonist: <User size={14} />, antagonist: <Swords size={14} />, supporting: <Users2 size={14} />, cameo: <Heart size={14} /> };
const relTypes = ['家人', '朋友', '恋人', '仇敌', '师徒', '同门', '盟友', '其他'];

export default function CharactersView() {
  const { characters, selectedId, isExtracting, loadCharacters, selectCharacter, addCharacter, updateCharacter, removeCharacter, extractFromChapters } = useCharacters();
  const currentWorkId = useWorks((s) => s.currentWorkId);
  const chapters = useWorks((s) => s.chapters);
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<CharacterCard | null>(null);
  const [newRelTarget, setNewRelTarget] = useState('');
  const [newRelType, setNewRelType] = useState('朋友');
  const [newRelDesc, setNewRelDesc] = useState('');
  const [extractResult, setExtractResult] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkId) {
      loadCharacters(currentWorkId);
    }
  }, [currentWorkId, loadCharacters]);

  const selected = characters.find((c) => c.id === selectedId);

  const filtered = characters.filter((c) =>
    c.name.includes(search) || c.attributes.personality.includes(search)
  );

  const handleAdd = async () => {
    if (!currentWorkId) return;
    const ch = await addCharacter(currentWorkId);
    setEditData(ch);
    setIsEditing(true);
  };

  const handleExtract = async () => {
    if (!currentWorkId || isExtracting) return;
    const sorted = [...chapters].sort((a, b) => a.chapterNumber - b.chapterNumber);
    const allText = sorted
      .map((ch) => `## ${ch.title}\n${tiptapToText(ch.content)}`)
      .join('\n\n');
    const result = await extractFromChapters(currentWorkId, allText);
    setExtractResult(result);
    setTimeout(() => setExtractResult(null), 4000);
  };

  const handleSave = async () => {
    if (!editData) return;
    await updateCharacter(editData);
    setIsEditing(false);
    setEditData(null);
  };

  const startEdit = (ch: CharacterCard) => {
    setEditData({ ...ch });
    setIsEditing(true);
  };

  if (!currentWorkId) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center px-4 py-3 border-b border-[var(--border-color)]">
          <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">角色卡</h2>
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
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">角色卡</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExtract}
            disabled={isExtracting}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--accent)] hover:bg-[var(--accent-muted)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="从正文提取角色信息"
          >
            <Sparkles size={13} className={isExtracting ? 'animate-pulse' : ''} />
            {isExtracting ? '提取中...' : 'AI提取'}
          </button>
          <button onClick={handleAdd} className="p-1.5 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <Plus size={16} />
          </button>
        </div>
      </div>

      {extractResult && (
        <div className="px-4 py-2 border-b border-[var(--border-color)] bg-[var(--accent-muted)] text-xs text-[var(--accent)] flex items-center gap-1.5">
          <Sparkles size={12} />
          {extractResult}
        </div>
      )}

      {isEditing && editData ? (
        /* Edit Form */
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setIsEditing(false)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              ← 返回
            </button>
            <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-medium hover:bg-[var(--accent-hover)] transition-colors">
              <Save size={13} /> 保存
            </button>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">姓名</label>
            <input value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })} className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none mt-1" />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">角色定位</label>
            <div className="flex gap-1.5 mt-1">
              {Object.entries(roleLabels).map(([key, label]) => (
                <button key={key} onClick={() => setEditData({ ...editData, role: key as CharacterCard['role'] })}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${editData.role === key ? 'bg-[var(--accent)] text-black' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>{label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">年龄</label>
            <input type="number" value={editData.attributes.age} onChange={(e) => setEditData({ ...editData, attributes: { ...editData.attributes, age: parseInt(e.target.value) || 0 } })} className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none mt-1" />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">性别</label>
            <input value={editData.attributes.gender} onChange={(e) => setEditData({ ...editData, attributes: { ...editData.attributes, gender: e.target.value } })} className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none mt-1" />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">外貌</label>
            <textarea value={editData.attributes.appearance} onChange={(e) => setEditData({ ...editData, attributes: { ...editData.attributes, appearance: e.target.value } })} rows={2} className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none mt-1 resize-none" />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">性格</label>
            <textarea value={editData.attributes.personality} onChange={(e) => setEditData({ ...editData, attributes: { ...editData.attributes, personality: e.target.value } })} rows={2} className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none mt-1 resize-none" />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">背景故事</label>
            <textarea value={editData.attributes.background} onChange={(e) => setEditData({ ...editData, attributes: { ...editData.attributes, background: e.target.value } })} rows={3} className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none mt-1 resize-none" />
          </div>

          <div>
            <label className="text-xs text-[var(--text-muted)]">人物弧光</label>
            <input value={editData.characterArc} onChange={(e) => setEditData({ ...editData, characterArc: e.target.value })} placeholder="例如：从独善其身 → 肩负天下" className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none mt-1" />
          </div>

          {/* Relationships */}
          <div>
            <label className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <Link2 size={12} /> 角色关系
            </label>

            {/* Existing relationships */}
            {editData.relationships.length > 0 && (
              <div className="space-y-2 mt-2 mb-3">
                {editData.relationships.map((rel, i) => {
                  const targetChar = characters.find((c) => c.id === rel.targetCharacterId);
                  return (
                    <div key={i} className="flex items-start gap-2 bg-[var(--bg-primary)] rounded-lg px-3 py-2 group">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {targetChar?.name || '未知角色'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
                            {rel.type}
                          </span>
                        </div>
                        {rel.description && (
                          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">{rel.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setEditData({
                            ...editData,
                            relationships: editData.relationships.filter((_, j) => j !== i),
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-muted)] hover:text-[var(--danger)] transition-all flex-shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add new relationship */}
            <div className="space-y-2 mt-2 bg-[var(--bg-primary)] rounded-lg p-3">
              <select
                value={newRelTarget}
                onChange={(e) => setNewRelTarget(e.target.value)}
                className="w-full bg-[var(--bg-tertiary)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
              >
                <option value="">选择关联角色...</option>
                {characters
                  .filter((c) => c.id !== editData.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
              <div className="flex gap-1.5 flex-wrap">
                {relTypes.map((t) => (
                  <button
                    key={t}
                    onClick={() => setNewRelType(t)}
                    className={`px-2.5 py-1 rounded-full text-[10px] transition-all
                      ${newRelType === t
                        ? 'bg-[var(--accent)] text-black font-medium'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newRelDesc}
                  onChange={(e) => setNewRelDesc(e.target.value)}
                  placeholder="关系描述（可选）"
                  className="flex-1 bg-[var(--bg-tertiary)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newRelTarget) {
                      setEditData({
                        ...editData,
                        relationships: [
                          ...editData.relationships,
                          { targetCharacterId: newRelTarget, type: newRelType, description: newRelDesc },
                        ],
                      });
                      setNewRelTarget('');
                      setNewRelDesc('');
                      setNewRelType('朋友');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (!newRelTarget) return;
                    setEditData({
                      ...editData,
                      relationships: [
                        ...editData.relationships,
                        { targetCharacterId: newRelTarget, type: newRelType, description: newRelDesc },
                      ],
                    });
                    setNewRelTarget('');
                    setNewRelDesc('');
                    setNewRelType('朋友');
                  }}
                  disabled={!newRelTarget}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black text-xs font-medium hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <Plus size={13} />
                </button>
              </div>
            </div>
          </div>

          <button onClick={() => { removeCharacter(editData.id); setIsEditing(false); setEditData(null); }}
            className="w-full py-2.5 rounded-lg border border-[var(--danger)]/30 text-[var(--danger)] text-sm hover:bg-[var(--danger)]/10 transition-colors">
            删除角色
          </button>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] rounded-lg px-3 py-2">
              <Search size={14} className="text-[var(--text-muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索角色..."
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none" />
            </div>
          </div>

          {/* List or Detail */}
          <div className="flex-1 overflow-y-auto">
            {!selected ? (
              <div className="p-3 space-y-1">
                {filtered.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)] text-center py-8">
                    {characters.length === 0 ? '点击 + 创建第一个角色' : '无匹配结果'}
                  </p>
                )}
                {filtered.map((ch) => (
                  <button key={ch.id} onClick={() => selectCharacter(ch.id)} className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left group">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0" style={{ backgroundColor: `${roleColors[ch.role]}20` }}>
                      {ch.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)]">{ch.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span style={{ color: roleColors[ch.role] }}>{roleIcons[ch.role]}</span>
                        <span className="text-xs text-[var(--text-muted)]">{roleLabels[ch.role]}</span>
                      </div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); startEdit(ch); }}
                      className="opacity-0 group-hover:opacity-100 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                      编辑
                    </button>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4">
                <button onClick={() => selectCharacter(null)} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] mb-4 transition-colors">← 返回列表</button>
                {selected && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${roleColors[selected.role]}20` }}>{selected.name[0]}</div>
                        <div>
                          <h3 className="text-lg font-semibold text-[var(--text-primary)]">{selected.name}</h3>
                          <span className="inline-flex items-center gap-1 text-xs mt-0.5 px-2 py-0.5 rounded-full" style={{ color: roleColors[selected.role], backgroundColor: `${roleColors[selected.role]}15` }}>
                            {roleIcons[selected.role]}{roleLabels[selected.role]}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => startEdit(selected)} className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">编辑</button>
                    </div>

                    <div className="space-y-3">
                      <Field label="年龄" value={`${selected.attributes.age}`} />
                      <Field label="性别" value={selected.attributes.gender || '未设置'} />
                      <Field label="外貌" value={selected.attributes.appearance || '未设置'} />
                      <Field label="性格" value={selected.attributes.personality || '未设置'} />
                      <Field label="背景" value={selected.attributes.background || '未设置'} />
                      <Field label="人物弧光" value={selected.characterArc || '未设置'} />
                    </div>

                    {selected.attributes.quirks.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">口头禅/癖好</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {selected.attributes.quirks.map((q, i) => (
                            <span key={i} className="px-2.5 py-1 text-xs rounded-md bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">{q}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selected.relationships.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <Link2 size={12} /> 角色关系
                        </h4>
                        <div className="space-y-2">
                          {selected.relationships.map((rel, i) => {
                            const targetChar = characters.find((c) => c.id === rel.targetCharacterId);
                            return (
                              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg-tertiary)]">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                                  style={{ backgroundColor: `${roleColors[targetChar?.role || 'cameo']}20`, color: roleColors[targetChar?.role || 'cameo'] }}>
                                  {targetChar?.name?.[0] || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                      {targetChar?.name || '未知角色'}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--accent-muted)] text-[var(--accent)]">
                                      {rel.type}
                                    </span>
                                  </div>
                                  {rel.description && (
                                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{rel.description}</p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value || value === '未设置') return null;
  return (
    <div>
      <div className="text-xs text-[var(--text-muted)] mb-0.5">{label}</div>
      <div className="text-sm text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
