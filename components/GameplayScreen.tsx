

import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { KnowledgeBase, GameMessage, AiChoice, PlayerStats, Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, QuestObjective, FirebaseUser, PlayerActionInputType, ResponseLength, StorageType, StyleSettings, StyleSettingProperty } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';
import KeywordSpan from './ui/KeywordSpan';
import MiniInfoPopover from './ui/MiniInfoPopover';
import StyleSettingsModal from './StyleSettingsModal'; // New Import
import { VIETNAMESE, TURNS_PER_PAGE, DEFAULT_STYLE_SETTINGS } from '../constants';
import * as GameTemplates from '../templates'; // Import for type assertions

// --- Define GameplayScreenProps interface ---
interface GameplayScreenProps {
  knowledgeBase: KnowledgeBase;
  gameMessages: GameMessage[]; // This is the FULL list of messages
  isLoading: boolean; // Loading AI response for current action
  onPlayerAction: (action: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => void;
  onQuit: () => void;
  rawAiResponsesLog: string[]; 
  sentPromptsLog: string[]; 
  firebaseUser: FirebaseUser | null; 
  onSaveGame: () => Promise<void>; 
  isSavingGame: boolean; 
  storageType: StorageType;
  // Pagination Props
  currentPageDisplay: number;
  setCurrentPageDisplay: (page: number) => void; // For jump to page
  totalPages: number;
  onGoToNextPage: () => void;
  onGoToPrevPage: () => void;
  onJumpToPage: (page: number) => void;
  isSummarizing: boolean; // True if summarizing for page end OR loading game with missing summaries
  getMessagesForPage: (pageNumber: number) => GameMessage[];
  isCurrentlyActivePage: boolean; // True if current page is the latest page
  onRollbackTurn: () => void; 
  isAutoPlaying: boolean; 
  onToggleAutoPlay: () => void; 
  styleSettings: StyleSettings; // New prop
  onUpdateStyleSettings: (newSettings: StyleSettings) => void; // New prop
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
  sentPromptsLog: string[];
  rawAiResponsesLog: string[]; 
  currentPageDisplay: number;
  totalPages: number;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
}
const DebugPanelDisplay: React.FC<DebugPanelDisplayProps> = ({ 
    kb, 
    sentPromptsLog, 
    rawAiResponsesLog, 
    currentPageDisplay, 
    totalPages,
    isAutoPlaying,
    onToggleAutoPlay
}) => {

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border-2 border-yellow-500 p-3 rounded-lg shadow-2xl max-w-md max-h-[calc(100vh-100px)] overflow-y-auto custom-scrollbar z-50">
      <h4 className="text-lg font-bold text-yellow-400 mb-3 border-b border-yellow-600 pb-2">Bảng Điều Khiển Debug</h4>
      
      <div className="mb-3 text-xs text-gray-400">
        Player: C{kb.playerStats.level} ({kb.playerStats.realm}), Lượt: {kb.playerStats.turn}<br/>
        Trang: {currentPageDisplay}/{totalPages}, Lượt tóm tắt cuối: {kb.lastSummarizedTurn || 'Chưa có'}<br/>
        Lịch sử trang (bắt đầu từ lượt): {JSON.stringify(kb.currentPageHistory)}<br/>
        Tóm tắt có sẵn cho trang: {kb.pageSummaries ? Object.keys(kb.pageSummaries).join(', ') : 'Không có'}<br/>
        Lịch sử lùi lượt: {kb.turnHistory ? kb.turnHistory.length : 0} mục
      </div>

       <Button
        variant={isAutoPlaying ? "danger" : "secondary"}
        size="sm"
        onClick={onToggleAutoPlay}
        className="w-full mb-3 border-orange-500 text-orange-300 hover:bg-orange-700 hover:text-white"
      >
        {isAutoPlaying ? VIETNAMESE.stopAutoPlayButton : VIETNAMESE.autoPlayButton}
      </Button>

      <div className="mb-4">
        <h5 className="text-md font-semibold text-sky-300 mb-1">Nhật Ký Prompt Đã Gửi (10 gần nhất)</h5>
        {sentPromptsLog.length === 0 ? (
          <p className="text-xs italic text-gray-500">Chưa có prompt nào được gửi.</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar text-xs">
            {sentPromptsLog.map((promptEntry, index) => (
              <details key={`sent-${index}`} className="bg-gray-800 rounded group">
                <summary className="p-1.5 text-sky-200 cursor-pointer text-[11px] group-open:font-semibold">
                  Prompt #{sentPromptsLog.length - index} (Nhấn để xem)
                </summary>
                <pre className="p-1.5 bg-gray-850 text-sky-100 whitespace-pre-wrap break-all text-[10px] leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
                  {promptEntry}
                </pre>
              </details>
            ))}
          </div>
        )}
      </div>

      <div>
        <h5 className="text-md font-semibold text-lime-300 mb-1">Nhật Ký Phản Hồi Từ AI (50 gần nhất)</h5>
        {rawAiResponsesLog.length === 0 ? (
          <p className="text-xs italic text-gray-500">Chưa có phản hồi nào từ AI.</p>
        ) : (
          <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar text-xs">
            {rawAiResponsesLog.map((responseEntry, index) => (
               <details key={`raw-${index}`} className="bg-gray-800 rounded group">
                <summary className="p-1.5 text-lime-200 cursor-pointer text-[11px] group-open:font-semibold">
                  Phản hồi AI #{rawAiResponsesLog.length - index} (Nhấn để xem)
                </summary>
                <pre className="p-1.5 bg-gray-850 text-lime-100 whitespace-pre-wrap break-all text-[10px] leading-relaxed max-h-80 overflow-y-auto custom-scrollbar">
                  {responseEntry}
                </pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Pagination Controls Component ---
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (page: number) => void;
  isSummarizing: boolean; // General summarizing state
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, onPrev, onNext, onJump, isSummarizing }) => {
  const [jumpToPageInput, setJumpToPageInput] = useState<string>(currentPage.toString());

  useEffect(() => {
    setJumpToPageInput(currentPage.toString());
  }, [currentPage]);

  const handleJumpInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setJumpToPageInput(e.target.value);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(jumpToPageInput, 10);
    if (!isNaN(pageNum)) {
      onJump(pageNum);
    }
  };

  return (
    <div className="flex items-center justify-between p-2 bg-gray-700 border-t border-gray-600 rounded-b-lg mt-auto flex-shrink-0">
      <Button onClick={onPrev} disabled={currentPage <= 1 || isSummarizing} size="sm" variant="ghost">
        {VIETNAMESE.previousPage}
      </Button>
      <div className="flex items-center space-x-2">
        <form onSubmit={handleJumpSubmit} className="flex items-center">
          <input
            type="number"
            value={jumpToPageInput}
            onChange={handleJumpInputChange}
            min="1"
            max={totalPages}
            className="w-16 p-1.5 text-sm text-center bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
            aria-label="Nhập số trang"
            disabled={isSummarizing}
          />
          <Button type="submit" size="sm" variant="ghost" className="ml-1 px-2" disabled={isSummarizing}>
            {VIETNAMESE.goToPage}
          </Button>
        </form>
        <span className="text-sm text-gray-300">
          {VIETNAMESE.pageIndicator(currentPage, totalPages)}
        </span>
      </div>
      <Button onClick={onNext} disabled={currentPage >= totalPages || isSummarizing} size="sm" variant="ghost">
        {VIETNAMESE.nextPage}
      </Button>
    </div>
  );
};


// --- Main Gameplay Screen Component ---
const GameplayScreen: React.FC<GameplayScreenProps> = ({ 
    knowledgeBase, 
    gameMessages: allGameMessages, 
    isLoading, 
    onPlayerAction, 
    onQuit, 
    rawAiResponsesLog, 
    sentPromptsLog,    
    firebaseUser,
    onSaveGame,
    isSavingGame,
    storageType,
    currentPageDisplay,
    totalPages,
    onGoToNextPage,
    onGoToPrevPage,
    onJumpToPage,
    isSummarizing, 
    getMessagesForPage,
    isCurrentlyActivePage,
    onRollbackTurn,
    isAutoPlaying,
    onToggleAutoPlay,
    styleSettings,
    onUpdateStyleSettings,
}) => {
  const [playerInput, setPlayerInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [isCharPanelOpen, setIsCharPanelOpen] = useState(false);
  const [isQuestsPanelOpen, setIsQuestsPanelOpen] = useState(false);
  const [isWorldPanelOpen, setIsWorldPanelOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isStyleSettingsModalOpen, setIsStyleSettingsModalOpen] = useState(false); // New state for style settings modal
  
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

  const displayedMessages = getMessagesForPage(currentPageDisplay);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [displayedMessages]); 

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
        setIsStyleSettingsModalOpen(false); // Close style settings modal on Esc
      }
    };

    if (isActionTypeDropdownOpen || isResponseLengthDropdownOpen || isStyleSettingsModalOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isActionTypeDropdownOpen, isResponseLengthDropdownOpen, isStyleSettingsModalOpen]);

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
    if (playerInput.trim() && !isLoading && !isSummarizing && isCurrentlyActivePage) {
      onPlayerAction(playerInput.trim(), false, currentActionType, selectedResponseLength);
      setPlayerInput('');
    }
  };

