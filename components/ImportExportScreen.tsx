
import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { GameScreen, SaveGameMeta, StorageType, SaveGameData, KnowledgeBase, GameMessage, TurnHistoryEntry } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { VIETNAMESE, APP_VERSION, KEYFRAME_INTERVAL } from '../constants';
import * as jsonpatch from "fast-json-patch"; 
import pako from 'pako';

// Helper function to format bytes
function formatBytes(bytes: number | undefined, decimals: number = 2): string {
  if (bytes === undefined || bytes === null || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (i < 0 || i >= sizes.length) return '0 Bytes';
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

interface ImportExportScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  storageType: StorageType; 
  notify: (message: string, type: 'success' | 'error') => void;
  fetchSaveGames: () => Promise<SaveGameMeta[]>;
  loadSpecificGameData: (saveId: string) => Promise<SaveGameData | null>;
  importGameData: (gameData: Omit<SaveGameData, 'id' | 'timestamp'> & { name: string }) => Promise<void>;
}

const ImportExportScreen: React.FC<ImportExportScreenProps> = ({
  setCurrentScreen,
  storageType, 
  notify,
  fetchSaveGames,
  loadSpecificGameData,
  importGameData,
}) => {
  const [saveSlots, setSaveSlots] = useState<SaveGameMeta[]>([]);
  const [selectedSaveForExport, setSelectedSaveForExport] = useState<string | null>(null);
  const [isFetchingSlots, setIsFetchingSlots] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [fileToImport, setFileToImport] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSaveSlots = useCallback(async () => {
    setIsFetchingSlots(true);
    try {
      const fetchedSaves = await fetchSaveGames();
      setSaveSlots(fetchedSaves);
    } catch (e) {
      console.error("Error fetching save games for import/export:", e);
      notify(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setIsFetchingSlots(false);
    }
  }, [fetchSaveGames, notify]); 

  useEffect(() => {
    loadSaveSlots();
  }, [loadSaveSlots]);

  const reconstructSnapshotsForExport = (gameData: SaveGameData): SaveGameData => {
    if (gameData.knowledgeBase && gameData.knowledgeBase.turnHistory) {
        let lastKeyframeKbSnapshot: KnowledgeBase | null = null;
        let lastKeyframeMessagesSnapshot: GameMessage[] | null = null;
        const reconstructedTurnHistory: TurnHistoryEntry[] = [];

        for (const entry of gameData.knowledgeBase.turnHistory) {
            if (entry.type === 'keyframe') {
                lastKeyframeKbSnapshot = JSON.parse(JSON.stringify(entry.knowledgeBaseSnapshot));
                lastKeyframeMessagesSnapshot = JSON.parse(JSON.stringify(entry.gameMessagesSnapshot));
                reconstructedTurnHistory.push(entry);
            } else if (entry.type === 'delta') {
                if (!lastKeyframeKbSnapshot || !lastKeyframeMessagesSnapshot || !entry.knowledgeBaseDelta || !entry.gameMessagesDelta) {
                    console.error('Cannot reconstruct delta frame for export, missing keyframe or delta data.', entry);
                    reconstructedTurnHistory.push(entry.knowledgeBaseSnapshot && entry.gameMessagesSnapshot ? entry : {...entry, knowledgeBaseSnapshot: {} as KnowledgeBase, gameMessagesSnapshot: []});
                    continue;
                }
                let newKbSnapshotForDelta = lastKeyframeKbSnapshot;
                if(entry.knowledgeBaseDelta.length > 0){
                     newKbSnapshotForDelta = jsonpatch.applyPatch(
                        JSON.parse(JSON.stringify(lastKeyframeKbSnapshot)),
                        entry.knowledgeBaseDelta
                    ).newDocument as KnowledgeBase;
                }
               
                let newMessagesSnapshotForDelta = lastKeyframeMessagesSnapshot;
                if(entry.gameMessagesDelta.length > 0) {
                    newMessagesSnapshotForDelta = jsonpatch.applyPatch(
                        JSON.parse(JSON.stringify(lastKeyframeMessagesSnapshot)),
                        entry.gameMessagesDelta
                    ).newDocument as GameMessage[];
                }
                
                reconstructedTurnHistory.push({
                    ...entry,
                    knowledgeBaseSnapshot: newKbSnapshotForDelta,
                    gameMessagesSnapshot: newMessagesSnapshotForDelta,
                });
                lastKeyframeKbSnapshot = newKbSnapshotForDelta;
                lastKeyframeMessagesSnapshot = newMessagesSnapshotForDelta;
            } else {
                reconstructedTurnHistory.push(entry);
            }
        }
        gameData.knowledgeBase.turnHistory = reconstructedTurnHistory;
    }
    return gameData;
  };


  const handleExport = async (optimized: boolean = false) => {
    if (!selectedSaveForExport) {
      notify(VIETNAMESE.noSaveSelectedForExport, 'error');
      return;
    }
    setIsExporting(true);
    try {
      let gameData = await loadSpecificGameData(selectedSaveForExport);
      if (!gameData) {
        notify(VIETNAMESE.errorLoadingGame + ": Không tìm thấy file lưu để xuất.", 'error');
        setIsExporting(false);
        return;
      }

      // If exporting full JSON (not optimized), reconstruct full snapshots
      if (!optimized) {
        gameData = reconstructSnapshotsForExport(gameData);
      }
      // For optimized export, gameData from loadSpecificGameData is already optimized (deltas don't have full snapshots)

      const exportData: SaveGameData = {
        name: gameData.name,
        timestamp: gameData.timestamp instanceof Date ? gameData.timestamp.toISOString() : gameData.timestamp,
        knowledgeBase: gameData.knowledgeBase,
        gameMessages: gameData.gameMessages,
        appVersion: gameData.appVersion || APP_VERSION,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      let blob: Blob;
      let fileName: string;
      
      let safeName = gameData.name.replace(/[^a-z0-9_-\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
      if (!safeName) safeName = 'daodoai-exported-save';

      if (optimized) {
        const compressed = pako.gzip(jsonString);
        blob = new Blob([compressed], { type: 'application/gzip' });
        fileName = `${safeName}.sav.gz`;
      } else {
        blob = new Blob([jsonString], { type: 'application/json' });
        fileName = `${safeName}.json`;
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify(optimized ? "Xuất file tối ưu thành công!" : VIETNAMESE.dataExportedSuccess, 'success');
    } catch (e) {
      console.error("Error exporting game data:", e);
      notify(VIETNAMESE.errorExportingData + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileToImport(e.target.files[0]);
    } else {
      setFileToImport(null);
    }
  };

  const handleImport = async () => {
    if (!fileToImport) {
      notify(VIETNAMESE.noFileSelectedForImport, 'error');
      return;
    }
    setIsImporting(true);
    try {
      let fileContent: string;
      if (fileToImport.name.endsWith('.gz') || fileToImport.name.endsWith('.sav.gz')) {
        const fileBuffer = await fileToImport.arrayBuffer();
        fileContent = pako.inflate(new Uint8Array(fileBuffer), { to: 'string' });
      } else {
        fileContent = await fileToImport.text();
      }
      
      const parsedData = JSON.parse(fileContent);

      if (
        !parsedData ||
        typeof parsedData !== 'object' ||
        !parsedData.knowledgeBase ||
        !parsedData.gameMessages ||
        !parsedData.name || 
        !parsedData.timestamp // timestamp might be string here
      ) {
        throw new Error(VIETNAMESE.invalidJsonFile);
      }
      
      const jsonFilename = fileToImport.name;
      let saveNameFromFilename = jsonFilename.substring(0, jsonFilename.lastIndexOf('.'));
      if (jsonFilename.endsWith('.sav.gz')) { // Handle .sav.gz double extension
        saveNameFromFilename = jsonFilename.substring(0, jsonFilename.lastIndexOf('.sav.gz'));
      } else if (jsonFilename.endsWith('.json') || jsonFilename.endsWith('.gz')) {
         saveNameFromFilename = jsonFilename.substring(0, jsonFilename.lastIndexOf('.'));
      }
      saveNameFromFilename = saveNameFromFilename || jsonFilename;


      // Reconstruct snapshots if importing from a standard JSON (which has full snapshots)
      // For optimized files, snapshots are already stripped or will be reconstructed on load by App.tsx
      // The key is that importGameData passes data that saveGameToIndexedDB can handle.
      // saveGameToIndexedDB will optimize based on `type` and `KEYFRAME_INTERVAL` logic.
      // If it's an optimized import, the deltas are already there, snapshots are not.
      
      // The critical part: Ensure turnHistory from imported JSON (full snapshots) is processed
      // by saveGameToIndexedDB to correctly create deltas and strip snapshots for delta entries in DB.
      // If importing an optimized file, turnHistory entries for deltas will lack snapshots,
      // saveGameToIndexedDB should correctly preserve the deltas.
      
      const dataToImport: Omit<SaveGameData, 'id' | 'timestamp'> & { name: string } = {
        name: saveNameFromFilename, 
        knowledgeBase: parsedData.knowledgeBase, // This KB will have its turnHistory processed by saveGameToIndexedDB
        gameMessages: parsedData.gameMessages,
        appVersion: parsedData.appVersion || APP_VERSION,
      };

      await importGameData(dataToImport); 
      setFileToImport(null); 
      if(fileInputRef.current) fileInputRef.current.value = ""; 
      loadSaveSlots(); 
    } catch (e) {
      console.error("Error importing game data:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      if(errorMessage.includes("JSON.parse") || errorMessage.toLowerCase().includes("decode")) {
        notify(VIETNAMESE.invalidJsonFile + ": Lỗi phân tích cú pháp JSON hoặc giải nén.", 'error');
      } else {
        notify(VIETNAMESE.errorImportingData + `: ${errorMessage}`, 'error');
      }
    } finally {
      setIsImporting(false);
    }
  };
  
  const formatDate = (date: Date) => {
    return date.toLocaleString('vi-VN', { 
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
      <div className="w-full max-w-2xl bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-lime-400 via-green-500 to-emerald-600">
            {VIETNAMESE.importExportScreenTitle} (Cục bộ)
          </h2>
          <Button variant="ghost" onClick={() => setCurrentScreen(GameScreen.Initial)}>
            {VIETNAMESE.goBackButton}
          </Button>
        </div>

        <section className="mb-10">
          <h3 className="text-2xl font-semibold text-green-400 mb-4 pb-2 border-b border-gray-700">{VIETNAMESE.exportSectionTitle}</h3>
          {isFetchingSlots && <Spinner text="Đang tải danh sách lưu..." size="sm" className="my-4" />}
          {!isFetchingSlots && saveSlots.length === 0 && (
            <p className="text-gray-400 italic">{VIETNAMESE.noSaveGamesFound}</p>
          )}
          {!isFetchingSlots && saveSlots.length > 0 && (
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
              <label htmlFor="saveToExport" className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.selectSaveToExport}</label>
              <select
                id="saveToExport"
                value={selectedSaveForExport || ''}
                onChange={(e) => setSelectedSaveForExport(e.target.value)}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500 text-gray-100 transition-colors"
              >
                <option value="" disabled>-- Chọn một file --</option>
                {saveSlots.map(slot => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name} ({formatDate(new Date(slot.timestamp))})
                    {slot.size !== undefined ? ` - ${formatBytes(slot.size)}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="primary"
              className="bg-green-600 hover:bg-green-700 focus:ring-green-500 flex-1"
              onClick={() => handleExport(false)}
              isLoading={isExporting}
              disabled={!selectedSaveForExport || isFetchingSlots}
              loadingText={VIETNAMESE.exportingData}
            >
              {VIETNAMESE.exportSelectedButton} (Đầy đủ .json)
            </Button>
            <Button
              variant="primary"
              className="bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 flex-1"
              onClick={() => handleExport(true)}
              isLoading={isExporting}
              disabled={!selectedSaveForExport || isFetchingSlots}
              loadingText="Đang nén & xuất..."
            >
              Xuất Tối Ưu (.sav.gz)
            </Button>
          </div>
        </section>

        <section>
          <h3 className="text-2xl font-semibold text-sky-400 mb-4 pb-2 border-b border-gray-700">{VIETNAMESE.importSectionTitle}</h3>
          <div className="mb-4">
            <label htmlFor="jsonFile" className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.selectJsonFile} (hoặc .gz, .sav.gz)</label>
            <input
              type="file"
              id="jsonFile"
              ref={fileInputRef}
              accept=".json,.gz,.sav.gz,application/json,application/gzip"
              onChange={handleFileChange}
              className="w-full p-2 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-500 file:text-white hover:file:bg-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            />
             {fileToImport && <p className="text-xs text-gray-400 mt-1">Đã chọn: {fileToImport.name}</p>}
          </div>
          <Button
            variant="primary"
            className="bg-sky-600 hover:bg-sky-700 focus:ring-sky-500 w-full"
            onClick={handleImport}
            isLoading={isImporting}
            disabled={!fileToImport}
            loadingText={VIETNAMESE.importingData}
          >
            {VIETNAMESE.importFileButton}
          </Button>
        </section>
      </div>
    </div>
  );
};

export default ImportExportScreen;