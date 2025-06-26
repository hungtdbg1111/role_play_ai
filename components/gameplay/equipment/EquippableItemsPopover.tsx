
import React, { useEffect, useRef, useState } from 'react';
import { Item, EquipmentSlotId } from '../../../types';
import { VIETNAMESE } from '../../../constants';
import Button from '../../ui/Button';
import * as GameTemplates from '../../../templates';

interface EquippableItemsPopoverProps {
  slotId: EquipmentSlotId;
  items: Item[]; // Already filtered compatible items
  currentItemInSlot: Item | null;
  onSelectItem: (itemId: string) => void;
  onUnequip: () => void;
  onClose: () => void;
  targetRect: DOMRect | null;
}

const EquippableItemsPopover: React.FC<EquippableItemsPopoverProps> = ({
  slotId,
  items,
  currentItemInSlot,
  onSelectItem,
  onUnequip,
  onClose,
  targetRect,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    // Click outside is handled by the parent EquipmentScreen for this popover

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  useEffect(() => {
    if (targetRect && popoverRef.current) {
      const popoverElement = popoverRef.current;
      const panel = popoverElement.closest('.lg\\:col-span-2'); // Find the parent container
      const panelRect = panel ? panel.getBoundingClientRect() : { top: 0, left: 0, width: window.innerWidth, height: window.innerHeight };
      
      let top = targetRect.bottom + 5;
      let left = targetRect.left;

      // Adjust if too close to right edge
      if (left + popoverElement.offsetWidth > panelRect.left + panelRect.width - 10) {
        left = panelRect.left + panelRect.width - popoverElement.offsetWidth - 10;
      }
      // Adjust if too close to left edge
      if (left < panelRect.left + 10) {
        left = panelRect.left + 10;
      }
      // Adjust if too close to bottom edge
      if (top + popoverElement.offsetHeight > panelRect.top + panelRect.height - 10) {
        top = targetRect.top - popoverElement.offsetHeight - 5;
      }
      // Adjust if too close to top edge
      if (top < panelRect.top + 10) {
        top = panelRect.top + 10;
      }
      setPosition({ top, left });
    }
  }, [targetRect]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 text-sm text-gray-100 w-64 max-h-80 flex flex-col"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()} // Prevent clicks inside from closing via parent's listener
    >
      <div className="flex justify-between items-center mb-2 border-b border-gray-600 pb-1.5">
        <h4 className="font-semibold text-indigo-400">{VIETNAMESE.selectItemToEquip}</h4>
        <Button onClick={onClose} variant="ghost" size="sm" className="!p-0.5 text-gray-400 hover:text-white">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {currentItemInSlot && (
        <Button
          variant="danger"
          size="sm"
          onClick={onUnequip}
          className="w-full mb-2 text-xs"
        >
          {VIETNAMESE.unequipItemButton}: {currentItemInSlot.name}
        </Button>
      )}

      {items.length === 0 && !currentItemInSlot && (
        <p className="text-xs text-gray-400 italic py-2 text-center">{VIETNAMESE.noCompatibleItems}</p>
      )}

      {items.length > 0 && (
        <ul className="space-y-1 overflow-y-auto custom-scrollbar flex-grow">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSelectItem(item.id)}
                className="w-full text-left p-1.5 rounded hover:bg-gray-700 focus:bg-indigo-700 focus:outline-none transition-colors duration-100"
                disabled={item.id === currentItemInSlot?.id} // Disable if already equipped
                title={`${item.name} (${(item as GameTemplates.EquipmentTemplate).equipmentType} - ${item.rarity})`}
              >
                <div className="flex justify-between items-center">
                    <span className={`truncate ${item.id === currentItemInSlot?.id ? 'text-gray-500 italic' : 'text-indigo-300'}`}>{item.name}</span>
                    <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{item.rarity}</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  {item.category === GameTemplates.ItemCategory.EQUIPMENT && (item as GameTemplates.EquipmentTemplate).equipmentType}
                  {/* Add more small details like key stats if needed */}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default EquippableItemsPopover;