
import React from 'react';
import { Quest } from '../../types';
// import { VIETNAMESE } from '../../constants'; // No longer needed for title here
import QuestsDisplayPanel from './QuestsDisplayPanel';
// import Button from '../ui/Button'; // No longer needed for close button

interface QuestsSidePanelProps {
  quests: Quest[];
  onQuestClick: (quest: Quest) => void;
  // onClose: () => void; // Removed - was provided by OffCanvasPanel, not used here
}

const QuestsSidePanel: React.FC<QuestsSidePanelProps> = ({ quests, onQuestClick /*, onClose */ }) => {
  return (
    // OffCanvasPanel will handle the title and close button.
    // This component now just renders its content.
    <div className="flex flex-col h-full">
      <QuestsDisplayPanel quests={quests} onQuestClick={onQuestClick} />
    </div>
  );
};

export default QuestsSidePanel;