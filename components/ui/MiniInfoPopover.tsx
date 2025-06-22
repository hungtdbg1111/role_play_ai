
import React, { useEffect, useRef, useState } from 'react';
import { Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, QuestObjective } from '../../types';
import * as GameTemplates from '../../templates'; // Import for type assertions

interface MiniInfoPopoverProps {
  isOpen: boolean;
  targetRect: DOMRect | null;
  entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion | null;
  entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | null;
  onClose: () => void;
}

const MiniInfoPopover: React.FC<MiniInfoPopoverProps> = ({ isOpen, targetRect, entity, entityType, onClose }) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && targetRect && popoverRef.current) {
      const popoverElement = popoverRef.current;
      let top = targetRect.bottom + 5; // 5px below the keyword
      let left = targetRect.left;

      // Adjust if it goes off-screen
      if (left + popoverElement.offsetWidth > window.innerWidth - 10) {
        left = window.innerWidth - popoverElement.offsetWidth - 10;
      }
      if (left < 10) {
        left = 10;
      }
      if (top + popoverElement.offsetHeight > window.innerHeight - 10) {
        top = targetRect.top - popoverElement.offsetHeight - 5; // Place above
      }
       if (top < 10) {
        top = 10;
      }
      setPosition({ top, left });
    }
  }, [isOpen, targetRect]);

  if (!isOpen || !entity || !entityType) return null;

  const renderContent = () => {
    switch (entityType) {
      case 'item':
        const item = entity as Item;
        return (
          <>
            <p><strong className="text-indigo-300">Phân loại:</strong> {item.category}
                {item.category === "Equipment" && ` (${(item as GameTemplates.EquipmentTemplate).equipmentType})`}
                {item.category === "Potion" && ` (${(item as GameTemplates.PotionTemplate).potionType})`}
                {item.category === "Material" && ` (${(item as GameTemplates.MaterialTemplate).materialType})`}
            </p>
            <p><strong className="text-indigo-300">Số lượng:</strong> {item.quantity}</p>
            {item.description && <p className="text-xs mt-1 italic text-gray-400">{item.description.substring(0, 100)}{item.description.length > 100 ? '...' : ''}</p>}
            {item.category === "Potion" && (item as GameTemplates.PotionTemplate).effects && (item as GameTemplates.PotionTemplate).effects.length > 0 && <p className="text-xs mt-1 text-cyan-300">{(item as GameTemplates.PotionTemplate).effects.join(', ').substring(0,100)}...</p>}
            {item.category === "Equipment" && (item as GameTemplates.EquipmentTemplate).uniqueEffects && (item as GameTemplates.EquipmentTemplate).uniqueEffects.length > 0 && <p className="text-xs mt-1 text-cyan-300">{(item as GameTemplates.EquipmentTemplate).uniqueEffects.join(', ').substring(0,100)}...</p>}
          </>
        );
      case 'skill':
        const skill = entity as Skill;
        return (
          <>
            <p><strong className="text-indigo-300">Loại:</strong> {skill.skillType}</p>
            {skill.description && <p className="text-xs mt-1 italic text-gray-400">{skill.description.substring(0,100)}{skill.description.length > 100 ? '...' : ''}</p>}
            {skill.detailedEffect && <p><strong className="text-indigo-300">Hiệu ứng:</strong> {skill.detailedEffect.substring(0,100)}{skill.detailedEffect.length > 100 ? '...' : ''}</p>}
          </>
        );
      case 'quest':
        const quest = entity as Quest;
        return (
          <>
            <p><strong className="text-indigo-300">Trạng thái:</strong>
              {quest.status === 'active' ? 'Đang làm' :
               quest.status === 'completed' ? <span className="text-green-400 font-semibold">Hoàn thành</span> :
               <span className="text-red-400 font-semibold">Thất bại</span>
              }
            </p>
            {quest.objectives.slice(0, 2).map((obj: QuestObjective) => (
              <p key={obj.id} className={`text-xs flex items-center 
                ${obj.completed && quest.status !== 'failed' ? 'text-green-400' : (quest.status === 'failed' ? 'text-red-400 opacity-80' : 'text-gray-300')}`}>
                {obj.completed && quest.status !== 'failed' && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 mr-1 flex-shrink-0 text-green-400">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                )}
                {quest.status === 'failed' && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 mr-1 flex-shrink-0 text-red-500">
                     <path fillRule="evenodd" d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06z" clipRule="evenodd" />
                  </svg>
                )}
                {!obj.completed && quest.status === 'active' && (
                  <span className="w-3 h-3 mr-1 flex-shrink-0 inline-flex items-center justify-center text-gray-400">-</span>
                )}
                <span className={`${obj.completed && quest.status !== 'failed' ? 'line-through' : ''} ${quest.status === 'failed' ? 'line-through text-red-400 opacity-70' : ''}`}>
                  {obj.text.substring(0, 35)}{obj.text.length > 35 ? '...' : ''}
                </span>
              </p>
            ))}
            {quest.objectives.length > 2 && <p className="text-xs text-gray-400">...</p>}
          </>
        );
      case 'npc':
        const npc = entity as NPC;
        return (
          <>
            {npc.description && <p className="text-xs mt-1 italic text-gray-400">{npc.description.substring(0,150)}{npc.description.length > 150 ? '...' : ''}</p>}
          </>
        );
      case 'location':
        const location = entity as GameLocation;
        return (
          <>
            {location.description && <p className="text-xs mt-1 italic text-gray-400">{location.description.substring(0,150)}{location.description.length > 150 ? '...' : ''}</p>}
          </>
        );
      case 'lore':
        const lore = entity as WorldLoreEntry;
        return (
          <>
            {lore.content && <p className="text-xs mt-1 italic text-gray-400">{lore.content.substring(0,150)}{lore.content.length > 150 ? '...' : ''}</p>}
          </>
        );
      case 'companion':
        const companion = entity as Companion;
        return (
          <>
            <p><strong className="text-indigo-300">HP:</strong> {companion.hp}/{companion.maxHp}</p>
            <p><strong className="text-indigo-300">ATK:</strong> {companion.atk}</p>
             {companion.description && <p className="text-xs mt-1 italic text-gray-400">{companion.description.substring(0,100)}{companion.description.length > 100 ? '...' : ''}</p>}
          </>
        );
      default:
        return <p>Không có thông tin chi tiết.</p>;
    }
  };

  const title = (entity as any).name || (entity as any).title;

  return (
    <div
      ref={popoverRef}
      className="fixed z-70 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-3 text-sm text-gray-100 max-w-xs transition-opacity duration-150" // Increased z-index
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="tooltip"
      aria-live="polite"
    >
      <h4 className="font-semibold text-indigo-400 mb-1 pb-1 border-b border-gray-700">{title}</h4>
      <div className="space-y-0.5 text-xs">
        {renderContent()}
      </div>
    </div>
  );
};

export default MiniInfoPopover;
