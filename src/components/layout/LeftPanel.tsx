'use client';

import { useWorkspace } from '@/store/useWorkspace';
import ChaptersPanel from './ChaptersPanel';
import CharactersView from '@/components/characters/CharactersView';
import OutlineView from '@/components/outline/OutlineView';
import StorylinesView from '@/components/outline/StorylinesView';
import DiscussionView from '@/components/discussion/DiscussionView';

export default function LeftPanel() {
  const { leftPanelView } = useWorkspace();

  const renderContent = () => {
    switch (leftPanelView) {
      case 'chapters': return <ChaptersPanel />;
      case 'characters': return <CharactersView />;
      case 'outline': return <OutlineView />;
      case 'storylines': return <StorylinesView />;
      case 'discussion': return <DiscussionView />;
      default: return <ChaptersPanel />;
    }
  };

  return (
    <div className="h-full bg-[var(--bg-secondary)] overflow-hidden">
      {renderContent()}
    </div>
  );
}
