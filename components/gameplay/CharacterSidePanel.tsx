
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
  onPlayerAvatarUploadRequest: (base64Data: string) => void; // New prop
  isUploadingPlayerAvatar: boolean; // New prop
}

const CharacterSidePanel: React.FC<CharacterSidePanelProps> = ({
  knowledgeBase,
  onItemClick,
  onSkillClick,
  onPlayerAvatarUploadRequest, // Destructure new prop
  isUploadingPlayerAvatar, // Destructure new prop
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
          playerAvatarUrl={knowledgeBase.worldConfig?.playerAvatarUrl} 
          playerAvatarData={knowledgeBase.playerAvatarData} 
          worldConfig={knowledgeBase.worldConfig} 
          isPlayerContext={true} // Indicate this is for the player
          onPlayerAvatarUploadRequest={onPlayerAvatarUploadRequest} // Pass the handler
          isUploadingPlayerAvatar={isUploadingPlayerAvatar} // Pass loading state
        />
      )}
      <InventoryPanel items={knowledgeBase.inventory} onItemClick={onItemClick} />
      <SkillsPanel skills={knowledgeBase.playerSkills} onSkillClick={onSkillClick} />
    </div>
  );
};

export default CharacterSidePanel;