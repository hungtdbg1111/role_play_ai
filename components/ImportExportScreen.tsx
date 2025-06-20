
import React, { useState, useEffect, useCallback, useRef, ChangeEvent } from 'react';
import { GameScreen, SaveGameMeta, FirebaseUser, StorageType, SaveGameData } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import { VIETNAMESE, APP_VERSION } from '../constants';

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
  firebaseUser: FirebaseUser | null;
  notify: (message: string, type: 'success' | 'error') => void;
  fetchSaveGames: () => Promise<SaveGameMeta[]>;
  loadSpecificGameData: (saveId: string) => Promise<SaveGameData | null>;
  importGameData: (gameData: Omit<SaveGameData, 'id' | 'timestamp'>) => Promise<void>;
}

const ImportExportScreen: React.FC<ImportExportScreenProps> = ({
  setCurrentScreen,
  storageType,
  firebaseUser,
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
      if (storageType === 'cloud' && !firebaseUser) {
        notify(VIETNAMESE.signInRequiredForLoad, 'error');
        setCurrentScreen(GameScreen.Initial); // Redirect if not signed in for cloud
        return;
      }
      const fetchedSaves = await fetchSaveGames();
      setSaveSlots(fetchedSaves);
    } catch (e) {
      console.error("Error fetching save games for import/export:", e);
      notify(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setIsFetchingSlots(false);
    }
  }, [storageType, firebaseUser, fetchSaveGames, notify, setCurrentScreen]);

  useEffect(() => {
    loadSaveSlots();
  }, [loadSaveSlots]);

  const handleExport = async () => {
    if (!selectedSaveForExport) {
      notify(VIETNAMESE.noSaveSelectedForExport, 'error');
      return;
    }
    setIsExporting(true);
    try {
      const gameData = await loadSpecificGameData(selectedSaveForExport);
      if (!gameData) {
        notify(VIETNAMESE.errorLoadingGame + ": Không tìm thấy file lưu để xuất.", 'error');
        setIsExporting(false);
        return;
      }

      // Prepare data for export (remove server-specific ID if any, keep original timestamp)
      const exportData: SaveGameData = {
        name: gameData.name,
        timestamp: gameData.timestamp instanceof Date ? gameData.timestamp.toISOString() : gameData.timestamp, // Ensure ISO string for JSON
        knowledgeBase: gameData.knowledgeBase,
        gameMessages: gameData.gameMessages,
        appVersion: gameData.appVersion || APP_VERSION,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = gameData.name.replace(/[^a-z0-9_-\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
      const timestampStr = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `daodoai-save-${safeName}-${timestampStr}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      notify(VIETNAMESE.dataExportedSuccess, 'success');
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
      const fileContent = await fileToImport.text();
      const parsedData = JSON.parse(fileContent);

      // Basic validation
      if (
        !parsedData ||
        typeof parsedData !== 'object' ||
        !parsedData.knowledgeBase ||
        !parsedData.gameMessages ||
        !parsedData.name ||
        !parsedData.timestamp // Original timestamp for reference, will be overwritten by service
      ) {
        throw new Error(VIETNAMESE.invalidJsonFile);
      }
      
      // Prepare data for import service (id and new timestamp will be handled by service)
      const dataToImport: Omit<SaveGameData, 'id' | 'timestamp'> = {
        name: parsedData.name, // Original name will be used by service (possibly prefixed)
        knowledgeBase: parsedData.knowledgeBase,
        gameMessages: parsedData.gameMessages,
        appVersion: parsedData.appVersion || APP_VERSION,
      };

      await importGameData(dataToImport);
      // No need for notify success here, App.tsx's handleImportGame will call notify
      setFileToImport(null); // Clear selection
      if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      loadSaveSlots(); // Refresh save slots list
    } catch (e) {
      console.error("Error importing game data:", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      if(errorMessage.includes("JSON.parse")) {
        notify(VIETNAMESE.invalidJsonFile + ": Lỗi phân tích cú pháp JSON.", 'error');
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
            {VIETNAMESE.importExportScreenTitle}
          </h2>
          <Button variant="ghost" onClick={() => setCurrentScreen(GameScreen.Initial)}>
            {VIETNAMESE.goBackButton}
          </Button>
        </div>

        {/* Export Section */}
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
          <Button
            variant="primary"
            className="bg-green-600 hover:bg-green-700 focus:ring-green-500 w-full"
            onClick={handleExport}
            isLoading={isExporting}
            disabled={!selectedSaveForExport || isFetchingSlots}
            loadingText={VIETNAMESE.exportingData}
          >
            {VIETNAMESE.exportSelectedButton}
          </Button>
        </section>

        {/* Import Section */}
        <section>
          <h3 className="text-2xl font-semibold text-sky-400 mb-4 pb-2 border-b border-gray-700">{VIETNAMESE.importSectionTitle}</h3>
          <div className="mb-4">
            <label htmlFor="jsonFile" className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.selectJsonFile}</label>
            <input
              type="file"
              id="jsonFile"
              ref={fileInputRef}
              accept=".json,application/json"
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