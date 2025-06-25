
import React from 'react';
// Ensure Faction is imported if not already via a chain that includes types.ts
import { Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, Faction } from '../../types';

interface KeywordSpanProps {
  keyword: string;
  entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | 'faction'; // Added faction
  entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion | Faction; // Added faction
  onClick: (
    event: React.MouseEvent<HTMLSpanElement>, 
    entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion | Faction, // Added faction
    entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | 'faction' // Added faction
  ) => void;
  style?: React.CSSProperties; // Added to accept dynamic styles
}

const KeywordSpan: React.FC<KeywordSpanProps> = ({ keyword, entityType, entity, onClick, style }) => {
  const handleClick = (event: React.MouseEvent<HTMLSpanElement>) => {
    onClick(event, entity, entityType);
  };

  return (
    <span
      className="underline cursor-pointer font-medium" // Removed text-yellow-400 and hover:text-yellow-300
      style={style} // Apply dynamic styles from props
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
