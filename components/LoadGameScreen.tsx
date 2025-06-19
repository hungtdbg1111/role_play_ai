
import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, SaveGameMeta, FirebaseUser } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { VIETNAMESE } from '../constants';
import { loadGamesFromFirestore, deleteGameFromFirestore } from '../services/firebaseService';

interface LoadGameScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  firebaseUser: FirebaseUser; // User must be authenticated to see this screen
  onLoadGame: (saveId: string) => Promise<void>;
  notify: (message: string, type: 'success' | 'error') => void;
}

const LoadGameScreen: React.FC<LoadGameScreenProps> = ({ setCurrentScreen, firebaseUser, onLoadGame, notify }) => {
  const [saveSlots, setSaveSlots] = useState<SaveGameMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null); // 'load-id' or 'delete-id'

  const fetchSaveGames = useCallback(async () => {
    if (!firebaseUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedSaves = await loadGamesFromFirestore(firebaseUser.uid);
      setSaveSlots(fetchedSaves);
    } catch (e) {
      console.error("Error fetching save games:", e);
      setError(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''));
      notify(VIETNAMESE.errorLoadingGame, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, notify]);

  useEffect(() => {
    fetchSaveGames();
  }, [fetchSaveGames]);

  const handleLoad = async (saveId: string) => {
    setActionInProgress(`load-${saveId}`);
    try {
      await onLoadGame(saveId);
      // App.tsx will navigate to GameplayScreen after successful load
    } catch (e) {
      console.error(`Error loading game ${saveId}:`, e);
      notify(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (saveId: string, saveName: string) => {
    if (!window.confirm(`${VIETNAMESE.confirmDeleteSaveMessage}\n"${saveName}"`)) {
      return;
    }
    setActionInProgress(`delete-${saveId}`);
    try {
      await deleteGameFromFirestore(firebaseUser.uid, saveId);
      notify(VIETNAMESE.gameDeletedSuccess, 'success');
      setSaveSlots(prevSlots => prevSlots.filter(slot => slot.id !== saveId)); // Optimistic update
    } catch (e) {
      console.error(`Error deleting game ${saveId}:`, e);
      notify(VIETNAMESE.errorDeletingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setActionInProgress(null);
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleString('vi-VN', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-600">
            {VIETNAMESE.loadGameScreenTitle}
          </h2>
          <Button variant="ghost" onClick={() => setCurrentScreen(GameScreen.Initial)}>
            {VIETNAMESE.goBackButton}
          </Button>
        </div>

        {isLoading && <Spinner text="Đang tải danh sách lưu..." className="my-8" />}
        {error && <p className="text-red-400 bg-red-900 p-3 rounded-md text-center my-4">{error}</p>}
        
        {!isLoading && !error && saveSlots.length === 0 && (
          <p className="text-gray-400 italic text-center py-8">{VIETNAMESE.noSaveGamesFound}</p>
        )}

        {!isLoading && !error && saveSlots.length > 0 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {saveSlots.map((slot) => (
              <div key={slot.id} className="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex-grow">
                  <p className="text-lg font-semibold text-indigo-300">{slot.name}</p>
                  <p className="text-xs text-gray-400">{VIETNAMESE.lastSaved}: {formatDate(slot.timestamp)}</p>
                </div>
                <div className="flex space-x-2 flex-shrink-0 mt-3 sm:mt-0">
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleLoad(slot.id)}
                    isLoading={actionInProgress === `load-${slot.id}`}
                    disabled={!!actionInProgress}
                    loadingText="Đang tải..."
                  >
                    {VIETNAMESE.loadGameButton}
                  </Button>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => handleDelete(slot.id, slot.name)}
                    isLoading={actionInProgress === `delete-${slot.id}`}
                    disabled={!!actionInProgress}
                    loadingText="Đang xóa..."
                  >
                    {VIETNAMESE.deleteSaveButton}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadGameScreen;
