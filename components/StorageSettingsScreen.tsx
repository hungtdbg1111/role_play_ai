
import React, { useState, useEffect, ChangeEvent } from 'react';
import { GameScreen, StorageType, FirebaseUserConfig, StorageSettings } from '../types';
import Button from './ui/Button';
import { VIETNAMESE, STORAGE_SETTINGS_STORAGE_KEY, DEFAULT_STORAGE_SETTINGS, DEFAULT_FIREBASE_USER_CONFIG } from '../constants';

interface StorageSettingsScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSettingsSaved: (settings: StorageSettings) => void;
}

const StorageSettingsScreen: React.FC<StorageSettingsScreenProps> = ({ setCurrentScreen, onSettingsSaved }) => {
  const [currentSettings, setCurrentSettings] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [firebaseInputs, setFirebaseInputs] = useState<FirebaseUserConfig>(DEFAULT_FIREBASE_USER_CONFIG);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    const storedSettingsRaw = localStorage.getItem(STORAGE_SETTINGS_STORAGE_KEY);
    if (storedSettingsRaw) {
      try {
        const parsedSettings = JSON.parse(storedSettingsRaw) as StorageSettings;
        setCurrentSettings(parsedSettings);
        if (parsedSettings.storageType === 'cloud' && parsedSettings.firebaseUserConfig) {
          setFirebaseInputs(parsedSettings.firebaseUserConfig);
        } else {
          setFirebaseInputs(DEFAULT_FIREBASE_USER_CONFIG); // Reset if local or no config
        }
      } catch (e) {
        console.error("Failed to parse storage settings from localStorage", e);
        // Stick with default settings if parsing fails
        setCurrentSettings(DEFAULT_STORAGE_SETTINGS);
        setFirebaseInputs(DEFAULT_FIREBASE_USER_CONFIG);
      }
    } else {
        // No stored settings, use defaults
        setCurrentSettings(DEFAULT_STORAGE_SETTINGS);
        setFirebaseInputs(DEFAULT_FIREBASE_USER_CONFIG);
    }
  }, []);

  const handleStorageTypeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newType = e.target.value as StorageType;
    setCurrentSettings(prev => ({ ...prev, storageType: newType }));
    setError('');
    setSuccessMessage('');
    // If switching to local, firebaseUserConfig might be irrelevant or reset
    if (newType === 'local') {
        setCurrentSettings(prev => ({...prev, firebaseUserConfig: null}));
    } else {
        // If switching to cloud, ensure firebaseInputs are used or try to load from currentSettings
        setCurrentSettings(prev => ({...prev, firebaseUserConfig: firebaseInputs.projectId ? firebaseInputs : null}));
    }
  };

  const handleFirebaseInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFirebaseInputs(prev => ({ ...prev, [name]: value }));
    setError('');
    setSuccessMessage('');
  };

  const handleSaveSettings = () => {
    setError('');
    setSuccessMessage('');

    let finalSettingsToSave = { ...currentSettings };

    if (currentSettings.storageType === 'cloud') {
      const { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId } = firebaseInputs;
      if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
        setError(VIETNAMESE.firebaseConfigRequiredError);
        return;
      }
      finalSettingsToSave.firebaseUserConfig = { ...firebaseInputs };
    } else {
      finalSettingsToSave.firebaseUserConfig = null; // Ensure it's null for local
    }
    
    localStorage.setItem(STORAGE_SETTINGS_STORAGE_KEY, JSON.stringify(finalSettingsToSave));
    setSuccessMessage(VIETNAMESE.storageSettingsSavedMessage);
    onSettingsSaved(finalSettingsToSave); 
  };
  
  const infoText = currentSettings.storageType === 'local' ? VIETNAMESE.storageInfoLocal : VIETNAMESE.storageInfoCloud;

  interface FirebaseInputDetail {
    id: keyof FirebaseUserConfig;
    label: string;
    placeholder: string;
    required: boolean;
    type?: string;
  }
  
  const firebaseInputFields: FirebaseInputDetail[] = [
    { id: 'apiKey', label: VIETNAMESE.firebaseApiKeyLabel, placeholder: 'Enter Firebase API Key', required: true, type: 'password' },
    { id: 'authDomain', label: VIETNAMESE.firebaseAuthDomainLabel, placeholder: 'your-project-id.firebaseapp.com', required: true },
    { id: 'projectId', label: VIETNAMESE.firebaseProjectIdLabel, placeholder: 'your-project-id', required: true },
    { id: 'storageBucket', label: VIETNAMESE.firebaseStorageBucketLabel, placeholder: 'your-project-id.appspot.com', required: true },
    { id: 'messagingSenderId', label: VIETNAMESE.firebaseMessagingSenderIdLabel, placeholder: '123456789012', required: true },
    { id: 'appId', label: VIETNAMESE.firebaseAppIdLabel, placeholder: '1:123:...:web:...', required: true },
    { id: 'measurementId', label: VIETNAMESE.firebaseMeasurementIdLabel, placeholder: 'G-XXXXXXXXXX (Optional)', required: false },
  ];

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
            <div className="space-y-2">
              <label htmlFor="storageTypeLocal" className="flex items-center p-3 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600/70 transition-colors cursor-pointer">
                <input
                  type="radio"
                  id="storageTypeLocal"
                  name="storageType"
                  value="local"
                  checked={currentSettings.storageType === 'local'}
                  onChange={handleStorageTypeChange}
                  className="h-4 w-4 text-teal-600 border-gray-500 focus:ring-teal-500"
                />
                <span className="ml-3 text-sm text-gray-200">{VIETNAMESE.storageTypeLocal}</span>
              </label>
              <label htmlFor="storageTypeCloud" className="flex items-center p-3 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600/70 transition-colors cursor-pointer">
                <input
                  type="radio"
                  id="storageTypeCloud"
                  name="storageType"
                  value="cloud"
                  checked={currentSettings.storageType === 'cloud'}
                  onChange={handleStorageTypeChange}
                  className="h-4 w-4 text-teal-600 border-gray-500 focus:ring-teal-500"
                />
                <span className="ml-3 text-sm text-gray-200">{VIETNAMESE.storageTypeCloud}</span>
              </label>
            </div>
          </div>

          {currentSettings.storageType === 'cloud' && (
            <fieldset className="border border-gray-700 p-4 rounded-md mt-4">
              <legend className="text-lg font-semibold text-teal-400 px-2">{VIETNAMESE.firebaseConfigSectionTitle}</legend>
              <div className="space-y-4 mt-2">
                {firebaseInputFields.map(field => (
                  <div key={field.id}>
                    <label htmlFor={field.id} className="block text-sm font-medium text-gray-300 mb-1">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type={field.type || "text"}
                      id={field.id}
                      name={field.id}
                      value={firebaseInputs[field.id] || ''}
                      onChange={handleFirebaseInputChange}
                      placeholder={field.placeholder}
                      className="w-full p-2.5 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500 text-gray-100 placeholder-gray-400 transition-colors"
                      aria-required={field.required}
                    />
                  </div>
                ))}
              </div>
            </fieldset>
          )}

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
      <div className="mt-8 text-xs text-gray-500 text-center max-w-lg px-2 space-y-2">
        <p>{infoText}</p>
        {currentSettings.storageType === 'local' && (
          <p className="font-semibold text-yellow-400">{VIETNAMESE.localSaveWarning}</p>
        )}
      </div>
    </div>
  );
};

export default StorageSettingsScreen;
