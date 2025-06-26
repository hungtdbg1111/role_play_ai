
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GameScreen, KnowledgeBase, Item, EquipmentSlotId, EquipmentSlotConfig, EquipmentTypeValues as EquipmentTypeValue } from '../../types';
import Button from '../ui/Button';
import { VIETNAMESE, EQUIPMENT_SLOTS_CONFIG } from '../../constants';
import * as GameTemplates from '../../templates';
import EquipmentSlotUI from './equipment/EquipmentSlotUI';
import EquipmentInventoryList from './equipment/EquipmentInventoryList';
import PlayerStatsWithEquipment from './equipment/PlayerStatsWithEquipment';
import EquippableItemsPopover from './equipment/EquippableItemsPopover'; // New component

interface EquipmentScreenProps {
  knowledgeBase: KnowledgeBase;
  setCurrentScreen: (screen: GameScreen) => void;
  onUpdateEquipment: (slotId: EquipmentSlotId, itemId: Item['id'] | null, previousItemIdInSlot: Item['id'] | null) => void;
}

const EquipmentScreen: React.FC<EquipmentScreenProps> = ({
  knowledgeBase,
  setCurrentScreen,
  onUpdateEquipment,
}) => {
  const [draggedItemInfo, setDraggedItemInfo] = useState<{
    id: string;
    category: GameTemplates.ItemCategoryValues;
    equipmentType: EquipmentTypeValue;
    fromSlotId?: EquipmentSlotId; 
  } | null>(null);
  const [draggingOverSlot, setDraggingOverSlot] = useState<EquipmentSlotId | null>(null);

  // State for click-to-equip popover
  const [activePopover, setActivePopover] = useState<{
    slotId: EquipmentSlotId;
    targetRect: DOMRect | null;
  } | null>(null);
  
  // State for highlighting valid slots on drag
  const [draggedItemTypeForHighlight, setDraggedItemTypeForHighlight] = useState<EquipmentTypeValue | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);


  const handleDragStartFromInventory = useCallback((event: React.DragEvent<HTMLDivElement>, item: Item) => {
    if (item.category === GameTemplates.ItemCategory.EQUIPMENT) {
      const equipment = item as GameTemplates.EquipmentTemplate;
      event.dataTransfer.setData('application/json-item-id', item.id);
      event.dataTransfer.setData('application/json-item-category', item.category);
      event.dataTransfer.setData('application/json-equipment-type', equipment.equipmentType || '');
      event.dataTransfer.effectAllowed = 'move';
      setDraggedItemInfo({
        id: item.id,
        category: item.category,
        equipmentType: equipment.equipmentType,
      });
      setDraggedItemTypeForHighlight(equipment.equipmentType); // Set for highlighting
      setActivePopover(null); // Close popover if open
    }
  }, []);

  const handleDragStartFromSlot = useCallback((event: React.DragEvent<HTMLDivElement>, itemId: string, fromSlotId: EquipmentSlotId) => {
    const item = knowledgeBase.inventory.find(i => i.id === itemId);
    if (item && item.category === GameTemplates.ItemCategory.EQUIPMENT) {
        const equipment = item as GameTemplates.EquipmentTemplate;
        event.dataTransfer.setData('application/json-item-id', item.id);
        event.dataTransfer.setData('application/json-item-category', item.category);
        event.dataTransfer.setData('application/json-equipment-type', equipment.equipmentType || '');
        event.dataTransfer.setData('application/json-from-slot-id', fromSlotId);
        event.dataTransfer.effectAllowed = 'move';
        setDraggedItemInfo({
            id: item.id,
            category: item.category,
            equipmentType: equipment.equipmentType,
            fromSlotId: fromSlotId
        });
        setDraggedItemTypeForHighlight(equipment.equipmentType); // Set for highlighting
        setActivePopover(null); // Close popover if open
    }
  }, [knowledgeBase.inventory]);

  const handleDragEnd = useCallback(() => {
    setDraggedItemInfo(null);
    setDraggedItemTypeForHighlight(null); // Clear highlight
  }, []);

  const handleDropOnSlot = useCallback((slotId: EquipmentSlotId, droppedItemId: string) => {
    if (!draggedItemInfo || draggedItemInfo.id !== droppedItemId) {
        setDraggedItemInfo(null);
        setDraggedItemTypeForHighlight(null);
        return;
    }
    const previousItemIdInSlot = knowledgeBase.equippedItems[slotId];
    if (draggedItemInfo.fromSlotId && draggedItemInfo.fromSlotId !== slotId) {
        onUpdateEquipment(draggedItemInfo.fromSlotId, null, draggedItemInfo.id); 
    }
    onUpdateEquipment(slotId, droppedItemId, previousItemIdInSlot);
    handleDragEnd();
  }, [knowledgeBase.equippedItems, onUpdateEquipment, draggedItemInfo, handleDragEnd]);

  const handleDropOnInventory = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fromSlotId = event.dataTransfer.getData('application/json-from-slot-id') as EquipmentSlotId | undefined;
    const itemId = event.dataTransfer.getData('application/json-item-id');
    if (fromSlotId && itemId) { 
        onUpdateEquipment(fromSlotId, null, itemId); 
    }
    handleDragEnd();
  };

  const handleDragOverInventory = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
  };

  // Click-to-equip handlers
  const handleSlotClick = useCallback((slotId: EquipmentSlotId, targetElement: HTMLDivElement) => {
    if (activePopover && activePopover.slotId === slotId) {
      setActivePopover(null); // Close if already open for this slot
    } else {
      setActivePopover({ slotId, targetRect: targetElement.getBoundingClientRect() });
    }
  }, [activePopover]);

  const handleClosePopover = useCallback(() => {
    setActivePopover(null);
  }, []);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
         if (activePopover && !(event.target as HTMLElement).closest('.group')) { // Check if click was outside any slot UI
            handleClosePopover();
         }
      }
    };
    if (activePopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activePopover, handleClosePopover]);


  const handleEquipFromPopover = useCallback((slotId: EquipmentSlotId, itemIdToEquip: string) => {
    const previousItemIdInSlot = knowledgeBase.equippedItems[slotId];
    onUpdateEquipment(slotId, itemIdToEquip, previousItemIdInSlot);
    handleClosePopover();
  }, [knowledgeBase.equippedItems, onUpdateEquipment, handleClosePopover]);

  const handleUnequipFromPopover = useCallback((slotId: EquipmentSlotId) => {
    const previousItemIdInSlot = knowledgeBase.equippedItems[slotId];
    if (previousItemIdInSlot) {
      onUpdateEquipment(slotId, null, previousItemIdInSlot);
    }
    handleClosePopover();
  }, [knowledgeBase.equippedItems, onUpdateEquipment, handleClosePopover]);

  const getCompatibleItemsForPopover = (): Item[] => {
    if (!activePopover) return [];
    const slotConfig = EQUIPMENT_SLOTS_CONFIG.find(s => s.id === activePopover.slotId);
    if (!slotConfig) return [];
    return knowledgeBase.inventory.filter(item => 
      item.category === GameTemplates.ItemCategory.EQUIPMENT && 
      slotConfig.accepts.includes((item as GameTemplates.EquipmentTemplate).equipmentType)
    );
  };
  
  const currentItemInActivePopoverSlot = activePopover ? 
    knowledgeBase.inventory.find(i => i.id === knowledgeBase.equippedItems[activePopover.slotId]) || null : null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-800 p-3 sm:p-4 text-gray-100">
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          {VIETNAMESE.equipmentScreenTitle}
        </h1>
        <Button variant="secondary" onClick={() => setCurrentScreen(GameScreen.Gameplay)}>
          {VIETNAMESE.goBackButton}
        </Button>
      </header>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 relative"> {/* Added relative for popover positioning */}
        {/* Left Column: Equipment Slots & Stats */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-gray-900 p-3 sm:p-4 rounded-lg shadow-xl border border-gray-700">
            <h2 className="text-xl font-semibold text-indigo-300 mb-4 border-b border-gray-600 pb-2">
              {VIETNAMESE.equippedItemsSection}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 place-items-center">
              {EQUIPMENT_SLOTS_CONFIG.map(slotConfig => {
                const equippedItemId = knowledgeBase.equippedItems[slotConfig.id];
                const equippedItem = equippedItemId ? knowledgeBase.inventory.find(i => i.id === equippedItemId) : null;
                const isSlotHighlighted = !!draggedItemTypeForHighlight && slotConfig.accepts.includes(draggedItemTypeForHighlight);
                return (
                  <EquipmentSlotUI
                    key={slotConfig.id}
                    slotConfig={slotConfig}
                    equippedItem={equippedItem || null}
                    onDropItem={handleDropOnSlot}
                    onDragStartFromSlot={handleDragStartFromSlot}
                    isDraggingOver={draggingOverSlot === slotConfig.id}
                    onDragEnterSlot={setDraggingOverSlot}
                    onDragLeaveSlot={() => setDraggingOverSlot(null)}
                    onClick={handleSlotClick}
                    isHighlighted={isSlotHighlighted}
                  />
                );
              })}
            </div>
          </div>
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
            isPlayerContext={true}
          />
        </div>

        {/* Right Column: Inventory */}
        <div 
            className="lg:col-span-1"
            onDrop={handleDropOnInventory}
            onDragOver={handleDragOverInventory}
            onDragEnd={handleDragEnd} // Added drag end to clear highlight from inventory drags
        >
          <EquipmentInventoryList
            inventory={knowledgeBase.inventory}
            onDragStartItem={handleDragStartFromInventory}
          />
        </div>
         {activePopover && (
          <div ref={popoverRef}>
            <EquippableItemsPopover
              slotId={activePopover.slotId}
              items={getCompatibleItemsForPopover()}
              currentItemInSlot={currentItemInActivePopoverSlot as Item | null}
              onSelectItem={(itemId) => handleEquipFromPopover(activePopover.slotId, itemId)}
              onUnequip={() => handleUnequipFromPopover(activePopover.slotId)}
              onClose={handleClosePopover}
              targetRect={activePopover.targetRect}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentScreen;