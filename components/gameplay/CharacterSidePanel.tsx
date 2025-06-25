
import React from 'react';
import { KnowledgeBase, Item, Skill, PlayerStats } from '../../types'; 
import { VIETNAMESE } from '../../constants';
// import PlayerStatsPanel from './PlayerStatsPanel'; // No longer used directly, PlayerStatsWithEquipment is used
import InventoryPanel from './InventoryPanel';
import SkillsPanel from './SkillsPanel';
import PlayerStatsWithEquipment from './equipment/PlayerStatsWithEquipment'; 

interface CharacterSidePanelProps {
  knowledgeBase: KnowledgeBase;
  onItemClick: (item: Item) => void;
  onSkillClick: (skill: Skill) => void;
}

const CharacterSidePanel: React.FC<CharacterSidePanelProps> = ({
  knowledgeBase,
  onItemClick,
  onSkillClick,
}) => {
  return (
    <div className="flex flex-col h-full"> 
      {knowledgeBase.playerStats && (
        <PlayerStatsWithEquipment 
          playerStats={knowledgeBase.playerStats}
          equippedItems={knowledgeBase.equippedItems}
          inventory={knowledgeBase.inventory}
          currencyName={knowledgeBase.worldConfig?.currencyName}
          playerName={knowledgeBase.worldConfig?.playerName}
          playerGender={knowledgeBase.worldConfig?.playerGender}
          playerAvatarUrl={knowledgeBase.worldConfig?.playerAvatarUrl} // Pass player avatar URL
          playerAvatarData={knowledgeBase.playerAvatarData} // Pass player avatar base64 data
          worldConfig={knowledgeBase.worldConfig} // Pass worldConfig for isCultivationEnabled
        />
      )}
      <InventoryPanel items={knowledgeBase.inventory} onItemClick={onItemClick} />
      <SkillsPanel skills={knowledgeBase.playerSkills} onSkillClick={onSkillClick} />
    </div>
  );
};

export default CharacterSidePanel;
