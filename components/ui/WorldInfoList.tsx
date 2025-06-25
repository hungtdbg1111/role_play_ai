
import React from 'react';

// Generic type constraint: T must have an 'id' and either 'name' or 'title'.
export interface WorldInfoListProps<T extends {id: string, name: string} | {id: string, title: string}> {
  items: T[];
  onItemClick: (item: T) => void;
  emptyMessage: string;
  getItemDisplay: (item: T) => React.ReactNode; // Changed to React.ReactNode
  getItemTitleString: (item: T) => string; // New prop for string title for aria attributes
}

const WorldInfoList = <T extends {id: string, name: string} | {id: string, title: string}>({ items, onItemClick, emptyMessage, getItemDisplay, getItemTitleString }: WorldInfoListProps<T>) => {
  if (items.length === 0) {
    return <p className="text-gray-400 italic p-2 text-sm">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map(item => {
        const displayNode = getItemDisplay(item);
        const titleString = getItemTitleString(item);
        return (
          <li
            key={item.id}
            className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded cursor-pointer transition-colors flex items-center" // Added flex and items-center
            onClick={() => onItemClick(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onItemClick(item)}
            aria-label={`Details for ${titleString}`}
            title={titleString} // Show full text on hover
          >
            {/* The displayNode can now contain an image and text */}
            {displayNode}
          </li>
        );
      })}
    </ul>
  );
};

export default WorldInfoList;
