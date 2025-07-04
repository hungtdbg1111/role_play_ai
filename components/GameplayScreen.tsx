
import React, { useState, useRef, useEffect, ChangeEvent, useCallback } from 'react';
import { KnowledgeBase, GameMessage, AiChoice, PlayerStats, Item, Skill, Quest, NPC, GameLocation, WorldLoreEntry, Companion, QuestObjective, PlayerActionInputType, ResponseLength, StorageType, StyleSettings, StyleSettingProperty, Faction, GameScreen, StatusEffect, DIALOGUE_MARKER } from './../types';
import Button from './ui/Button'; // Ensured relative path
import Spinner from './ui/Spinner';
import Modal from './ui/Modal'; // Corrected import path
import KeywordSpan from './ui/KeywordSpan';
import MiniInfoPopover from './ui/MiniInfoPopover';
import StyleSettingsModal from './StyleSettingsModal';
import OffCanvasPanel from './ui/OffCanvasPanel';
// Refactored imports for GameplayScreen layout
import GameHeader from './gameplay/layout/GameHeader';
import StoryLog from './gameplay/layout/StoryLog';
import PlayerInputArea from './gameplay/layout/PlayerInputArea';

import CharacterSidePanel from './gameplay/CharacterSidePanel';
import QuestsSidePanel from './gameplay/QuestsSidePanel';
import WorldSidePanel from './gameplay/WorldSidePanel';
import DebugPanelDisplay from './gameplay/DebugPanelDisplay';
import PaginationControls from './gameplay/PaginationControls';
import { VIETNAMESE, DEFAULT_STYLE_SETTINGS, FEMALE_AVATAR_BASE_URL, MALE_AVATAR_PLACEHOLDER_URL, MAX_FEMALE_AVATAR_INDEX } from './../constants';
import * as GameTemplates from './../templates';
import { uploadImageToCloudinary } from '../services/cloudinaryService'; // Import Cloudinary service
import { isValidImageUrl } from '../utils/imageValidationUtils';
import InputField from './ui/InputField';


// --- Define GameplayScreenProps interface ---
interface GameplayScreenProps {
  knowledgeBase: KnowledgeBase;
  gameMessages: GameMessage[];
  isLoading: boolean;
  onPlayerAction: (action: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => void;
  onQuit: () => void;
  rawAiResponsesLog: string[];
  sentPromptsLog: string[];
  latestPromptTokenCount: number | null | string;
  summarizationResponsesLog: string[];
  sentCraftingPromptsLog: string[]; 
  receivedCraftingResponsesLog: string[]; 
  sentNpcAvatarPromptsLog: string[]; 
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
  setCurrentScreen: (screen: GameScreen) => void;
  onUpdatePlayerAvatar: (newAvatarUrl: string) => void; 
  onUpdateNpcAvatar: (npcId: string, newAvatarUrl: string) => void; 
  isUploadingAvatar: boolean; 
}

// --- Helper function to escape regex characters ---
const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// --- Main Gameplay Screen Component ---
const GameplayScreen: React.FC<GameplayScreenProps> = ({
    knowledgeBase,
    gameMessages,
    isLoading,
    onPlayerAction,
    onQuit,
    rawAiResponsesLog,
    sentPromptsLog,
    latestPromptTokenCount,
    summarizationResponsesLog,
    sentCraftingPromptsLog,
    receivedCraftingResponsesLog,
    sentNpcAvatarPromptsLog, 
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
    setCurrentScreen,
    onUpdatePlayerAvatar,
    onUpdateNpcAvatar,
    isUploadingAvatar, 
}) => {
  const [playerInput, setPlayerInput] = useState('');

  const [isCharPanelOpen, setIsCharPanelOpen] = useState(false);
  const [isQuestsPanelOpen, setIsQuestsPanelOpen] = useState(false);
  const [isWorldPanelOpen, setIsWorldPanelOpen] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [isStyleSettingsModalOpen, setIsStyleSettingsModalOpen] = useState(false);
  const [showAiSuggestions, setShowAiSuggestions] = useState(true);

  // Store IDs for selected entities to ensure data freshness from knowledgeBase
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [selectedNpcId, setSelectedNpcId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedLoreId, setSelectedLoreId] = useState<string | null>(null);
  const [selectedCompanionId, setSelectedCompanionId] = useState<string | null>(null);
  const [selectedFactionId, setSelectedFactionId] = useState<string | null>(null);


  const [currentActionType, setCurrentActionType] = useState<PlayerActionInputType>('action');
  const [isActionTypeDropdownOpen, setIsActionTypeDropdownOpen] = useState(false);
  const actionTypeDropdownRef = useRef<HTMLDivElement | null>(null);

  const [selectedResponseLength, setSelectedResponseLength] = useState<ResponseLength>('default');
  const [isResponseLengthDropdownOpen, setIsResponseLengthDropdownOpen] = useState(false);
  const responseLengthDropdownRef = useRef<HTMLDivElement | null>(null);

  const [currentEditText, setCurrentEditText] = useState('');
  const npcAvatarFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingNpcSpecificAvatar, setIsUploadingNpcSpecificAvatar] = useState<string | null>(null); 

  // State for NPC avatar URL input in modal
  const [showNpcAvatarUrlInputModal, setShowNpcAvatarUrlInputModal] = useState(false); // New state
  const [npcAvatarUrlInput, setNpcAvatarUrlInput] = useState('');
  const [isNpcAvatarUrlValidating, setIsNpcAvatarUrlValidating] = useState(false);
  const [npcAvatarUrlError, setNpcAvatarUrlError] = useState<string | null>(null);


  const [miniInfoPopover, setMiniInfoPopover] = useState<{
    isOpen: boolean;
    targetRect: DOMRect | null;
    entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion | Faction | null;
    entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | 'faction' | null;
  }>({ isOpen: false, targetRect: null, entity: null, entityType: null });

  const displayedMessages = getMessagesForPage(currentPageDisplay);

