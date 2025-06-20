
import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, SaveGameMeta, FirebaseUser, StorageType } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { VIETNAMESE } from '../constants';
import { loadGamesFromFirestore, deleteGameFromFirestore } from '../services/firebaseService';
import { loadGamesFromIndexedDB, deleteGameFromIndexedDB } from '../services/indexedDBService';

// Helper function to format bytes
function formatBytes(bytes: number | undefined, decimals: number = 2): string {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '0 Bytes'; // Handle edge cases like log(negative) or very small numbers
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface LoadGameScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  firebaseUser: FirebaseUser | null; // Nullable if local storage doesn't require auth
  onLoadGame: (saveId: string) => Promise<void>; // App.tsx handles backend routing
  notify: (message: string, type: 'success' | 'error') => void;
  storageType: StorageType;
}

const LoadGameScreen: React.FC<LoadGameScreenProps> = ({ 
  setCurrentScreen, 
  firebaseUser, 
  onLoadGame, 
  notify,
  storageType 
}) => {
  const [saveSlots, setSaveSlots] = useState<SaveGameMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchSaveGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let fetchedSaves: SaveGameMeta[] = [];
      if (storageType === 'cloud') {
        if (!firebaseUser) {
          setError(VIETNAMESE.signInRequiredForLoad);
          notify(VIETNAMESE.signInRequiredForLoad, 'error');
          setIsLoading(false);
          setCurrentScreen(GameScreen.Initial); // Redirect if not signed in for cloud
          return;
        }
        fetchedSaves = await loadGamesFromFirestore(firebaseUser.uid);
      } else { // 'local'
        fetchedSaves = await loadGamesFromIndexedDB();
      }
      setSaveSlots(fetchedSaves);
    } catch (e) {
      console.error("Error fetching save games:", e);
      const errorMsg = VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : '');
      setError(errorMsg);
      notify(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [firebaseUser, storageType, notify, setCurrentScreen]);

  useEffect(() => {
    fetchSaveGames();
  }, [fetchSaveGames]);

  const handleLoad = async (saveId: string) => {
    setActionInProgress(`load-${saveId}`);
    try {
      await onLoadGame(saveId); // App.tsx handles which backend to use
    } catch (e) {
      // Error should be handled by App.tsx's onLoadGame, but catch here just in case
      console.error(`Error initiating load for game ${saveId}:`, e);
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
      if (storageType === 'cloud') {
        if (!firebaseUser) {
          notify(VIETNAMESE.signInRequiredForLoad, 'error'); // Should not happen if UI is correct
          setActionInProgress(null);
          return;
        }
        await deleteGameFromFirestore(firebaseUser.uid, saveId);
      } else { // 'local'
        await deleteGameFromIndexedDB(saveId);
      }
      notify(VIETNAMESE.gameDeletedSuccess, 'success');
      setSaveSlots(prevSlots => prevSlots.filter(slot => slot.id !== saveId));
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
            {VIETNAMESE.loadGameScreenTitle} ({storageType === 'local' ? 'Cục Bộ' : 'Đám Mây'})
          </h2>
          <Button variant="ghost" onClick={() => setCurrentScreen(GameScreen.Initial)}>
            {VIETNAMESE.goBackButton}
          </Button>
        </div>

        {isLoading && <Spinner text="Đang tải danh sách lưu..." className="my-8" />}
        {error && <p className="text-red-400 bg-red-900/50 p-3 rounded-md text-center my-4 border border-red-700">{error}</p>}
        
        {!isLoading && !error && saveSlots.length === 0 && (
          <p className="text-gray-400 italic text-center py-8">{VIETNAMESE.noSaveGamesFound}</p>
        )}

        {!isLoading && !error && saveSlots.length > 0 && (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {saveSlots.map((slot) => (
              <div key={slot.id} className="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-gray-750 transition-colors duration-150">
                <div className="flex-grow">
                  <p className="text-lg font-semibold text-indigo-300">{slot.name}</p>
                  <div className="text-xs text-gray-400">
                    <span>{VIETNAMESE.lastSaved}: {formatDate(slot.timestamp)}</span>
                    {slot.size !== undefined && (
                      <span className="ml-3 pl-3 border-l border-gray-600">{VIETNAMESE.fileSizeLabel}: {formatBytes(slot.size)}</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2 flex-shrink-0 mt-3 sm:mt-0 self-center sm:self-auto">
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