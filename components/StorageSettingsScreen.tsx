
import React, { useState, useEffect } from 'react';
import { GameScreen, StorageSettings } from '../types';
import Button from './ui/Button';
import { VIETNAMESE, STORAGE_SETTINGS_STORAGE_KEY, DEFAULT_STORAGE_SETTINGS } from '../constants';

interface StorageSettingsScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSettingsSaved: (settings: StorageSettings) => void;
}

const StorageSettingsScreen: React.FC<StorageSettingsScreenProps> = ({ setCurrentScreen, onSettingsSaved }) => {
  // currentSettings will always have storageType: 'local'
  const [currentSettings, setCurrentSettings] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  // firebaseInputs removed
  // error and successMessage states can be kept for general messages if needed
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    // Load settings, but always force to local storage.
    const storedSettingsRaw = localStorage.getItem(STORAGE_SETTINGS_STORAGE_KEY);
    if (storedSettingsRaw) {
      try {
        const parsedSettings = JSON.parse(storedSettingsRaw) as StorageSettings;
        setCurrentSettings({ ...parsedSettings, storageType: 'local' });
      } catch (e) {
        console.error("Failed to parse storage settings from localStorage", e);
        setCurrentSettings({ ...DEFAULT_STORAGE_SETTINGS, storageType: 'local' });
      }
    } else {
        setCurrentSettings({ ...DEFAULT_STORAGE_SETTINGS, storageType: 'local' });
    }
  }, []);

  // handleStorageTypeChange and handleFirebaseInputChange removed as storage is fixed to local

  const handleSaveSettings = () => {
    setError('');
    setSuccessMessage('');
    
    // Settings are already 'local' only.
    const finalSettingsToSave = { ...currentSettings, storageType: 'local' as 'local' }; 
    localStorage.setItem(STORAGE_SETTINGS_STORAGE_KEY, JSON.stringify(finalSettingsToSave));
    setSuccessMessage(VIETNAMESE.storageSettingsSavedMessage);
    onSettingsSaved(finalSettingsToSave); 
  };
  
  const infoText = VIETNAMESE.storageInfoLocal; // Always local

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
      <div className="w-full max-w-xl bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-600 mb-8">
          {VIETNAMESE.storageSettingsTitle}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-30 border border-red-700 text-red-300 rounded-md text-sm">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500 bg-opacity-30 border border-green-700 text-green-300 rounded-md text-sm">
            {successMessage}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {VIETNAMESE.storageTypeLabel}
            </label>
            <div className="p-3 bg-gray-700 border border-gray-600 rounded-md">
              <span className="text-sm text-gray-200">{VIETNAMESE.storageTypeLocal} (Mặc định)</span>
            </div>
            <p className="mt-2 text-xs text-gray-400">{VIETNAMESE.storageInfoLocal}</p>
            <p className="mt-1 text-xs font-semibold text-yellow-400">{VIETNAMESE.localSaveWarning}</p>
          </div>

          {/* Firebase config section removed */}

          <div className="flex flex-col sm:flex-row justify-between items-center pt-6 space-y-3 sm:space-y-0 sm:space-x-4">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setCurrentScreen(GameScreen.Initial)}
              className="w-full sm:w-auto"
            >
              {VIETNAMESE.goBackButton}
            </Button>
            <Button 
              type="button" 
              variant="primary"
              className="bg-teal-600 hover:bg-teal-700 focus:ring-teal-500 w-full sm:w-auto"
              size="lg" 
              onClick={handleSaveSettings}
            >
              {VIETNAMESE.saveSettingsButton}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageSettingsScreen;