import React from 'react';
import { Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion } from '../../types';

interface KeywordSpanProps {
  keyword: string;
  entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion';
  entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion;
  onClick: (
    event: React.MouseEvent<HTMLSpanElement>, 
    entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion, 
    entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion'
  ) => void;
}

const KeywordSpan: React.FC<KeywordSpanProps> = ({ keyword, entityType, entity, onClick }) => {
  const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    onClick(event, entity, entityType);
  };

  return (
    <span
      className="text-yellow-400 hover:text-yellow-300 underline cursor-pointer font-medium"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick(e as any)}
      aria-label={`Details for ${keyword}`}
    >
      {keyword}
    </span>
  );
};

export default KeywordSpan;
