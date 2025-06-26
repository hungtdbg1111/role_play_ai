
import { useState, useCallback } from 'react';
import { KnowledgeBase, GameMessage, WorldSettings, PlayerActionInputType, ResponseLength, GameScreen, RealmBaseStatDefinition, TurnHistoryEntry } from '../types';
import { INITIAL_KNOWLEDGE_BASE, APP_VERSION, DEFAULT_PLAYER_STATS, DEFAULT_TIERED_STATS, TURNS_PER_PAGE, MAX_TURN_HISTORY_LENGTH, AUTO_SAVE_INTERVAL_TURNS, MAX_AUTO_SAVE_SLOTS, VIETNAMESE, SUB_REALM_NAMES } from '../constants';
import { generateInitialStory, generateNextTurn, summarizeTurnHistory, countTokens, getApiSettings as getGeminiApiSettings } from '../services/geminiService';
import { performTagProcessing, calculateRealmBaseStats, addTurnHistoryEntryRaw, getMessagesForPage, calculateEffectiveStats } from '../utils/gameLogicUtils'; // Changed addTurnHistoryEntry to addTurnHistoryEntryRaw

interface UseGameActionsProps {
  knowledgeBase: KnowledgeBase;
  setKnowledgeBase: React.Dispatch<React.SetStateAction<KnowledgeBase>>;
  gameMessages: GameMessage[];
  addMessageAndUpdateState: (newMessages: GameMessage[], newKnowledgeBase: KnowledgeBase, callback?: () => void) => void;
  setRawAiResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  setSentPromptsLog: React.Dispatch<React.SetStateAction<string[]>>;
  setLatestPromptTokenCount: React.Dispatch<React.SetStateAction<number | null | string>>;
  setSummarizationResponsesLog: React.Dispatch<React.SetStateAction<string[]>>;
  showNotification: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setCurrentScreen: (screen: GameScreen) => void;
  currentPageDisplay: number;
  setCurrentPageDisplay: React.Dispatch<React.SetStateAction<number>>;
  isAutoPlaying: boolean;
  setIsAutoPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  executeSaveGame: (kbToSave: KnowledgeBase, messagesToSave: GameMessage[], saveName: string, existingId: string | null, isAuto: boolean) => Promise<string | null>;
  storageType: string; 
  firebaseUser: null; // FirebaseUser replaced with null
  logNpcAvatarPromptCallback: (prompt: string) => void; 
}

