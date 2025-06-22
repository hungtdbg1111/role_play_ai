
import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, KnowledgeBase, GameMessage, WorldSettings, PlayerStats, ApiConfig, FirebaseUser, SaveGameData, StorageType, FirebaseUserConfig, SaveGameMeta, RealmBaseStatDefinition, TurnHistoryEntry, StyleSettings, PlayerActionInputType } from './types';
import InitialScreen from './components/InitialScreen';
import GameSetupScreen from './components/GameSetupScreen';
import GameplayScreen from './components/GameplayScreen';
import ApiSettingsScreen from './components/ApiSettingsScreen';
import LoadGameScreen from './components/LoadGameScreen';
import StorageSettingsScreen from './components/StorageSettingsScreen';
import ImportExportScreen from './components/ImportExportScreen';
import Spinner from './components/ui/Spinner';
import Button from './components/ui/Button';
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, APP_VERSION, MAX_AUTO_SAVE_SLOTS, TURNS_PER_PAGE, DEFAULT_TIERED_STATS, MAX_TURN_HISTORY_LENGTH } from './constants';
import { signOutUser, saveGameToFirestore, loadGamesFromFirestore, loadSpecificGameFromFirestore, deleteGameFromFirestore, importGameToFirestore } from './services/firebaseService';
import { saveGameToIndexedDB, loadGamesFromIndexedDB, loadSpecificGameFromIndexedDB, deleteGameFromIndexedDB, importGameToIndexedDB } from './services/indexedDBService';
import * as GameTemplates from './templates';
import { useAppInitialization } from './hooks/useAppInitialization';
import { useGameNotifications } from './hooks/useGameNotifications';
import { useGameData } from './hooks/useGameData';
import { useGameActions } from './hooks/useGameActions';
import { calculateStatsForRealm, getMessagesForPage as getMessagesForPageUtil } from './utils/gameLogicUtils'; // Keep utils that App still needs
import { summarizeTurnHistory, getApiSettings as getGeminiApiSettings, countTokens } from './services/geminiService'; // For load game summary

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.Initial);
  
  const {
    storageSettings,
    styleSettings,
    setStorageSettings,
    setStyleSettings,
    firebaseUser,
    setFirebaseUser,
    isInitialLoading,
    storageInitError,
    reInitializeFirebase
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
    getMessagesForPage, // This now comes from useGameData
    addMessageAndUpdateState,
    resetGameData
  } = useGameData();

  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false); // Could be part of a useAutoPlay hook
  const [isSavingGame, setIsSavingGame] = useState<boolean>(false);
  const [isAutoSaving, setIsAutoSaving] = useState<boolean>(false); // For auto-save notification/spinner
  const [isSummarizingOnLoad, setIsSummarizingOnLoad] = useState<boolean>(false);


  const executeSaveGame = useCallback(async (
    kbToSave: KnowledgeBase, 
    messagesToSave: GameMessage[],
    saveName: string,
    existingId: string | null,
    isAuto: boolean
  ): Promise<string | null> => {
    if(isAuto) setIsAutoSaving(true); else setIsSavingGame(true);
    try {
        let newSaveId: string;
        if (storageSettings.storageType === 'cloud') {
            if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForSave);
            newSaveId = await saveGameToFirestore(firebaseUser.uid, kbToSave, messagesToSave, saveName, existingId);
        } else {
            const idForLocal = typeof existingId === 'string' ? parseInt(existingId, 10) : existingId;
            newSaveId = await saveGameToIndexedDB(kbToSave, messagesToSave, saveName, isNaN(idForLocal as number) ? existingId : idForLocal);
        }
        if (!isAuto) {
            showNotification(VIETNAMESE.gameSavedSuccess + ` ("${saveName}")`, 'success');
        } else {
            // console.log(VIETNAMESE.autoSaveSuccess(saveName)); // Removed console log
            // Optionally, show a less intrusive auto-save notification
            // showNotification(VIETNAMESE.autoSaveSuccess(saveName), 'info'); 
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
  }, [storageSettings.storageType, firebaseUser, showNotification]);


  const {
    isLoadingApi,
    apiError, 
    setApiError, // Added from useGameActions
    isSummarizingNextPageTransition,
    handleSetupComplete,
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
    storageType: storageSettings.storageType,
    firebaseUser
  });


  useEffect(() => { // Auto-play logic, moved from App.tsx's main body
    let autoPlayTimeoutId: NodeJS.Timeout | undefined;
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
        autoPlayTimeoutId = setTimeout(() => {
          if (isAutoPlaying && !isLoadingApi && !isSummarizingNextPageTransition && !isSummarizingOnLoad && currentScreen === GameScreen.Gameplay && currentPageDisplay === totalPages) {
            handlePlayerAction(actionToTake!, isChoiceAction, actionType, 'default');
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
    setIsSavingGame(true); // Using isSavingGame as a general "loading content" flag here. Could rename.
    setApiError(null); // Clear previous API errors if any
    setIsSummarizingOnLoad(false); 
    try {
        let gameData: SaveGameData | null = null;
        if (storageSettings.storageType === 'cloud') {
            if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
            gameData = await loadSpecificGameFromFirestore(firebaseUser.uid, saveId);
        } else {
            gameData = await loadSpecificGameFromIndexedDB(saveId);
        }

        if (gameData) {
            setGameMessages(gameData.gameMessages); 
            let loadedKb = gameData.knowledgeBase;
            loadedKb.autoSaveTurnCounter = loadedKb.autoSaveTurnCounter ?? 0;
            loadedKb.currentAutoSaveSlotIndex = loadedKb.currentAutoSaveSlotIndex ?? 0;
            loadedKb.autoSaveSlotIds = Array.isArray(loadedKb.autoSaveSlotIds) && loadedKb.autoSaveSlotIds.length === MAX_AUTO_SAVE_SLOTS 
                ? loadedKb.autoSaveSlotIds 
                : Array(MAX_AUTO_SAVE_SLOTS).fill(null);
            loadedKb.manualSaveName = gameData.name || loadedKb.manualSaveName || loadedKb.worldConfig?.saveGameName || "Không Tên";
            loadedKb.manualSaveId = loadedKb.manualSaveId ?? (storageSettings.storageType === 'local' ? gameData.id : null) ?? null;

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
            const currentRealmStats = calculateStatsForRealm(loadedKb.playerStats.realm, loadedKb.realmProgressionList, loadedKb.currentRealmBaseStats);
            loadedKb.playerStats = { ...loadedKb.playerStats, ...currentRealmStats };
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
                    if (currentModel === 'gemini-1.5-flash') {
                      setLatestPromptTokenCount('N/A (model)');
                    } else {
                      setLatestPromptTokenCount('Đang tính...');
                      countTokens(prompt)
                        .then(count => setLatestPromptTokenCount(count))
                        .catch(err => {
                          // console.warn("Could not count tokens for prompt:", err);
                          setLatestPromptTokenCount('Lỗi');
                        });
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
                                    logSentPromptForLoad,
                                    logSummarizationResponseForLoad
                                );
                                if (!tempKb.pageSummaries) tempKb.pageSummaries = {};
                                tempKb.pageSummaries[pageNum] = summaryResult.processedSummary;
                                tempKb.lastSummarizedTurn = Math.max(tempKb.lastSummarizedTurn || 0, endTurn);
                            } catch (summaryError) { 
                                // console.error(`Error re-summarizing page ${pageNum} on load:`, summaryError); 
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
        // console.error("Error in handleLoadGame:", e);
        setApiError(errorMsg); // Use apiError state if it's general purpose
        showNotification(errorMsg, 'error');
        setCurrentScreen(GameScreen.LoadGameSelection); 
    } finally {
        setIsSavingGame(false); // Re-purpose for general loading flag
        setIsSummarizingOnLoad(false); 
    }
  };

  const fetchSaveGamesForImportExport = async (): Promise<SaveGameMeta[]> => {
    if (storageSettings.storageType === 'cloud') {
      if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
      return loadGamesFromFirestore(firebaseUser.uid);
    } else {
      return loadGamesFromIndexedDB();
    }
  };

  const loadSpecificGameDataForExport = async (saveId: string): Promise<SaveGameData | null> => {
    if (storageSettings.storageType === 'cloud') {
      if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
      return loadSpecificGameFromFirestore(firebaseUser.uid, saveId);
    } else {
      return loadSpecificGameFromIndexedDB(saveId);
    }
  };

  const handleImportGameData = async (gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'>) => {
    try {
      if (storageSettings.storageType === 'cloud') {
        if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
        await importGameToFirestore(firebaseUser.uid, gameDataToImport);
      } else {
        await importGameToIndexedDB(gameDataToImport);
      }
      showNotification(VIETNAMESE.dataImportedSuccess, 'success');
    } catch (e) {
      // console.error("Error importing game in App.tsx:", e);
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
            const lastHistoryEntry = knowledgeBase.turnHistory[knowledgeBase.turnHistory.length - 1];
            setKnowledgeBase(lastHistoryEntry.knowledgeBaseSnapshot);
            setGameMessages(lastHistoryEntry.gameMessagesSnapshot);
            const rolledBackKb = lastHistoryEntry.knowledgeBaseSnapshot;
            const newTotalPages = Math.max(1, rolledBackKb.currentPageHistory?.length || 1);
            let newCurrentPage = newTotalPages; 
            if (rolledBackKb.currentPageHistory) {
                for (let i = rolledBackKb.currentPageHistory.length - 1; i >= 0; i--) {
                    if (rolledBackKb.playerStats.turn >= rolledBackKb.currentPageHistory[i]) {
                        newCurrentPage = i + 1;
                        break;
                    }
                }
            }
            setCurrentPageDisplay(newCurrentPage);
            showNotification(VIETNAMESE.rollbackSuccess, 'success');
        } else {
            showNotification(VIETNAMESE.cannotRollbackFurther, 'warning');
        }
    };

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
                    firebaseUser={firebaseUser}
                    onSignOut={async () => { await signOutUser(); setFirebaseUser(null); }}
                    isFirebaseLoading={isInitialLoading && storageSettings.storageType === 'cloud'}
                 />;
        case GameScreen.GameSetup:
          return <GameSetupScreen 
                    setCurrentScreen={setCurrentScreen} 
                    onSetupComplete={(settings) => {
                        resetGameData(); // Reset data before starting new setup
                        handleSetupComplete(settings);
                    }} 
                 />;
        case GameScreen.Gameplay:
          return <GameplayScreen
                    knowledgeBase={knowledgeBase}
                    gameMessages={gameMessages}
                    isLoading={isLoadingApi || isSummarizingNextPageTransition || isSummarizingOnLoad || isAutoSaving}
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
                    firebaseUser={firebaseUser}
                    onSaveGame={handleSaveGame}
                    isSavingGame={isSavingGame}
                    storageType={storageSettings.storageType}
                    currentPageDisplay={currentPageDisplay}
                    setCurrentPageDisplay={setCurrentPageDisplay}
                    totalPages={totalPages}
                    onGoToNextPage={() => setCurrentPageDisplay(prev => Math.min(prev + 1, totalPages))}
                    onGoToPrevPage={() => setCurrentPageDisplay(prev => Math.max(prev - 1, 1))}
                    onJumpToPage={(page) => setCurrentPageDisplay(Math.max(1, Math.min(page, totalPages)))}
                    isSummarizing={isSummarizingNextPageTransition || isSummarizingOnLoad}
                    getMessagesForPage={(pageNum) => getMessagesForPageUtil(pageNum, knowledgeBase, gameMessages)}
                    isCurrentlyActivePage={currentPageDisplay === totalPages}
                    onRollbackTurn={handleRollbackTurn}
                    isAutoPlaying={isAutoPlaying}
                    onToggleAutoPlay={handleToggleAutoPlay}
                    styleSettings={styleSettings}
                    onUpdateStyleSettings={(newSettings) => {
                        setStyleSettings(newSettings); // This comes from useAppInitialization which handles localStorage
                        showNotification("Cài đặt hiển thị đã được cập nhật.", "success");
                    }}
                    messageIdBeingEdited={messageIdBeingEdited}
                    onStartEditMessage={handleStartEditMessage}
                    onSaveEditedMessage={handleSaveEditedMessage}
                    onCancelEditMessage={handleCancelEditMessage}
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
                    firebaseUser={firebaseUser}
                    onLoadGame={handleLoadGame}
                    notify={showNotification}
                    storageType={storageSettings.storageType}
                   />;
        case GameScreen.StorageSettings:
            return <StorageSettingsScreen
                    setCurrentScreen={setCurrentScreen}
                    onSettingsSaved={(newSettings) => {
                        setStorageSettings(newSettings); // This comes from useAppInitialization
                        reInitializeFirebase(newSettings.storageType === 'cloud' ? newSettings.firebaseUserConfig : null)
                            .then(() => {
                                 showNotification(VIETNAMESE.storageSettingsSavedMessage + (newSettings.storageType === 'cloud' ? " Thay đổi Firebase có thể cần tải lại trang." : ""), 'success');
                            })
                            .catch(err => {
                                showNotification(`Lỗi khi áp dụng cài đặt lưu trữ mới: ${err.message}`, 'error');
                            });
                    }}
                   />;
         case GameScreen.ImportExport:
            return <ImportExportScreen
                    setCurrentScreen={setCurrentScreen}
                    storageType={storageSettings.storageType}
                    firebaseUser={firebaseUser}
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
      {apiError && currentScreen === GameScreen.Gameplay && ( /* Example of displaying API error */
         <div className="fixed top-5 left-1/2 -translate-x-1/2 p-3 bg-red-700 text-white rounded-md shadow-lg z-[100] text-xs max-w-md">
            Lỗi API: {apiError}
         </div>
      )}
    </>
  );
};
