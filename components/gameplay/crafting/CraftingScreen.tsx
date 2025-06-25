
import React, { useState, useCallback, ChangeEvent } from 'react';
import { GameScreen, KnowledgeBase, Item as ItemType } from '../../../types';
import Button from '../../ui/Button';
import InputField from '../../ui/InputField';
import { VIETNAMESE } from '../../../constants';
import * as GameTemplates from '../../../templates';
import CraftingMaterialSlotUI from './CraftingMaterialSlotUI';
import MaterialInventoryListUI from './MaterialInventoryListUI';

interface CraftingScreenProps {
  knowledgeBase: KnowledgeBase;
  setCurrentScreen: (screen: GameScreen) => void;
  onCraftItem: (
    desiredCategory: GameTemplates.ItemCategoryValues,
    requirements: string,
    materialIds: string[]
  ) => void;
  isCrafting: boolean; 
}

const CraftingScreen: React.FC<CraftingScreenProps> = ({
  knowledgeBase,
  setCurrentScreen,
  onCraftItem,
  isCrafting,
}) => {
  const [desiredCategory, setDesiredCategory] = useState<GameTemplates.ItemCategoryValues | ''>('');
  const [itemRequirements, setItemRequirements] = useState('');
  const [materialSlots, setMaterialSlots] = useState<Array<{ id: string; itemId: string | null }>>([
    { id: `slot-${Date.now()}`, itemId: null },
  ]);
  const [draggingOverSlotId, setDraggingOverSlotId] = useState<string | null>(null);

  const handleAddMaterialSlot = () => {
    if (materialSlots.length < 10) { // Limit max slots
      setMaterialSlots(prev => [...prev, { id: `slot-${Date.now()}-${prev.length}`, itemId: null }]);
    }
  };

  const handleRemoveMaterialSlot = (slotIdToRemove: string) => {
    setMaterialSlots(prev => prev.filter(slot => slot.id !== slotIdToRemove && prev.length > 1)); // Keep at least one slot
  };
  
  const handleDropOnMaterialSlot = useCallback((slotId: string, droppedItemId: string) => {
    setMaterialSlots(prevSlots =>
      prevSlots.map(slot =>
        slot.id === slotId ? { ...slot, itemId: droppedItemId } : slot
      )
    );
    setDraggingOverSlotId(null);
  }, []);

  const handleRemoveMaterialFromSlot = useCallback((slotIdToRemoveMaterialFrom: string) => {
     setMaterialSlots(prevSlots =>
      prevSlots.map(slot =>
        slot.id === slotIdToRemoveMaterialFrom ? { ...slot, itemId: null } : slot
      )
    );
  }, []);

  const handleDragStartFromInventory = useCallback((event: React.DragEvent<HTMLDivElement>, item: ItemType) => {
    if (item.category === GameTemplates.ItemCategory.MATERIAL) {
      event.dataTransfer.setData('application/json-item-id', item.id);
      event.dataTransfer.setData('application/json-item-category', item.category); // Ensure this is 'Material'
      event.dataTransfer.effectAllowed = 'copyMove';
    } else {
      event.preventDefault(); // Prevent dragging non-materials
    }
  }, []);

  const handleCraft = () => {
    if (!desiredCategory) {
      // Optionally, show a notification to select a category
      alert(VIETNAMESE.selectItemCategory);
      return;
    }
    const materialItemIds = materialSlots.map(slot => slot.itemId).filter(id => id !== null) as string[];
    if (materialItemIds.length === 0) {
        alert(VIETNAMESE.noMaterialsForCrafting);
        return;
    }
    onCraftItem(desiredCategory, itemRequirements, materialItemIds);
  };
  
  const itemCategoriesForDropdown = Object.values(GameTemplates.ItemCategory).map(category => ({
    value: category,
    label: VIETNAMESE[`itemCategory_${category}` as keyof typeof VIETNAMESE] || category,
  }));


  return (
    <div className="min-h-screen flex flex-col bg-gray-800 p-3 sm:p-4 text-gray-100">
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-500 to-yellow-600">
          {VIETNAMESE.craftingScreenTitle}
        </h1>
        <Button variant="secondary" onClick={() => setCurrentScreen(GameScreen.Gameplay)} disabled={isCrafting}>
          {VIETNAMESE.goBackButton}
        </Button>
      </header>

      <div className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left & Middle Column: Crafting Setup */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Section 1: Desired Item */}
          <div className="bg-gray-900 p-3 sm:p-4 rounded-lg shadow-xl border border-gray-700">
            <h2 className="text-xl font-semibold text-amber-300 mb-3 border-b border-gray-600 pb-2">
              {VIETNAMESE.desiredItemSection}
            </h2>
            <div className="space-y-3">
              <InputField
                label={VIETNAMESE.desiredItemCategoryLabel}
                id="desiredItemCategory"
                type="select"
                options={['', ...Object.values(GameTemplates.ItemCategory)]} // Add a default empty option
                value={desiredCategory}
                onChange={(e) => setDesiredCategory(e.target.value as GameTemplates.ItemCategoryValues | '')}
              />
              <InputField
                label={VIETNAMESE.desiredItemRequirementsLabel}
                id="itemRequirements"
                textarea
                rows={3}
                value={itemRequirements}
                onChange={(e) => setItemRequirements(e.target.value)}
                placeholder={VIETNAMESE.desiredItemRequirementsPlaceholder}
              />
            </div>
          </div>

          {/* Section 2: Material Slots */}
          <div className="bg-gray-900 p-3 sm:p-4 rounded-lg shadow-xl border border-gray-700">
            <div className="flex justify-between items-center mb-3 border-b border-gray-600 pb-2">
                <h2 className="text-xl font-semibold text-amber-300">
                {VIETNAMESE.craftingMaterialsSection}
                </h2>
                <Button variant="primary" size="sm" onClick={handleAddMaterialSlot} disabled={materialSlots.length >= 10 || isCrafting}>
                    {VIETNAMESE.addMaterialSlotButton}
                </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
              {materialSlots.map((slot, index) => (
                <div key={slot.id} className="relative">
                    <CraftingMaterialSlotUI
                    slotId={slot.id}
                    material={slot.itemId ? knowledgeBase.inventory.find(i => i.id === slot.itemId) || null : null}
                    onDropMaterial={handleDropOnMaterialSlot}
                    onRemoveMaterial={handleRemoveMaterialFromSlot}
                    isDraggingOver={draggingOverSlotId === slot.id}
                    onDragEnterSlot={setDraggingOverSlotId}
                    onDragLeaveSlot={() => setDraggingOverSlotId(null)}
                    />
                    {materialSlots.length > 1 && (
                         <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemoveMaterialSlot(slot.id)}
                            className="!absolute !-top-1 !-right-1 !p-0.5 !w-5 !h-5 flex items-center justify-center !text-xs leading-none rounded-full"
                            title="Xóa ô nguyên liệu này"
                            disabled={isCrafting}
                        >
                            &times;
                        </Button>
                    )}
                </div>
              ))}
            </div>
          </div>
          <Button 
            variant="primary" 
            size="lg" 
            onClick={handleCraft} 
            className="w-full mt-2 bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
            isLoading={isCrafting}
            loadingText={VIETNAMESE.craftingInProgress}
            disabled={isCrafting || !desiredCategory || materialSlots.every(s => s.itemId === null)}
          >
            {VIETNAMESE.craftItemButton}
          </Button>
        </div>

        {/* Right Column: Material Inventory List */}
        <div className="lg:col-span-1">
          <MaterialInventoryListUI
            inventory={knowledgeBase.inventory}
            onDragStartItem={handleDragStartFromInventory}
          />
        </div>
      </div>
    </div>
  );
};

export default CraftingScreen;