  useEffect(() => {
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
        if (messageIdBeingEdited) {
          onCancelEditMessage();
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

  useEffect(() => {
    if (messageIdBeingEdited) {
      const msgToEdit = displayedMessages.find(m => m.id === messageIdBeingEdited) || gameMessages.find(m => m.id === messageIdBeingEdited);
      if (msgToEdit) {
        setCurrentEditText(msgToEdit.content);
      }
    } else {
      setCurrentEditText('');
    }
  }, [messageIdBeingEdited, displayedMessages, gameMessages]);


  const getResponseLengthButtonLabel = (): string => {
    const baseText = VIETNAMESE.responseLengthButtonText(selectedResponseLength);
    return baseText;
  };

  const getLatestChoicesSource = useCallback(() => {
    // Determine if the current page is a newly advanced, empty page (before AI response for it)
    const isPotentiallyNewEmptyPage = currentPageDisplay > 1 &&
                                       isCurrentlyActivePage && // We are on the latest page
                                       !displayedMessages.some(m => m.type === 'narration' && m.choices && m.choices.length > 0);

    if (isPotentiallyNewEmptyPage) {
        // If it's a new empty page, look for choices in the *overall* gameMessages history
        return [...gameMessages].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);
    } else {
        // Otherwise, use choices from the currently displayed messages on this page
        return [...displayedMessages].reverse().find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);
    }
  }, [gameMessages, displayedMessages, currentPageDisplay, isCurrentlyActivePage]);

  const latestMessageWithChoices = getLatestChoicesSource();


  const closeModal = () => {
    setSelectedItemId(null);
    setSelectedSkillId(null);
    setSelectedQuestId(null);
    setSelectedNpcId(null);
    setSelectedLocationId(null);
    setSelectedLoreId(null);
    setSelectedCompanionId(null);
    setSelectedFactionId(null);
    // Reset NPC Avatar URL states when modal closes
    setShowNpcAvatarUrlInputModal(false); // Hide input section
    setNpcAvatarUrlInput('');
    setIsNpcAvatarUrlValidating(false);
    setNpcAvatarUrlError(null);
  };

  // Retrieve full entity objects from knowledgeBase using stored IDs for modals
  const selectedItem = knowledgeBase.inventory.find(i => i.id === selectedItemId);
  const selectedSkill = knowledgeBase.playerSkills.find(s => s.id === selectedSkillId);
  const selectedQuest = knowledgeBase.allQuests.find(q => q.id === selectedQuestId);
  const selectedNpc = knowledgeBase.discoveredNPCs.find(n => n.id === selectedNpcId);
  const selectedLocation = knowledgeBase.discoveredLocations.find(l => l.id === selectedLocationId);
  const selectedLore = knowledgeBase.worldLore.find(l => l.id === selectedLoreId);
  const selectedCompanion = knowledgeBase.companions.find(c => c.id === selectedCompanionId);
  const selectedFaction = knowledgeBase.discoveredFactions.find(f => f.id === selectedFactionId);

  useEffect(() => { // When NPC modal opens, prefill URL input if available
    if (selectedNpc) {
      setNpcAvatarUrlInput(selectedNpc.avatarUrl?.startsWith('http') ? selectedNpc.avatarUrl : '');
      setShowNpcAvatarUrlInputModal(false); // Keep URL input hidden initially
      setNpcAvatarUrlError(null);
    }
  }, [selectedNpc]);


  const handleKeywordClick = useCallback((
    event: React.MouseEvent<HTMLSpanElement>,
    entity: Item | Skill | Quest | NPC | GameLocation | WorldLoreEntry | Companion | Faction,
    entityType: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | 'faction'
  ) => {
    const target = event.currentTarget as HTMLElement;
    if (miniInfoPopover.isOpen && miniInfoPopover.entity === entity) {
        // If clicking the same keyword that opened the popover, close it
        setMiniInfoPopover(prev => ({ ...prev, isOpen: false, targetRect: null }));
    } else {
        // Otherwise, open/reposition the popover for the new keyword
        setMiniInfoPopover({
            isOpen: true,
            targetRect: target.getBoundingClientRect(),
            entity,
            entityType,
        });
    }
  }, [miniInfoPopover.isOpen, miniInfoPopover.entity]); // Dependencies for the popover

  const getKeywordHighlightStyle = useCallback((): React.CSSProperties => {
    const { textColor, fontFamily, fontSize, backgroundColor } = styleSettings.keywordHighlight;
    const style: React.CSSProperties = {};
    if (textColor) style.color = textColor;
    if (fontFamily && fontFamily !== 'inherit') style.fontFamily = fontFamily;
    if (fontSize && fontSize !== 'inherit') style.fontSize = fontSize;
    if (backgroundColor && backgroundColor !== 'transparent') style.backgroundColor = backgroundColor;
    return style;
  }, [styleSettings.keywordHighlight]);

  const getDialogueHighlightStyle = useCallback((): React.CSSProperties => {
    const { textColor, fontFamily, fontSize, backgroundColor } = styleSettings.dialogueHighlight;
    const style: React.CSSProperties = {};
    if (textColor) style.color = textColor;
    if (fontFamily && fontFamily !== 'inherit') style.fontFamily = fontFamily; 
    if (fontSize && fontSize !== 'inherit') style.fontSize = fontSize;       
    if (backgroundColor && backgroundColor !== 'transparent') style.backgroundColor = backgroundColor; 
    return style;
  }, [styleSettings.dialogueHighlight]);


  const parseAndHighlightText = useCallback((textInput: string, kb: KnowledgeBase): React.ReactNode[] => {
    const text = textInput ? String(textInput) : "";
    if (!text) return [""];

    const finalNodes: React.ReactNode[] = [];
    const dialogueHighlightStyle = getDialogueHighlightStyle();
    const keywordHighlightStyle = getKeywordHighlightStyle();

    const segments = text.split(DIALOGUE_MARKER);

    segments.forEach((segment, index) => {
      if (index % 2 === 1) { // Dialogue content (between markers)
        if (segment.length > 0) { // Non-empty dialogue
          finalNodes.push(
            <span key={`dialogue-${finalNodes.length}`} style={dialogueHighlightStyle}>
              {DIALOGUE_MARKER + segment + DIALOGUE_MARKER}
            </span>
          );
        } 
        // If segment.length is 0 here, it means we had adjacent markers like "", which should be removed (by adding nothing).
      } else { // Regular text (even index)
        if (segment.length > 0) {
          const allKeywords: Array<{ name: string; type: 'item' | 'skill' | 'quest' | 'npc' | 'location' | 'lore' | 'companion' | 'faction'; entity: any;}> = [];
          kb.inventory.forEach(e => { if (typeof e.name === 'string' && e.name.trim().length > 2) allKeywords.push({ name: e.name.trim(), type: 'item', entity: e }); });
          kb.playerSkills.forEach(e => { if (typeof e.name === 'string' && e.name.trim().length > 2) allKeywords.push({ name: e.name.trim(), type: 'skill', entity: e }); });
          kb.allQuests.filter(q => q.status === 'active').forEach(e => { if (typeof e.title === 'string' && e.title.trim().length > 2) allKeywords.push({ name: e.title.trim(), type: 'quest', entity: e }); });
          kb.discoveredNPCs.forEach(e => { if (typeof e.name === 'string' && e.name.trim().length > 2) allKeywords.push({ name: e.name.trim(), type: 'npc', entity: e }); });
          kb.discoveredLocations.forEach(e => { if (typeof e.name === 'string' && e.name.trim().length > 2) allKeywords.push({ name: e.name.trim(), type: 'location', entity: e }); });
          kb.worldLore.forEach(e => { if (typeof e.title === 'string' && e.title.trim().length > 2) allKeywords.push({ name: e.title.trim(), type: 'lore', entity: e }); });
          kb.companions.forEach(e => { if (typeof e.name === 'string' && e.name.trim().length > 2) allKeywords.push({ name: e.name.trim(), type: 'companion', entity: e }); });
          kb.discoveredFactions.forEach(e => { if (typeof e.name === 'string' && e.name.trim().length > 2) allKeywords.push({ name: e.name.trim(), type: 'faction', entity: e }); });

          if (allKeywords.length === 0) {
            finalNodes.push(segment);
          } else {
            allKeywords.sort((a, b) => b.name.length - a.name.length);
            const keywordMap = new Map<string, { type: any, entity: any }>();
            allKeywords.forEach(kw => { if (!keywordMap.has(kw.name.toLowerCase())) keywordMap.set(kw.name.toLowerCase(), { type: kw.type, entity: kw.entity }); });
            const uniqueNamesForRegex = Array.from(new Set(allKeywords.map(kw => escapeRegExp(kw.name))));

            if (uniqueNamesForRegex.length === 0) {
                finalNodes.push(segment);
            } else {
                const pattern = `\\b(${uniqueNamesForRegex.join('|')})\\b`;
                const regex = new RegExp(pattern, 'gi');
                
                let lastKeywordIndexInSegment = 0;
                let matchInSegment;
                while ((matchInSegment = regex.exec(segment)) !== null) {
                  const keywordText = matchInSegment[0];
                  const keywordInfo = keywordMap.get(keywordText.toLowerCase());

                  if (matchInSegment.index > lastKeywordIndexInSegment) {
                    finalNodes.push(segment.substring(lastKeywordIndexInSegment, matchInSegment.index));
                  }

                  if (keywordInfo) {
                    finalNodes.push(
                      <KeywordSpan
                        key={`keyword-${keywordInfo.type}-${(keywordInfo.entity as any).id || keywordInfo.entity.name || keywordInfo.entity.title}-${finalNodes.length}`}
                        keyword={keywordText}
                        entityType={keywordInfo.type}
                        entity={keywordInfo.entity}
                        onClick={handleKeywordClick}
                        style={keywordHighlightStyle}
                      />
                    );
                  } else {
                    finalNodes.push(keywordText); 
                  }
                  lastKeywordIndexInSegment = regex.lastIndex;
                }
                if (lastKeywordIndexInSegment < segment.length) {
                  finalNodes.push(segment.substring(lastKeywordIndexInSegment));
                }
            }
          }
        }
      }
    });
    return finalNodes.length > 0 ? finalNodes : [""];
  }, [handleKeywordClick, getKeywordHighlightStyle, getDialogueHighlightStyle, DIALOGUE_MARKER, knowledgeBase]);


  const isSaveDisabled =
    isSavingGame ||
    isLoading ||
    isSummarizing ||
    isUploadingAvatar; 

  // Determine if the stop button should be disabled.
  // It can be used if not summarizing AND ( (isLoading from API and there's history) OR (not loading and there's history beyond initial setup) )
  const canRollbackStandard = knowledgeBase.turnHistory && knowledgeBase.turnHistory.length > 0 && !(knowledgeBase.playerStats.turn === 1 && knowledgeBase.turnHistory.length ===1 && knowledgeBase.turnHistory[0].knowledgeBaseSnapshot.playerStats.turn === 0);
  const isStopButtonDisabled = isSummarizing || (!isLoading && !canRollbackStandard) || isUploadingAvatar;

  const getDynamicMessageStyles = (msgType: GameMessage['type']): React.CSSProperties => {
    const styles: React.CSSProperties = {};
    let setting: StyleSettingProperty | undefined;

    if (msgType === 'narration') setting = styleSettings.narration;
    else if (msgType === 'player_action') setting = styleSettings.playerAction;

    if (setting) {
      if (setting.fontFamily && setting.fontFamily !== 'inherit') styles.fontFamily = setting.fontFamily;
      if (setting.fontSize && setting.fontSize !== 'inherit') styles.fontSize = setting.fontSize;
      if (setting.textColor) styles.color = setting.textColor; 
      // Ensure background color is applied only if it's not 'transparent' or undefined
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
        // Explicitly set transparent if that's the value, otherwise default browser/Tailwind style applies
        styles.backgroundColor = 'transparent';
      }
    }
    return styles;
  };


