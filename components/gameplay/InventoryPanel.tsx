
import React from 'react';
import { Item } from '../../types';
import { VIETNAMESE } from '../../constants';

interface InventoryPanelProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}

const InventoryPanel: React.FC<InventoryPanelProps> = React.memo(({items, onItemClick}) => {
  return (
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md mb-4">
       <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{VIETNAMESE.inventory}</h3>
       {items.length === 0 ? <p className="text-gray-400 italic text-sm">Túi đồ trống rỗng.</p> : (
        <ul className="space-y-1 max-h-48 sm:max-h-60 overflow-y-auto custom-scrollbar">
          {items.map(item => (
            <li
              key={item.id}
              className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded cursor-pointer transition-colors"
              onClick={() => onItemClick(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onItemClick(item)}
              aria-label={`Details for ${item.name}`}
              title={`${item.name} (x${item.quantity})`}
            >
              <span className="truncate block">
                <strong className="text-indigo-300">{item.name}</strong> (x{item.quantity})
              </span>
            </li>
          ))}
        </ul>
       )}
    </div>
  );
});

export default InventoryPanel;