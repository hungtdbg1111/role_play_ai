
import React from 'react';
import { Item, EquipmentSlotId, EquipmentSlotConfig } from '../../../types';
import { VIETNAMESE } from '../../../constants';
import * as GameTemplates from '../../../templates';

interface EquipmentSlotUIProps {
  slotConfig: EquipmentSlotConfig;
  equippedItem: Item | null; // The actual item object, or null if empty
  onDropItem: (slotId: EquipmentSlotId, itemId: string) => void;
  onDragStartFromSlot: (event: React.DragEvent<HTMLDivElement>, itemId: string, fromSlotId: EquipmentSlotId) => void;
  isDraggingOver: boolean;
  onDragEnterSlot: (slotId: EquipmentSlotId) => void;
  onDragLeaveSlot: () => void;
  onClick: (slotId: EquipmentSlotId, targetElement: HTMLDivElement) => void; // Added for click-to-equip
  isHighlighted: boolean; // Added for drag highlight
}

const EquipmentSlotUI: React.FC<EquipmentSlotUIProps> = ({
  slotConfig,
  equippedItem,
  onDropItem,
  onDragStartFromSlot,
  isDraggingOver,
  onDragEnterSlot,
  onDragLeaveSlot,
  onClick,
  isHighlighted,
}) => {
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const itemId = event.dataTransfer.getData('application/json-item-id');
    const itemCategory = event.dataTransfer.getData('application/json-item-category') as GameTemplates.ItemCategoryValues;
    const equipmentType = event.dataTransfer.getData('application/json-equipment-type') as GameTemplates.EquipmentTypeValues;
    
    if (itemId && itemCategory === GameTemplates.ItemCategory.EQUIPMENT && slotConfig.accepts.includes(equipmentType)) {
        onDropItem(slotConfig.id, itemId);
    }
    onDragLeaveSlot(); 
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (equippedItem) {
        onDragStartFromSlot(event, equippedItem.id, slotConfig.id);
    }
  };

  const slotLabel = (VIETNAMESE[slotConfig.labelKey] as string) || slotConfig.id;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    onClick(slotConfig.id, event.currentTarget);
  };
  
  let borderClass = 'border-gray-600 hover:border-indigo-500';
  if (isDraggingOver) {
    borderClass = 'border-green-500 bg-green-700/30 ring-2 ring-green-400';
  } else if (isHighlighted) {
    borderClass = 'border-yellow-400 bg-yellow-800/20 ring-1 ring-yellow-300 ring-offset-1 ring-offset-gray-900';
  }


  return (
    <div
      className={`w-24 h-24 sm:w-28 sm:h-28 border-2 rounded-lg flex flex-col items-center justify-between p-1 text-center transition-all duration-150 relative group ${borderClass} ${equippedItem ? 'cursor-grab' : 'cursor-pointer hover:bg-gray-700/70'}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={() => onDragEnterSlot(slotConfig.id)}
      onDragLeave={onDragLeaveSlot}
      draggable={!!equippedItem}
      onDragStart={handleDragStart}
      onClick={handleClick}
      title={equippedItem ? `${equippedItem.name} (${slotLabel})` : slotLabel}
      aria-label={slotLabel}
    >
      {equippedItem ? (
        <>
          <div className="flex-grow flex flex-col items-center justify-center w-full mt-1">
            <span className="text-xs font-semibold text-indigo-300 truncate w-full px-1">{equippedItem.name}</span>
            <span className="text-[10px] text-gray-400 truncate w-full px-1">{equippedItem.rarity}</span>
            {equippedItem.category === GameTemplates.ItemCategory.EQUIPMENT && (
              <span className="text-[9px] text-gray-500 truncate w-full px-1">
                {(equippedItem as GameTemplates.EquipmentTemplate).equipmentType}
              </span>
            )}
          </div>
        </>
      ) : (
        <span className="text-sm font-medium text-gray-400 px-1 flex items-center justify-center h-full">{VIETNAMESE.emptySlot}</span>
      )}
      <span 
        className="text-[10px] text-gray-500 group-hover:text-indigo-400 absolute bottom-0.5 left-0 right-0 text-center truncate px-1"
        title={slotLabel} 
      >
        {slotLabel}
      </span>
    </div>
  );
};

export default EquipmentSlotUI;