  const handleSaveEditInternal = (messageId: string) => {
    onSaveEditedMessage(messageId, currentEditText);
  };

  // Use the manualSaveName or worldConfig.saveGameName or worldConfig.theme for display
  const gameTitleDisplay = knowledgeBase.manualSaveName || knowledgeBase.worldConfig?.saveGameName || knowledgeBase.worldConfig?.theme || "Role Play AI";

  // Helper to render stat bonuses in the modal
  const renderStatBonuses = (bonuses: Partial<PlayerStats>) => {
    // Filter out base stats and non-numeric/zero values for display
    const relevantBonuses = Object.entries(bonuses).filter(
        (entry): entry is [string, number] => { // Type assertion
            const [key, value] = entry;
            return !key.startsWith('base') && // Exclude baseMaxSinhLuc, etc.
                typeof value === 'number' &&
                value !== 0;
        }
    );

    if (relevantBonuses.length === 0) return <p className="text-xs text-gray-400">Không có chỉ số cộng thêm.</p>;

    const statLabels: Record<string, string> = {
        sinhLuc: "Sinh Lực Hiện Tại", maxSinhLuc: "Sinh Lực Tối Đa",
        linhLuc: "Linh Lực Hiện Tại", maxLinhLuc: "Linh Lực Tối Đa",
        sucTanCong: "Sức Tấn Công",
        kinhNghiem: "Kinh Nghiệm", maxKinhNghiem: "Kinh Nghiệm Tối Đa",
        // Add more translations as needed
    };

    return (
        <ul className="list-disc list-inside pl-4 text-xs">
            {relevantBonuses.map(([key, value]) => ( 
                <li key={key}>
                    <span className="text-gray-300">{statLabels[key] || key}: </span>
                    <span className={value > 0 ? "text-green-400" : "text-red-400"}>
                        {value > 0 ? `+${value}` : value}
                    </span>
                </li>
            ))}
        </ul>
    );
  };
  