export const useGameActions = ({
  knowledgeBase,
  setKnowledgeBase, 
  gameMessages,
  addMessageAndUpdateState,
  setRawAiResponsesLog,
  setSentPromptsLog,
  setLatestPromptTokenCount,
  setSummarizationResponsesLog,
  showNotification,
  setCurrentScreen,
  currentPageDisplay,
  setCurrentPageDisplay,
  isAutoPlaying,
  setIsAutoPlaying,
  executeSaveGame,
  storageType,
  firebaseUser,
  logNpcAvatarPromptCallback, 
}: UseGameActionsProps) => {
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false);

  const logSentPromptCallback = useCallback((prompt: string) => {
    setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10));
    const { model: currentModel } = getGeminiApiSettings();
    if (currentModel === 'gemini-2.5-flash-preview-04-17' || !currentModel.startsWith('gemini-1.5-flash')) { 
      setLatestPromptTokenCount('Đang tính...');
      countTokens(prompt)
        .then(count => setLatestPromptTokenCount(count))
        .catch(err => {
          console.warn("Could not count tokens for prompt:", err);
          setLatestPromptTokenCount('Lỗi');
        });
    } else {
       setLatestPromptTokenCount('N/A (model)');
    }
  }, [setSentPromptsLog, setLatestPromptTokenCount]);

  const logSummarizationResponseCallback = useCallback((response: string) => {
    setSummarizationResponsesLog(prev => [response, ...prev].slice(0, 10));
  }, [setSummarizationResponsesLog]);

  const handleSetupComplete = useCallback(async (settings: WorldSettings, dataForKbPlayerAvatar?: string | null) => { 
    setIsLoadingApi(true);
    setApiError(null);
    
    const realmProgression = settings.heThongCanhGioi.split(' - ').map(s => s.trim()).filter(Boolean);
    const initialRealm = settings.canhGioiKhoiDau;
    
    const generatedBaseStats: Record<string, RealmBaseStatDefinition> = {};
    realmProgression.forEach((realmName, index) => {
        generatedBaseStats[realmName] = DEFAULT_TIERED_STATS[Math.min(index, DEFAULT_TIERED_STATS.length - 1)];
    });
    
    const initialCalculatedStats = calculateRealmBaseStats(initialRealm, realmProgression, generatedBaseStats);
    
    const worldConfigForKb = { ...settings }; 

    let minimalInitialKB: KnowledgeBase = {
      ...INITIAL_KNOWLEDGE_BASE, 
      playerStats: {
        ...DEFAULT_PLAYER_STATS, 
        realm: initialRealm, 
        ...initialCalculatedStats, 
        sinhLuc: initialCalculatedStats.baseMaxSinhLuc || DEFAULT_PLAYER_STATS.maxSinhLuc,
        linhLuc: initialCalculatedStats.baseMaxLinhLuc || DEFAULT_PLAYER_STATS.maxLinhLuc,
        kinhNghiem: 0,
        turn: 0, // Turn is 0 before the first AI response generates turn 1 content
        hieuUngBinhCanh: false,
        activeStatusEffects: [], 
      },
      realmProgressionList: realmProgression,
      currentRealmBaseStats: generatedBaseStats,
      worldConfig: worldConfigForKb, 
      appVersion: APP_VERSION,
      pageSummaries: {},
      currentPageHistory: [1], // Initial page starts at turn 1 (after AI gen)
      lastSummarizedTurn: 0,
      turnHistory: [], // Starts empty
      autoSaveTurnCounter: 0,
      currentAutoSaveSlotIndex: 0,
      autoSaveSlotIds: Array(MAX_AUTO_SAVE_SLOTS).fill(null),
      manualSaveId: null,
      manualSaveName: settings.saveGameName || VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", settings.playerName || "Tân Đạo Hữu"),
      playerAvatarData: dataForKbPlayerAvatar || settings.playerAvatarUrl || undefined, 
    };
    
    // History entry for "before turn 1" (initial state)
    minimalInitialKB.turnHistory = addTurnHistoryEntryRaw(
        [], // No previous history
        JSON.parse(JSON.stringify(minimalInitialKB)), // Snapshot of the very initial KB
        []  // No messages before the game starts
    );

    setKnowledgeBase(minimalInitialKB); 
    setCurrentPageDisplay(1);
    setCurrentScreen(GameScreen.Gameplay); 

    try {
      const {response, rawText} = await generateInitialStory(minimalInitialKB.worldConfig!, logSentPromptCallback); 
      setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
      
      let workingKbForProcessing = JSON.parse(JSON.stringify(minimalInitialKB));
       // The turn for the first AI-generated content is 1.
      // Tags in initial story should modify this "turn 1" state.
      const { 
        newKb: kbAfterTags, 
        turnIncrementedByTag, // This should ideally not happen or be handled carefully for turn 1
        systemMessagesFromTags: systemMessagesFromInitialTags, 
        realmChangedByTag: realmChangedByInitTag 
      } = await performTagProcessing(workingKbForProcessing, response.tags, 1, setKnowledgeBase, logNpcAvatarPromptCallback); 
      
      let finalKbForDisplay = kbAfterTags;
      let turnForInitialMessages = 1;

      // Ensure turn is at least 1 after initial tags.
      if (finalKbForDisplay.playerStats.turn < 1) {
          finalKbForDisplay.playerStats.turn = 1;
      }
      turnForInitialMessages = finalKbForDisplay.playerStats.turn;
      
      if (realmChangedByInitTag) {
          const reCalculatedStats = calculateRealmBaseStats(finalKbForDisplay.playerStats.realm, finalKbForDisplay.realmProgressionList, finalKbForDisplay.currentRealmBaseStats);
          finalKbForDisplay.playerStats = { ...finalKbForDisplay.playerStats, ...reCalculatedStats };
          finalKbForDisplay.playerStats.sinhLuc = finalKbForDisplay.playerStats.maxSinhLuc;
          finalKbForDisplay.playerStats.linhLuc = finalKbForDisplay.playerStats.maxLinhLuc;
          finalKbForDisplay.playerStats.kinhNghiem = Math.min(finalKbForDisplay.playerStats.kinhNghiem, finalKbForDisplay.playerStats.maxKinhNghiem);
      } else {
          finalKbForDisplay.playerStats.sinhLuc = initialCalculatedStats.baseMaxSinhLuc || finalKbForDisplay.playerStats.maxSinhLuc;
          finalKbForDisplay.playerStats.linhLuc = initialCalculatedStats.baseMaxLinhLuc || finalKbForDisplay.playerStats.maxLinhLuc;
      }
      
      // currentPageHistory should correctly point to the start turn of the first page.
      finalKbForDisplay.currentPageHistory = [turnForInitialMessages];
      finalKbForDisplay.playerStats = calculateEffectiveStats(finalKbForDisplay.playerStats, finalKbForDisplay.equippedItems, finalKbForDisplay.inventory);
      
      const newMessages: GameMessage[] = [];
      newMessages.push({
        id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration, 
        timestamp: Date.now(), choices: response.choices, turnNumber: turnForInitialMessages
      });
      if (response.systemMessage) {
        newMessages.push({
          id: Date.now().toString() + Math.random(), type: 'system', content: response.systemMessage, 
          timestamp: Date.now(), turnNumber: turnForInitialMessages
        });
      }
      newMessages.push(...systemMessagesFromInitialTags.map(m => ({...m, turnNumber: turnForInitialMessages })));
      
      addMessageAndUpdateState(newMessages, finalKbForDisplay);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setApiError(errorMsg);
      showNotification(errorMsg, 'error');
      console.error(err);
    } finally {
        setIsLoadingApi(false);
    }
  }, [
    setKnowledgeBase,
    setCurrentPageDisplay,
    setCurrentScreen,
    addMessageAndUpdateState, 
    logSentPromptCallback, 
    setRawAiResponsesLog, 
    showNotification,
    setApiError,
    setIsLoadingApi,
    logNpcAvatarPromptCallback, 
  ]);

  const handlePlayerAction = useCallback(async (
    action: string, 
    isChoice: boolean,
    inputType: PlayerActionInputType,
    responseLength: ResponseLength
  ) => {
    setIsLoadingApi(true);
    setApiError(null);
    
    // State AT THE START of this turn's processing cycle
    const knowledgeBaseAtActionStart = JSON.parse(JSON.stringify(knowledgeBase));
    const gameMessagesAtActionStart = [...gameMessages];
    // turnOfPlayerAction is the turn number that is *about to be processed*.
    // If playerStats.turn is 0 (start of game), this action is for turn 1.
    // If playerStats.turn is N, this action is for turn N+1.
    // The AI response and tags will apply to this upcoming turn.
    const turnOfPlayerAction = knowledgeBase.playerStats.turn + 1;


    const playerActionMessage: GameMessage = {
      id: Date.now().toString() + Math.random(),
      type: 'player_action',
      content: action,
      timestamp: Date.now(),
      isPlayerInput: true,
      turnNumber: turnOfPlayerAction // Player action belongs to the turn being processed
    };
    
    const messagesForCurrentPagePrompt = getMessagesForPage(currentPageDisplay, knowledgeBase, [...gameMessages, playerActionMessage]);
    let currentPageMessagesLog = messagesForCurrentPagePrompt
        .map(msg => {
            let prefix = "";
            if (msg.type === 'player_action') prefix = `${knowledgeBase.worldConfig?.playerName || 'Người chơi'} ${msg.isPlayerInput ? 'đã làm' : 'đã chọn'}: `;
            else if (msg.type === 'narration') prefix = "AI kể: ";
            else if (msg.type === 'system' && !msg.content.includes("Tóm tắt") && !msg.content.includes("trang")) prefix = "Hệ thống: ";
            return prefix + msg.content;
        })
        .join("\n---\n");

    const previousPageNumbers = knowledgeBase.currentPageHistory?.slice(0, -1) || [];
    const previousPageSummariesContent: string[] = previousPageNumbers
        .map((_, index) => knowledgeBase.pageSummaries?.[index + 1])
        .filter((summary): summary is string => !!summary);
    
    const lastPageNumberForPrompt = (knowledgeBase.currentPageHistory?.length || 1) -1;
    let lastNarrationFromPreviousPage: string | undefined = undefined;
    if (lastPageNumberForPrompt > 0 && currentPageDisplay > lastPageNumberForPrompt) { 
        const messagesOfLastSummarizedPagePrompt = getMessagesForPage(lastPageNumberForPrompt, knowledgeBase, gameMessages);
        lastNarrationFromPreviousPage = [...messagesOfLastSummarizedPagePrompt].reverse().find(msg => msg.type === 'narration')?.content;
    }

    try {
        const { response, rawText } = await generateNextTurn(
            knowledgeBase, // Pass KB at start of turn N
            action,
            inputType,
            responseLength,
            currentPageMessagesLog,
            previousPageSummariesContent,
            lastNarrationFromPreviousPage,
            logSentPromptCallback
        );
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
        
        // Start with KB from beginning of turn, then apply changes
        let currentTurnKb = JSON.parse(JSON.stringify(knowledgeBaseAtActionStart));

        const { 
            newKb: kbAfterTags, 
            turnIncrementedByTag, 
            systemMessagesFromTags, 
            realmChangedByTag, 
            removedBinhCanhViaTag 
        } = await performTagProcessing(currentTurnKb, response.tags, turnOfPlayerAction, setKnowledgeBase, logNpcAvatarPromptCallback); 
        
        currentTurnKb = kbAfterTags;
        let manualTurnIncrementMessage: GameMessage | null = null;
        
        const systemMessagesForThisTurn = [...systemMessagesFromTags];
        const oldRealmBeforeAnyProcessingThisTurn = knowledgeBaseAtActionStart.playerStats.realm; 
        let realmChangedThisTurnProcess = realmChangedByTag; 

        // Ensure playerStats.turn is correctly set to the turn number that was just processed
        // If tags modified turn, respect it, otherwise increment.
        if (turnIncrementedByTag) {
            if (currentTurnKb.playerStats.turn < turnOfPlayerAction) {
                // This case implies a tag tried to decrement turn or set it too low.
                // We should ensure it's at least the current turn being processed.
                currentTurnKb.playerStats.turn = turnOfPlayerAction;
                manualTurnIncrementMessage = {
                    id: 'manual-fix-turn-' + Date.now(), type: 'system', 
                    content: `Hệ thống: Lượt chơi đã được điều chỉnh thành ${currentTurnKb.playerStats.turn} (do AI tag không hợp lệ).`, 
                    timestamp: Date.now(), turnNumber: turnOfPlayerAction 
                };
            }
        } else {
            // If no tag modified the turn, this turn's processing (turnOfPlayerAction) is now complete.
            currentTurnKb.playerStats.turn = turnOfPlayerAction;
        }
        
        const effectsToExpire: string[] = [];
        if (currentTurnKb.playerStats.activeStatusEffects) {
            currentTurnKb.playerStats.activeStatusEffects = currentTurnKb.playerStats.activeStatusEffects
                .map(effect => {
                    if (effect.durationTurns > 0) {
                        effect.durationTurns -= 1;
                        if (effect.durationTurns === 0) {
                            effectsToExpire.push(effect.name);
                        }
                    }
                    return effect;
                })
                .filter(effect => effect.durationTurns !== 0); 
            
            effectsToExpire.forEach(effectName => {
                systemMessagesForThisTurn.push({
                    id: `status-effect-expired-${effectName}-${Date.now()}`, type: 'system',
                    content: VIETNAMESE.statusEffectRemoved(effectName),
                    timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn 
                });
            });
        }
        currentTurnKb.playerStats = calculateEffectiveStats(currentTurnKb.playerStats, currentTurnKb.equippedItems, currentTurnKb.inventory);

        const realmStringToParseForBottleneck = currentTurnKb.playerStats.realm;
        let mainRealmForBottleneck = "";
        let subRealmForBottleneck = "";
        const sortedMainRealmsForBottleneck = [...currentTurnKb.realmProgressionList].sort((a, b) => b.length - a.length);
        for (const potentialMainRealm of sortedMainRealmsForBottleneck) {
            if (realmStringToParseForBottleneck.startsWith(potentialMainRealm)) {
                const remaining = realmStringToParseForBottleneck.substring(potentialMainRealm.length).trim();
                if (SUB_REALM_NAMES.includes(remaining)) {
                    mainRealmForBottleneck = potentialMainRealm;
                    subRealmForBottleneck = remaining;
                    break;
                }
            }
        }
        
        if (subRealmForBottleneck === SUB_REALM_NAMES[SUB_REALM_NAMES.length - 1] && 
            currentTurnKb.playerStats.kinhNghiem >= currentTurnKb.playerStats.maxKinhNghiem &&
            !currentTurnKb.playerStats.hieuUngBinhCanh && 
            !removedBinhCanhViaTag 
        ) {
            currentTurnKb.playerStats.hieuUngBinhCanh = true;
            systemMessagesForThisTurn.push({
                id: 'binh-canh-applied-client-' + Date.now(), type: 'system',
                content: `Bạn đã đạt đến ${currentTurnKb.playerStats.realm}! ${VIETNAMESE.bottleneckNotification}`,
                timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn 
            });
        }
        
        const realmAtStartOfXPLoop = currentTurnKb.playerStats.realm;
        let realmAfterXPLoop = realmAtStartOfXPLoop;

        while (
            currentTurnKb.playerStats.kinhNghiem >= currentTurnKb.playerStats.maxKinhNghiem &&
            !currentTurnKb.playerStats.hieuUngBinhCanh
        ) {
            const realmBeforeThisSubLevelUp = currentTurnKb.playerStats.realm;
            const expRequiredForThisLevelUp = currentTurnKb.playerStats.maxKinhNghiem;

            currentTurnKb.playerStats.kinhNghiem -= expRequiredForThisLevelUp;

            let currentMainRealmName = "";
            let currentSubRealmName = "";
            const sortedMainRealmListForLevelUp = [...currentTurnKb.realmProgressionList].sort((a, b) => b.length - a.length);
            for (const potentialMainRealm of sortedMainRealmListForLevelUp) {
                if (realmBeforeThisSubLevelUp.startsWith(potentialMainRealm)) {
                    const remainingPart = realmBeforeThisSubLevelUp.substring(potentialMainRealm.length).trim();
                    if (SUB_REALM_NAMES.includes(remainingPart)) {
                        currentMainRealmName = potentialMainRealm;
                        currentSubRealmName = remainingPart;
                        break;
                    }
                }
            }

            if (!currentMainRealmName || !currentSubRealmName) {
                currentTurnKb.playerStats.kinhNghiem += expRequiredForThisLevelUp; 
                console.error(`[LEVEL_UP_LOGIC] Invalid realm string for level up: "${realmBeforeThisSubLevelUp}". Could not determine main/sub realm.`);
                systemMessagesForThisTurn.push({ 
                    id: 'level-up-parse-error-' + Date.now(), type: 'system',
                    content: `Lỗi hệ thống: Không thể phân tích cảnh giới "${realmBeforeThisSubLevelUp}" để lên cấp.`,
                    timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn
                });
                break;
            }

            const currentSubRealmIndex = SUB_REALM_NAMES.indexOf(currentSubRealmName);
            const currentMainRealmIndex = currentTurnKb.realmProgressionList.indexOf(currentMainRealmName);

            if (currentSubRealmIndex === -1 || currentMainRealmIndex === -1) {
                currentTurnKb.playerStats.kinhNghiem += expRequiredForThisLevelUp;
                console.error(`[LEVEL_UP_LOGIC] Invalid realm components during level up. Parsed Main: "${currentMainRealmName}" (Index: ${currentMainRealmIndex}), Parsed Sub: "${currentSubRealmName}" (Index: ${currentSubRealmIndex}) from "${realmBeforeThisSubLevelUp}"`);
                systemMessagesForThisTurn.push({ 
                    id: 'level-up-component-error-' + Date.now(), type: 'system',
                    content: `Lỗi hệ thống: Thành phần cảnh giới không hợp lệ khi lên cấp từ "${realmBeforeThisSubLevelUp}".`,
                    timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn
                });
                break; 
            }
            
            let nextRealmString;
            if (currentSubRealmIndex < SUB_REALM_NAMES.length - 1) {
                nextRealmString = `${currentMainRealmName} ${SUB_REALM_NAMES[currentSubRealmIndex + 1]}`;
            } else {
                if (currentMainRealmIndex < currentTurnKb.realmProgressionList.length - 1) {
                    const nextMainRealmName = currentTurnKb.realmProgressionList[currentMainRealmIndex + 1];
                    nextRealmString = `${nextMainRealmName} ${SUB_REALM_NAMES[0]}`;
                } else {
                    currentTurnKb.playerStats.kinhNghiem += expRequiredForThisLevelUp; 
                    currentTurnKb.playerStats.kinhNghiem = Math.min(currentTurnKb.playerStats.kinhNghiem, currentTurnKb.playerStats.maxKinhNghiem); 
                    break;
                }
            }
            
            currentTurnKb.playerStats.realm = nextRealmString;
            
            const tempCurrentHP = currentTurnKb.playerStats.sinhLuc;
            const tempCurrentMP = currentTurnKb.playerStats.linhLuc;

            const newStatsForThisLevel = calculateRealmBaseStats(
                currentTurnKb.playerStats.realm,
                currentTurnKb.realmProgressionList,
                currentTurnKb.currentRealmBaseStats
            );
            currentTurnKb.playerStats = {
                ...currentTurnKb.playerStats,
                ...newStatsForThisLevel
            };
            
            const oldMainNameForSubLevel = realmBeforeThisSubLevelUp.substring(0, realmBeforeThisSubLevelUp.lastIndexOf(" ") > -1 ? realmBeforeThisSubLevelUp.lastIndexOf(" ") : undefined);
            const newMainNameForSubLevel = currentTurnKb.playerStats.realm.substring(0, currentTurnKb.playerStats.realm.lastIndexOf(" ") > -1 ? currentTurnKb.playerStats.realm.lastIndexOf(" ") : undefined);

            if (oldMainNameForSubLevel !== newMainNameForSubLevel && oldMainNameForSubLevel && newMainNameForSubLevel) {
                currentTurnKb.playerStats.sinhLuc = currentTurnKb.playerStats.maxSinhLuc;
                currentTurnKb.playerStats.linhLuc = currentTurnKb.playerStats.maxLinhLuc;
            } else {
                currentTurnKb.playerStats.sinhLuc = Math.min(tempCurrentHP, currentTurnKb.playerStats.maxSinhLuc);
                currentTurnKb.playerStats.linhLuc = Math.min(tempCurrentMP, currentTurnKb.playerStats.maxLinhLuc);
            }
            
            realmAfterXPLoop = currentTurnKb.playerStats.realm;
            realmChangedThisTurnProcess = true; 
        }
        
        if (realmAtStartOfXPLoop !== realmAfterXPLoop) { 
            systemMessagesForThisTurn.push({
                id: 'breakthrough-notify-xp-' + Date.now(), type: 'system',
                content: `Chúc mừng ${currentTurnKb.worldConfig?.playerName || 'bạn'} đã đột phá thành công từ ${realmAtStartOfXPLoop} lên ${realmAfterXPLoop}!`,
                timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn
            });
            const finalOldMainName = realmAtStartOfXPLoop.substring(0, realmAtStartOfXPLoop.lastIndexOf(" ") > -1 ? realmAtStartOfXPLoop.lastIndexOf(" ") : undefined);
            const finalNewMainName = realmAfterXPLoop.substring(0, realmAfterXPLoop.lastIndexOf(" ") > -1 ? realmAfterXPLoop.lastIndexOf(" ") : undefined);
            if (finalOldMainName !== finalNewMainName && finalOldMainName && finalNewMainName) {
                systemMessagesForThisTurn.push({
                    id: 'realm-breakthrough-heal-final-' + Date.now(), type: 'system',
                    content: `Đột phá đại cảnh giới, sinh lực và linh lực hoàn toàn hồi phục!`,
                    timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn
                });
            }
        }
        
        if (realmChangedThisTurnProcess) {
            currentTurnKb.playerStats.kinhNghiem = Math.min(currentTurnKb.playerStats.kinhNghiem, currentTurnKb.playerStats.maxKinhNghiem);
            currentTurnKb.playerStats.sinhLuc = Math.min(currentTurnKb.playerStats.sinhLuc, currentTurnKb.playerStats.maxSinhLuc);
            currentTurnKb.playerStats.linhLuc = Math.min(currentTurnKb.playerStats.linhLuc, currentTurnKb.playerStats.maxLinhLuc);
        }

        currentTurnKb.playerStats.sinhLuc = Math.max(0, Math.min(currentTurnKb.playerStats.sinhLuc, currentTurnKb.playerStats.maxSinhLuc));
        currentTurnKb.playerStats.linhLuc = Math.max(0, Math.min(currentTurnKb.playerStats.linhLuc, currentTurnKb.playerStats.maxLinhLuc));
        currentTurnKb.playerStats.kinhNghiem = Math.max(0, currentTurnKb.playerStats.kinhNghiem);

        if (currentTurnKb.playerStats.hieuUngBinhCanh) {
           currentTurnKb.playerStats.kinhNghiem = Math.min(currentTurnKb.playerStats.kinhNghiem, Math.max(0, currentTurnKb.playerStats.maxKinhNghiem -1) );
        }
        currentTurnKb.playerStats = calculateEffectiveStats(currentTurnKb.playerStats, currentTurnKb.equippedItems, currentTurnKb.inventory);

        // Add history entry using state AT THE START of this turn's processing
        currentTurnKb.turnHistory = addTurnHistoryEntryRaw(
            knowledgeBaseAtActionStart.turnHistory || [], // History from KB at start of this turn
            knowledgeBaseAtActionStart,                   // Snapshot of KB at start of this turn
            gameMessagesAtActionStart                     // Snapshot of Msgs at start of this turn
        );

        currentTurnKb.autoSaveTurnCounter = (currentTurnKb.autoSaveTurnCounter + 1);
        if (currentTurnKb.autoSaveTurnCounter >= AUTO_SAVE_INTERVAL_TURNS) {
            currentTurnKb.autoSaveTurnCounter = 0;
            const autoSaveSlot = currentTurnKb.currentAutoSaveSlotIndex;
            const autoSaveName = `Auto Save Slot ${autoSaveSlot + 1}`;
            const existingAutoSaveId = currentTurnKb.autoSaveSlotIds[autoSaveSlot];
            // For auto-save, we save the *final* state of this turn.
            const kbForAutoSave = JSON.parse(JSON.stringify(currentTurnKb));
            // Messages for auto-save should include this turn's messages
            const messagesForAutoSave = [...gameMessagesAtActionStart, playerActionMessage, ...systemMessagesForThisTurn];
             if (response.narration) {
                messagesForAutoSave.push({
                    id: `narration-autosave-${Date.now()}`, type: 'narration', content: response.narration,
                    timestamp: Date.now(), choices: response.choices, turnNumber: currentTurnKb.playerStats.turn
                });
            }
            if (response.systemMessage) {
                messagesForAutoSave.push({
                    id: `sysmsg-autosave-${Date.now()}`, type: 'system', content: response.systemMessage,
                    timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn
                });
            }


            executeSaveGame(kbForAutoSave, messagesForAutoSave, autoSaveName, existingAutoSaveId, true)
                .then(savedId => {
                    if (savedId) {
                        // This needs to update the main KB, not a stale copy.
                        setKnowledgeBase(prevKb => { 
                            const newKbWithAutoSaveId = JSON.parse(JSON.stringify(prevKb));
                            newKbWithAutoSaveId.autoSaveSlotIds[autoSaveSlot] = savedId;
                            newKbWithAutoSaveId.currentAutoSaveSlotIndex = (autoSaveSlot + 1) % MAX_AUTO_SAVE_SLOTS;
                            return newKbWithAutoSaveId;
                        });
                    }
                });
        }

        const newMessagesForThisCycle: GameMessage[] = [playerActionMessage];
        newMessagesForThisCycle.push({
            id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration,
            timestamp: Date.now(), choices: response.choices, turnNumber: currentTurnKb.playerStats.turn 
        });
        if (response.systemMessage) {
          newMessagesForThisCycle.push({
            id: Date.now().toString() + Math.random(), type: 'system', content: response.systemMessage,
            timestamp: Date.now(), turnNumber: currentTurnKb.playerStats.turn
          });
        }
        systemMessagesForThisTurn.forEach(msg => msg.turnNumber = currentTurnKb.playerStats.turn);
        newMessagesForThisCycle.push(...systemMessagesForThisTurn); 

        if (manualTurnIncrementMessage) { 
            manualTurnIncrementMessage.turnNumber = currentTurnKb.playerStats.turn;
            newMessagesForThisCycle.push(manualTurnIncrementMessage);
        }
        
        const finalKbStateForThisTurn = currentTurnKb; 
        const turnCompleted = finalKbStateForThisTurn.playerStats.turn; 
        const shouldSummarizeAndPaginateNow = 
            turnCompleted > 0 &&
            turnCompleted % TURNS_PER_PAGE === 0 &&
            turnCompleted > (finalKbStateForThisTurn.lastSummarizedTurn || 0);

        if (shouldSummarizeAndPaginateNow) {
            const pageToSummarize = turnCompleted / TURNS_PER_PAGE;
            if (!finalKbStateForThisTurn.pageSummaries?.[pageToSummarize]) { 
                setIsSummarizingNextPageTransition(true);
                newMessagesForThisCycle.push({
                     id: 'summarizing-notice-' + Date.now(), type: 'system', 
                     content: VIETNAMESE.summarizingAndPreparingNextPage, 
                     timestamp: Date.now(), turnNumber: turnCompleted
                });
                const startTurnOfSummaryPageActual = (pageToSummarize - 1) * TURNS_PER_PAGE + 1;
                const endTurnOfSummaryPageActual = turnCompleted;
                // Messages for summary should be up to and including the current turn's generated messages
                const allMessagesForSummaryCalc = [...gameMessagesAtActionStart, ...newMessagesForThisCycle];
                const actualMessagesToSummarize = allMessagesForSummaryCalc.filter(
                    msg => msg.turnNumber >= startTurnOfSummaryPageActual && msg.turnNumber <= endTurnOfSummaryPageActual
                );
                
                if (actualMessagesToSummarize.length > 0) {
                    try {
                        const summaryResult = await summarizeTurnHistory(
                            actualMessagesToSummarize,
                            finalKbStateForThisTurn.worldConfig?.theme || "Không rõ",
                            finalKbStateForThisTurn.worldConfig?.playerName || "Người chơi",
                            finalKbStateForThisTurn.worldConfig?.genre,
                            finalKbStateForThisTurn.worldConfig?.customGenreName,
                            logSentPromptCallback,
                            logSummarizationResponseCallback
                        );
                        
                        const summary = summaryResult.processedSummary;
                        if (!finalKbStateForThisTurn.pageSummaries) finalKbStateForThisTurn.pageSummaries = {};
                        finalKbStateForThisTurn.pageSummaries[pageToSummarize] = summary;
                        finalKbStateForThisTurn.lastSummarizedTurn = turnCompleted;
                        const nextPageStartTurn = turnCompleted + 1;
                        if (!finalKbStateForThisTurn.currentPageHistory) finalKbStateForThisTurn.currentPageHistory = [1];
                        if (!finalKbStateForThisTurn.currentPageHistory.includes(nextPageStartTurn)) {
                            finalKbStateForThisTurn.currentPageHistory.push(nextPageStartTurn);
                        }
                        newMessagesForThisCycle.push({
                            id: 'page-summary-' + Date.now(), type: 'page_summary',
                            content: `${VIETNAMESE.pageSummaryTitle(pageToSummarize)}: ${summary}`,
                            timestamp: Date.now(), turnNumber: turnCompleted
                        });
                        addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
                            setCurrentPageDisplay(pageToSummarize + 1);
                            setIsSummarizingNextPageTransition(false);
                            setIsLoadingApi(false);
                        });
                        return; 
                    } catch (summaryError) {
                        console.error("Error summarizing page:", summaryError);
                         newMessagesForThisCycle.push({
                            id: 'summary-error-' + Date.now(), type: 'error',
                            content: `Lỗi tóm tắt trang ${pageToSummarize}. Tiếp tục không có tóm tắt.`,
                            timestamp: Date.now(), turnNumber: turnCompleted
                        });
                        const nextPageStartTurn = turnCompleted + 1;
                        if (!finalKbStateForThisTurn.currentPageHistory) finalKbStateForThisTurn.currentPageHistory = [1];
                        if (!finalKbStateForThisTurn.currentPageHistory.includes(nextPageStartTurn)) {
                            finalKbStateForThisTurn.currentPageHistory.push(nextPageStartTurn);
                        }
                        addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
                            setCurrentPageDisplay(pageToSummarize + 1);
                             setIsSummarizingNextPageTransition(false);
                             setIsLoadingApi(false);
                        });
                        return;
                    }
                } else { 
                    if (!finalKbStateForThisTurn.pageSummaries) finalKbStateForThisTurn.pageSummaries = {};
                    finalKbStateForThisTurn.pageSummaries[pageToSummarize] = VIETNAMESE.noContentToSummarize;
                    finalKbStateForThisTurn.lastSummarizedTurn = turnCompleted;
                    const nextPageStartTurn = turnCompleted + 1;
                    if (!finalKbStateForThisTurn.currentPageHistory) finalKbStateForThisTurn.currentPageHistory = [1];
                    if (!finalKbStateForThisTurn.currentPageHistory.includes(nextPageStartTurn)) {
                        finalKbStateForThisTurn.currentPageHistory.push(nextPageStartTurn);
                    }
                     newMessagesForThisCycle.push({
                        id: 'page-summary-empty-' + Date.now(), type: 'page_summary',
                        content: `${VIETNAMESE.pageSummaryTitle(pageToSummarize)}: ${VIETNAMESE.noContentToSummarize}`,
                        timestamp: Date.now(), turnNumber: turnCompleted
                    });
                    addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
                        setCurrentPageDisplay(pageToSummarize + 1);
                        setIsSummarizingNextPageTransition(false);
                        setIsLoadingApi(false);
                    });
                    return;
                }
            }
        }

        addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn);

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setApiError(errorMsg);
        showNotification(errorMsg, 'error');
        console.error(err);
        // Restore KB and messages to the state before this failed action
        setKnowledgeBase(knowledgeBaseAtActionStart);
        // setGameMessages(gameMessagesAtActionStart); // No, keep player action message if desired
        
        if (isAutoPlaying) {
            setIsAutoPlaying(false); 
            showNotification(VIETNAMESE.autoPlayStoppedOnError, 'warning');
        }
    } finally {
        setIsLoadingApi(false);
    }
  }, [
      knowledgeBase, gameMessages, currentPageDisplay, addMessageAndUpdateState, setKnowledgeBase,
      logSentPromptCallback, setRawAiResponsesLog, setApiError, showNotification,
      setCurrentPageDisplay, isAutoPlaying, setIsAutoPlaying, executeSaveGame, storageType, firebaseUser,
      setSummarizationResponsesLog, setIsLoadingApi, logNpcAvatarPromptCallback, 
    ]);
    
  return {
    isLoadingApi,
    setIsLoadingApi, 
    apiError, 
    setApiError, 
    isSummarizingNextPageTransition,
    handleSetupComplete,
    handlePlayerAction,
  };
};
