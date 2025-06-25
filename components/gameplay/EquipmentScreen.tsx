
import React, { useState, useCallback } from 'react';
import { GameScreen, KnowledgeBase, Item, EquipmentSlotId, EquipmentSlotConfig } from '../../types';
import Button from '../ui/Button';
import { VIETNAMESE, EQUIPMENT_SLOTS_CONFIG } from '../../constants';
import * as GameTemplates from '../../templates';
import EquipmentSlotUI from './equipment/EquipmentSlotUI';
import EquipmentInventoryList from './equipment/EquipmentInventoryList';
import PlayerStatsWithEquipment from './equipment/PlayerStatsWithEquipment';

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
    equipmentType: GameTemplates.EquipmentTypeValues;
    fromSlotId?: EquipmentSlotId; // If dragged from an equipment slot
  } | null>(null);
  const [draggingOverSlot, setDraggingOverSlot] = useState<EquipmentSlotId | null>(null);

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
    }
  }, [knowledgeBase.inventory]);

  const handleDropOnSlot = useCallback((slotId: EquipmentSlotId, droppedItemId: string) => {
    if (!draggedItemInfo || draggedItemInfo.id !== droppedItemId) {
        console.warn("Mismatched dragged item info on drop.");
        setDraggedItemInfo(null);
        return;
    }

    const previousItemIdInSlot = knowledgeBase.equippedItems[slotId];
    
    // If item was dragged from another slot, unequip it from there first
    if (draggedItemInfo.fromSlotId && draggedItemInfo.fromSlotId !== slotId) {
        onUpdateEquipment(draggedItemInfo.fromSlotId, null, draggedItemInfo.id); // Unequip from old slot
    }

    onUpdateEquipment(slotId, droppedItemId, previousItemIdInSlot);
    setDraggedItemInfo(null);
  }, [knowledgeBase.equippedItems, onUpdateEquipment, draggedItemInfo]);

  const handleDropOnInventory = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const fromSlotId = event.dataTransfer.getData('application/json-from-slot-id') as EquipmentSlotId | undefined;
    const itemId = event.dataTransfer.getData('application/json-item-id');

    if (fromSlotId && itemId) { // Item was dragged from a slot
        onUpdateEquipment(fromSlotId, null, itemId); // Unequip by setting slot to null
    }
    setDraggedItemInfo(null);
  };

  const handleDragOverInventory = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); // Allow dropping
  };

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

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4">
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
          />
        </div>

        {/* Right Column: Inventory */}
        <div 
            className="lg:col-span-1"
            onDrop={handleDropOnInventory}
            onDragOver={handleDragOverInventory}
        >
          <EquipmentInventoryList
            inventory={knowledgeBase.inventory}
            onDragStartItem={handleDragStartFromInventory}
          />
        </div>
      </div>
    </div>
  );
};

export default EquipmentScreen;