  const getSelectedNpcAvatarSrc = () => {
    if (selectedNpc) {
      if (selectedNpc.avatarUrl && (selectedNpc.avatarUrl.startsWith('http://') || selectedNpc.avatarUrl.startsWith('https://') || selectedNpc.avatarUrl.startsWith('data:image'))) {
        return selectedNpc.avatarUrl; // Use stored Cloudinary/web URL or base64
      }
      // Fallback to random/placeholder if no valid URL
      if (selectedNpc.gender === 'Nữ') {
        const randomIndex = Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1;
        return `${FEMALE_AVATAR_BASE_URL}${randomIndex}.png`;
      }
      return MALE_AVATAR_PLACEHOLDER_URL; // Default for Male or Không rõ
    }
    return MALE_AVATAR_PLACEHOLDER_URL; // Default if no NPC selected
  };

  // Handle NPC avatar file input change
  const handleNpcAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedNpc) {
        setIsUploadingNpcSpecificAvatar(selectedNpc.id);
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64String = reader.result as string;
            onUpdateNpcAvatar(selectedNpc.id, base64String);
            setIsUploadingNpcSpecificAvatar(null); 
            if (npcAvatarFileInputRef.current) npcAvatarFileInputRef.current.value = "";
            setShowNpcAvatarUrlInputModal(false); // Hide URL input on file upload
        };
        reader.readAsDataURL(file);
    }
  };

  // Handle player avatar upload (passed from CharacterSidePanel)
  const handlePlayerAvatarUploadRequest = async (base64Data: string) => {
    onUpdatePlayerAvatar(base64Data);
  };
  
  const handleNpcAvatarUrlInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNpcAvatarUrlInput(e.target.value);
    setNpcAvatarUrlError(null);
  };

  const handleNpcAvatarUrlSubmit = async () => {
    if (!selectedNpc || !npcAvatarUrlInput.trim()) return;
    setIsNpcAvatarUrlValidating(true);
    setNpcAvatarUrlError(null);
    const isValid = await isValidImageUrl(npcAvatarUrlInput);
    setIsNpcAvatarUrlValidating(false);
    if (isValid) {
      onUpdateNpcAvatar(selectedNpc.id, npcAvatarUrlInput);
      setShowNpcAvatarUrlInputModal(false); // Hide on successful URL submit
    } else {
      setNpcAvatarUrlError(VIETNAMESE.avatarUrlInvalid);
    }
  };


  return (
    <div className="h-screen flex flex-col bg-gray-900 text-gray-100 p-2 sm:p-4">
      <GameHeader
        gameTitleDisplay={gameTitleDisplay}
        isCharPanelOpen={isCharPanelOpen}
        isQuestsPanelOpen={isQuestsPanelOpen}
        isWorldPanelOpen={isWorldPanelOpen}
        setIsCharPanelOpen={setIsCharPanelOpen}
        setIsQuestsPanelOpen={setIsQuestsPanelOpen}
        setIsWorldPanelOpen={setIsWorldPanelOpen}
        setCurrentScreen={setCurrentScreen}
        onRollbackTurn={onRollbackTurn}
        isStopButtonDisabled={isStopButtonDisabled}
        isLoading={isLoading || isUploadingAvatar}
        onSaveGame={onSaveGame}
        isSaveDisabled={isSaveDisabled}
        isSavingGame={isSavingGame}
        showDebugPanel={showDebugPanel}
        setShowDebugPanel={setShowDebugPanel}
        onQuit={onQuit}
        isSummarizing={isSummarizing}
        setIsStyleSettingsModalOpen={setIsStyleSettingsModalOpen}
      />

      <div className="flex-grow flex flex-col gap-4 overflow-hidden">
        {/* Main content area: Story Log and Player Input */}
        <div className="flex-grow flex flex-col bg-gray-850 shadow-xl rounded-lg overflow-hidden">
          <StoryLog
            displayedMessages={displayedMessages}
            isLoadingUi={isLoading || isUploadingAvatar} // Combine loading states for UI
            isSummarizingUi={isSummarizing}
            isCurrentlyActivePage={isCurrentlyActivePage}
            knowledgeBase={knowledgeBase}
            styleSettings={styleSettings}
            messageIdBeingEdited={messageIdBeingEdited}
            currentEditText={currentEditText}
            setCurrentEditText={setCurrentEditText}
            onStartEditMessage={onStartEditMessage} 
            onSaveEditedMessage={handleSaveEditInternal} 
            onCancelEditMessage={onCancelEditMessage} // Corrected prop name
            parseAndHighlightText={parseAndHighlightText}
            getDynamicMessageStyles={getDynamicMessageStyles}
            playerStatsTurn={knowledgeBase.playerStats.turn}
          />
          <PlayerInputArea
            latestMessageWithChoices={latestMessageWithChoices}
            showAiSuggestions={showAiSuggestions}
            setShowAiSuggestions={setShowAiSuggestions}
            playerInput={playerInput}
            setPlayerInput={setPlayerInput}
            currentActionType={currentActionType}
            setCurrentActionType={setCurrentActionType}
            isActionTypeDropdownOpen={isActionTypeDropdownOpen}
            setIsActionTypeDropdownOpen={setIsActionTypeDropdownOpen}
            actionTypeDropdownRef={actionTypeDropdownRef}
            selectedResponseLength={selectedResponseLength}
            setSelectedResponseLength={setSelectedResponseLength}
            isResponseLengthDropdownOpen={isResponseLengthDropdownOpen}
            setIsResponseLengthDropdownOpen={setIsResponseLengthDropdownOpen}
            responseLengthDropdownRef={responseLengthDropdownRef}
            isLoadingUi={isLoading || isUploadingAvatar}
            isSummarizingUi={isSummarizing}
            isCurrentlyActivePage={isCurrentlyActivePage}
            messageIdBeingEdited={messageIdBeingEdited}
            onPlayerAction={onPlayerAction}
            getChoiceButtonStyles={getChoiceButtonStyles}
            getResponseLengthButtonLabel={getResponseLengthButtonLabel}
          />
          <PaginationControls
            currentPage={currentPageDisplay}
            totalPages={totalPages}
            onPrev={onGoToPrevPage}
            onNext={onGoToNextPage}
            onJump={onJumpToPage}
            isSummarizing={isSummarizing || isUploadingAvatar}
          />
        </div>
      </div>

      {/* Off-Canvas Panels */}
      <OffCanvasPanel isOpen={isCharPanelOpen} onClose={() => setIsCharPanelOpen(false)} title={VIETNAMESE.characterPanelTitle} position="right">
          <CharacterSidePanel
            knowledgeBase={knowledgeBase}
            onItemClick={(item) => { setSelectedItemId(item.id); }}
            onSkillClick={(skill) => { setSelectedSkillId(skill.id); }}
            onPlayerAvatarUploadRequest={handlePlayerAvatarUploadRequest}
            isUploadingPlayerAvatar={isUploadingNpcSpecificAvatar === 'player' || isUploadingAvatar}
          />
      </OffCanvasPanel>
      <OffCanvasPanel isOpen={isQuestsPanelOpen} onClose={() => setIsQuestsPanelOpen(false)} title={VIETNAMESE.questsPanelTitle} position="right">
        <QuestsSidePanel
            quests={knowledgeBase.allQuests}
            onQuestClick={(quest) => { setSelectedQuestId(quest.id); }}
          />
      </OffCanvasPanel>
      <OffCanvasPanel isOpen={isWorldPanelOpen} onClose={() => setIsWorldPanelOpen(false)} title={VIETNAMESE.worldPanelTitle} position="right">
        <WorldSidePanel
            knowledgeBase={knowledgeBase}
            onNpcClick={(npc) => { setSelectedNpcId(npc.id); }}
            onLocationClick={(location) => { setSelectedLocationId(location.id); }}
            onLoreClick={(lore) => { setSelectedLoreId(lore.id); }}
            onCompanionClick={(companion) => { setSelectedCompanionId(companion.id); }}
            onFactionClick={(faction) => { setSelectedFactionId(faction.id); }}
          />
      </OffCanvasPanel>

      {/* Modal for Entity Details */}
      <Modal
        isOpen={!!selectedItem || !!selectedSkill || !!selectedQuest || !!selectedNpc || !!selectedLocation || !!selectedLore || !!selectedCompanion || !!selectedFaction}
        onClose={closeModal}
        title={
          selectedItem ? VIETNAMESE.itemDetails :
          selectedSkill ? VIETNAMESE.skillDetails :
          selectedQuest ? VIETNAMESE.questDetails :
          selectedNpc ? VIETNAMESE.npcDetails :
          selectedLocation ? VIETNAMESE.locationDetails :
          selectedLore ? VIETNAMESE.loreDetails :
          selectedCompanion ? VIETNAMESE.companionDetails :
          selectedFaction ? "Chi Tiết Phe Phái" :
          "Chi Tiết"
        }
      >
        <div className="space-y-2 text-sm">
            {/* ... (Content for Item, Skill, Quest, Location, Lore, Companion, Faction as before) ... */}
            {selectedItem && (
              <>
                <p><strong className="text-indigo-300">Tên:</strong> {selectedItem.name}</p>
                <p><strong className="text-indigo-300">Phân loại:</strong> {selectedItem.category}</p>
                {selectedItem.category === GameTemplates.ItemCategory.EQUIPMENT && (selectedItem as GameTemplates.EquipmentTemplate).equipmentType && <p><strong className="text-indigo-300">Loại Trang Bị:</strong> {(selectedItem as GameTemplates.EquipmentTemplate).equipmentType}</p>}
                {selectedItem.category === GameTemplates.ItemCategory.POTION && (selectedItem as GameTemplates.PotionTemplate).potionType && <p><strong className="text-indigo-300">Loại Đan Dược:</strong> {(selectedItem as GameTemplates.PotionTemplate).potionType}</p>}
                {selectedItem.category === GameTemplates.ItemCategory.MATERIAL && (selectedItem as GameTemplates.MaterialTemplate).materialType && <p><strong className="text-indigo-300">Loại Nguyên Liệu:</strong> {(selectedItem as GameTemplates.MaterialTemplate).materialType}</p>}

                <p><strong className="text-indigo-300">Độ hiếm:</strong> {selectedItem.rarity}</p>
                <p><strong className="text-indigo-300">Số lượng:</strong> {selectedItem.quantity}</p>
                {selectedItem.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedItem.description}</p>}
                {selectedItem.value !== undefined && <p><strong className="text-indigo-300">Giá trị:</strong> {selectedItem.value}</p>}

                {selectedItem.category === GameTemplates.ItemCategory.EQUIPMENT && (
                    <>
                        {(selectedItem as GameTemplates.EquipmentTemplate).slot && <p><strong className="text-indigo-300">Vị trí:</strong> {(selectedItem as GameTemplates.EquipmentTemplate).slot}</p>}
                        {(selectedItem as GameTemplates.EquipmentTemplate).statBonuses && Object.keys((selectedItem as GameTemplates.EquipmentTemplate).statBonuses).length > 0 && (
                            <div><strong className="text-indigo-300">Chỉ số cộng thêm:</strong> {renderStatBonuses((selectedItem as GameTemplates.EquipmentTemplate).statBonuses)}</div>
                        )}
                        {(selectedItem as GameTemplates.EquipmentTemplate).uniqueEffects && (selectedItem as GameTemplates.EquipmentTemplate).uniqueEffects.length > 0 && <p><strong className="text-indigo-300">Hiệu ứng đặc biệt:</strong> {(selectedItem as GameTemplates.EquipmentTemplate).uniqueEffects.join(', ')}</p>}
                        {(selectedItem as GameTemplates.EquipmentTemplate).durability !== undefined && <p><strong className="text-indigo-300">Độ bền:</strong> {(selectedItem as GameTemplates.EquipmentTemplate).durability} / {(selectedItem as GameTemplates.EquipmentTemplate).maxDurability || 'N/A'}</p>}
                        {(selectedItem as GameTemplates.EquipmentTemplate).levelRequirement !== undefined && <p><strong className="text-indigo-300">Yêu cầu cấp độ:</strong> {(selectedItem as GameTemplates.EquipmentTemplate).levelRequirement}</p>}
                    </>
                )}
                {selectedItem.category === GameTemplates.ItemCategory.POTION && (
                    <>
                        {(selectedItem as GameTemplates.PotionTemplate).effects && (selectedItem as GameTemplates.PotionTemplate).effects.length > 0 && <p><strong className="text-indigo-300">Hiệu ứng:</strong> {(selectedItem as GameTemplates.PotionTemplate).effects.join(', ')}</p>}
                        {(selectedItem as GameTemplates.PotionTemplate).durationTurns !== undefined && <p><strong className="text-indigo-300">Thời gian hiệu lực:</strong> {(selectedItem as GameTemplates.PotionTemplate).durationTurns} lượt</p>}
                        {(selectedItem as GameTemplates.PotionTemplate).cooldownTurns !== undefined && <p><strong className="text-indigo-300">Thời gian hồi phục (sử dụng):</strong> {(selectedItem as GameTemplates.PotionTemplate).cooldownTurns} lượt</p>}
                    </>
                )}
                 {selectedItem.category === GameTemplates.ItemCategory.QUEST_ITEM && (selectedItem as GameTemplates.QuestItemTemplate).questIdAssociated && <p><strong className="text-indigo-300">Liên quan đến nhiệm vụ ID:</strong> {(selectedItem as GameTemplates.QuestItemTemplate).questIdAssociated}</p>}
              </>
            )}
            {selectedSkill && (
              <>
                <p><strong className="text-indigo-300">Tên:</strong> {selectedSkill.name}</p>
                <p><strong className="text-indigo-300">Loại:</strong> {selectedSkill.skillType}</p>
                {selectedSkill.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedSkill.description}</p>}
                {selectedSkill.detailedEffect && <p><strong className="text-indigo-300">Hiệu ứng chi tiết:</strong> {selectedSkill.detailedEffect}</p>}
                <p><strong className="text-indigo-300">Tiêu hao Mana:</strong> {selectedSkill.manaCost || 0}</p>
                {selectedSkill.baseDamage > 0 && <p><strong className="text-indigo-300">Sát thương cơ bản:</strong> {selectedSkill.baseDamage}</p>}
                {selectedSkill.damageMultiplier > 0 && <p><strong className="text-indigo-300">Hệ số Sức Tấn Công:</strong> x{selectedSkill.damageMultiplier}</p>}
                {selectedSkill.healingAmount > 0 && <p><strong className="text-indigo-300">Hồi phục cơ bản:</strong> {selectedSkill.healingAmount}</p>}
                {selectedSkill.cooldown !== undefined && <p><strong className="text-indigo-300">Thời gian hồi:</strong> {selectedSkill.cooldown} lượt (Hiện tại: {selectedSkill.currentCooldown || 0})</p>}
                {selectedSkill.targetType && <p><strong className="text-indigo-300">Mục tiêu:</strong> {selectedSkill.targetType}</p>}
                {selectedSkill.levelRequirement !== undefined && <p><strong className="text-indigo-300">Yêu cầu cấp độ:</strong> {selectedSkill.levelRequirement}</p>}
                {selectedSkill.requiredRealm && <p><strong className="text-indigo-300">Yêu cầu cảnh giới:</strong> {selectedSkill.requiredRealm}</p>}
                {selectedSkill.prerequisiteSkillId && <p><strong className="text-indigo-300">Kỹ năng tiền đề ID:</strong> {selectedSkill.prerequisiteSkillId}</p>}
                {selectedSkill.isUltimate && <p><strong className="text-indigo-300">Là Kỹ Năng Tối Thượng:</strong> Có</p>}
                {selectedSkill.xpGainOnUse !== undefined && <p><strong className="text-indigo-300">Kinh nghiệm nhận khi dùng:</strong> {selectedSkill.xpGainOnUse}</p>}
              </>
            )}
            {selectedQuest && (
              <>
                <p><strong className="text-indigo-300">Tên:</strong> {selectedQuest.title}</p>
                {selectedQuest.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedQuest.description}</p>}
                <p><strong className="text-indigo-300">Trạng thái:</strong>
                    {selectedQuest.status === 'active' ? "Đang làm" :
                    selectedQuest.status === 'completed' ? <span className="text-green-400 font-semibold">Hoàn thành</span> :
                    <span className="text-red-400 font-semibold">Thất bại</span>
                    }
                </p>
                <p className="font-semibold text-indigo-300 mt-2">Mục tiêu:</p>
                {selectedQuest.objectives.length > 0 ? (
                  <ul className="list-none pl-0 space-y-1">
                    {selectedQuest.objectives.map(obj => (
                      <li key={obj.id} className={`flex items-center text-xs
                        ${obj.completed && selectedQuest.status !== 'failed' ? 'text-green-400' : (selectedQuest.status === 'failed' ? 'text-red-400 opacity-80' : 'text-gray-300')}`}>
                        {obj.completed && selectedQuest.status !== 'failed' && (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 flex-shrink-0 text-green-400">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                          </svg>
                        )}
                        {selectedQuest.status === 'failed' && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1.5 flex-shrink-0 text-red-500">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                            </svg>
                        )}
                        {!obj.completed && selectedQuest.status === 'active' && (
                            <span className="w-4 h-4 mr-1.5 flex-shrink-0 inline-flex items-center justify-center text-gray-400">-</span>
                        )}
                        <span className={`${obj.completed && selectedQuest.status !== 'failed' ? 'line-through' : ''} ${selectedQuest.status === 'failed' ? 'line-through text-red-400 opacity-70' : ''}`}>{obj.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="italic text-gray-400 text-xs">Không có mục tiêu cụ thể.</p>}
              </>
            )}
            {selectedNpc && (<>
                <img
                    src={getSelectedNpcAvatarSrc()}
                    alt={selectedNpc.name}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover mx-auto mb-3 border-2 border-indigo-400 shadow-md"
                />
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-1">
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => npcAvatarFileInputRef.current?.click()}
                            className="text-xs !py-1.5 border-purple-500 hover:bg-purple-700/60 flex-grow sm:flex-grow-0"
                            isLoading={isUploadingNpcSpecificAvatar === selectedNpc.id && !showNpcAvatarUrlInputModal}
                            loadingText={VIETNAMESE.uploadingAvatarMessage}
                            disabled={isUploadingNpcSpecificAvatar === selectedNpc.id}
                        >
                            {VIETNAMESE.uploadNpcAvatarLabel}
                        </Button>
                        <input
                            type="file"
                            ref={npcAvatarFileInputRef}
                            onChange={(e) => handleNpcAvatarFileChange(e as ChangeEvent<HTMLInputElement>)}
                            accept="image/png, image/jpeg, image/webp, image/gif"
                            className="hidden"
                            id={`npc-avatar-upload-input-${selectedNpc.id}`}
                            disabled={isUploadingNpcSpecificAvatar === selectedNpc.id}
                        />
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                                setShowNpcAvatarUrlInputModal(!showNpcAvatarUrlInputModal);
                                if (!showNpcAvatarUrlInputModal) { // If opening
                                    setNpcAvatarUrlInput(selectedNpc.avatarUrl?.startsWith('http') ? selectedNpc.avatarUrl : '');
                                }
                                setNpcAvatarUrlError(null);
                            }}
                            className="text-xs !py-1.5 border-cyan-500 hover:bg-cyan-700/60 flex-grow sm:flex-grow-0"
                            aria-expanded={showNpcAvatarUrlInputModal}
                        >
                           {showNpcAvatarUrlInputModal ? "Đóng URL" : VIETNAMESE.avatarUrlInputLabel.replace(":", "")}
                        </Button>
                    </div>
                    {showNpcAvatarUrlInputModal && (
                        <div className="mt-1.5 p-2 border border-gray-700 rounded-md bg-gray-800/30">
                            <InputField
                                label=""
                                id={`npc-avatar-url-modal-${selectedNpc.id}`}
                                value={npcAvatarUrlInput}
                                onChange={(e) => handleNpcAvatarUrlInputChange(e as ChangeEvent<HTMLInputElement>)}
                                placeholder={VIETNAMESE.avatarUrlInputPlaceholder}
                                disabled={isUploadingNpcSpecificAvatar === selectedNpc.id || isNpcAvatarUrlValidating}
                                className="!mb-1.5"
                            />
                             <Button
                                size="sm"
                                variant="primary"
                                onClick={handleNpcAvatarUrlSubmit}
                                className="w-full text-xs !py-1"
                                isLoading={isNpcAvatarUrlValidating}
                                disabled={isUploadingNpcSpecificAvatar === selectedNpc.id || isNpcAvatarUrlValidating || !npcAvatarUrlInput.trim()}
                                loadingText={VIETNAMESE.avatarUrlValidating}
                            >
                                {VIETNAMESE.confirmUrlButton}
                            </Button>
                            {isNpcAvatarUrlValidating && <Spinner size="sm" text={VIETNAMESE.avatarUrlValidating} className="mt-1 text-xs" />}
                            {npcAvatarUrlError && <p className="text-xs text-red-400 mt-1">{npcAvatarUrlError}</p>}
                        </div>
                    )}
                </div>
                <p><strong className="text-indigo-300">Tên:</strong> {selectedNpc.name} {selectedNpc.title ? `(${selectedNpc.title})` : ''}</p>
                {selectedNpc.gender && <p><strong className="text-indigo-300">Giới tính:</strong> {selectedNpc.gender}</p>}
                <p><strong className="text-indigo-300">Cảnh giới:</strong> {selectedNpc.realm || "Không rõ"}</p>
                {selectedNpc.level !== undefined && <p><strong className="text-indigo-300">Cấp độ:</strong> {String(selectedNpc.level)}</p>}
                {selectedNpc.description && selectedNpc.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedNpc.description}</p>}
                {selectedNpc.personalityTraits && selectedNpc.personalityTraits.length > 0 && <p><strong className="text-indigo-300">Tính cách:</strong> {selectedNpc.personalityTraits.join(', ')}</p>}
                <p><strong className="text-indigo-300">Thiện cảm:</strong> {String(selectedNpc.affinity)}</p>
                {selectedNpc.factionId && <p><strong className="text-indigo-300">Phe phái:</strong> {knowledgeBase.discoveredFactions.find(f => f.id === selectedNpc.factionId)?.name || selectedNpc.factionId}</p>}

                {selectedNpc.realm === "Không rõ" ? (
                    <div>
                        <p><strong className="text-indigo-300">Sinh Lực:</strong> Không rõ</p>
                        <p><strong className="text-indigo-300">Linh Lực:</strong> Không rõ</p>
                        <p><strong className="text-indigo-300">Sức Tấn Công:</strong> Không rõ</p>
                    </div>
                ) : selectedNpc.stats && (
                    <div><strong className="text-indigo-300">Chỉ số:</strong><ul className="list-disc list-inside pl-4 text-xs">
                        {selectedNpc.stats.sinhLuc !== undefined && <li>Sinh Lực: {String(selectedNpc.stats.sinhLuc)} / {String(selectedNpc.stats.maxSinhLuc || selectedNpc.stats.sinhLuc)}</li>}
                        {selectedNpc.stats.linhLuc !== undefined && <li>Linh Lực: {String(selectedNpc.stats.linhLuc)} / {String(selectedNpc.stats.maxLinhLuc || selectedNpc.stats.linhLuc)}</li>}
                        {selectedNpc.stats.sucTanCong !== undefined && <li>Sức Tấn Công: {String(selectedNpc.stats.sucTanCong)}</li>}
                    </ul></div>
                )}
                {selectedNpc.isEssential && <p><strong className="text-indigo-300">Là nhân vật quan trọng:</strong> Có</p>}
                {selectedNpc.locationId && <p><strong className="text-indigo-300">Vị trí hiện tại:</strong> {knowledgeBase.discoveredLocations.find(l=>l.id === selectedNpc.locationId)?.name || selectedNpc.locationId}</p>}
            </>)}
            {selectedLocation && (<>
                <p><strong className="text-indigo-300">Tên:</strong> {selectedLocation.name}</p>
                {selectedLocation.description && selectedLocation.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedLocation.description}</p>}
                {selectedLocation.regionId && <p><strong className="text-indigo-300">Vùng:</strong> {selectedLocation.regionId}</p>}
                <p><strong className="text-indigo-300">Khu vực an toàn:</strong> {selectedLocation.isSafeZone ? "Có" : "Không"}</p>
                {selectedLocation.environmentalEffects && selectedLocation.environmentalEffects.length > 0 && <p><strong className="text-indigo-300">Hiệu ứng môi trường:</strong> {selectedLocation.environmentalEffects.join(', ')}</p>}
                {selectedLocation.requiredLevel !== undefined && <p><strong className="text-indigo-300">Yêu cầu cấp độ vào:</strong> {String(selectedLocation.requiredLevel)}</p>}
                {selectedLocation.requiredQuestIdForEntry && <p><strong className="text-indigo-300">Yêu cầu nhiệm vụ ID để vào:</strong> {selectedLocation.requiredQuestIdForEntry}</p>}
                {selectedLocation.discoverableNPCIds && selectedLocation.discoverableNPCIds.length > 0 && <p><strong className="text-indigo-300">NPC có thể gặp:</strong> {selectedLocation.discoverableNPCIds.map(id => knowledgeBase.discoveredNPCs.find(n=>n.id===id)?.name || id).join(', ')}</p>}
            </>)}
            {selectedFaction && (<>
                <p><strong className="text-indigo-300">Tên Phe Phái:</strong> {selectedFaction.name}</p>
                {selectedFaction.description && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedFaction.description}</p>}
                <p><strong className="text-indigo-300">Chính tà:</strong> {selectedFaction.alignment}</p>
                <p><strong className="text-indigo-300">Uy tín người chơi:</strong> {String(selectedFaction.playerReputation)}</p>
                {selectedFaction.leaderNPCId && <p><strong className="text-indigo-300">Lãnh đạo:</strong> {knowledgeBase.discoveredNPCs.find(n => n.id === selectedFaction.leaderNPCId)?.name || selectedFaction.leaderNPCId}</p>}
                {selectedFaction.baseLocationId && <p><strong className="text-indigo-300">Trụ sở:</strong> {knowledgeBase.discoveredLocations.find(l => l.id === selectedFaction.baseLocationId)?.name || selectedFaction.baseLocationId}</p>}
                {selectedFaction.alliedFactionIds && selectedFaction.alliedFactionIds.length > 0 && <p><strong className="text-indigo-300">Đồng minh:</strong> {selectedFaction.alliedFactionIds.map(id => knowledgeBase.discoveredFactions.find(f=>f.id===id)?.name || id).join(', ')}</p>}
                {selectedFaction.enemyFactionIds && selectedFaction.enemyFactionIds.length > 0 && <p><strong className="text-indigo-300">Kẻ địch:</strong> {selectedFaction.enemyFactionIds.map(id => knowledgeBase.discoveredFactions.find(f=>f.id===id)?.name || id).join(', ')}</p>}
            </>)}
            {selectedLore && (<>
                <p><strong className="text-indigo-300">Tiêu đề:</strong> {selectedLore.title}</p>
                {selectedLore.content && selectedLore.content.trim() && <p className="whitespace-pre-wrap"><strong className="text-indigo-300">Nội dung:</strong> {selectedLore.content}</p>}
            </>)}
            {selectedCompanion && (<>
                <p><strong className="text-indigo-300">Tên:</strong> {selectedCompanion.name}</p>
                {selectedCompanion.description && selectedCompanion.description.trim() && <p><strong className="text-indigo-300">Mô tả:</strong> {selectedCompanion.description}</p>}
                <p><strong className="text-indigo-300">HP:</strong> {String(selectedCompanion.hp)} / {String(selectedCompanion.maxHp)}</p>
                <p><strong className="text-indigo-300">Mana:</strong> {String(selectedCompanion.mana)} / {String(selectedCompanion.maxMana)}</p>
                <p><strong className="text-indigo-300">ATK:</strong> {String(selectedCompanion.atk)}</p>
            </>)}
        </div>
      </Modal>

      {/* MiniInfoPopover for keyword hover details */}
      <MiniInfoPopover isOpen={miniInfoPopover.isOpen} targetRect={miniInfoPopover.targetRect} entity={miniInfoPopover.entity} entityType={miniInfoPopover.entityType} onClose={() => setMiniInfoPopover(prev => ({ ...prev, isOpen: false }))} knowledgeBase={knowledgeBase} />
      {/* Debug Panel (conditionally rendered) */}
      {showDebugPanel && <DebugPanelDisplay kb={knowledgeBase} sentPromptsLog={sentPromptsLog} rawAiResponsesLog={rawAiResponsesLog} latestPromptTokenCount={latestPromptTokenCount} summarizationResponsesLog={summarizationResponsesLog} sentCraftingPromptsLog={sentCraftingPromptsLog} receivedCraftingResponsesLog={receivedCraftingResponsesLog} sentNpcAvatarPromptsLog={sentNpcAvatarPromptsLog} currentPageDisplay={currentPageDisplay} totalPages={totalPages} isAutoPlaying={isAutoPlaying} onToggleAutoPlay={onToggleAutoPlay} />}
      {/* Style Settings Modal (conditionally rendered) */}
      {isStyleSettingsModalOpen && <StyleSettingsModal initialSettings={styleSettings} onSave={(newSettings) => { onUpdateStyleSettings(newSettings); setIsStyleSettingsModalOpen(false); }} onClose={() => setIsStyleSettingsModalOpen(false)} />}
    </div>
  );
};

export default GameplayScreen;
