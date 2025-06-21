
import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { KnowledgeBase, GameMessage, AiChoice, PlayerStats, Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, QuestObjective, FirebaseUser, PlayerActionInputType, ResponseLength, StorageType, StyleSettings, StyleSettingProperty } from '../../types';
import Button from './ui/Button'; // Ensured relative path
import Spinner from './ui/Spinner';
import Modal from './ui/Modal';
import KeywordSpan from './ui/KeywordSpan';
import MiniInfoPopover from './ui/MiniInfoPopover';
import StyleSettingsModal from './StyleSettingsModal';
import OffCanvasPanel from './ui/OffCanvasPanel'; 
import CharacterSidePanel from './gameplay/CharacterSidePanel';
import QuestsSidePanel from './gameplay/QuestsSidePanel';
import WorldSidePanel from './gameplay/WorldSidePanel';
import DebugPanelDisplay from './gameplay/DebugPanelDisplay';
import PaginationControls from './gameplay/PaginationControls';
import { VIETNAMESE, DEFAULT_STYLE_SETTINGS } from './../constants';
import * as GameTemplates from './../templates';

// --- Define GameplayScreenProps interface ---
interface GameplayScreenProps {
  knowledgeBase: KnowledgeBase;
  gameMessages: GameMessage[];
  isLoading: boolean;
  onPlayerAction: (action: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => void;
  onQuit: () => void;
  rawAiResponsesLog: string[];
  sentPromptsLog: string[];
  latestPromptTokenCount: number | null;
  firebaseUser: FirebaseUser | null;
  onSaveGame: () => Promise<void>;
  isSavingGame: boolean;
  storageType: StorageType;
  currentPageDisplay: number;
  setCurrentPageDisplay: (page: number) => void;
  totalPages: number;
  onGoToNextPage: () => void;
  onGoToPrevPage: () => void;
  onJumpToPage: (page: number) => void;
  isSummarizing: boolean;
  getMessagesForPage: (pageNumber: number) => GameMessage[];
  isCurrentlyActivePage: boolean;
  onRollbackTurn: () => void;
  isAutoPlaying: boolean;
  onToggleAutoPlay: () => void;
  styleSettings: StyleSettings;
  onUpdateStyleSettings: (newSettings: StyleSettings) => void;
  messageIdBeingEdited: string | null;
  onStartEditMessage: (messageId: string) => void;
  onSaveEditedMessage: (messageId: string, newContent: string) => void;
  onCancelEditMessage: () => void;
}

// --- Helper function to escape regex characters ---
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// --- Main Gameplay Screen Component ---
const GameplayScreen: React.FC<GameplayScreenProps> = ({
    knowledgeBase,
    gameMessages, // This is allGameMessages from App.tsx
    isLoading,
    onPlayerAction,
    onQuit,
    rawAiResponsesLog,
    sentPromptsLog,
    latestPromptTokenCount,
    firebaseUser,
    onSaveGame,
    isSavingGame,
    storageType,
    currentPageDisplay,
    setCurrentPageDisplay,
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
    messageIdBeingEdited,
    onStartEditMessage,
    onSaveEditedMessage,
    onCancelEditMessage,
}) => {
  const [playerInput, setPlayerInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [isCharPanelOpen, setIsCharPanelOpen] = useState(false);
  const [isQuestsPanelOpen, setIsQuestsPanelOpen] = useState(false);
  const [isWorldPanelOpen, setIsWorldPanelOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isStyleSettingsModalOpen, setIsStyleSettingsModalOpen] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(true); 

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

  const [currentEditText, setCurrentEditText] = useState('');


  const [miniInfoPopover, setMiniInfoPopover] = useState<{
    isOpen: boolean;
    targetRect: DOMRect | null;
    entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion | null;
    entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | null;
  }>({ isOpen: false, targetRect: null, entity: null, entityType: null });

  const displayedMessages = getMessagesForPage(currentPageDisplay);

  useEffect(() => {
    // Scroll to bottom if on the current "live" page (last page of content)
    // This triggers when new messages are added to the live page, or when navigating to it.
    if (currentPageDisplay === totalPages) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [gameMessages.length, currentPageDisplay, totalPages]);
  
  useEffect(() => {
    // This effect runs once on mount to ensure panels start closed.
    // It addresses the issue where panels might appear open initially.
    setIsCharPanelOpen(false);
    setIsQuestsPanelOpen(false);
    setIsWorldPanelOpen(false);
  }, []);

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
        setIsStyleSettingsModalOpen(false);
        if (messageIdBeingEdited) { // Also cancel edit on ESC
          onCancelEditMessage();
          setCurrentEditText('');
        }
      }
    };

    if (isActionTypeDropdownOpen || isResponseLengthDropdownOpen || isStyleSettingsModalOpen || messageIdBeingEdited) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isActionTypeDropdownOpen, isResponseLengthDropdownOpen, isStyleSettingsModalOpen, messageIdBeingEdited, onCancelEditMessage]);

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
    const baseText = VIETNAMESE.responseLengthButtonText(selectedResponseLength);
    return baseText; 
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
        return [...gameMessages].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);
    } else {
        return [...displayedMessages].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);
    }
  }, [gameMessages, displayedMessages, currentPageDisplay, isCurrentlyActivePage]);

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
    
    const uniqueNamesForRegex = Array.from(new Set(allKeywords.map(kw => escapeRegExp(kw.name))));
    if (uniqueNamesForRegex.length === 0) return [text];

    const pattern = `\\b(${uniqueNamesForRegex.join('|')})\\b`;
    const regex = new RegExp(pattern, 'gi'); 

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
      if (setting.backgroundColor && setting.backgroundColor !== 'transparent') {
        styles.backgroundColor = setting.backgroundColor;
      } else if (setting.backgroundColor === 'transparent') {
        styles.backgroundColor = 'transparent';
      }
    }
    return styles;
  };

  const handleStartEditInternal = (msg: GameMessage) => {
    onStartEditMessage(msg.id);
    setCurrentEditText(msg.content);
  };

  const handleSaveEditInternal = (messageId: string) => {
    onSaveEditedMessage(messageId, currentEditText);
    setCurrentEditText('');
  };

  const handleCancelEditInternal = () => {
    onCancelEditMessage();
    setCurrentEditText('');
  };


  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-2 sm:p-4">
      <header className="mb-2 sm:mb-4 flex flex-col sm:flex-row justify-between items-center flex-shrink-0 gap-2">
        <h1 
          className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600 truncate max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl"
          title={knowledgeBase.worldConfig?.theme || "Role Play AI"}
        >
          {knowledgeBase.worldConfig?.theme || "Role Play AI"}
        </h1>
        <div className="flex space-x-1 sm:space-x-2 flex-wrap gap-y-1 sm:gap-y-2 justify-center sm:justify-end">
            <Button onClick={() => setIsCharPanelOpen(true)} variant={isCharPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isCharPanelOpen} disabled={isSummarizing} className="px-2 sm:px-3">
              <span className="sm:hidden">{VIETNAMESE.characterButtonShort}</span>
              <span className="hidden sm:inline">{VIETNAMESE.characterButton}</span>
            </Button>
            <Button onClick={() => setIsWorldPanelOpen(true)} variant={isWorldPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isWorldPanelOpen} disabled={isSummarizing} className="px-2 sm:px-3">
              <span className="sm:hidden">{VIETNAMESE.worldButtonShort}</span>
              <span className="hidden sm:inline">{VIETNAMESE.worldButton}</span>
            </Button>
            <Button onClick={() => setIsQuestsPanelOpen(true)} variant={isQuestsPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isQuestsPanelOpen} disabled={isSummarizing} className="px-2 sm:px-3">
              <span className="sm:hidden">{VIETNAMESE.questsButtonShort}</span>
              <span className="hidden sm:inline">{VIETNAMESE.questsButton}</span>
            </Button>
            <Button
              onClick={() => setIsStyleSettingsModalOpen(true)}
              variant="secondary"
              size="sm"
              disabled={isSummarizing}
              className="border-purple-500 text-purple-300 hover:bg-purple-700 hover:text-white px-2 sm:px-3"
              title={VIETNAMESE.gameplaySettingsButton}
            >
             <span className="sm:hidden">⚙️</span><span className="hidden sm:inline">{VIETNAMESE.gameplaySettingsButtonShort || VIETNAMESE.gameplaySettingsButton}</span>
            </Button>
             <Button
                onClick={onRollbackTurn}
                variant="secondary"
                size="sm"
                disabled={isStopButtonDisabled}
                title={isLoading ? "Dừng nhận phản hồi và lùi lượt" : (canRollbackStandard ? VIETNAMESE.rollbackTurn : VIETNAMESE.cannotRollbackFurther)}
                className="border-amber-500 text-amber-300 hover:bg-amber-700 hover:text-white px-2 sm:px-3"
            >
                <span className="sm:hidden">⏪</span><span className="hidden sm:inline">{VIETNAMESE.stopButtonShort || VIETNAMESE.stopButton}</span>
            </Button>
            <Button
                onClick={onSaveGame}
                variant="primary"
                size="sm"
                disabled={isSaveDisabled}
                isLoading={isSavingGame}
                loadingText="Đang lưu..."
                title={(storageType === 'cloud' && !firebaseUser) ? VIETNAMESE.signInRequiredForSave : VIETNAMESE.saveGameButton}
                className="px-2 sm:px-3"
            >
                <span className="sm:hidden">💾</span><span className="hidden sm:inline">{VIETNAMESE.saveGameButtonShort || VIETNAMESE.saveGameButton}</span>
            </Button>
            <Button 
                onClick={() => setShowDebugPanel(prev => !prev)} 
                variant={showDebugPanel ? "primary" : "ghost"} 
                size="sm" 
                className="border-yellow-500 text-yellow-300 hover:bg-yellow-700 hover:text-white px-2 sm:px-3"
                title="Debug Panel"
            >
                <span className="sm:hidden" aria-hidden="true">🐞</span>
                <span className="hidden sm:inline">Debug</span>
            </Button>
            <Button onClick={onQuit} variant="danger" size="sm" disabled={isSummarizing} className="px-2 sm:px-3" title={VIETNAMESE.quitGameButtonTitle}>
                 <span className="sm:hidden">🚪</span><span className="hidden sm:inline">{VIETNAMESE.quitGameButtonShort || VIETNAMESE.quitGameButton}</span>
            </Button>
        </div>
      </header>

      <div className="flex-grow flex flex-col gap-4 overflow-hidden"> 
        <div className="flex-grow flex flex-col bg-gray-850 shadow-xl rounded-lg overflow-hidden">
          <div id="story-log" className="flex-grow overflow-y-auto p-3 sm:p-4 bg-gray-800 rounded-t-lg custom-scrollbar">
            {displayedMessages.map((msg) => {
              const messageBaseClass = 'my-1 max-w-full p-2 sm:p-3 rounded-xl shadow text-sm sm:text-base relative'; 
              let typeSpecificClass = '';
              let dynamicStyle = getDynamicMessageStyles(msg.type);

              const isEditable = (msg.type === 'narration' || msg.type === 'player_action') && isCurrentlyActivePage;

              if (msg.type === 'narration') {
                if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-gray-700';
                if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-gray-100';
              } else if (msg.type === 'player_action') {
                if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-indigo-600';
                if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-white';
              } else if (msg.type === 'system') {
                typeSpecificClass = 'bg-yellow-600 bg-opacity-30 text-yellow-200 border border-yellow-500 italic text-xs sm:text-sm';
              } else if (msg.type === 'error') {
                typeSpecificClass = 'bg-red-700 text-white';
              } else if (msg.type === 'page_summary') {
                typeSpecificClass = 'bg-purple-800 bg-opacity-50 text-purple-200 border border-purple-600 italic text-xs sm:text-sm mt-3 mb-2';
              } else {
                 typeSpecificClass = 'bg-gray-600 text-gray-200';
              }

              return (
                <div key={msg.id} className={`flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`${messageBaseClass} ${typeSpecificClass} ${messageIdBeingEdited === msg.id ? 'w-full' : ''}`}
                    style={dynamicStyle}
                  >
                    {isEditable && messageIdBeingEdited !== msg.id && (
                        <button
                          onClick={() => handleStartEditInternal(msg)}
                          className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                          aria-label={VIETNAMESE.editButtonLabel}
                          title={VIETNAMESE.editButtonLabel}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                          </svg>
                        </button>
                      )}
                    {messageIdBeingEdited === msg.id ? (
                      <div className="mt-1"> {/* This div doesn't need w-full, its parent (with messageBaseClass) will handle it */}
                        <textarea
                          value={currentEditText}
                          onChange={(e) => setCurrentEditText(e.target.value)}
                          className="w-full p-2 text-sm bg-gray-600 border border-gray-500 rounded-md focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-gray-100 placeholder-gray-400 min-h-[480px]"
                          rows={Math.max(3, currentEditText.split('\n').length)}
                        />
                        <div className="flex justify-end space-x-2 mt-2">
                          <Button size="sm" variant="ghost" onClick={handleCancelEditInternal}>{VIETNAMESE.cancelEditButton}</Button>
                          <Button size="sm" variant="primary" onClick={() => handleSaveEditInternal(msg.id)}>{VIETNAMESE.saveEditButton}</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {parseAndHighlightText(msg.content, knowledgeBase)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {(isLoading && displayedMessages.length === 0 && knowledgeBase.playerStats.turn === 0) && <Spinner text={VIETNAMESE.contactingAI} size="sm" className="my-4" />}

            {(isLoading && !isSummarizing && isCurrentlyActivePage && displayedMessages.length > 0) && (
              <div className="text-center text-gray-400 italic py-2 mt-2 text-xs sm:text-sm">
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

          <div className="bg-gray-800 p-2 sm:p-3 border-t border-gray-700 flex-shrink-0">
            {latestMessageWithChoices?.choices && latestMessageWithChoices.choices.length > 0 && isCurrentlyActivePage && !isSummarizing && (
              <div className="mb-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-left justify-start py-1.5 px-2 text-xs text-indigo-300 hover:text-indigo-200 mb-1"
                    onClick={() => setShowAiSuggestions(prev => !prev)}
                >
                    {showAiSuggestions ? VIETNAMESE.hideAiSuggestionsButton : VIETNAMESE.showAiSuggestionsButton}
                </Button>
                {showAiSuggestions && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
                    {latestMessageWithChoices.choices.map((choice, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="w-full text-left justify-start py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm whitespace-normal" 
                        customStyles={getChoiceButtonStyles()}
                        onClick={() => handleChoiceClick(choice.text)}
                        disabled={isLoading || isSummarizing || !isCurrentlyActivePage || !!messageIdBeingEdited}
                        title={choice.text} 
                      >
                        {index + 1}. {choice.text}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmitAction} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mt-2">
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-shrink-0 flex-grow sm:flex-grow-0" ref={responseLengthDropdownRef}>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm" 
                    onClick={() => setIsResponseLengthDropdownOpen(!isResponseLengthDropdownOpen)}
                    className="px-2 w-full sm:min-w-[120px] md:min-w-[140px] flex items-center justify-between"
                    aria-haspopup="true"
                    aria-expanded={isResponseLengthDropdownOpen}
                    disabled={isLoading || isSummarizing || !isCurrentlyActivePage || !!messageIdBeingEdited}
                  >
                    <span className="truncate text-xs sm:text-sm">{getResponseLengthButtonLabel()}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 sm:w-5 sm:h-5 ml-1 transition-transform duration-200 ${isResponseLengthDropdownOpen ? 'transform rotate-180' : ''}`}>
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
                          className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-indigo-500 ${selectedResponseLength === length ? 'bg-indigo-600 font-semibold' : 'text-gray-100'} first:rounded-t-md last:rounded-b-md`}
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

                <div className="relative flex-shrink-0 flex-grow sm:flex-grow-0" ref={actionTypeDropdownRef}>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm" 
                    onClick={() => setIsActionTypeDropdownOpen(!isActionTypeDropdownOpen)}
                    className="px-2 w-full sm:min-w-[100px] md:min-w-[120px] flex items-center justify-between"
                    aria-haspopup="true"
                    aria-expanded={isActionTypeDropdownOpen}
                    disabled={isLoading || isSummarizing || !isCurrentlyActivePage || !!messageIdBeingEdited}
                  >
                    <span className="truncate text-xs sm:text-sm">
                      {currentActionType === 'action' ? VIETNAMESE.inputTypeActionLabel : VIETNAMESE.inputTypeStoryLabel}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 sm:w-5 sm:h-5 ml-1 transition-transform duration-200 ${isActionTypeDropdownOpen ? 'transform rotate-180' : ''}`}>
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </Button>
                  {isActionTypeDropdownOpen && (
                    <div className="absolute bottom-full mb-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                      <button
                        type="button"
                        onClick={() => selectActionType('action')}
                        className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-indigo-500 rounded-t-md ${currentActionType === 'action' ? 'bg-indigo-600 font-semibold' : 'text-gray-100'}`}
                        role="menuitem"
                      >
                        {VIETNAMESE.inputTypeActionLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => selectActionType('story')}
                        className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-indigo-500 rounded-b-md ${currentActionType === 'story' ? 'bg-indigo-600 font-semibold' : 'text-gray-100'}`}
                        role="menuitem"
                      >
                        {VIETNAMESE.inputTypeStoryLabel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <input
                type="text"
                value={playerInput}
                onChange={handleInputChange}
                placeholder={!isCurrentlyActivePage ? "Chỉ có thể hành động ở trang hiện tại nhất." : VIETNAMESE.enterAction}
                className="flex-grow p-2 sm:p-2.5 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-400 transition-colors duration-150"
                disabled={isLoading || isSummarizing || !isCurrentlyActivePage || !!messageIdBeingEdited}
                title={!isCurrentlyActivePage ? "Bạn chỉ có thể hành động ở trang hiện tại nhất của cuộc phiêu lưu." : (isSummarizing ? VIETNAMESE.summarizingAndPreparingNextPage : (!!messageIdBeingEdited ? "Đang sửa diễn biến..." : undefined))}
              />
              <Button
                type="submit"
                variant="primary"
                size="sm" 
                className="px-3 sm:px-4 w-full sm:w-auto"
                disabled={isLoading || isSummarizing || playerInput.trim() === "" || !isCurrentlyActivePage || !!messageIdBeingEdited}
                isLoading={isLoading && playerInput.trim() !== "" && !isSummarizing && isCurrentlyActivePage && !messageIdBeingEdited}
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
      </div>
      
      <OffCanvasPanel isOpen={isCharPanelOpen} onClose={() => setIsCharPanelOpen(false)} title={VIETNAMESE.characterPanelTitle} position="right">
          <CharacterSidePanel
            knowledgeBase={knowledgeBase}
            onItemClick={(item) => { setSelectedItem(item); setIsCharPanelOpen(false); }}
            onSkillClick={(skill) => { setSelectedSkill(skill); setIsCharPanelOpen(false); }}
          />
      </OffCanvasPanel>
      <OffCanvasPanel isOpen={isQuestsPanelOpen} onClose={() => setIsQuestsPanelOpen(false)} title={VIETNAMESE.questsPanelTitle} position="right">
        <QuestsSidePanel
            quests={knowledgeBase.allQuests}
            onQuestClick={(quest) => { setSelectedQuest(quest); setIsQuestsPanelOpen(false); }}
          />
      </OffCanvasPanel>
      <OffCanvasPanel isOpen={isWorldPanelOpen} onClose={() => setIsWorldPanelOpen(false)} title={VIETNAMESE.worldPanelTitle} position="right">
        <WorldSidePanel
            knowledgeBase={knowledgeBase}
            onNpcClick={(npc) => { setSelectedNpc(npc); setIsWorldPanelOpen(false); }}
            onLocationClick={(location) => { setSelectedLocation(location); setIsWorldPanelOpen(false); }}
            onLoreClick={(lore) => { setSelectedLore(lore); setIsWorldPanelOpen(false); }}
            onCompanionClick={(companion) => { setSelectedCompanion(companion); setIsWorldPanelOpen(false); }}
          />
      </OffCanvasPanel>

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
          <div className="space-y-2 text-sm">
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
                <ul className="list-disc list-inside pl-4 text-xs">
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
          <div className="space-y-2 text-sm">
            <p><strong className="text-indigo-300">Tên:</strong> {selectedSkill.name}</p>
            <p><strong className="text-indigo-300">Loại:</strong> {selectedSkill.skillType}</p>
            {selectedSkill.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedSkill.description}</p>}
            {selectedSkill.detailedEffect && <p><strong className="text-indigo-300">Hiệu ứng chi tiết:</strong> {selectedSkill.detailedEffect}</p>}
            {selectedSkill.manaCost !== undefined && <p><strong className="text-indigo-300">Tiêu hao Mana:</strong> {selectedSkill.manaCost}</p>}
            {selectedSkill.cooldown !== undefined && <p><strong className="text-indigo-300">Thời gian hồi:</strong> {selectedSkill.cooldown} lượt</p>}
          </div>
        )}
        {selectedQuest && (
          <div className="space-y-2 text-sm">
            <p><strong className="text-indigo-300">Tên:</strong> {selectedQuest.title}</p>
            {selectedQuest.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedQuest.description}</p>}
            <p><strong className="text-indigo-300">Trạng thái:</strong>
              {selectedQuest.status === 'active' ? "Đang làm" : selectedQuest.status === 'completed' ? "Hoàn thành" : "Thất bại"}
            </p>
            <p className="font-semibold text-indigo-300 mt-2">Mục tiêu:</p>
            {selectedQuest.objectives.length > 0 ? (
              <ul className="list-none pl-0 space-y-1">
                {selectedQuest.objectives.map(obj => (
                  <li key={obj.id} className={`flex items-center text-xs ${obj.completed ? 'text-green-400' : 'text-gray-300'}`}>
                    {obj.completed && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 flex-shrink-0">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                    <span className={obj.completed ? 'line-through' : ''}>{obj.text}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="italic text-gray-400 text-xs">Không có mục tiêu cụ thể.</p>}
          </div>
        )}
        {selectedNpc && (
            <div className="space-y-2 text-sm">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedNpc.name}</p>
                {selectedNpc.title && <p><strong className="text-indigo-300">Chức danh:</strong> {selectedNpc.title}</p>}
                {selectedNpc.description && selectedNpc.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedNpc.description}</p>}
                {selectedNpc.factionId && <p><strong className="text-indigo-300">Phe phái ID:</strong> {selectedNpc.factionId}</p>}
            </div>
        )}
        {selectedLocation && (
            <div className="space-y-2 text-sm">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedLocation.name}</p>
                {selectedLocation.description && selectedLocation.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedLocation.description}</p>}
            </div>
        )}
        {selectedLore && (
            <div className="space-y-2 text-sm">
                <p><strong className="text-indigo-300">Tiêu đề:</strong> {selectedLore.title}</p>
                {selectedLore.content && selectedLore.content.trim() && <p className="whitespace-pre-wrap"><strong className="text-indigo-300">Nội dung:</strong> {selectedLore.content}</p>}
            </div>
        )}
        {selectedCompanion && (
            <div className="space-y-2 text-sm">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedCompanion.name}</p>
                {selectedCompanion.description && selectedCompanion.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedCompanion.description}</p>}
                <p><strong className="text-indigo-300">HP:</strong> {selectedCompanion.hp} / {selectedCompanion.maxHp}</p>
                <p><strong className="text-indigo-300">Mana:</strong> {selectedCompanion.mana} / {selectedCompanion.maxMana}</p>
                <p><strong className="text-indigo-300">ATK:</strong> {selectedCompanion.atk}</p>
            </div>
        )}
      </Modal>

      <MiniInfoPopover
        isOpen={miniInfoPopover.isOpen}
        targetRect={miniInfoPopover.targetRect}
        entity={miniInfoPopover.entity}
        entityType={miniInfoPopover.entityType}
        onClose={() => setMiniInfoPopover(prev => ({ ...prev, isOpen: false }))}
      />

      {showDebugPanel && <DebugPanelDisplay
                            kb={knowledgeBase}
                            sentPromptsLog={sentPromptsLog}
                            rawAiResponsesLog={rawAiResponsesLog}
                            latestPromptTokenCount={latestPromptTokenCount}
                            currentPageDisplay={currentPageDisplay}
                            totalPages={totalPages}
                            isAutoPlaying={isAutoPlaying}
                            onToggleAutoPlay={onToggleAutoPlay}
                           />}

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
