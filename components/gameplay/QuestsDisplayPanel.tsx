
import React, { useState } from 'react';
import { Quest } from '../../types';
import { VIETNAMESE } from '../../constants';

interface QuestsDisplayPanelProps {
  quests: Quest[];
  onQuestClick: (quest: Quest) => void;
}

const QuestsDisplayPanel: React.FC<QuestsDisplayPanelProps> = ({ quests, onQuestClick }) => {
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'failed'>('active');
  const filteredQuests = quests.filter(q => q.status === activeTab);

  const renderQuestList = (questsToRender: Quest[]) => {
    if (questsToRender.length === 0) {
      let message = VIETNAMESE.noActiveQuests;
      if (activeTab === 'completed') message = VIETNAMESE.noCompletedQuests;
      if (activeTab === 'failed') message = VIETNAMESE.noFailedQuests;
      return <p className="text-gray-400 italic p-2 text-sm">{message}</p>;
    }
    return (
      <ul className="space-y-1 p-1">
        {questsToRender.map(quest => (
          <li
            key={quest.id}
            className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded cursor-pointer transition-colors"
            onClick={() => onQuestClick(quest)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onQuestClick(quest)}
            aria-label={`Details for quest ${quest.title}`}
            title={quest.title}
          >
            <span className="truncate block">
                <strong className="text-indigo-300">{quest.title}</strong>
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-gray-700 mb-2">
        {(['active', 'completed', 'failed'] as const).map(tab => (
          <button
            key={tab}
            className={`py-2 px-3 sm:px-4 text-xs sm:text-sm font-medium flex-1 ${
              activeTab === tab
                ? 'border-b-2 border-indigo-500 text-indigo-400'
                : 'text-gray-400 hover:text-indigo-300'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'active' ? VIETNAMESE.activeQuestsTab : tab === 'completed' ? VIETNAMESE.completedQuestsTab : VIETNAMESE.failedQuestsTab}
          </button>
        ))}
      </div>
      <div className="flex-grow overflow-y-auto custom-scrollbar">
        {renderQuestList(filteredQuests)}
      </div>
    </div>
  );
};

export default QuestsDisplayPanel;