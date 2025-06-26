
import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, KnowledgeBase, GameMessage, WorldSettings, PlayerStats, ApiConfig, SaveGameData, StorageType, SaveGameMeta, RealmBaseStatDefinition, TurnHistoryEntry, StyleSettings, PlayerActionInputType, EquipmentSlotId, Item as ItemType, AvatarUploadHandlers, NPC } from './types';
import InitialScreen from './components/InitialScreen';
import GameSetupScreen from './components/GameSetupScreen';
import GameplayScreen from './components/GameplayScreen'; 
import EquipmentScreen from './components/gameplay/EquipmentScreen';
import CraftingScreen from './components/gameplay/crafting/CraftingScreen'; 
import ApiSettingsScreen from './components/ApiSettingsScreen';
import LoadGameScreen from './components/LoadGameScreen';
import StorageSettingsScreen from './components/StorageSettingsScreen';
import ImportExportScreen from './components/ImportExportScreen';
import Spinner from './components/ui/Spinner';
import Button from './components/ui/Button';
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, APP_VERSION, MAX_AUTO_SAVE_SLOTS, TURNS_PER_PAGE, DEFAULT_TIERED_STATS, MAX_TURN_HISTORY_LENGTH, EQUIPMENT_SLOTS_CONFIG, KEYFRAME_INTERVAL } from './constants';
// Firebase imports removed
import { saveGameToIndexedDB, loadGamesFromIndexedDB, loadSpecificGameFromIndexedDB, deleteGameFromIndexedDB, importGameToIndexedDB, resetDBConnection as resetIndexedDBConnection } from './services/indexedDBService';
import * as GameTemplates from './templates';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useGameNotifications } from './hooks/useGameNotifications';
import { useGameData } from './hooks/useGameData';
import { useGameActions } from './hooks/useGameActions';
import { calculateRealmBaseStats, calculateEffectiveStats, getMessagesForPage, performTagProcessing } from './utils/gameLogicUtils'; 
import { summarizeTurnHistory, getApiSettings as getGeminiApiSettings, countTokens, generateCraftedItemViaAI } from './services/geminiService'; 
import { uploadImageToCloudinary } from './services/cloudinaryService';
import * as jsonpatch from "fast-json-patch";
import { isValidImageUrl } from './utils/imageValidationUtils';


