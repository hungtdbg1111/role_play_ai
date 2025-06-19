
import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { KnowledgeBase, GameMessage, AiChoice, PlayerStats, Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, QuestObjective, FirebaseUser, PlayerActionInputType, ResponseLength } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';
import KeywordSpan from './ui/KeywordSpan';
import MiniInfoPopover from './ui/MiniInfoPopover';
import { VIETNAMESE } from '../constants';

// --- Define GameplayScreenProps interface ---
interface GameplayScreenProps {
  knowledgeBase: KnowledgeBase;
  gameMessages: GameMessage[];
  isLoading: boolean;
  onPlayerAction: (action: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => void;
  onQuit: () => void;
  rawAiResponsesLog: string[];
  firebaseUser: FirebaseUser | null; // For enabling/disabling save
  onSaveGame: () => Promise<void>; // Function to trigger game save
  isSavingGame: boolean; // To show loading state on save button
}

// --- Helper function to escape regex characters ---
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};


// --- Reusable StatDisplay ---
const StatDisplay: React.FC<{label: string, value: string | number, className?: string}> = ({label, value, className=""}) => (
  <div className={`text-sm py-1 ${className}`}>
    <span className="font-semibold text-indigo-300">{label}: </span>
    <span className="text-gray-100">{value}</span>
  </div>
);

// --- Player Stats Panel ---
interface PlayerStatsPanelProps {
  stats: PlayerStats;
  currencyName?: string;
}
const PlayerStatsPanel: React.FC<PlayerStatsPanelProps> = React.memo(({stats, currencyName}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
      <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{VIETNAMESE.playerStats}</h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        <StatDisplay label="HP" value={`${stats.hp}/${stats.maxHp}`} />
        <StatDisplay label="Mana" value={`${stats.mana}/${stats.maxMana}`} />
        <StatDisplay label="ATK" value={stats.atk} />
        <StatDisplay label="Cấp" value={stats.level} />
        <StatDisplay label="EXP" value={`${stats.exp}/${stats.maxExp}`} />
        <StatDisplay label="Cảnh Giới" value={stats.realm} />
        <StatDisplay label={currencyName || "Tiền Tệ"} value={stats.currency} />
        <StatDisplay label="Lượt" value={stats.turn} />
      </div>
    </div>
  );
});

// --- Inventory Panel ---
interface InventoryPanelProps {
  items: Item[];
  onItemClick: (item: Item) => void;
}
const InventoryPanel: React.FC<InventoryPanelProps> = React.memo(({items, onItemClick}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md mb-4">
       <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{VIETNAMESE.inventory}</h3>
       {items.length === 0 ? <p className="text-gray-400 italic">Túi đồ trống rỗng.</p> : (
        <ul className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
          {items.map(item => (
            <li 
              key={item.id} 
              className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded cursor-pointer transition-colors"
              onClick={() => onItemClick(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onItemClick(item)}
            >
              <strong className="text-indigo-300">{item.name}</strong> (x{item.quantity})
            </li>
          ))}
        </ul>
       )}
    </div>
  );
});

// --- Skills Panel ---
interface SkillsPanelProps {
  skills: Skill[];
  onSkillClick: (skill: Skill) => void;
}
const SkillsPanel: React.FC<SkillsPanelProps> = React.memo(({skills, onSkillClick}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-md">
       <h3 className="text-lg font-semibold text-indigo-400 mb-3 border-b border-gray-700 pb-2">{VIETNAMESE.skills}</h3>
       {skills.length === 0 ? <p className="text-gray-400 italic">Chưa học được kỹ năng nào.</p> : (
        <ul className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
          {skills.map(skill => (
            <li 
              key={skill.id} 
              className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded cursor-pointer transition-colors"
              onClick={() => onSkillClick(skill)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSkillClick(skill)}
            >
              <strong className="text-indigo-300">{skill.name}</strong>
            </li>
          ))}
        </ul>
       )}
    </div>
  );
});

