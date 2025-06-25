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
}

const EquipmentSlotUI: React.FC<EquipmentSlotUIProps> = ({
  slotConfig,
  equippedItem,
  onDropItem,
  onDragStartFromSlot,
  isDraggingOver,
  onDragEnterSlot,
  onDragLeaveSlot
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
    } else {
        // Optionally provide feedback for invalid drop type
        console.warn(`Cannot drop item type "${equipmentType}" into slot "${slotConfig.labelKey}" which accepts "${slotConfig.accepts.join(', ')}"`);
        // You could use a notification system here:
        // notify(VIETNAMESE.cannotEquipItem(itemId, slotLabel, VIETNAMESE.invalidItemTypeForSlot), 'error');
    }
    onDragLeaveSlot(); // Reset dragging over state
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    if (equippedItem) {
        onDragStartFromSlot(event, equippedItem.id, slotConfig.id);
    }
  };

  const slotLabel = (VIETNAMESE[slotConfig.labelKey] as string) || slotConfig.id;

  return (
    <div
      className={`w-24 h-24 sm:w-28 sm:h-28 border-2 rounded-lg flex flex-col items-center justify-center p-1 text-center transition-all duration-150 relative
                  ${isDraggingOver ? 'border-green-500 bg-green-700/30 ring-2 ring-green-400' : 'border-gray-600 bg-gray-700/50 hover:border-indigo-500'}
                  ${equippedItem ? 'cursor-grab' : 'cursor-default'}`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={() => onDragEnterSlot(slotConfig.id)}
      onDragLeave={onDragLeaveSlot}
      draggable={!!equippedItem}
      onDragStart={handleDragStart}
      title={equippedItem ? `${equippedItem.name} (${slotLabel})` : slotLabel}
      aria-label={slotLabel}
    >
      {equippedItem ? (
        <>
          <span className="text-xs font-semibold text-indigo-300 truncate w-full px-1 mt-1">{equippedItem.name}</span>
          <span className="text-[10px] text-gray-400 truncate w-full px-1">{equippedItem.rarity}</span>
           {equippedItem.category === GameTemplates.ItemCategory.EQUIPMENT && (
             <span className="text-[10px] text-gray-500 truncate w-full px-1 mb-3">
               {(equippedItem as GameTemplates.EquipmentTemplate).equipmentType}
             </span>
           )}
        </>
      ) : (
        // Display slot label prominently when empty
        <span className="text-sm font-medium text-gray-400 px-1">{slotLabel}</span>
      )}
      {/* Keep a smaller label at the bottom for consistency or if item name is too long */}
      <span 
        className="text-xs text-gray-500 absolute bottom-1 left-0 right-0 text-center truncate px-1"
        title={slotLabel} // Ensure full label is visible on hover if truncated
      >
        {slotLabel}
      </span>
    </div>
  );
};

export default EquipmentSlotUI;