export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.Initial);
  
  const {
    storageSettings,
    styleSettings,
    setStorageSettings,
    setStyleSettings,
    // firebaseUser, setFirebaseUser removed
    isInitialLoading,
    storageInitError,
    // reInitializeFirebase removed
  } = useAppInitialization();

  const { notification, showNotification } = useGameNotifications();
  
  const {
    knowledgeBase,
    setKnowledgeBase,
    gameMessages,
    setGameMessages,
    rawAiResponsesLog,
    setRawAiResponsesLog,
    sentPromptsLog,
    setSentPromptsLog,
    latestPromptTokenCount,
    setLatestPromptTokenCount,
    summarizationResponsesLog,
    setSummarizationResponsesLog,
    currentPageDisplay,
    setCurrentPageDisplay,
    totalPages,
    messageIdBeingEdited,
    setMessageIdBeingEdited,
    getMessagesForPage: getMessagesForPageFromHook, 
    addMessageAndUpdateState,
    resetGameData
  } = useGameData();

  const [sentCraftingPromptsLog, setSentCraftingPromptsLog] = useState<string[]>([]);
  const [receivedCraftingResponsesLog, setReceivedCraftingResponsesLog] = useState<string[]>([]);
  const [sentNpcAvatarPromptsLog, setSentNpcAvatarPromptsLog] = useState<string[]>([]); 

  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false); 
  const [isSavingGame, setIsSavingGame] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false); 
  const [isSummarizingOnLoad, setIsSummarizingOnLoad] = useState<boolean>(false);
  const [isCraftingItem, setIsCraftingItem] = useState<boolean>(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);

  const logNpcAvatarPromptCallback = useCallback((prompt: string) => {
    setSentNpcAvatarPromptsLog(prev => [prompt, ...prev].slice(0, 10));
  }, []);


  const executeSaveGame = useCallback(async (
    kbToSave: KnowledgeBase, 
    messagesToSave: GameMessage[],
    saveName: string,
    existingId: string | null,
    isAuto: boolean
  ): Promise<string | null> => {
    if(isAuto) setIsAutoSaving(true); else setIsSavingGame(true);
    try {
        // KnowledgeBase passed here (kbToSave) contains full snapshots in memory.
        // saveGameToIndexedDB will handle stripping snapshots for delta entries before DB write.
        const idForLocal = typeof existingId === 'string' ? parseInt(existingId, 10) : existingId;
        const newSaveId = await saveGameToIndexedDB(kbToSave, messagesToSave, saveName, isNaN(idForLocal as number) ? existingId : idForLocal);
        
        if (!isAuto) {
            showNotification(VIETNAMESE.gameSavedSuccess + ` ("${saveName}")`, 'success');
        }
        return newSaveId;
    } catch (e) {
        const errorMsg = VIETNAMESE.errorSavingGame + (e instanceof Error ? `: ${e.message}` : '');
        if (!isAuto) showNotification(errorMsg, 'error');
        else console.error(VIETNAMESE.autoSaveError(saveName), errorMsg);
        return null;
    } finally {
        if(isAuto) setIsAutoSaving(false); else setIsSavingGame(false);
    }
  }, [showNotification]);


  const {
    isLoadingApi,
    setIsLoadingApi, 
    apiError, 
    setApiError, 
    isSummarizingNextPageTransition,
    handleSetupComplete: originalHandleSetupComplete, 
    handlePlayerAction,
  } = useGameActions({ 
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
    storageType: 'local', 
    firebaseUser: null, 
    logNpcAvatarPromptCallback 
  });

  const handleSetupCompleteAppWrapper = useCallback(async (settingsFromGameSetup: WorldSettings, rawAvatarDataFromGameSetup?: string | null) => {
    let finalWorldSettings = { ...settingsFromGameSetup };
    let finalPlayerAvatarUrlForKbConfig: string | undefined = undefined;
    let base64ToStoreInKb: string | undefined = undefined;

    setIsUploadingAvatar(true);

    if (rawAvatarDataFromGameSetup) {
        if (rawAvatarDataFromGameSetup.startsWith('data:image')) { // It's base64 data (from file upload or AI gen + Cloudinary fail in tab)
            base64ToStoreInKb = rawAvatarDataFromGameSetup; 
            try {
                const playerNameSlug = finalWorldSettings.playerName?.replace(/\s+/g, '_').toLowerCase() || `player_${Date.now()}`;
                const base64StringOnly = rawAvatarDataFromGameSetup.split(',')[1];
                const cloudinaryUrl = await uploadImageToCloudinary(base64StringOnly, 'player', `player_${playerNameSlug}`);
                finalPlayerAvatarUrlForKbConfig = cloudinaryUrl;
                base64ToStoreInKb = undefined; // Cloudinary success, KB will use URL, worldConfig will have URL
            } catch (uploadError) {
                console.error("Cloudinary upload failed for player avatar during setup complete:", uploadError);
                showNotification(VIETNAMESE.avatarUploadError + (uploadError instanceof Error ? uploadError.message : ""), "warning");
                // Cloudinary failed. finalPlayerAvatarUrlForKbConfig remains undefined. base64ToStoreInKb has the data for KB.
                // finalWorldSettings.playerAvatarUrl will be updated by originalHandleSetupComplete based on base64ToStoreInKb if it's set.
            }
        } else if (rawAvatarDataFromGameSetup.startsWith('http')) { // It's already a URL (from random, direct URL, or AI gen + Cloudinary success in tab)
            const isValidDirectUrl = await isValidImageUrl(rawAvatarDataFromGameSetup);
            if (isValidDirectUrl) {
                finalPlayerAvatarUrlForKbConfig = rawAvatarDataFromGameSetup;
            } else {
                console.warn(`Invalid direct URL from GameSetupScreen: ${rawAvatarDataFromGameSetup}. Clearing avatar.`);
                showNotification(VIETNAMESE.avatarUrlInvalid + " Ảnh đại diện sẽ bị xóa.", "warning");
            }
        }
    } else if (finalWorldSettings.playerAvatarUrl && (finalWorldSettings.playerAvatarUrl.startsWith('http'))) {
        // This case handles if playerAvatarUrl was set directly in settings (e.g. import)
        // and no new rawAvatarDataFromGameSetup was provided (e.g. user didn't touch avatar controls in this setup session)
        const isValidDirectUrl = await isValidImageUrl(finalWorldSettings.playerAvatarUrl);
        if (isValidDirectUrl) {
            finalPlayerAvatarUrlForKbConfig = finalWorldSettings.playerAvatarUrl;
        } else {
            console.warn(`Invalid playerAvatarUrl in settings: ${finalWorldSettings.playerAvatarUrl}. Clearing.`);
            finalWorldSettings.playerAvatarUrl = undefined; // Clear it from settings
        }
    }
    
    // Update worldConfig with the final URL (Cloudinary or direct valid URL) for saving within worldConfig itself
    finalWorldSettings.playerAvatarUrl = finalPlayerAvatarUrlForKbConfig;

    setIsUploadingAvatar(false);
    // Pass finalWorldSettings (with updated playerAvatarUrl).
    // And pass base64ToStoreInKb (if Cloudinary failed for a base64 input, this will be used for knowledgeBase.playerAvatarData).
    // If Cloudinary was successful or a direct URL was used, base64ToStoreInKb is undefined.
    await originalHandleSetupComplete(finalWorldSettings, base64ToStoreInKb);
  }, [originalHandleSetupComplete, showNotification]);


  const handleUpdatePlayerAvatarInKb = useCallback(async (newAvatarUrlOrData: string) => {
    setIsUploadingAvatar(true);
    let finalUrlToShow = newAvatarUrlOrData; // Assume it's a URL initially or becomes one
    let base64ForKbIfUploadFails: string | undefined = undefined;


    if (newAvatarUrlOrData.startsWith('data:image')) { // It's base64 data, needs upload
        base64ForKbIfUploadFails = newAvatarUrlOrData;
        try {
            const playerNameSlug = knowledgeBase.worldConfig?.playerName?.replace(/\s+/g, '_').toLowerCase() || `player_${Date.now()}`;
            const base64StringOnly = newAvatarUrlOrData.split(',')[1];
            finalUrlToShow = await uploadImageToCloudinary(base64StringOnly, 'player', `player_${playerNameSlug}_ingame`);
            base64ForKbIfUploadFails = undefined; // Upload success
        } catch (uploadError) {
            console.error("Cloudinary upload failed for in-game player avatar update:", uploadError);
            showNotification(VIETNAMESE.avatarUploadError + (uploadError instanceof Error ? uploadError.message : ""), "error");
            setIsUploadingAvatar(false);
            // Don't update KB if upload fails and we intended to upload.
            // KB will keep its old avatar data.
            // If we want to store base64 on failure, then we'd proceed to setKnowledgeBase with base64ForKbIfUploadFails.
            // For now, let's make it an all-or-nothing for Cloudinary upload during gameplay update.
            // User can re-try.
            return; 
        }
    } else if (newAvatarUrlOrData.startsWith('http')) {
        const isValid = await isValidImageUrl(newAvatarUrlOrData);
        if (!isValid) {
            showNotification(VIETNAMESE.avatarUrlInvalid, "error");
            setIsUploadingAvatar(false);
            return;
        }
        finalUrlToShow = newAvatarUrlOrData; // URL is valid
    } else if (newAvatarUrlOrData === '') { // Clearing avatar
        finalUrlToShow = ''; // Represent as empty string for clearing
    } else { // Invalid format
        showNotification("Định dạng avatar không hợp lệ.", "error");
        setIsUploadingAvatar(false);
        return;
    }


    setKnowledgeBase(prevKb => {
      const updatedKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
      // If base64ForKbIfUploadFails is set, it means Cloudinary failed, so store base64.
      // Otherwise, finalUrlToShow contains either the Cloudinary URL or the validated direct URL.
      // If finalUrlToShow is empty, it means clearing.
      updatedKb.playerAvatarData = base64ForKbIfUploadFails || (finalUrlToShow === '' ? undefined : finalUrlToShow);
      if (updatedKb.worldConfig) {
        updatedKb.worldConfig.playerAvatarUrl = base64ForKbIfUploadFails || (finalUrlToShow === '' ? undefined : finalUrlToShow);
      }
      return updatedKb;
    });
    showNotification(finalUrlToShow === '' ? "Đã xóa ảnh đại diện." : VIETNAMESE.avatarUploadSuccess, 'success');
    setIsUploadingAvatar(false);
  }, [setKnowledgeBase, showNotification, knowledgeBase.worldConfig?.playerName]);

  const handleUpdateNpcAvatarInKb = useCallback(async (npcId: string, newAvatarUrlOrData: string) => {
    setIsUploadingAvatar(true); 
    let finalUrlForNpc = newAvatarUrlOrData;
    const npcData = knowledgeBase.discoveredNPCs.find(n => n.id === npcId);

    if (newAvatarUrlOrData.startsWith('data:image') && npcData) { 
        try {
            const base64StringOnly = newAvatarUrlOrData.split(',')[1];
            let cloudinaryFolderType: 'npc_male' | 'npc_female' = 'npc_male';
            if (npcData.gender === 'Nữ') cloudinaryFolderType = 'npc_female';
            
            finalUrlForNpc = await uploadImageToCloudinary(base64StringOnly, cloudinaryFolderType, `npc_${npcId}_ingame`);
        } catch (uploadError) {
            console.error(`Cloudinary upload failed for NPC ${npcId} avatar update:`, uploadError);
            showNotification(VIETNAMESE.avatarUploadError + (uploadError instanceof Error ? uploadError.message : ""), "error");
            setIsUploadingAvatar(false);
            return; 
        }
    } else if (newAvatarUrlOrData.startsWith('http')) {
        const isValid = await isValidImageUrl(newAvatarUrlOrData);
        if (!isValid) {
            showNotification(VIETNAMESE.avatarUrlInvalid, "error");
            setIsUploadingAvatar(false);
            return;
        }
        finalUrlForNpc = newAvatarUrlOrData;
    } else if (newAvatarUrlOrData === '') { // Clearing avatar
        finalUrlForNpc = ''; // Represent as empty string for clearing
    } else { // Invalid format
        showNotification("Định dạng avatar không hợp lệ cho NPC.", "error");
        setIsUploadingAvatar(false);
        return;
    }

    setKnowledgeBase(prevKb => {
      const updatedNPCs = prevKb.discoveredNPCs.map(npc =>
        npc.id === npcId ? { ...npc, avatarUrl: finalUrlForNpc === '' ? undefined : finalUrlForNpc } : npc
      );
      return { ...prevKb, discoveredNPCs: updatedNPCs };
    });
    const npcNameDisplay = npcData?.name || "NPC";
    showNotification(finalUrlForNpc === '' ? `Đã xóa ảnh đại diện cho ${npcNameDisplay}.` : `${VIETNAMESE.avatarUploadSuccess} cho ${npcNameDisplay}.`, 'success');
    setIsUploadingAvatar(false);
  }, [knowledgeBase.discoveredNPCs, setKnowledgeBase, showNotification]);


  useEffect(() => { 
    let autoPlayTimeoutId: number | undefined;
    if (isAutoPlaying && !isLoadingApi && !isSummarizingNextPageTransition && !isSummarizingOnLoad && currentScreen === GameScreen.Gameplay && currentPageDisplay === totalPages) {
      const latestMessageWithChoices = [...gameMessages].reverse().find(
        (msg) => msg.type === 'narration' && msg.choices && msg.choices.length > 0
      );
      let actionToTake: string | null = null;
      let isChoiceAction = false;
      let actionType: PlayerActionInputType = 'action';

      if (latestMessageWithChoices && latestMessageWithChoices.choices && latestMessageWithChoices.choices.length > 0) {
        actionToTake = latestMessageWithChoices.choices[0].text; 
        isChoiceAction = true;
        actionType = 'action';
      } else {
        actionToTake = VIETNAMESE.autoPlayContinueAction || "Tiếp tục diễn biến.";
        isChoiceAction = false;
        actionType = 'story'; 
      }

      if (actionToTake) {
        autoPlayTimeoutId = window.setTimeout(async () => { 
          if (isAutoPlaying && !isLoadingApi && !isSummarizingNextPageTransition && !isSummarizingOnLoad && currentScreen === GameScreen.Gameplay && currentPageDisplay === totalPages) {
            await handlePlayerAction(actionToTake!, isChoiceAction, actionType, 'default'); 
          }
        }, 1000); 
      }
    }
    return () => {
      if (autoPlayTimeoutId) {
        clearTimeout(autoPlayTimeoutId);
      }
    };
  }, [
    isAutoPlaying, 
    isLoadingApi, 
    gameMessages, 
    currentScreen, 
    handlePlayerAction,
    isSummarizingNextPageTransition,
    isSummarizingOnLoad,
    currentPageDisplay,
    totalPages
  ]);

  const handleToggleAutoPlay = () => {
    setIsAutoPlaying(prev => {
      const newAutoPlayingState = !prev;
      showNotification(newAutoPlayingState ? VIETNAMESE.autoPlayEnabledNotification : VIETNAMESE.autoPlayDisabledNotification, 'info');
      return newAutoPlayingState;
    });
  };

  const handleStartEditMessage = (messageId: string) => {
    setMessageIdBeingEdited(messageId);
  };

  const handleCancelEditMessage = () => {
    setMessageIdBeingEdited(null);
  };

  const handleSaveEditedMessage = (messageId: string, newContent: string) => {
    setGameMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
      )
    );
    setMessageIdBeingEdited(null);
    showNotification(VIETNAMESE.messageEditedSuccess, 'success');
  };

  const processManualSaveWithName = async (name: string) => {
    setIsSavingGame(true); 
    try {
      const currentSaveName = name.trim();
      if (!currentSaveName) {
        showNotification(VIETNAMESE.manualSaveErrorNoName, 'warning');
        setIsSavingGame(false);
        return;
      }
      const existingIdToUpdate = knowledgeBase.manualSaveId;
      // Pass current in-memory knowledgeBase and gameMessages
      const newSaveId = await executeSaveGame(knowledgeBase, gameMessages, currentSaveName, existingIdToUpdate, false);
      if (newSaveId) { 
        setKnowledgeBase(prevKb => ({ ...prevKb, manualSaveId: newSaveId, manualSaveName: currentSaveName }));
      }
    } catch (error) {
        showNotification("Lỗi khi xử lý lưu game: " + (error instanceof Error ? error.message : String(error)), "error");
    } finally {
        setIsSavingGame(false); 
    }
  };

  const handleSaveGame = async () => {
    setIsSavingGame(true);
    const saveName = knowledgeBase.manualSaveName || knowledgeBase.worldConfig?.saveGameName || "Cuộc Phiêu Lưu Mặc Định";
    if (!saveName.trim()) {
        showNotification(VIETNAMESE.manualSaveErrorNoName, 'error');
        setIsSavingGame(false);
        return;
    }
    await processManualSaveWithName(saveName);
  };

  const handleLoadGame = async (saveId: string) => {
    setIsSavingGame(true); 
    setApiError(null); 
    setIsSummarizingOnLoad(false); 
    try {
        const gameData = await loadSpecificGameFromIndexedDB(saveId);

        if (gameData) {
            let loadedKb = gameData.knowledgeBase;

            // Reconstruct full snapshots for delta frames in turnHistory
            if (loadedKb.turnHistory && Array.isArray(loadedKb.turnHistory)) {
                let lastKeyframeKbSnapshot: KnowledgeBase | null = null;
                let lastKeyframeMessagesSnapshot: GameMessage[] | null = null;
                const reconstructedTurnHistory: TurnHistoryEntry[] = [];

                for (const entry of loadedKb.turnHistory) {
                    if (entry.type === 'keyframe') {
                        // Keyframes from DB should have full snapshots
                        lastKeyframeKbSnapshot = JSON.parse(JSON.stringify(entry.knowledgeBaseSnapshot));
                        lastKeyframeMessagesSnapshot = JSON.parse(JSON.stringify(entry.gameMessagesSnapshot));
                        reconstructedTurnHistory.push(entry);
                    } else if (entry.type === 'delta') {
                        if (!lastKeyframeKbSnapshot || !lastKeyframeMessagesSnapshot || !entry.knowledgeBaseDelta || !entry.gameMessagesDelta) {
                            console.error('Cannot reconstruct delta frame, missing keyframe or delta data. Corrupted save?', entry);
                            // Fallback: if a delta somehow has its own snapshot (should not happen from DB), use it. Otherwise, this entry is problematic.
                            reconstructedTurnHistory.push(entry.knowledgeBaseSnapshot && entry.gameMessagesSnapshot ? entry : {...entry, knowledgeBaseSnapshot: {} as KnowledgeBase, gameMessagesSnapshot: []});
                            continue;
                        }
                        
                        let newKbSnapshotForDelta = lastKeyframeKbSnapshot;
                        if (entry.knowledgeBaseDelta.length > 0) {
                            newKbSnapshotForDelta = jsonpatch.applyPatch(
                                JSON.parse(JSON.stringify(lastKeyframeKbSnapshot)), // Clone base
                                entry.knowledgeBaseDelta
                            ).newDocument as KnowledgeBase;
                        }
                        
                        let newMessagesSnapshotForDelta = lastKeyframeMessagesSnapshot;
                        if(entry.gameMessagesDelta.length > 0) {
                            newMessagesSnapshotForDelta = jsonpatch.applyPatch(
                                JSON.parse(JSON.stringify(lastKeyframeMessagesSnapshot)), // Clone base
                                entry.gameMessagesDelta
                            ).newDocument as GameMessage[];
                        }

                        const reconstructedEntry: TurnHistoryEntry = {
                            ...entry,
                            knowledgeBaseSnapshot: newKbSnapshotForDelta,
                            gameMessagesSnapshot: newMessagesSnapshotForDelta,
                        };
                        reconstructedTurnHistory.push(reconstructedEntry);
                        
                        // Update "last keyframe" to be the newly reconstructed state for the next delta
                        lastKeyframeKbSnapshot = newKbSnapshotForDelta;
                        lastKeyframeMessagesSnapshot = newMessagesSnapshotForDelta;
                    } else {
                        // Should not happen if type is only keyframe/delta. Push as is or handle error.
                        reconstructedTurnHistory.push(entry); 
                    }
                }
                loadedKb.turnHistory = reconstructedTurnHistory;
            }


            setGameMessages(gameData.gameMessages); 
            
            loadedKb.autoSaveTurnCounter = loadedKb.autoSaveTurnCounter ?? 0;
            loadedKb.currentAutoSaveSlotIndex = loadedKb.currentAutoSaveSlotIndex ?? 0;
            loadedKb.autoSaveSlotIds = Array.isArray(loadedKb.autoSaveSlotIds) && loadedKb.autoSaveSlotIds.length === MAX_AUTO_SAVE_SLOTS 
                ? loadedKb.autoSaveSlotIds 
                : Array(MAX_AUTO_SAVE_SLOTS).fill(null);
            loadedKb.manualSaveName = gameData.name || loadedKb.manualSaveName || loadedKb.worldConfig?.saveGameName || "Không Tên";
            loadedKb.manualSaveId = loadedKb.manualSaveId ?? gameData.id ?? null;
            
            if (loadedKb.worldConfig && loadedKb.worldConfig.playerAvatarUrl) {
                loadedKb.playerAvatarData = loadedKb.worldConfig.playerAvatarUrl; 
            } else if (loadedKb.playerAvatarData) { 
                if(loadedKb.worldConfig) loadedKb.worldConfig.playerAvatarUrl = loadedKb.playerAvatarData;
            } else {
                 if(loadedKb.worldConfig) loadedKb.worldConfig.playerAvatarUrl = undefined;
                 loadedKb.playerAvatarData = undefined;
            }


            if (loadedKb.worldConfig?.heThongCanhGioi && (!loadedKb.realmProgressionList || loadedKb.realmProgressionList.length === 0)) {
                loadedKb.realmProgressionList = loadedKb.worldConfig.heThongCanhGioi.split(' - ').map(s => s.trim()).filter(Boolean);
            }
            if (!loadedKb.currentRealmBaseStats || Object.keys(loadedKb.currentRealmBaseStats).length === 0) {
                const generatedBaseStats: Record<string, RealmBaseStatDefinition> = {};
                 loadedKb.realmProgressionList.forEach((realmName, index) => {
                    generatedBaseStats[realmName] = DEFAULT_TIERED_STATS[Math.min(index, DEFAULT_TIERED_STATS.length - 1)];
                });
                loadedKb.currentRealmBaseStats = generatedBaseStats;
            }
            
            const baseRealmStats = calculateRealmBaseStats(loadedKb.playerStats.realm, loadedKb.realmProgressionList, loadedKb.currentRealmBaseStats);
            loadedKb.playerStats = { ...loadedKb.playerStats, ...baseRealmStats };
            loadedKb.playerStats = calculateEffectiveStats(loadedKb.playerStats, loadedKb.equippedItems, loadedKb.inventory);
            
            loadedKb.playerStats.sinhLuc = Math.min(loadedKb.playerStats.sinhLuc, loadedKb.playerStats.maxSinhLuc);
            loadedKb.playerStats.linhLuc = Math.min(loadedKb.playerStats.linhLuc, loadedKb.playerStats.maxLinhLuc);
            loadedKb.playerStats.kinhNghiem = Math.min(loadedKb.playerStats.kinhNghiem, loadedKb.playerStats.maxKinhNghiem);

            const requiredSummariesUpToPage = Math.floor( ( (loadedKb.lastSummarizedTurn || 0) ) / TURNS_PER_PAGE );
            let missingSummaryFound = false;
            for (let i = 1; i <= requiredSummariesUpToPage; i++) {
                if (!loadedKb.pageSummaries?.[i]) { missingSummaryFound = true; break; }
            }
            const lastCompletedPageByTurn = Math.floor( (loadedKb.playerStats.turn) / TURNS_PER_PAGE );
            if (lastCompletedPageByTurn > 0 && !loadedKb.pageSummaries?.[lastCompletedPageByTurn] && loadedKb.playerStats.turn % TURNS_PER_PAGE === 0 && (loadedKb.lastSummarizedTurn || 0) < loadedKb.playerStats.turn) {
                 missingSummaryFound = true;
            }

            if(missingSummaryFound) {
                setIsSummarizingOnLoad(true);
                const tempGameMessagesWithNotice = [...gameData.gameMessages, { id: 'missing-summary-notice-' + Date.now(), type: 'system' as const, content: VIETNAMESE.creatingMissingSummary, timestamp: Date.now(), turnNumber: loadedKb.playerStats.turn }];
                setGameMessages(tempGameMessagesWithNotice);
                let tempKb = JSON.parse(JSON.stringify(loadedKb));
                
                const logSentPromptForLoad = (prompt: string) => {
                    setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10));
                    const { model: currentModel } = getGeminiApiSettings();
                    if (currentModel === 'gemini-2.5-flash-preview-04-17' || !currentModel.startsWith('gemini-1.5-flash')) {
                      setLatestPromptTokenCount('Đang tính...');
                      countTokens(prompt)
                        .then(count => setLatestPromptTokenCount(count))
                        .catch(err => {
                          setLatestPromptTokenCount('Lỗi');
                        });
                    } else {
                         setLatestPromptTokenCount('N/A (model)');
                    }
                };
                const logSummarizationResponseForLoad = (response: string) => {
                    setSummarizationResponsesLog(prev => [response, ...prev].slice(0, 10));
                };

                const pagesThatShouldBeSummarized = Math.floor(tempKb.playerStats.turn / TURNS_PER_PAGE);
                for (let pageNum = 1; pageNum <= pagesThatShouldBeSummarized; pageNum++) {
                    if (!tempKb.pageSummaries?.[pageNum] && (tempKb.lastSummarizedTurn || 0) < (pageNum * TURNS_PER_PAGE) ) {
                         const startTurn = (pageNum - 1) * TURNS_PER_PAGE + 1;
                         const endTurn = pageNum * TURNS_PER_PAGE;
                         const messagesForSummary = tempGameMessagesWithNotice.filter(msg => msg.turnNumber >= startTurn && msg.turnNumber <= endTurn);
                         if (messagesForSummary.length > 0) {
                            try {
                                const summaryResult = await summarizeTurnHistory(
                                    messagesForSummary, 
                                    tempKb.worldConfig?.theme || "Không rõ", 
                                    tempKb.worldConfig?.playerName || "Người chơi",
                                    tempKb.worldConfig?.genre,
                                    tempKb.worldConfig?.customGenreName,
                                    logSentPromptForLoad,
                                    logSummarizationResponseForLoad
                                );
                                if (!tempKb.pageSummaries) tempKb.pageSummaries = {};
                                tempKb.pageSummaries[pageNum] = summaryResult.processedSummary;
                                tempKb.lastSummarizedTurn = Math.max(tempKb.lastSummarizedTurn || 0, endTurn);
                            } catch (summaryError) { 
                            }
                         } else {
                            if (!tempKb.pageSummaries) tempKb.pageSummaries = {};
                            tempKb.pageSummaries[pageNum] = VIETNAMESE.noContentToSummarize;
                            tempKb.lastSummarizedTurn = Math.max(tempKb.lastSummarizedTurn || 0, endTurn);
                         }
                    }
                }
                setKnowledgeBase(tempKb); 
                setIsSummarizingOnLoad(false);
            } else {
                 setKnowledgeBase(loadedKb);
            }
            
            const loadedTotalPages = Math.max(1, loadedKb.currentPageHistory?.length || 1);
            setCurrentPageDisplay(loadedTotalPages); 
            setCurrentScreen(GameScreen.Gameplay);
            showNotification(VIETNAMESE.gameLoadedSuccess, 'success');
        } else {
            throw new Error("Không tìm thấy dữ liệu game.");
        }
    } catch (e) {
        const errorMsg = VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : '');
        setApiError(errorMsg); 
        showNotification(errorMsg, 'error');
        setCurrentScreen(GameScreen.LoadGameSelection); 
    } finally {
        setIsSavingGame(false); 
        setIsSummarizingOnLoad(false); 
    }
  };

  const fetchSaveGamesForImportExport = async (): Promise<SaveGameMeta[]> => {
    return loadGamesFromIndexedDB();
  };

  const loadSpecificGameDataForExport = async (saveId: string): Promise<SaveGameData | null> => {
    // This will load the game data possibly with optimized turn history (deltas missing full snapshots)
    // The reconstruction must happen in ImportExportScreen if exporting full JSON.
    return loadSpecificGameFromIndexedDB(saveId);
  };

  const handleImportGameData = async (gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'> & { name: string}) => {
    try {
      // gameDataToImport might have full snapshots (from JSON) or optimized (from .sav.gz)
      // importGameToIndexedDB and subsequently saveGameToIndexedDB will handle optimization.
      await importGameToIndexedDB(gameDataToImport);
      showNotification(VIETNAMESE.dataImportedSuccess, 'success');
    } catch (e) {
      throw e; 
    }
  };
  
  const handleRollbackTurn = () => {
        if (isLoadingApi || isSummarizingNextPageTransition || isSummarizingOnLoad) { 
            showNotification("Không thể lùi lượt khi hệ thống đang xử lý.", 'warning');
            return;
        }
        if (knowledgeBase.turnHistory && knowledgeBase.turnHistory.length > 0) {
             const isAtVeryBeginning = knowledgeBase.playerStats.turn === 1 && 
                                   knowledgeBase.turnHistory.length === 1 && 
                                   knowledgeBase.turnHistory[0].knowledgeBaseSnapshot.playerStats.turn === 0 &&
                                   gameMessages.filter(m => m.type === 'player_action' || m.type === 'narration').length <=1; 
            if (isAtVeryBeginning) {
                 showNotification(VIETNAMESE.cannotRollbackFurther + " (Không thể lùi về trước khi truyện bắt đầu).", 'warning');
                 return;
            }
            
            const currentTurnHistory = [...(knowledgeBase.turnHistory || [])];
            const lastHistoryEntry = currentTurnHistory.pop(); 

            if (lastHistoryEntry) {
                // The snapshots in lastHistoryEntry are already complete due to reconstruction in handleLoadGame
                // or direct storage in useGameActions.
                const restoredKb = {
                    ...lastHistoryEntry.knowledgeBaseSnapshot,
                    turnHistory: currentTurnHistory 
                };

                setKnowledgeBase(restoredKb);
                setGameMessages(lastHistoryEntry.gameMessagesSnapshot);
                
                const newTotalPages = Math.max(1, restoredKb.currentPageHistory?.length || 1);
                let newCurrentPage = newTotalPages; 
                if (restoredKb.currentPageHistory) {
                    for (let i = restoredKb.currentPageHistory.length - 1; i >= 0; i--) {
                        if (restoredKb.playerStats.turn >= restoredKb.currentPageHistory[i]) {
                            newCurrentPage = i + 1;
                            break;
                        }
                    }
                }
                setCurrentPageDisplay(newCurrentPage);
                showNotification(VIETNAMESE.rollbackSuccess, 'success');
            } else {
                 showNotification(VIETNAMESE.cannotRollbackFurther + " (Lỗi: Lịch sử rỗng sau khi pop).", 'warning');
            }
        } else {
            showNotification(VIETNAMESE.cannotRollbackFurther, 'warning');
        }
    };

  const handleUpdateEquipment = useCallback((slotId: EquipmentSlotId, itemIdToEquip: ItemType['id'] | null, previousItemIdInSlot: ItemType['id'] | null) => {
    setKnowledgeBase(prevKb => {
        const newKb = JSON.parse(JSON.stringify(prevKb)) as KnowledgeBase;
        
        newKb.equippedItems[slotId] = itemIdToEquip;

        newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);

        const itemToEquipObj = itemIdToEquip ? newKb.inventory.find(i => i.id === itemIdToEquip) : null;
        const slotConfig = EQUIPMENT_SLOTS_CONFIG.find(s => s.id === slotId);
        const slotName = slotConfig ? (VIETNAMESE[slotConfig.labelKey] as string) : slotId; 

        if (itemToEquipObj) {
            showNotification(VIETNAMESE.itemEquipped(itemToEquipObj.name, slotName), 'info');
        } else if (previousItemIdInSlot) {
            const unequippedItemObj = newKb.inventory.find(i => i.id === previousItemIdInSlot);
            if (unequippedItemObj) {
                 showNotification(VIETNAMESE.itemUnequipped(unequippedItemObj.name, slotName), 'info');
            }
        }
        return newKb;
    });
  }, [showNotification, setKnowledgeBase]);

  const handleCraftItem = useCallback(async (
    desiredCategory: GameTemplates.ItemCategoryValues,
    requirements: string,
    materialIds: string[]
  ) => {
    setIsCraftingItem(true);
    setApiError(null);

    const materialsForPrompt = materialIds
      .map(id => knowledgeBase.inventory.find(item => item.id === id && item.category === GameTemplates.ItemCategory.MATERIAL))
      .filter(item => item !== undefined) as GameTemplates.MaterialTemplate[];

    if (materialsForPrompt.length === 0 && materialIds.length > 0) {
        showNotification("Lỗi: Không tìm thấy thông tin nguyên liệu đã chọn.", "error");
        setIsCraftingItem(false);
        return;
    }
    
    const materialsPromptData = materialsForPrompt.map(m => ({
        name: m.name,
        description: m.description,
        category: m.category, 
        materialType: m.materialType
    }));

    try {
        const { response: parsedAiResponse, rawText } = await generateCraftedItemViaAI(
            desiredCategory,
            requirements,
            materialsPromptData,
            knowledgeBase.playerStats, 
            knowledgeBase.worldConfig?.playerName,
            knowledgeBase.worldConfig?.genre, 
            knowledgeBase.worldConfig?.isCultivationEnabled,
            knowledgeBase.worldConfig?.customGenreName,
            (prompt) => {
                setSentCraftingPromptsLog(prev => [prompt, ...prev].slice(0, 10));
            }
        );
        setReceivedCraftingResponsesLog(prev => [rawText, ...prev].slice(0,10));

        let tempKb = JSON.parse(JSON.stringify(knowledgeBase)) as KnowledgeBase;
        const messagesForCrafting: GameMessage[] = [];
        
        if (parsedAiResponse.narration && parsedAiResponse.narration.trim() !== "") {
            messagesForCrafting.push({
                id: `craft-desc-${Date.now()}`,
                type: 'system', 
                content: parsedAiResponse.narration.trim(),
                timestamp: Date.now(), turnNumber: tempKb.playerStats.turn 
            });
        }
        
        const { newKb: kbAfterItemAcquired, systemMessagesFromTags } = await performTagProcessing(tempKb, parsedAiResponse.tags, tempKb.playerStats.turn, setKnowledgeBase, logNpcAvatarPromptCallback); 
        tempKb = kbAfterItemAcquired;
        
        const acquiredItemName = parsedAiResponse.tags.find(tag => tag.toUpperCase().startsWith("[ITEM_ACQUIRED:"))?.match(/name="([^"]+)"/i)?.[1];

        if (acquiredItemName) {
             if (acquiredItemName === VIETNAMESE.craftingFailure || parsedAiResponse.tags.some(tag => tag.includes(VIETNAMESE.craftingFailure))) {
                if (!parsedAiResponse.narration) { 
                    messagesForCrafting.push({
                        id: `craft-fail-msg-${Date.now()}`, type: 'system',
                        content: VIETNAMESE.craftingFailure,
                        timestamp: Date.now(), turnNumber: tempKb.playerStats.turn
                    });
                }
                showNotification(VIETNAMESE.craftingFailure, 'warning');
            } else {
                 messagesForCrafting.push({
                    id: `craft-success-msg-${Date.now()}`, type: 'system',
                    content: VIETNAMESE.craftingSuccess(acquiredItemName),
                    timestamp: Date.now(), turnNumber: tempKb.playerStats.turn
                });
                showNotification(VIETNAMESE.craftingSuccess(acquiredItemName), 'success');
            }
        } else if (!parsedAiResponse.narration && parsedAiResponse.tags.length === 0) { 
             messagesForCrafting.push({
                id: `craft-error-msg-${Date.now()}`, type: 'system',
                content: VIETNAMESE.errorCraftingItem + " AI không trả về đúng định dạng.",
                timestamp: Date.now(), turnNumber: tempKb.playerStats.turn
            });
            showNotification(VIETNAMESE.errorCraftingItem, 'error');
        }
        
        const consumedMaterialsInfo: string[] = [];
        materialsForPrompt.forEach(mat => {
            const invIndex = tempKb.inventory.findIndex(i => i.id === mat.id);
            if (invIndex > -1) {
                tempKb.inventory[invIndex].quantity -= 1;
                consumedMaterialsInfo.push(tempKb.inventory[invIndex].name);
                if (tempKb.inventory[invIndex].quantity <= 0) {
                    tempKb.inventory.splice(invIndex, 1);
                }
            }
        });

        if (consumedMaterialsInfo.length > 0) {
             messagesForCrafting.push({
                id: `craft-consume-${Date.now()}`, type: 'system',
                content: VIETNAMESE.materialsConsumed(consumedMaterialsInfo.join(', ')),
                timestamp: Date.now(), turnNumber: tempKb.playerStats.turn
            });
        }
        
        addMessageAndUpdateState(messagesForCrafting, tempKb);

    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setApiError(errorMsg);
        showNotification(`${VIETNAMESE.errorCraftingItem}: ${errorMsg}`, 'error');
         addMessageAndUpdateState([{
            id: `craft-exception-msg-${Date.now()}`, type: 'system',
            content: `${VIETNAMESE.errorCraftingItem}: ${errorMsg}`,
            timestamp: Date.now(), turnNumber: knowledgeBase.playerStats.turn
        }], knowledgeBase);
    } finally {
        setIsCraftingItem(false);
    }

  }, [knowledgeBase, addMessageAndUpdateState, showNotification, setApiError, setReceivedCraftingResponsesLog, setSentCraftingPromptsLog, setKnowledgeBase, logNpcAvatarPromptCallback]);


  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900"><Spinner text="Đang tải và khởi tạo..." /></div>;
  }
  
  if (storageInitError && currentScreen !== GameScreen.StorageSettings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{VIETNAMESE.errorInitializingStorage}</h1>
        <p className="text-lg text-gray-300 mb-6">{storageInitError}</p>
        <Button onClick={() => setCurrentScreen(GameScreen.StorageSettings)}>
          {VIETNAMESE.storageSettings}
        </Button>
      </div>
    );
  }
  
  const renderAppContent = () => {
      switch (currentScreen) {
        case GameScreen.Initial:
          return <InitialScreen 
                    setCurrentScreen={setCurrentScreen} 
                    onSignOut={() => { /* No-op as Firebase is removed */ }}
                    isFirebaseLoading={false} // Firebase removed
                 />;
        case GameScreen.GameSetup:
          return <GameSetupScreen 
                    setCurrentScreen={setCurrentScreen} 
                    onSetupComplete={(settings, rawAvatarData) => { 
                        resetGameData(); 
                        handleSetupCompleteAppWrapper(settings, rawAvatarData); 
                    }} 
                 />;
        case GameScreen.Gameplay:
          return <GameplayScreen
                    knowledgeBase={knowledgeBase}
                    gameMessages={gameMessages}
                    isLoading={isLoadingApi || isSummarizingNextPageTransition || isSummarizingOnLoad || isAutoSaving || isUploadingAvatar}
                    onPlayerAction={handlePlayerAction}
                    onQuit={() => {
                      resetGameData();
                      setCurrentScreen(GameScreen.Initial);
                      setIsAutoPlaying(false);
                    }}
                    rawAiResponsesLog={rawAiResponsesLog}
                    sentPromptsLog={sentPromptsLog}
                    latestPromptTokenCount={latestPromptTokenCount}
                    summarizationResponsesLog={summarizationResponsesLog}
                    sentCraftingPromptsLog={sentCraftingPromptsLog} 
                    receivedCraftingResponsesLog={receivedCraftingResponsesLog}
                    sentNpcAvatarPromptsLog={sentNpcAvatarPromptsLog} 
                    onSaveGame={handleSaveGame}
                    isSavingGame={isSavingGame}
                    storageType="local" 
                    currentPageDisplay={currentPageDisplay}
                    setCurrentPageDisplay={setCurrentPageDisplay}
                    totalPages={totalPages}
                    onGoToNextPage={() => setCurrentPageDisplay(prev => Math.min(prev + 1, totalPages))}
                    onGoToPrevPage={() => setCurrentPageDisplay(prev => Math.max(prev - 1, 1))}
                    onJumpToPage={(page) => setCurrentPageDisplay(Math.max(1, Math.min(page, totalPages)))}
                    isSummarizing={isSummarizingNextPageTransition || isSummarizingOnLoad}
                    getMessagesForPage={(pageNum) => getMessagesForPageFromHook(pageNum)}
                    isCurrentlyActivePage={currentPageDisplay === totalPages}
                    onRollbackTurn={handleRollbackTurn}
                    isAutoPlaying={isAutoPlaying}
                    onToggleAutoPlay={handleToggleAutoPlay}
                    styleSettings={styleSettings}
                    onUpdateStyleSettings={(newSettings) => {
                        setStyleSettings(newSettings); 
                        showNotification("Cài đặt hiển thị đã được cập nhật.", "success");
                    }}
                    messageIdBeingEdited={messageIdBeingEdited}
                    onStartEditMessage={handleStartEditMessage}
                    onSaveEditedMessage={handleSaveEditedMessage}
                    onCancelEditMessage={handleCancelEditMessage}
                    setCurrentScreen={setCurrentScreen}
                    onUpdatePlayerAvatar={handleUpdatePlayerAvatarInKb} 
                    onUpdateNpcAvatar={handleUpdateNpcAvatarInKb} 
                    isUploadingAvatar={isUploadingAvatar} 
                 />;
        case GameScreen.Equipment: 
          return <EquipmentScreen
                    knowledgeBase={knowledgeBase}
                    setCurrentScreen={setCurrentScreen}
                    onUpdateEquipment={handleUpdateEquipment}
                 />;
        case GameScreen.Crafting:
          return <CraftingScreen
                    knowledgeBase={knowledgeBase}
                    setCurrentScreen={setCurrentScreen}
                    onCraftItem={handleCraftItem}
                    isCrafting={isCraftingItem}
                  />;
        case GameScreen.ApiSettings:
          return <ApiSettingsScreen 
                    setCurrentScreen={setCurrentScreen} 
                    onSettingsSaved={() => {
                      showNotification("Cài đặt API đã được lưu. Các thay đổi sẽ có hiệu lực ngay.", "success");
                    }}
                 />;
        case GameScreen.LoadGameSelection:
            return <LoadGameScreen
                    setCurrentScreen={setCurrentScreen}
                    onLoadGame={handleLoadGame}
                    notify={showNotification}
                    storageType="local" 
                   />;
        case GameScreen.StorageSettings:
            return <StorageSettingsScreen
                    setCurrentScreen={setCurrentScreen}
                    onSettingsSaved={(newSettings) => {
                        setStorageSettings(newSettings); 
                        resetIndexedDBConnection(); 
                        showNotification(VIETNAMESE.storageSettingsSavedMessage, 'success');
                    }}
                   />;
         case GameScreen.ImportExport:
            return <ImportExportScreen
                    setCurrentScreen={setCurrentScreen}
                    storageType="local" 
                    notify={showNotification}
                    fetchSaveGames={fetchSaveGamesForImportExport}
                    loadSpecificGameData={loadSpecificGameDataForExport}
                    importGameData={handleImportGameData}
                    />;
        default:
          return <div>Error: Unknown screen</div>;
      }
  };

  return (
    <>
      {renderAppContent()}
      {notification && (
        <div 
          className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white text-sm z-[100]
                      ${notification.type === 'success' ? 'bg-green-600' : ''}
                      ${notification.type === 'error' ? 'bg-red-600' : ''}
                      ${notification.type === 'info' ? 'bg-blue-600' : ''}
                      ${notification.type === 'warning' ? 'bg-yellow-500 text-gray-800' : ''}`}
        >
          {notification.message}
        </div>
      )}
      {apiError && currentScreen === GameScreen.Gameplay && ( 
         <div className="fixed top-5 left-1/2 -translate-x-1/2 p-3 bg-red-700 text-white rounded-md shadow-lg z-[100] text-xs max-w-md">
            Lỗi API: {apiError}
         </div>
      )}
       {(isCraftingItem || (isLoadingApi && currentScreen === GameScreen.Crafting)) && ( 
         <div className="fixed top-5 left-1/2 -translate-x-1/2 p-3 bg-blue-600 text-white rounded-md shadow-lg z-[100] text-xs max-w-md flex items-center">
            <Spinner size="sm" className="mr-2 !h-4 !w-4" /> {isCraftingItem ? VIETNAMESE.craftingInProgress : VIETNAMESE.contactingAI}
         </div>
       )}
    </>
  );
};