// --- Quests Display Panel (for inline sidebar) ---
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
      return <p className="text-gray-400 italic p-2">{message}</p>;
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
          >
            <strong className="text-indigo-300">{quest.title}</strong>
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
            className={`py-2 px-4 text-sm font-medium flex-1 ${
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


// --- World Information Panels ---
interface WorldInfoListProps<T extends {id: string, name: string} | {id: string, title: string}> {
  items: T[];
  onItemClick: (item: T) => void;
  emptyMessage: string;
  getItemDisplay: (item: T) => string;
}

const WorldInfoList = <T extends {id: string, name: string} | {id: string, title: string}>({ items, onItemClick, emptyMessage, getItemDisplay }: WorldInfoListProps<T>) => {
  if (items.length === 0) {
    return <p className="text-gray-400 italic p-2 text-sm">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map(item => (
        <li 
          key={item.id} 
          className="text-sm text-gray-300 hover:bg-gray-700 p-2 rounded cursor-pointer transition-colors"
          onClick={() => onItemClick(item)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onItemClick(item)}
        >
          {getItemDisplay(item)}
        </li>
      ))}
    </ul>
  );
};

// --- Debug Panel ---
interface DebugPanelDisplayProps {
  kb: KnowledgeBase;
  rawAiResponsesLog: string[];
}
const DebugPanelDisplay: React.FC<DebugPanelDisplayProps> = ({ kb, rawAiResponsesLog }) => {
  const renderKbList = (title: string, items: any[], nameKey: string = 'name', idKey: string = 'id') => {
    return (
      <div className="mb-3">
        <h5 className="text-md font-semibold text-yellow-300 mb-1">{title} ({items.length})</h5>
        {items.length === 0 ? (
          <p className="text-xs italic text-gray-500">Trống.</p>
        ) : (
          <ul className="list-disc list-inside pl-2 space-y-0.5 max-h-32 overflow-y-auto custom-scrollbar text-xs">
            {items.map(item => (
              <li key={item[idKey] || item[nameKey]} className="text-gray-300">
                {item[nameKey]}
                {item.title && ` (${item.title})`}
                {item.status && ` (Status: ${item.status})`}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border-2 border-yellow-500 p-3 rounded-lg shadow-2xl max-w-md max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar z-50">
      <h4 className="text-lg font-bold text-yellow-400 mb-3 border-b border-yellow-600 pb-2">Bảng Điều Khiển Debug</h4>
      
      <div className="mb-4">
        <h5 className="text-lg font-semibold text-amber-300 mb-2">Knowledge Base Inspector</h5>
        {renderKbList("Vật phẩm (Inventory)", kb.inventory, 'name')}
        {renderKbList("Kỹ năng (Player Skills)", kb.playerSkills, 'name')}
        {renderKbList("Nhiệm vụ (All Quests)", kb.allQuests, 'title')}
        {renderKbList("NPC đã gặp (Discovered NPCs)", kb.discoveredNPCs, 'name')}
        {renderKbList("Địa điểm đã biết (Discovered Locations)", kb.discoveredLocations, 'name')}
        {renderKbList("Tri thức Thế giới (World Lore)", kb.worldLore, 'title')}
        {renderKbList("Bạn đồng hành (Companions)", kb.companions, 'name')}
        <div className="mt-2 text-xs text-gray-500">
          Player Level: {kb.playerStats.level}, Realm: {kb.playerStats.realm}, Turn: {kb.playerStats.turn}
        </div>
      </div>

      <div>
        <h5 className="text-lg font-semibold text-sky-300 mb-2">AI Communication Log (Last 50)</h5>
        {rawAiResponsesLog.length === 0 ? (
          <p className="text-xs italic text-gray-500">Chưa có log rå AI nào.</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar text-xs">
            {rawAiResponsesLog.map((logEntry, index) => (
              <pre key={index} className="p-1.5 bg-gray-800 rounded text-sky-200 whitespace-pre-wrap break-all text-[10px] leading-relaxed">
                {logEntry}
              </pre>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


// --- Main Gameplay Screen Component ---
const GameplayScreen: React.FC<GameplayScreenProps> = ({ 
    knowledgeBase, 
    gameMessages, 
    isLoading, 
    onPlayerAction, 
    onQuit, 
    rawAiResponsesLog,
    firebaseUser,
    onSaveGame,
    isSavingGame
}) => {
  const [playerInput, setPlayerInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isCharPanelOpen, setIsCharPanelOpen] = useState(false);
  const [isQuestsPanelOpen, setIsQuestsPanelOpen] = useState(false);
  const [isWorldPanelOpen, setIsWorldPanelOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<NPC | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<GameLocation | null>(null);
  const [selectedLore, setSelectedLore] = useState<WorldLoreEntry | null>(null);
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  
  const [currentActionType, setCurrentActionType] = useState<PlayerActionInputType>('action');
  const [isActionTypeDropdownOpen, setIsActionTypeDropdownOpen] = useState(false);
  const actionTypeDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedResponseLength, setSelectedResponseLength] = useState<ResponseLength>('default');
  const [isResponseLengthDropdownOpen, setIsResponseLengthDropdownOpen] = useState(false);
  const responseLengthDropdownRef = useRef<HTMLDivElement>(null);


  const [miniInfoPopover, setMiniInfoPopover] = useState<{
    isOpen: boolean;
    targetRect: DOMRect | null;
    entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion | null;
    entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | null;
  }>({ isOpen: false, targetRect: null, entity: null, entityType: null });


  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [gameMessages]);

  // Close dropdowns on click outside or ESC
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionTypeDropdownRef.current && !actionTypeDropdownRef.current.contains(event.target as Node)) {
        setIsActionTypeDropdownOpen(false);
      }
      if (responseLengthDropdownRef.current && !responseLengthDropdownRef.current.contains(event.target as Node)) {
        setIsResponseLengthDropdownOpen(false);
      }
    };
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsActionTypeDropdownOpen(false);
        setIsResponseLengthDropdownOpen(false);
      }
    };

    if (isActionTypeDropdownOpen || isResponseLengthDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isActionTypeDropdownOpen, isResponseLengthDropdownOpen]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPlayerInput(e.target.value);
  };

  const selectActionType = (type: PlayerActionInputType) => {
    setCurrentActionType(type);
    setIsActionTypeDropdownOpen(false);
  };

  const selectResponseLength = (length: ResponseLength) => {
    setSelectedResponseLength(length);
    setIsResponseLengthDropdownOpen(false);
  };

  const getResponseLengthButtonLabel = (): string => {
    return VIETNAMESE.responseLengthButtonText(selectedResponseLength);
  };


  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerInput.trim() && !isLoading) {
      onPlayerAction(playerInput.trim(), false, currentActionType, selectedResponseLength);
      setPlayerInput('');
    }
  };

  const handleChoiceClick = (choiceText: string) => {
    if (!isLoading) {
      onPlayerAction(choiceText, true, 'action', selectedResponseLength); 
       setPlayerInput('');
    }
  };
  
  const latestMessageWithChoices = [...gameMessages].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);

  const closeModal = () => {
    setSelectedItem(null);
    setSelectedSkill(null);
    setSelectedQuest(null);
    setSelectedNpc(null);
    setSelectedLocation(null);
    setSelectedLore(null);
    setSelectedCompanion(null);
  };

  const toggleCharPanel = () => {
    const newCharOpenState = !isCharPanelOpen;
    setIsCharPanelOpen(newCharOpenState);
    if (newCharOpenState) {
        setIsQuestsPanelOpen(false);
        setIsWorldPanelOpen(false);
    }
  };

  const toggleQuestsPanel = () => {
    const newQuestsOpenState = !isQuestsPanelOpen;
    setIsQuestsPanelOpen(newQuestsOpenState);
    if (newQuestsOpenState) {
        setIsCharPanelOpen(false);
        setIsWorldPanelOpen(false);
    }
  };

  const toggleWorldPanel = () => {
    const newWorldOpenState = !isWorldPanelOpen;
    setIsWorldPanelOpen(newWorldOpenState);
    if (newWorldOpenState) {
        setIsCharPanelOpen(false);
        setIsQuestsPanelOpen(false);
    }
  };
  
  const openSidebar = isCharPanelOpen || isQuestsPanelOpen || isWorldPanelOpen;

  const handleKeywordClick = useCallback((
    event: React.MouseEvent<HTMLSpanElement>,
    entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion,
    entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion'
  ) => {
    const target = event.currentTarget as HTMLElement;
    if (miniInfoPopover.isOpen && miniInfoPopover.entity === entity) {
        setMiniInfoPopover(prev => ({ ...prev, isOpen: false, targetRect: null }));
    } else {
        setMiniInfoPopover({
            isOpen: true,
            targetRect: target.getBoundingClientRect(),
            entity,
            entityType,
        });
    }
  }, [miniInfoPopover.isOpen, miniInfoPopover.entity]);

  const parseAndHighlightText = useCallback((text: string, kb: KnowledgeBase): React.ReactNode[] => {
    if (!text) return [text];

    const allKeywords: Array<{
        name: string;
        type: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion';
        entity: any;
    }> = [];

    const addKeywords = (source: any[], nameKey: string, type: any) => {
        source.forEach(e => {
            const name = e[nameKey];
            if (typeof name === 'string' && name.trim().length > 2) { 
                allKeywords.push({ name: name.trim(), type, entity: e });
            }
        });
    };
    
    addKeywords(kb.inventory, 'name', 'item');
    addKeywords(kb.playerSkills, 'name', 'skill');
    addKeywords(kb.allQuests.filter(q => q.status === 'active'), 'title', 'quest');
    addKeywords(kb.discoveredNPCs, 'name', 'npc');
    addKeywords(kb.discoveredLocations, 'name', 'location');
    addKeywords(kb.worldLore, 'title', 'lore');
    addKeywords(kb.companions, 'name', 'companion');

    if (allKeywords.length === 0) return [text];

    allKeywords.sort((a, b) => b.name.length - a.name.length);

    const keywordMap = new Map<string, { type: any, entity: any }>();
    allKeywords.forEach(kw => {
      if (!keywordMap.has(kw.name.toLowerCase())) { 
          keywordMap.set(kw.name.toLowerCase(), { type: kw.type, entity: kw.entity });
      }
    });
    
    const uniqueNames = Array.from(new Set(allKeywords.map(kw => kw.name))).filter(name => name.length > 0);
    if (uniqueNames.length === 0) return [text];
    
    const pattern = uniqueNames.map(name => escapeRegExp(name)).join('|');
    const regex = new RegExp(`\\b(${pattern})\\b`, 'gi'); 

    const resultNodes: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const keywordText = match[0]; 
        const keywordInfo = keywordMap.get(keywordText.toLowerCase()); 

        if (match.index > lastIndex) {
            resultNodes.push(text.substring(lastIndex, match.index));
        }

        if (keywordInfo) {
            resultNodes.push(
                <KeywordSpan
                    key={`${keywordInfo.type}-${(keywordInfo.entity as any).id || keywordInfo.entity.name || keywordInfo.entity.title}-${match.index}`}
                    keyword={keywordText} 
                    entityType={keywordInfo.type}
                    entity={keywordInfo.entity}
                    onClick={handleKeywordClick}
                />
            );
        } else {
            resultNodes.push(keywordText); 
        }
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        resultNodes.push(text.substring(lastIndex));
    }
    
    return resultNodes.length > 0 ? resultNodes : [text];
  }, [handleKeywordClick]);


  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-2 sm:p-4">
      <header className="mb-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600">{knowledgeBase.worldConfig?.theme || "Đạo Đồ A.I"}</h1>
        <div className="flex space-x-2">
            <Button onClick={toggleCharPanel} variant={isCharPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isCharPanelOpen}>{VIETNAMESE.characterButton}</Button>
            <Button onClick={toggleWorldPanel} variant={isWorldPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isWorldPanelOpen}>{VIETNAMESE.worldButton}</Button>
            <Button onClick={toggleQuestsPanel} variant={isQuestsPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isQuestsPanelOpen}>{VIETNAMESE.questsButton}</Button>
            <Button 
                onClick={onSaveGame} 
                variant="primary" 
                size="sm" 
                disabled={!firebaseUser || isSavingGame || isLoading} 
                isLoading={isSavingGame}
                loadingText="Đang lưu..."
                title={!firebaseUser ? VIETNAMESE.signInRequiredForSave : undefined}
            >
                {VIETNAMESE.saveGameButton}
            </Button>
            <Button onClick={() => setShowDebugPanel(prev => !prev)} variant={showDebugPanel ? "primary" : "ghost"} size="sm" className="border-yellow-500 text-yellow-300 hover:bg-yellow-700 hover:text-white">Debug</Button>
            <Button onClick={onQuit} variant="danger" size="sm">Thoát Game</Button>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Story Log & Actions - Main Content Area */}
        <div className={`flex-grow flex flex-col bg-gray-850 shadow-xl rounded-lg transition-all duration-300 ease-in-out ${openSidebar ? 'md:w-2/3 lg:w-3/4' : 'w-full'}`}>
          <div id="story-log" className="flex-grow overflow-y-auto p-3 sm:p-4 bg-gray-800 rounded-t-lg custom-scrollbar">
            {gameMessages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'}`}>
                <div className={`my-1 max-w-xl p-3 rounded-xl shadow ${
                  msg.type === 'narration' ? 'bg-gray-700 text-gray-100' :
                  msg.type === 'player_action' ? 'bg-indigo-600 text-white' :
                  msg.type === 'system' ? 'bg-yellow-600 bg-opacity-30 text-yellow-200 border border-yellow-500 italic text-sm' :
                  msg.type === 'error' ? 'bg-red-700 text-white' :
                  'bg-gray-600 text-gray-200'
                }`}>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {parseAndHighlightText(msg.content, knowledgeBase)}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && gameMessages.length === 0 && <Spinner text={VIETNAMESE.contactingAI} size="sm" className="my-4" />}
            <div ref={messagesEndRef} />
          </div>

          <div className="bg-gray-800 p-3 sm:p-4 border-t border-gray-700 rounded-b-lg flex-shrink-0">
            {latestMessageWithChoices?.choices && latestMessageWithChoices.choices.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-indigo-300 mb-2">{VIETNAMESE.aiSuggestedOrTypeBelow}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {latestMessageWithChoices.choices.map((choice, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full text-left justify-start hover:bg-indigo-700 hover:text-white py-2 px-3 text-sm sm:text-base"
                      onClick={() => handleChoiceClick(choice.text)}
                      disabled={isLoading}
                    >
                      {index + 1}. {choice.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmitAction} className="flex gap-2 items-center mt-2">
              {/* Response Length Dropdown */}
              <div className="relative flex-shrink-0" ref={responseLengthDropdownRef}>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setIsResponseLengthDropdownOpen(!isResponseLengthDropdownOpen)}
                  className="px-3 min-w-[160px] flex items-center justify-between" // Adjusted width
                  aria-haspopup="true"
                  aria-expanded={isResponseLengthDropdownOpen}
                  disabled={isLoading}
                >
                  <span>{getResponseLengthButtonLabel()}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ml-1 transition-transform duration-200 ${isResponseLengthDropdownOpen ? 'transform rotate-180' : ''}`}>
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </Button>
                {isResponseLengthDropdownOpen && (
                  <div className="absolute bottom-full mb-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                    {(['default', 'short', 'medium', 'long'] as ResponseLength[]).map(length => (
                      <button
                        key={length}
                        type="button"
                        onClick={() => selectResponseLength(length)}
                        className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-500 ${selectedResponseLength === length ? 'bg-indigo-600 font-semibold' : 'text-gray-100'} first:rounded-t-md last:rounded-b-md`}
                        role="menuitem"
                      >
                        {
                          length === 'default' ? VIETNAMESE.responseLength_default :
                          length === 'short' ? VIETNAMESE.responseLength_short :
                          length === 'medium' ? VIETNAMESE.responseLength_medium :
                          VIETNAMESE.responseLength_long
                        }
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Action/Story Type Dropdown */}
              <div className="relative flex-shrink-0" ref={actionTypeDropdownRef}>
                <Button
                  type="button"
                  variant="primary" 
                  size="md"
                  onClick={() => setIsActionTypeDropdownOpen(!isActionTypeDropdownOpen)}
                  className="px-3 min-w-[130px] flex items-center justify-between" 
                  aria-haspopup="true"
                  aria-expanded={isActionTypeDropdownOpen}
                  disabled={isLoading}
                >
                  <span>
                    {currentActionType === 'action' ? VIETNAMESE.inputTypeActionLabel : VIETNAMESE.inputTypeStoryLabel}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ml-1 transition-transform duration-200 ${isActionTypeDropdownOpen ? 'transform rotate-180' : ''}`}>
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </Button>
                {isActionTypeDropdownOpen && (
                  <div className="absolute bottom-full mb-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                    <button
                      type="button"
                      onClick={() => selectActionType('action')}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-500 rounded-t-md ${currentActionType === 'action' ? 'bg-indigo-600 font-semibold' : 'text-gray-100'}`}
                      role="menuitem"
                    >
                      {VIETNAMESE.inputTypeActionLabel}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectActionType('story')}
                      className={`block w-full text-left px-4 py-2 text-sm hover:bg-indigo-500 rounded-b-md ${currentActionType === 'story' ? 'bg-indigo-600 font-semibold' : 'text-gray-100'}`}
                      role="menuitem"
                    >
                      {VIETNAMESE.inputTypeStoryLabel}
                    </button>
                  </div>
                )}
              </div>
              <input
                type="text"
                value={playerInput}
                onChange={handleInputChange}
                placeholder={VIETNAMESE.enterAction}
                className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-400 transition-colors duration-150"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                variant="primary" 
                size="md" 
                disabled={isLoading || playerInput.trim() === ""}
                isLoading={isLoading && playerInput.trim() !== ""}
                loadingText="Gửi..." 
              >
                {VIETNAMESE.okButton}
              </Button>
            </form>
            {isLoading && !latestMessageWithChoices?.choices && gameMessages.length > 0 && (
              <div className="text-center text-gray-400 italic py-2 mt-2">
                {VIETNAMESE.contactingAI}
              </div>
            )}
          </div>
        </div>

        {/* Character Panel Sidebar (Inline) */}
        {isCharPanelOpen && (
          <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden md:order-last p-1 transition-all duration-300 ease-in-out">
            <div className="flex justify-between items-center p-3 border-b border-gray-700 flex-shrink-0">
              <h3 className="text-xl font-semibold text-indigo-400">{VIETNAMESE.characterPanelTitle}</h3>
              <Button onClick={toggleCharPanel} variant="ghost" size="sm" aria-label={VIETNAMESE.closeButton} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </Button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3">
              {knowledgeBase.playerStats && <PlayerStatsPanel stats={knowledgeBase.playerStats} currencyName={knowledgeBase.worldConfig?.currencyName} />}
              <InventoryPanel items={knowledgeBase.inventory} onItemClick={setSelectedItem} />
              <SkillsPanel skills={knowledgeBase.playerSkills} onSkillClick={setSelectedSkill} />
            </div>
          </div>
        )}

        {/* Quests Panel Sidebar (Inline) */}
        {isQuestsPanelOpen && (
          <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden md:order-last p-1 transition-all duration-300 ease-in-out">
             <div className="flex justify-between items-center p-3 border-b border-gray-700 flex-shrink-0">
              <h3 className="text-xl font-semibold text-indigo-400">{VIETNAMESE.questsPanelTitle}</h3>
              <Button onClick={toggleQuestsPanel} variant="ghost" size="sm" aria-label={VIETNAMESE.closeButton} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </Button>
            </div>
            <div className="flex-grow overflow-y-auto custom-scrollbar">
                <QuestsDisplayPanel quests={knowledgeBase.allQuests} onQuestClick={setSelectedQuest} />
            </div>
          </div>
        )}

        {/* World Panel Sidebar (Inline) */}
        {isWorldPanelOpen && (
            <div className="w-full md:w-1/3 lg:w-1/4 bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden md:order-last p-1 transition-all duration-300 ease-in-out">
                <div className="flex justify-between items-center p-3 border-b border-gray-700 flex-shrink-0">
                    <h3 className="text-xl font-semibold text-indigo-400">{VIETNAMESE.worldPanelTitle}</h3>
                    <Button onClick={toggleWorldPanel} variant="ghost" size="sm" aria-label={VIETNAMESE.closeButton} className="text-gray-400 hover:text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </Button>
                </div>
                <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-4">
                    <div>
                        <h4 className="text-lg font-semibold text-indigo-300 mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.discoveredNPCsSection}</h4>
                        <WorldInfoList 
                            items={knowledgeBase.discoveredNPCs} 
                            onItemClick={(npc: NPC) => setSelectedNpc(npc)} 
                            emptyMessage={VIETNAMESE.noNPCsDiscovered}
                            getItemDisplay={(npc: NPC) => npc.name} 
                        />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-indigo-300 mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.discoveredLocationsSection}</h4>
                        <WorldInfoList 
                            items={knowledgeBase.discoveredLocations} 
                            onItemClick={(loc: GameLocation) => setSelectedLocation(loc)} 
                            emptyMessage={VIETNAMESE.noLocationsDiscovered}
                            getItemDisplay={(loc: GameLocation) => loc.name} 
                        />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-indigo-300 mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.worldLoreSection}</h4>
                        <WorldInfoList 
                            items={knowledgeBase.worldLore} 
                            onItemClick={(lore: WorldLoreEntry) => setSelectedLore(lore)} 
                            emptyMessage={VIETNAMESE.noWorldLore}
                            getItemDisplay={(lore: WorldLoreEntry) => lore.title} 
                        />
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold text-indigo-300 mb-2 border-b border-gray-700 pb-1">{VIETNAMESE.companionsSection}</h4>
                        <WorldInfoList 
                            items={knowledgeBase.companions} 
                            onItemClick={(comp: Companion) => setSelectedCompanion(comp)} 
                            emptyMessage={VIETNAMESE.noCompanions}
                            getItemDisplay={(comp: Companion) => `${comp.name} (HP: ${comp.hp}/${comp.maxHp})`} 
                        />
                    </div>
                </div>
            </div>
        )}
      </div>

      {/* Details Modal */}
      <Modal 
        isOpen={!!selectedItem || !!selectedSkill || !!selectedQuest || !!selectedNpc || !!selectedLocation || !!selectedLore || !!selectedCompanion} 
        onClose={closeModal} 
        title={
          selectedItem ? VIETNAMESE.itemDetails : 
          selectedSkill ? VIETNAMESE.skillDetails : 
          selectedQuest ? VIETNAMESE.questDetails : 
          selectedNpc ? VIETNAMESE.npcDetails :
          selectedLocation ? VIETNAMESE.locationDetails :
          selectedLore ? VIETNAMESE.loreDetails :
          selectedCompanion ? VIETNAMESE.companionDetails :
          "Chi Tiết"
        }
      >
        {selectedItem && (
          <div className="space-y-2">
            <p><strong className="text-indigo-300">Tên:</strong> {selectedItem.name}</p>
            <p><strong className="text-indigo-300">Loại:</strong> {selectedItem.type}</p>
            <p><strong className="text-indigo-300">Số lượng:</strong> {selectedItem.quantity}</p>
            <p><strong className="text-indigo-300">Mô tả:</strong> {selectedItem.description}</p>
            {selectedItem.effect && <p><strong className="text-indigo-300">Hiệu ứng:</strong> {selectedItem.effect}</p>}
            {selectedItem.usable !== undefined && <p><strong className="text-indigo-300">Có thể dùng:</strong> {selectedItem.usable ? "Có" : "Không"}</p>}
            {selectedItem.consumable !== undefined && <p><strong className="text-indigo-300">Tiêu hao:</strong> {selectedItem.consumable ? "Có" : "Không"}</p>}
            {selectedItem.slot && <p><strong className="text-indigo-300">Vị trí:</strong> {selectedItem.slot}</p>}
          </div>
        )}
        {selectedSkill && (
          <div className="space-y-2">
            <p><strong className="text-indigo-300">Tên:</strong> {selectedSkill.name}</p>
            <p><strong className="text-indigo-300">Loại:</strong> {selectedSkill.type}</p>
            <p><strong className="text-indigo-300">Mô tả:</strong> {selectedSkill.description}</p>
            <p><strong className="text-indigo-300">Hiệu ứng:</strong> {selectedSkill.effect}</p>
            {selectedSkill.manaCost !== undefined && <p><strong className="text-indigo-300">Tiêu hao Mana:</strong> {selectedSkill.manaCost}</p>}
            {selectedSkill.cooldown !== undefined && <p><strong className="text-indigo-300">Thời gian hồi:</strong> {selectedSkill.cooldown} lượt</p>}
          </div>
        )}
        {selectedQuest && (
          <div className="space-y-2">
            <p><strong className="text-indigo-300">Tên:</strong> {selectedQuest.title}</p>
            <p><strong className="text-indigo-300">Mô tả:</strong> {selectedQuest.description}</p>
            <p><strong className="text-indigo-300">Trạng thái:</strong> 
              {selectedQuest.status === 'active' ? "Đang làm" : selectedQuest.status === 'completed' ? "Hoàn thành" : "Thất bại"}
            </p>
            <p className="font-semibold text-indigo-300 mt-2">Mục tiêu:</p>
            {selectedQuest.objectives.length > 0 ? (
              <ul className="list-none pl-0 space-y-1"> {/* Changed to list-none and pl-0 */}
                {selectedQuest.objectives.map(obj => (
                  <li key={obj.id} className={`flex items-center ${obj.completed ? 'text-green-400' : 'text-gray-300'}`}>
                    {obj.completed && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2 flex-shrink-0">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className={obj.completed ? 'line-through' : ''}>{obj.text}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="italic text-gray-400">Không có mục tiêu cụ thể.</p>}
          </div>
        )}
        {selectedNpc && (
            <div className="space-y-2">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedNpc.name}</p>
                <p><strong className="text-indigo-300">Mô tả:</strong> {selectedNpc.description || "Chưa có thông tin."}</p>
            </div>
        )}
        {selectedLocation && (
            <div className="space-y-2">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedLocation.name}</p>
                <p><strong className="text-indigo-300">Mô tả:</strong> {selectedLocation.description}</p>
            </div>
        )}
        {selectedLore && (
            <div className="space-y-2">
                <p><strong className="text-indigo-300">Tiêu đề:</strong> {selectedLore.title}</p>
                <p className="whitespace-pre-wrap"><strong className="text-indigo-300">Nội dung:</strong> {selectedLore.content}</p>
            </div>
        )}
        {selectedCompanion && (
            <div className="space-y-2">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedCompanion.name}</p>
                <p><strong className="text-indigo-300">Mô tả:</strong> {selectedCompanion.description}</p>
                <p><strong className="text-indigo-300">HP:</strong> {selectedCompanion.hp} / {selectedCompanion.maxHp}</p>
                <p><strong className="text-indigo-300">Mana:</strong> {selectedCompanion.mana} / {selectedCompanion.maxMana}</p>
                <p><strong className="text-indigo-300">ATK:</strong> {selectedCompanion.atk}</p>
            </div>
        )}
      </Modal>

      {/* Mini Info Popover */}
      <MiniInfoPopover
        isOpen={miniInfoPopover.isOpen}
        targetRect={miniInfoPopover.targetRect}
        entity={miniInfoPopover.entity}
        entityType={miniInfoPopover.entityType}
        onClose={() => setMiniInfoPopover(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Debug Panel Display */}
      {showDebugPanel && <DebugPanelDisplay kb={knowledgeBase} rawAiResponsesLog={rawAiResponsesLog} />}

    </div>
  );
};

export default GameplayScreen;
