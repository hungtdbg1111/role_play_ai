
import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, SaveGameMeta, FirebaseUser, StorageType } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { VIETNAMESE, MAX_AUTO_SAVE_SLOTS } from '../constants';
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
  const [manualSave, setManualSave] = useState<SaveGameMeta | null>(null);
  const [autoSaves, setAutoSaves] = useState<SaveGameMeta[]>([]);
  const [otherSaves, setOtherSaves] = useState<SaveGameMeta[]>([]); // For imported or older saves
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchSaveGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    // console.log(`[DEBUG_DELETE] fetchSaveGames called. Storage type: ${storageType}`);
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
        // console.log(`[DEBUG_DELETE] Calling loadGamesFromFirestore for user: ${firebaseUser.uid}`);
        fetchedSaves = await loadGamesFromFirestore(firebaseUser.uid);
      } else { // 'local'
        // console.log("[DEBUG_DELETE] Calling loadGamesFromIndexedDB.");
        fetchedSaves = await loadGamesFromIndexedDB();
      }
      // console.log("[DEBUG_DELETE] Fetched saves:", fetchedSaves);
      
      // Sort and categorize saves
      const currentManualSave = fetchedSaves.find(s => !s.name.startsWith("Auto Save Slot") && !s.name.startsWith(VIETNAMESE.importFileButton)); // Simple heuristic
      const currentAutoSaves = fetchedSaves.filter(s => s.name.startsWith("Auto Save Slot")).sort((a,b) => {
        const slotA = parseInt(a.name.replace("Auto Save Slot ", ""), 10);
        const slotB = parseInt(b.name.replace("Auto Save Slot ", ""), 10);
        return slotA - slotB;
      });
      const currentOtherSaves = fetchedSaves.filter(s => 
        s !== currentManualSave && 
        !currentAutoSaves.includes(s)
      ).sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime());

      setManualSave(currentManualSave || null);
      setAutoSaves(currentAutoSaves.slice(0, MAX_AUTO_SAVE_SLOTS));
      setOtherSaves(currentOtherSaves);

    } catch (e) {
      // console.error("[DEBUG_DELETE] Error fetching save games:", e);
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
      // console.error(`Error initiating load for game ${saveId}:`, e);
      notify(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDelete = async (saveId: string, saveName: string) => {
    // console.log(`[DEBUG_DELETE] handleDelete called. Save ID: ${saveId}, Name: "${saveName}", Storage: ${storageType}`);
    // console.log("[DEBUG_DELETE] Proceeding with deletion directly (confirm step removed for debug).");

    setActionInProgress(`delete-${saveId}`);
    try {
      if (storageType === 'cloud') {
        if (!firebaseUser) {
          notify(VIETNAMESE.signInRequiredForLoad, 'error'); 
          setActionInProgress(null);
          // console.log("[DEBUG_DELETE] Deletion aborted: Firebase user not available for cloud storage.");
          return;
        }
        // console.log(`[DEBUG_DELETE] Calling deleteGameFromFirestore for user ${firebaseUser.uid}, saveId ${saveId}`);
        await deleteGameFromFirestore(firebaseUser.uid, saveId);
        // console.log(`[DEBUG_DELETE] deleteGameFromFirestore successful for ${saveId}`);
      } else { // 'local'
        // console.log(`[DEBUG_DELETE] Calling deleteGameFromIndexedDB for saveId ${saveId}`);
        await deleteGameFromIndexedDB(saveId);
        // console.log(`[DEBUG_DELETE] deleteGameFromIndexedDB presumed successful for ${saveId}.`);
      }
      notify(VIETNAMESE.gameDeletedSuccess, 'success');
      // console.log("[DEBUG_DELETE] Refetching save games after deletion.");
      fetchSaveGames(); // Refresh the list
    } catch (e) {
      // console.error(`[DEBUG_DELETE] Error during game deletion process for saveId ${saveId}:`, e);
      notify(VIETNAMESE.errorDeletingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setActionInProgress(null);
      // console.log(`[DEBUG_DELETE] handleDelete finished for saveId ${saveId}.`);
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleString('vi-VN', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit', second: '2-digit' 
    });
  };

  const renderSaveSlot = (slot: SaveGameMeta, isManual: boolean = false) => (
    <div key={slot.id} className={`p-4 rounded-lg shadow-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-colors duration-150 ${isManual ? 'bg-emerald-800/30 border border-emerald-600 hover:bg-emerald-700/40' : 'bg-gray-800 hover:bg-gray-750'}`}>
      <div className="flex-grow">
        <p className={`text-lg font-semibold ${isManual ? 'text-emerald-300' : 'text-indigo-300'}`}>{slot.name}</p>
        <div className="text-xs text-gray-400">
          <span>{VIETNAMESE.lastSaved}: {formatDate(slot.timestamp)}</span>
          {slot.size !== undefined && (
            <span className="ml-3 pl-3 border-l border-gray-600">{VIETNAMESE.fileSizeLabel}: {formatBytes(slot.size)}</span>
          )}
        </div>
      </div>
      <div className="flex space-x-4 flex-shrink-0 mt-3 sm:mt-0 self-center sm:self-auto"> {/* Increased space-x-2 to space-x-4 */}
        <Button 
          variant="primary" 
          size="sm"
          onClick={() => handleLoad(slot.id)}
          isLoading={actionInProgress === `load-${slot.id}`}
          disabled={!!actionInProgress}
          loadingText="Đang tải..."
          className={isManual ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500' : ''}
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
  );

  const allSavesCount = (manualSave ? 1 : 0) + autoSaves.length + otherSaves.length;

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
        
        {!isLoading && !error && allSavesCount === 0 && (
          <p className="text-gray-400 italic text-center py-8">{VIETNAMESE.noSaveGamesFound}</p>
        )}

        {!isLoading && !error && allSavesCount > 0 && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
            {manualSave && (
              <section>
                <h3 className="text-xl font-semibold text-emerald-400 mb-2">Lưu Thủ Công</h3>
                {renderSaveSlot(manualSave, true)}
              </section>
            )}
            
            {autoSaves.length > 0 && (
              <section>
                <h3 className="text-xl font-semibold text-sky-400 mb-2">Lưu Tự Động (Mới nhất ở trên)</h3>
                <div className="space-y-3">
                  {autoSaves.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()).map(slot => renderSaveSlot(slot))}
                </div>
              </section>
            )}

            {otherSaves.length > 0 && (
                 <section>
                    <h3 className="text-xl font-semibold text-gray-400 mb-2">Các File Lưu Khác (Đã Nhập, Cũ)</h3>
                    <div className="space-y-3">
                        {otherSaves.map(slot => renderSaveSlot(slot))}
                    </div>
                </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadGameScreen;