  const handleChoiceClick = (choiceText: string) => {
    if (!isLoading && !isSummarizing && isCurrentlyActivePage) {
      onPlayerAction(choiceText, true, 'action', selectedResponseLength); 
       setPlayerInput('');
    }
  };
  
  const getLatestChoicesSource = useCallback(() => {
    const isPotentiallyNewEmptyPage = currentPageDisplay > 1 &&
                                       isCurrentlyActivePage &&
                                       !displayedMessages.some(m => m.type === 'narration' && m.choices && m.choices.length > 0);

    if (isPotentiallyNewEmptyPage) {
        return [...allGameMessages].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);
    } else {
        return [...displayedMessages].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);
    }
  }, [allGameMessages, displayedMessages, currentPageDisplay, isCurrentlyActivePage]);
  
  const latestMessageWithChoices = getLatestChoicesSource();


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

  const getKeywordHighlightStyle = useCallback((): React.CSSProperties => {
    const { textColor, fontFamily, fontSize, backgroundColor } = styleSettings.keywordHighlight;
    const style: React.CSSProperties = {};
    if (textColor) style.color = textColor;
    if (fontFamily && fontFamily !== 'inherit') style.fontFamily = fontFamily;
    if (fontSize && fontSize !== 'inherit') style.fontSize = fontSize;
    if (backgroundColor && backgroundColor !== 'transparent') style.backgroundColor = backgroundColor;
    return style;
  }, [styleSettings.keywordHighlight]);

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
    const highlightStyle = getKeywordHighlightStyle();

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
                    style={highlightStyle}
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
  }, [handleKeywordClick, getKeywordHighlightStyle]);

  const isSaveDisabled = 
    (storageType === 'cloud' && !firebaseUser) || 
    isSavingGame || 
    isLoading ||
    isSummarizing; 
  
  const canRollbackStandard = knowledgeBase.turnHistory && knowledgeBase.turnHistory.length > 0 && !(knowledgeBase.playerStats.turn === 1 && knowledgeBase.turnHistory.length ===1 && knowledgeBase.turnHistory[0].knowledgeBaseSnapshot.playerStats.turn === 0);
  const isStopButtonDisabled = isSummarizing || (!isLoading && !canRollbackStandard);

  const getDynamicMessageStyles = (msgType: GameMessage['type']): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    let setting: StyleSettingProperty | undefined;

    if (msgType === 'narration') setting = styleSettings.narration;
    else if (msgType === 'player_action') setting = styleSettings.playerAction;

    if (setting) {
      if (setting.fontFamily && setting.fontFamily !== 'inherit') styles.fontFamily = setting.fontFamily;
      if (setting.fontSize && setting.fontSize !== 'inherit') styles.fontSize = setting.fontSize;
      if (setting.textColor) styles.color = setting.textColor;
      if (setting.backgroundColor && setting.backgroundColor !== 'transparent') styles.backgroundColor = setting.backgroundColor;
    }
    return styles;
  };

  const getChoiceButtonStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    const setting = styleSettings.choiceButton;
    if (setting) {
      if (setting.fontFamily && setting.fontFamily !== 'inherit') styles.fontFamily = setting.fontFamily;
      if (setting.fontSize && setting.fontSize !== 'inherit') styles.fontSize = setting.fontSize;
      if (setting.textColor) styles.color = setting.textColor;
      // If backgroundColor is transparent or not set, Button variant default applies.
      // If set, it overrides Button variant's background.
      if (setting.backgroundColor && setting.backgroundColor !== 'transparent') {
        styles.backgroundColor = setting.backgroundColor;
      } else if (setting.backgroundColor === 'transparent') {
        styles.backgroundColor = 'transparent'; // Ensure explicit transparency
      }
    }
    return styles;
  };


  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-2 sm:p-4">
      <header className="mb-4 flex justify-between items-center flex-shrink-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600">{knowledgeBase.worldConfig?.theme || "Role Play AI"}</h1>
        <div className="flex space-x-2 flex-wrap gap-y-2"> {/* Added flex-wrap and gap-y-2 for better responsiveness */}
            <Button onClick={toggleCharPanel} variant={isCharPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isCharPanelOpen} disabled={isSummarizing}>{VIETNAMESE.characterButton}</Button>
            <Button onClick={toggleWorldPanel} variant={isWorldPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isWorldPanelOpen} disabled={isSummarizing}>{VIETNAMESE.worldButton}</Button>
            <Button onClick={toggleQuestsPanel} variant={isQuestsPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isQuestsPanelOpen} disabled={isSummarizing}>{VIETNAMESE.questsButton}</Button>
            <Button
              onClick={() => setIsStyleSettingsModalOpen(true)}
              variant="secondary"
              size="sm"
              disabled={isSummarizing}
              className="border-purple-500 text-purple-300 hover:bg-purple-700 hover:text-white"
            >
              {VIETNAMESE.gameplaySettingsButton}
            </Button>
             <Button
                onClick={onRollbackTurn}
                variant="secondary"
                size="sm"
                disabled={isStopButtonDisabled}
                title={isLoading ? "Dừng nhận phản hồi và lùi lượt" : (canRollbackStandard ? VIETNAMESE.rollbackTurn : VIETNAMESE.cannotRollbackFurther)}
                className="border-amber-500 text-amber-300 hover:bg-amber-700 hover:text-white"
            >
                {VIETNAMESE.stopButton}
            </Button>
            <Button 
                onClick={onSaveGame} 
                variant="primary" 
                size="sm" 
                disabled={isSaveDisabled}
                isLoading={isSavingGame}
                loadingText="Đang lưu..."
                title={(storageType === 'cloud' && !firebaseUser) ? VIETNAMESE.signInRequiredForSave : undefined}
            >
                {VIETNAMESE.saveGameButton}
            </Button>
            <Button onClick={() => setShowDebugPanel(prev => !prev)} variant={showDebugPanel ? "primary" : "ghost"} size="sm" className="border-yellow-500 text-yellow-300 hover:bg-yellow-700 hover:text-white" disabled={isSummarizing}>Debug</Button>
            <Button onClick={onQuit} variant="danger" size="sm" disabled={isSummarizing}>Thoát Game</Button>
        </div>
      </header>

      <div className="flex-grow flex flex-col md:flex-row gap-4 overflow-hidden">
        {/* Story Log & Actions - Main Content Area */}
        <div className={`flex-grow flex flex-col bg-gray-850 shadow-xl rounded-lg transition-all duration-300 ease-in-out ${openSidebar ? 'md:w-3/4 lg:w-4/5' : 'w-full'}`}>
          <div id="story-log" className="flex-grow overflow-y-auto p-3 sm:p-4 bg-gray-800 rounded-t-lg custom-scrollbar">
            {displayedMessages.map((msg) => {
              const messageBaseClass = 'my-1 max-w-6xl p-3 rounded-xl shadow';
              let typeSpecificClass = '';
              let dynamicStyle = getDynamicMessageStyles(msg.type);

              // Original Tailwind classes for fallback or if not overridden by dynamic styles
              if (msg.type === 'narration') {
                if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-gray-700';
                if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-gray-100';
              } else if (msg.type === 'player_action') {
                if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-indigo-600';
                if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-white';
              } else if (msg.type === 'system') {
                typeSpecificClass = 'bg-yellow-600 bg-opacity-30 text-yellow-200 border border-yellow-500 italic text-sm';
              } else if (msg.type === 'error') {
                typeSpecificClass = 'bg-red-700 text-white';
              } else if (msg.type === 'page_summary') {
                typeSpecificClass = 'bg-purple-800 bg-opacity-50 text-purple-200 border border-purple-600 italic text-sm mt-3 mb-2';
              } else {
                 typeSpecificClass = 'bg-gray-600 text-gray-200'; // Default for other types if any
              }
              
              return (
                <div key={msg.id} className={`flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'}`}>
                  <div 
                    className={`${messageBaseClass} ${typeSpecificClass}`}
                    style={dynamicStyle}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">
                      {parseAndHighlightText(msg.content, knowledgeBase)}
                    </p>
                  </div>
                </div>
              );
            })}
            {(isLoading && displayedMessages.length === 0 && knowledgeBase.playerStats.turn === 0) && <Spinner text={VIETNAMESE.contactingAI} size="sm" className="my-4" />}
            
            {(isLoading && !isSummarizing && isCurrentlyActivePage && displayedMessages.length > 0) && (
              <div className="text-center text-gray-400 italic py-2 mt-2">
                {VIETNAMESE.contactingAI}
              </div>
            )}
            {isSummarizing && ( 
                 <div className="text-center text-gray-400 italic py-2 mt-2">
                     <Spinner 
                        text={
                            displayedMessages.some(m => m.content.includes(VIETNAMESE.creatingMissingSummary)) 
                            ? VIETNAMESE.creatingMissingSummary
                            : VIETNAMESE.summarizingAndPreparingNextPage
                        } 
                        size="sm" />
                 </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="bg-gray-800 p-3 sm:p-4 border-t border-gray-700 flex-shrink-0">
            {latestMessageWithChoices?.choices && latestMessageWithChoices.choices.length > 0 && isCurrentlyActivePage && !isSummarizing && (
              <div className="mb-4">
                <p className="text-sm text-indigo-300 mb-2">{VIETNAMESE.aiSuggestedOrTypeBelow}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {latestMessageWithChoices.choices.map((choice, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full text-left justify-start py-2 px-3 text-sm sm:text-base" // Removed hover styles to be controlled by customStyles or default ghost
                      customStyles={getChoiceButtonStyles()} // Apply dynamic styles
                      onClick={() => handleChoiceClick(choice.text)}
                      disabled={isLoading || isSummarizing || !isCurrentlyActivePage}
                    >
                      {index + 1}. {choice.text}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmitAction} className="flex gap-2 items-center mt-2">
              <div className="relative flex-shrink-0" ref={responseLengthDropdownRef}>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setIsResponseLengthDropdownOpen(!isResponseLengthDropdownOpen)}
                  className="px-3 min-w-[160px] flex items-center justify-between" 
                  aria-haspopup="true"
                  aria-expanded={isResponseLengthDropdownOpen}
                  disabled={isLoading || isSummarizing || !isCurrentlyActivePage}
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

              <div className="relative flex-shrink-0" ref={actionTypeDropdownRef}>
                <Button
                  type="button"
                  variant="primary" 
                  size="md"
                  onClick={() => setIsActionTypeDropdownOpen(!isActionTypeDropdownOpen)}
                  className="px-3 min-w-[130px] flex items-center justify-between" 
                  aria-haspopup="true"
                  aria-expanded={isActionTypeDropdownOpen}
                  disabled={isLoading || isSummarizing || !isCurrentlyActivePage}
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
                placeholder={!isCurrentlyActivePage ? "Chỉ có thể hành động ở trang hiện tại nhất." : VIETNAMESE.enterAction}
                className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-400 transition-colors duration-150"
                disabled={isLoading || isSummarizing || !isCurrentlyActivePage}
                title={!isCurrentlyActivePage ? "Bạn chỉ có thể hành động ở trang hiện tại nhất của cuộc phiêu lưu." : (isSummarizing ? VIETNAMESE.summarizingAndPreparingNextPage : undefined)}
              />
              <Button 
                type="submit" 
                variant="primary" 
                size="md" 
                disabled={isLoading || isSummarizing || playerInput.trim() === "" || !isCurrentlyActivePage}
                isLoading={isLoading && playerInput.trim() !== "" && !isSummarizing && isCurrentlyActivePage} // Show loading only if this button initiated it
                loadingText={VIETNAMESE.sendingAction}
              >
                {VIETNAMESE.sendInputButton}
              </Button>
            </form>
          </div>
          <PaginationControls 
            currentPage={currentPageDisplay}
            totalPages={totalPages}
            onPrev={onGoToPrevPage}
            onNext={onGoToNextPage}
            onJump={onJumpToPage}
            isSummarizing={isSummarizing}
          />
        </div>

        {/* Character Panel Sidebar (Inline) */}
        {isCharPanelOpen && (
          <div className="w-full md:w-1/4 lg:w-1/5 bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden md:order-last p-1 transition-all duration-300 ease-in-out">
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
          <div className="w-full md:w-1/4 lg:w-1/5 bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden md:order-last p-1 transition-all duration-300 ease-in-out">
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
            <div className="w-full md:w-1/4 lg:w-1/5 bg-gray-800 shadow-lg rounded-lg flex flex-col overflow-hidden md:order-last p-1 transition-all duration-300 ease-in-out">
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
            <p><strong className="text-indigo-300">Phân loại:</strong> {selectedItem.category}
                {selectedItem.category === "Equipment" && ` (${(selectedItem as GameTemplates.EquipmentTemplate).equipmentType})`}
                {selectedItem.category === "Potion" && ` (${(selectedItem as GameTemplates.PotionTemplate).potionType})`}
                {selectedItem.category === "Material" && ` (${(selectedItem as GameTemplates.MaterialTemplate).materialType})`}
            </p>
            <p><strong className="text-indigo-300">Số lượng:</strong> {selectedItem.quantity}</p>
            <p><strong className="text-indigo-300">Mô tả:</strong> {selectedItem.description}</p>
            {selectedItem.category === "Equipment" && (selectedItem as GameTemplates.EquipmentTemplate).slot && (
                 <p><strong className="text-indigo-300">Vị trí:</strong> {(selectedItem as GameTemplates.EquipmentTemplate).slot}</p>
            )}
            {selectedItem.category === "Equipment" && 
                Object.keys((selectedItem as GameTemplates.EquipmentTemplate).statBonuses).length > 0 && (
              <div>
                <strong className="text-indigo-300">Chỉ số cộng thêm:</strong>
                <ul className="list-disc list-inside pl-4 text-sm">
                  {Object.entries((selectedItem as GameTemplates.EquipmentTemplate).statBonuses).map(([key, value]) => {
                    if (value && typeof value === 'number' && value !== 0) {
                      const statLabels: Record<string, string> = { hp: "HP", maxHp: "HP Tối Đa", mana: "Mana", maxMana: "Mana Tối Đa", atk: "Tấn Công", exp: "EXP"};
                      const label = statLabels[key as keyof PlayerStats] || key;
                      return <li key={key}><span className="text-gray-300">{label}:</span> <span className={value > 0 ? "text-green-400" : "text-red-400"}>{value > 0 ? `+${value}` : value}</span></li>;
                    }
                    return null;
                  })}
                </ul>
              </div>
            )}
            {selectedItem.category === "Equipment" && (selectedItem as GameTemplates.EquipmentTemplate).uniqueEffects && (selectedItem as GameTemplates.EquipmentTemplate).uniqueEffects.length > 0 && (
                <p><strong className="text-indigo-300">Hiệu ứng đặc biệt:</strong> {(selectedItem as GameTemplates.EquipmentTemplate).uniqueEffects.join(', ')}</p>
            )}
            {selectedItem.category === "Potion" && (selectedItem as GameTemplates.PotionTemplate).effects && (selectedItem as GameTemplates.PotionTemplate).effects.length > 0 && (
                 <p><strong className="text-indigo-300">Hiệu ứng:</strong> {(selectedItem as GameTemplates.PotionTemplate).effects.join(', ')}</p>
            )}
            {selectedItem.usable !== undefined && <p><strong className="text-indigo-300">Có thể dùng:</strong> {selectedItem.usable ? "Có" : "Không"}</p>}
            {selectedItem.consumable !== undefined && <p><strong className="text-indigo-300">Tiêu hao:</strong> {selectedItem.consumable ? "Có" : "Không"}</p>}
          </div>
        )}
        {selectedSkill && (
          <div className="space-y-2">
            <p><strong className="text-indigo-300">Tên:</strong> {selectedSkill.name}</p>
            <p><strong className="text-indigo-300">Loại:</strong> {selectedSkill.skillType}</p>
            {selectedSkill.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedSkill.description}</p>}
            {selectedSkill.detailedEffect && <p><strong className="text-indigo-300">Hiệu ứng chi tiết:</strong> {selectedSkill.detailedEffect}</p>}
            {selectedSkill.manaCost !== undefined && <p><strong className="text-indigo-300">Tiêu hao Mana:</strong> {selectedSkill.manaCost}</p>}
            {selectedSkill.cooldown !== undefined && <p><strong className="text-indigo-300">Thời gian hồi:</strong> {selectedSkill.cooldown} lượt</p>}
          </div>
        )}
        {selectedQuest && (
          <div className="space-y-2">
            <p><strong className="text-indigo-300">Tên:</strong> {selectedQuest.title}</p>
            {selectedQuest.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedQuest.description}</p>}
            <p><strong className="text-indigo-300">Trạng thái:</strong> 
              {selectedQuest.status === 'active' ? "Đang làm" : selectedQuest.status === 'completed' ? "Hoàn thành" : "Thất bại"}
            </p>
            <p className="font-semibold text-indigo-300 mt-2">Mục tiêu:</p>
            {selectedQuest.objectives.length > 0 ? (
              <ul className="list-none pl-0 space-y-1"> 
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
                {selectedNpc.title && <p><strong className="text-indigo-300">Chức danh:</strong> {selectedNpc.title}</p>}
                {selectedNpc.description && selectedNpc.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedNpc.description}</p>}
                {selectedNpc.factionId && <p><strong className="text-indigo-300">Phe phái ID:</strong> {selectedNpc.factionId}</p>}
            </div>
        )}
        {selectedLocation && (
            <div className="space-y-2">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedLocation.name}</p>
                {selectedLocation.description && selectedLocation.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedLocation.description}</p>}
            </div>
        )}
        {selectedLore && (
            <div className="space-y-2">
                <p><strong className="text-indigo-300">Tiêu đề:</strong> {selectedLore.title}</p>
                {selectedLore.content && selectedLore.content.trim() && <p className="whitespace-pre-wrap"><strong className="text-indigo-300">Nội dung:</strong> {selectedLore.content}</p>}
            </div>
        )}
        {selectedCompanion && (
            <div className="space-y-2">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedCompanion.name}</p>
                {selectedCompanion.description && selectedCompanion.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedCompanion.description}</p>}
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
      {showDebugPanel && <DebugPanelDisplay 
                            kb={knowledgeBase} 
                            sentPromptsLog={sentPromptsLog} 
                            rawAiResponsesLog={rawAiResponsesLog} 
                            currentPageDisplay={currentPageDisplay} 
                            totalPages={totalPages}
                            isAutoPlaying={isAutoPlaying}
                            onToggleAutoPlay={onToggleAutoPlay}
                           />}
      
      {/* Style Settings Modal */}
      {isStyleSettingsModalOpen && (
        <StyleSettingsModal
          initialSettings={styleSettings}
          onSave={(newSettings) => {
            onUpdateStyleSettings(newSettings);
            setIsStyleSettingsModalOpen(false);
          }}
          onClose={() => setIsStyleSettingsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default GameplayScreen;