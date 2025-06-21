
import React from 'react';
import { KnowledgeBase, Item, Skill } from '../../types';
import { VIETNAMESE } from '../../constants';
import PlayerStatsPanel from './PlayerStatsPanel';
import InventoryPanel from './InventoryPanel';
import SkillsPanel from './SkillsPanel';
// import Button from '../ui/Button'; // Not used directly in this simplified version for OffCanvas

interface CharacterSidePanelProps {
  knowledgeBase: KnowledgeBase;
  onItemClick: (item: Item) => void;
  onSkillClick: (skill: Skill) => void;
  // onClose: () => void; // Removed - was provided by OffCanvasPanel, not used here
}

const CharacterSidePanel: React.FC<CharacterSidePanelProps> = ({
  knowledgeBase,
  onItemClick,
  onSkillClick,
  // onClose // Removed
}) => {
  return (
    // No need for explicit close button here if OffCanvasPanel provides one
    // Width and height are controlled by OffCanvasPanel styles
    <div className="flex flex-col h-full"> 
      {/* Content for Character Panel */}
      {knowledgeBase.playerStats && (
        <PlayerStatsPanel 
          stats={knowledgeBase.playerStats} 
          currencyName={knowledgeBase.worldConfig?.currencyName}
          playerName={knowledgeBase.worldConfig?.playerName}
          playerGender={knowledgeBase.worldConfig?.playerGender}
        />
      )}
      <InventoryPanel items={knowledgeBase.inventory} onItemClick={onItemClick} />
      <SkillsPanel skills={knowledgeBase.playerSkills} onSkillClick={onSkillClick} />
    </div>
  );
};

export default CharacterSidePanel;