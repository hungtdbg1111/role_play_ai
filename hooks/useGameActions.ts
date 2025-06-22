
import { useState, useCallback } from 'react';
import { KnowledgeBase, GameMessage, WorldSettings, PlayerActionInputType, ResponseLength, GameScreen, RealmBaseStatDefinition, TurnHistoryEntry } from '../types';
import { INITIAL_KNOWLEDGE_BASE, APP_VERSION, DEFAULT_PLAYER_STATS, DEFAULT_TIERED_STATS, TURNS_PER_PAGE, MAX_TURN_HISTORY_LENGTH, AUTO_SAVE_INTERVAL_TURNS, MAX_AUTO_SAVE_SLOTS, VIETNAMESE, SUB_REALM_NAMES } from '../constants';
import { generateInitialStory, generateNextTurn, summarizeTurnHistory, countTokens, getApiSettings as getGeminiApiSettings } from '../services/geminiService';
import { performTagProcessing, calculateStatsForRealm, addTurnHistoryEntry, getMessagesForPage as getMessagesForPageUtil } from '../utils/gameLogicUtils';

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
  storageType: string; // Assuming storageType is passed down or determined appropriately
  firebaseUser: any; // Assuming firebaseUser is available for cloud saves
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
}: UseGameActionsProps) => {
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false);

  const logSentPromptCallback = useCallback((prompt: string) => {
    setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10));
    const { model: currentModel } = getGeminiApiSettings();
    if (currentModel === 'gemini-1.5-flash') {
      setLatestPromptTokenCount('N/A (model)');
    } else {
      setLatestPromptTokenCount('Đang tính...');
      countTokens(prompt)
        .then(count => setLatestPromptTokenCount(count))
        .catch(err => {
          console.warn("Could not count tokens for prompt:", err);
          setLatestPromptTokenCount('Lỗi');
        });
    }
  }, [setSentPromptsLog, setLatestPromptTokenCount]);

  const logSummarizationResponseCallback = useCallback((response: string) => {
    setSummarizationResponsesLog(prev => [response, ...prev].slice(0, 10));
  }, [setSummarizationResponsesLog]);

  const handleSetupComplete = useCallback(async (settings: WorldSettings) => {
    setIsLoadingApi(true);
    setApiError(null);
    
    const realmProgression = settings.heThongCanhGioi.split(' - ').map(s => s.trim()).filter(Boolean);
    const initialRealm = settings.canhGioiKhoiDau;
    
    const generatedBaseStats: Record<string, RealmBaseStatDefinition> = {};
    realmProgression.forEach((realmName, index) => {
        generatedBaseStats[realmName] = DEFAULT_TIERED_STATS[Math.min(index, DEFAULT_TIERED_STATS.length - 1)];
    });
    
    const initialCalculatedStats = calculateStatsForRealm(initialRealm, realmProgression, generatedBaseStats);

    const initialKB: KnowledgeBase = {
      ...INITIAL_KNOWLEDGE_BASE,
      playerStats: {
        ...DEFAULT_PLAYER_STATS,
        realm: initialRealm,
        ...initialCalculatedStats, 
        sinhLuc: initialCalculatedStats.maxSinhLuc || DEFAULT_PLAYER_STATS.maxSinhLuc,
        linhLuc: initialCalculatedStats.maxLinhLuc || DEFAULT_PLAYER_STATS.maxLinhLuc,
        kinhNghiem: 0,
        turn: 0,
        hieuUngBinhCanh: false,
      },
      realmProgressionList: realmProgression,
      currentRealmBaseStats: generatedBaseStats,
      worldConfig: settings, 
      appVersion: APP_VERSION,
      pageSummaries: {},
      currentPageHistory: [1], 
      lastSummarizedTurn: 0,
      turnHistory: [],
      autoSaveTurnCounter: 0,
      currentAutoSaveSlotIndex: 0,
      autoSaveSlotIds: Array(MAX_AUTO_SAVE_SLOTS).fill(null),
      manualSaveId: null,
      manualSaveName: settings.saveGameName || VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", settings.playerName || "Tân Đạo Hữu"),
    };
    
    setCurrentPageDisplay(1); 

    try {
      const {response, rawText} = await generateInitialStory(settings, logSentPromptCallback);
      setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
      
      const { newKb: kbAfterTags, turnIncrementedByTag, systemMessagesFromTags: systemMessagesFromInitialTags, realmChangedByTag: realmChangedByInitTag } = performTagProcessing(initialKB, response.tags, 1);
      
      let finalKbForSetup = kbAfterTags;
      let turnForInitialMessages = 1;

      if (turnIncrementedByTag && finalKbForSetup.playerStats.turn > 0) {
          turnForInitialMessages = finalKbForSetup.playerStats.turn;
      } else {
          finalKbForSetup.playerStats.turn = 1; 
          turnForInitialMessages = 1;
      }
      
      if (realmChangedByInitTag) {
          const reCalculatedStats = calculateStatsForRealm(finalKbForSetup.playerStats.realm, finalKbForSetup.realmProgressionList, finalKbForSetup.currentRealmBaseStats);
          finalKbForSetup.playerStats = { ...finalKbForSetup.playerStats, ...reCalculatedStats };
          finalKbForSetup.playerStats.sinhLuc = finalKbForSetup.playerStats.maxSinhLuc;
          finalKbForSetup.playerStats.linhLuc = finalKbForSetup.playerStats.maxLinhLuc;
          finalKbForSetup.playerStats.kinhNghiem = Math.min(finalKbForSetup.playerStats.kinhNghiem, finalKbForSetup.playerStats.maxKinhNghiem);
      } else {
          finalKbForSetup.playerStats.sinhLuc = initialCalculatedStats.maxSinhLuc || finalKbForSetup.playerStats.maxSinhLuc;
          finalKbForSetup.playerStats.linhLuc = initialCalculatedStats.maxLinhLuc || finalKbForSetup.playerStats.maxLinhLuc;
      }
      
      if (finalKbForSetup.currentPageHistory?.length === 1 && finalKbForSetup.currentPageHistory[0] !== turnForInitialMessages) {
          finalKbForSetup.currentPageHistory = [turnForInitialMessages];
      } else if (!finalKbForSetup.currentPageHistory || finalKbForSetup.currentPageHistory.length === 0) {
          finalKbForSetup.currentPageHistory = [turnForInitialMessages];
      }
      
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
      
      addMessageAndUpdateState(newMessages, finalKbForSetup, () => {
           setCurrentScreen(GameScreen.Gameplay);
           setIsLoadingApi(false);
      });

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setApiError(errorMsg);
      showNotification(errorMsg, 'error');
      console.error(err);
      setIsLoadingApi(false);
    }
  }, [
    addMessageAndUpdateState, 
    logSentPromptCallback, 
    setCurrentPageDisplay, 
    setCurrentScreen, 
    setRawAiResponsesLog, 
    showNotification,
    setKnowledgeBase, 
  ]);

  const handlePlayerAction = useCallback(async (
    action: string, 
    isChoice: boolean,
    inputType: PlayerActionInputType,
    responseLength: ResponseLength
  ) => {
    setIsLoadingApi(true);
    setApiError(null);
    
    const turnOfPlayerAction = knowledgeBase.playerStats.turn; 
    const knowledgeBaseAtActionStart = JSON.parse(JSON.stringify(knowledgeBase)); 
    const gameMessagesBeforePlayerAction = [...gameMessages];

    const playerActionMessage: GameMessage = {
      id: Date.now().toString() + Math.random(),
      type: 'player_action',
      content: action,
      timestamp: Date.now(),
      isPlayerInput: true,
      turnNumber: turnOfPlayerAction
    };
    
    const messagesForCurrentPagePrompt = getMessagesForPageUtil(currentPageDisplay, knowledgeBase, [...gameMessages, playerActionMessage]);
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
        const messagesOfLastSummarizedPagePrompt = getMessagesForPageUtil(lastPageNumberForPrompt, knowledgeBase, gameMessages);
        lastNarrationFromPreviousPage = [...messagesOfLastSummarizedPagePrompt].reverse().find(msg => msg.type === 'narration')?.content;
    }

    try {
        const { response, rawText } = await generateNextTurn(
            knowledgeBase, 
            action,
            inputType,
            responseLength,
            currentPageMessagesLog,
            previousPageSummariesContent,
            lastNarrationFromPreviousPage,
            logSentPromptCallback
        );
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
        
        let currentTurnKb = JSON.parse(JSON.stringify(knowledgeBase));

        const { 
            newKb: kbAfterTags, 
            turnIncrementedByTag, 
            systemMessagesFromTags, 
            realmChangedByTag, 
            removedBinhCanhViaTag 
        } = performTagProcessing(currentTurnKb, response.tags, turnOfPlayerAction);
        
        currentTurnKb = kbAfterTags;
        let manualTurnIncrementMessage: GameMessage | null = null;
        
        const systemMessagesForThisTurn = [...systemMessagesFromTags];
        const oldRealmBeforeAnyProcessingThisTurn = knowledgeBaseAtActionStart.playerStats.realm; 
        let realmChangedThisTurnProcess = realmChangedByTag; 

        if (turnIncrementedByTag) {
            if (currentTurnKb.playerStats.turn <= turnOfPlayerAction) {
                currentTurnKb.playerStats.turn = turnOfPlayerAction + 1;
                 manualTurnIncrementMessage = {
                    id: 'manual-fix-turn-' + Date.now(), type: 'system', 
                    content: `Hệ thống: Lượt chơi đã được điều chỉnh thành ${currentTurnKb.playerStats.turn} (do AI tag không hợp lệ).`, 
                    timestamp: Date.now(), turnNumber: turnOfPlayerAction
                };
            }
        } else {
            currentTurnKb.playerStats.turn = turnOfPlayerAction + 1;
        }
        
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
                timestamp: Date.now(), turnNumber: turnOfPlayerAction
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
                    timestamp: Date.now(), turnNumber: turnOfPlayerAction
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
                    timestamp: Date.now(), turnNumber: turnOfPlayerAction
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

            const newStatsForThisLevel = calculateStatsForRealm(
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
                timestamp: Date.now(), turnNumber: turnOfPlayerAction
            });
            const finalOldMainName = realmAtStartOfXPLoop.substring(0, realmAtStartOfXPLoop.lastIndexOf(" ") > -1 ? realmAtStartOfXPLoop.lastIndexOf(" ") : undefined);
            const finalNewMainName = realmAfterXPLoop.substring(0, realmAfterXPLoop.lastIndexOf(" ") > -1 ? realmAfterXPLoop.lastIndexOf(" ") : undefined);
            if (finalOldMainName !== finalNewMainName && finalOldMainName && finalNewMainName) {
                systemMessagesForThisTurn.push({
                    id: 'realm-breakthrough-heal-final-' + Date.now(), type: 'system',
                    content: `Đột phá đại cảnh giới, sinh lực và linh lực hoàn toàn hồi phục!`,
                    timestamp: Date.now(), turnNumber: turnOfPlayerAction
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

        currentTurnKb = addTurnHistoryEntry(currentTurnKb, gameMessagesBeforePlayerAction);

        currentTurnKb.autoSaveTurnCounter = (currentTurnKb.autoSaveTurnCounter + 1);
        if (currentTurnKb.autoSaveTurnCounter >= AUTO_SAVE_INTERVAL_TURNS) {
            currentTurnKb.autoSaveTurnCounter = 0;
            const autoSaveSlot = currentTurnKb.currentAutoSaveSlotIndex;
            const autoSaveName = `Auto Save Slot ${autoSaveSlot + 1}`;
            const existingAutoSaveId = currentTurnKb.autoSaveSlotIds[autoSaveSlot];
            const kbForAutoSave = JSON.parse(JSON.stringify(currentTurnKb));
            const messagesForAutoSave = [...gameMessagesBeforePlayerAction, playerActionMessage, ...systemMessagesForThisTurn];

            executeSaveGame(kbForAutoSave, messagesForAutoSave, autoSaveName, existingAutoSaveId, true)
                .then(savedId => {
                    if (savedId) {
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
            timestamp: Date.now(), choices: response.choices, turnNumber: turnOfPlayerAction
        });
        if (response.systemMessage) {
          newMessagesForThisCycle.push({
            id: Date.now().toString() + Math.random(), type: 'system', content: response.systemMessage,
            timestamp: Date.now(), turnNumber: turnOfPlayerAction
          });
        }
        newMessagesForThisCycle.push(...systemMessagesForThisTurn); 
        if (manualTurnIncrementMessage && !turnIncrementedByTag) { 
            newMessagesForThisCycle.push(manualTurnIncrementMessage);
        }
        
        const finalKbStateForThisTurn = currentTurnKb; 
        const turnCompleted = turnOfPlayerAction;
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
                const allMessagesForSummaryCalc = [...gameMessagesBeforePlayerAction, ...newMessagesForThisCycle];
                const actualMessagesToSummarize = allMessagesForSummaryCalc.filter(
                    msg => msg.turnNumber >= startTurnOfSummaryPageActual && msg.turnNumber <= endTurnOfSummaryPageActual
                );
                
                if (actualMessagesToSummarize.length > 0) {
                    try {
                        const summaryResult = await summarizeTurnHistory(
                            actualMessagesToSummarize,
                            finalKbStateForThisTurn.worldConfig?.theme || "Không rõ",
                            finalKbStateForThisTurn.worldConfig?.playerName || "Người chơi",
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
                     finalKbStateForThisTurn.pageSummaries[pageToSummarize] = VIETNAMESE.noContentToSummarize || "Không có nội dung.";
                     finalKbStateForThisTurn.lastSummarizedTurn = turnCompleted;
                     const nextPageStartTurn = turnCompleted + 1;
                     if (!finalKbStateForThisTurn.currentPageHistory) finalKbStateForThisTurn.currentPageHistory = [1];
                     if (!finalKbStateForThisTurn.currentPageHistory.includes(nextPageStartTurn)) {
                        finalKbStateForThisTurn.currentPageHistory.push(nextPageStartTurn);
                     }
                     newMessagesForThisCycle.push({
                        id: 'no-content-summary-' + Date.now(), type: 'page_summary',
                        content: `${VIETNAMESE.pageSummaryTitle(pageToSummarize)}: ${VIETNAMESE.noContentToSummarize || "Không có nội dung."}`,
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
        addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
             setIsLoadingApi(false);
        });

    } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setApiError(errorMsg);
        showNotification(errorMsg, 'error');
        console.error(err);
        setIsLoadingApi(false); 
        if (isAutoPlaying) {
          setIsAutoPlaying(false);
          showNotification(VIETNAMESE.autoPlayStoppedOnError || "Đã dừng tự động chơi do có lỗi.", 'error');
        }
    }
  }, [
      knowledgeBase, 
      gameMessages, 
      addMessageAndUpdateState, 
      logSentPromptCallback,
      logSummarizationResponseCallback, 
      currentPageDisplay,
      isAutoPlaying,
      setIsAutoPlaying,
      showNotification,
      executeSaveGame, 
      storageType,
      firebaseUser,
      setCurrentPageDisplay,
      setKnowledgeBase, 
      setRawAiResponsesLog,
    ]);

  return {
    isLoadingApi,
    apiError,
    setApiError, 
    isSummarizingNextPageTransition,
    handleSetupComplete,
    handlePlayerAction,
  };
};
