
import React from 'react';
import { GameScreen } from '../../../types';
import Button from '../../ui/Button';
import { VIETNAMESE } from '../../../constants';

interface GameHeaderProps {
  gameTitleDisplay: string;
  isCharPanelOpen: boolean;
  isQuestsPanelOpen: boolean;
  isWorldPanelOpen: boolean;
  setIsCharPanelOpen: (isOpen: boolean) => void;
  setIsQuestsPanelOpen: (isOpen: boolean) => void;
  setIsWorldPanelOpen: (isOpen: boolean) => void;
  setCurrentScreen: (screen: GameScreen) => void;
  onRollbackTurn: () => void;
  isStopButtonDisabled: boolean;
  isLoading: boolean; // For stop button
  onSaveGame: () => Promise<void>;
  isSaveDisabled: boolean;
  isSavingGame: boolean;
  showDebugPanel: boolean;
  setShowDebugPanel: (show: boolean) => void;
  onQuit: () => void;
  isSummarizing: boolean; // For disabling buttons
  setIsStyleSettingsModalOpen: (isOpen: boolean) => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({
  gameTitleDisplay,
  isCharPanelOpen,
  isQuestsPanelOpen,
  isWorldPanelOpen,
  setIsCharPanelOpen,
  setIsQuestsPanelOpen,
  setIsWorldPanelOpen,
  setCurrentScreen,
  onRollbackTurn,
  isStopButtonDisabled,
  isLoading,
  onSaveGame,
  isSaveDisabled,
  isSavingGame,
  showDebugPanel,
  setShowDebugPanel,
  onQuit,
  isSummarizing,
  setIsStyleSettingsModalOpen,
}) => {
  return (
    <header className="mb-2 sm:mb-4 flex flex-col sm:flex-row justify-between items-center flex-shrink-0 gap-2">
      <h1
        className="text-xl sm:text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-cyan-500 to-blue-600 truncate max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl"
        title={gameTitleDisplay}
      >
        {gameTitleDisplay}
      </h1>
      <div className="flex space-x-1 sm:space-x-2 flex-wrap gap-y-1 sm:gap-y-2 justify-center sm:justify-end">
        <Button onClick={() => setIsCharPanelOpen(true)} variant={isCharPanelOpen ? "primary" : "secondary"} size="sm" aria-pressed={isCharPanelOpen} disabled={isSummarizing} className="px-2 sm:px-3">
          <span className="sm:hidden">{VIETNAMESE.characterButtonShort}</span>
          <span className="hidden sm:inline">{VIETNAMESE.characterButton}</span>
        </Button>
        <Button onClick={() => setCurrentScreen(GameScreen.Equipment)} variant="secondary" size="sm" disabled={isSummarizing} className="px-2 sm:px-3 border-purple-500 text-purple-300 hover:bg-purple-700 hover:text-white">
          <span className="sm:hidden">{VIETNAMESE.equipmentButtonShort}</span>
          <span className="hidden sm:inline">{VIETNAMESE.equipmentButton}</span>
        </Button>
        <Button onClick={() => setCurrentScreen(GameScreen.Crafting)} variant="secondary" size="sm" disabled={isSummarizing} className="px-2 sm:px-3 border-orange-500 text-orange-300 hover:bg-orange-700 hover:text-white">
          <span className="sm:hidden">{VIETNAMESE.craftingButtonShort}</span>
          <span className="hidden sm:inline">{VIETNAMESE.craftingButton}</span>
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
          title={isLoading ? "Dừng nhận phản hồi và lùi lượt" : VIETNAMESE.rollbackTurn}
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
          title={VIETNAMESE.saveGameButton}
          className="px-2 sm:px-3"
        >
          <span className="sm:hidden">💾</span><span className="hidden sm:inline">{VIETNAMESE.saveGameButtonShort || VIETNAMESE.saveGameButton}</span>
        </Button>
        <Button
          onClick={() => setShowDebugPanel(!showDebugPanel)}
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
  );
};

export default GameHeader;
