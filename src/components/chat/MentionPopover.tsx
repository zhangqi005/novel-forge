'use client';

import { useEffect, useRef } from 'react';
import { User, Swords, Users2, Heart } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  role: string;
  shortDesc?: string;
  attributes?: {
    personality: string;
    appearance: string;
    background: string;
    age: number;
  };
}

interface Props {
  isOpen: boolean;
  search: string;
  characters: Character[];
  onSelect: (character: Character) => void;
  onClose: () => void;
  position: { top: number; left: number };
}

const roleIcons: Record<string, React.ReactNode> = {
  protagonist: <User size={13} />,
  antagonist: <Swords size={13} />,
  supporting: <Users2 size={13} />,
  cameo: <Heart size={13} />,
};

export default function MentionPopover({ isOpen, search, characters, onSelect, onClose, position }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (!isOpen) return null;

  const filtered = search
    ? characters.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : characters;

  if (filtered.length === 0) return null;

  return (
    <div
      ref={ref}
      className="absolute z-50 bg-[var(--bg-elevated)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden min-w-[220px]"
      style={{ bottom: '100%', left: position.left, marginBottom: 8 }}
    >
      <div className="text-xs text-[var(--text-muted)] px-3 py-2 border-b border-[var(--border-color)]">
        选择角色注入上下文
      </div>
      <div className="max-h-[200px] overflow-y-auto py-1">
        {filtered.map((ch) => (
          <button
            key={ch.id}
            onClick={() => onSelect(ch)}
            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--bg-tertiary)] transition-colors text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] flex items-center justify-center text-sm font-medium text-[var(--accent)] flex-shrink-0">
              {ch.name[0]}
            </div>
            <div className="min-w-0">
              <div className="text-sm text-[var(--text-primary)]">{ch.name}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {ch.attributes?.personality || ch.shortDesc || ch.role}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
