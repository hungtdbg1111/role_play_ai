
import React from 'react';
import { KnowledgeBase, NPC, GameLocation, WorldLoreEntry, Companion } from '../../types';
import { VIETNAMESE } from '../../constants';
import WorldInfoList from '../ui/WorldInfoList';
// import Button from '../ui/Button'; // No longer needed

interface WorldSidePanelProps {
  knowledgeBase: KnowledgeBase;
  onNpcClick: (npc: NPC) => void;
  onLocationClick: (location: GameLocation) => void;
  onLoreClick: (lore: WorldLoreEntry) => void;
  onCompanionClick: (companion: Companion) => void;
  // onClose: () => void; // Removed - handled by OffCanvasPanel
}

const WorldSidePanel: React.FC<WorldSidePanelProps> = ({
  knowledgeBase,
  onNpcClick,
  onLocationClick,
  onLoreClick,
  onCompanionClick,
  // onClose // Removed
}) => {
  return (
    <div className="flex flex-col h-full space-y-3 sm:space-y-4">
        <div>
            <h4 className="text-md sm:text-lg font-semibold text-indigo-300 mb-1 sm:mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.discoveredNPCsSection}</h4>
            <WorldInfoList
                items={knowledgeBase.discoveredNPCs}
                onItemClick={onNpcClick}
                emptyMessage={VIETNAMESE.noNPCsDiscovered}
                getItemDisplay={(npc: NPC) => npc.name}
            />
        </div>
        <div>
            <h4 className="text-md sm:text-lg font-semibold text-indigo-300 mb-1 sm:mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.discoveredLocationsSection}</h4>
            <WorldInfoList
                items={knowledgeBase.discoveredLocations}
                onItemClick={onLocationClick}
                emptyMessage={VIETNAMESE.noLocationsDiscovered}
                getItemDisplay={(loc: GameLocation) => loc.name}
            />
        </div>
        <div>
            <h4 className="text-md sm:text-lg font-semibold text-indigo-300 mb-1 sm:mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.worldLoreSection}</h4>
            <WorldInfoList
                items={knowledgeBase.worldLore}
                onItemClick={onLoreClick}
                emptyMessage={VIETNAMESE.noWorldLore}
                getItemDisplay={(lore: WorldLoreEntry) => lore.title}
            />
        </div>
        <div>
            <h4 className="text-md sm:text-lg font-semibold text-indigo-300 mb-1 sm:mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.companionsSection}</h4>
            <WorldInfoList
                items={knowledgeBase.companions}
                onItemClick={onCompanionClick}
                emptyMessage={VIETNAMESE.noCompanions}
                getItemDisplay={(comp: Companion) => `${comp.name} (HP: ${comp.hp}/${comp.maxHp})`}
            />
        </div>
    </div>
  );
};

export default WorldSidePanel;