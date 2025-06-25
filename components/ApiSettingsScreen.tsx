

import React, { useState, useEffect, ChangeEvent } from 'react';
import { GameScreen, ApiConfig, SafetySetting } from '../types'; 
import Button from './ui/Button';
import { 
  VIETNAMESE, 
  API_SETTINGS_STORAGE_KEY, 
  AVAILABLE_MODELS, 
  HARM_CATEGORIES,      
  HARM_BLOCK_THRESHOLDS, 
  DEFAULT_API_CONFIG,
  AVAILABLE_IMAGE_MODELS, // Added
  DEFAULT_IMAGE_MODEL_ID // Added
} from '../constants';
import { getApiSettings } from '../services/geminiService'; 
import { HarmCategory, HarmBlockThreshold } from '@google/genai'; 

interface ApiSettingsScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSettingsSaved: () => void;
}

const ApiSettingsScreen: React.FC<ApiSettingsScreenProps> = ({ setCurrentScreen, onSettingsSaved }) => {
  const [currentApiKeySource, setCurrentApiKeySource] = useState<'system' | 'user'>(DEFAULT_API_CONFIG.apiKeySource);
  const [userApiKeyInput, setUserApiKeyInput] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_API_CONFIG.model);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(DEFAULT_API_CONFIG.imageModel); // New state for image model
  const [safetySettings, setSafetySettings] = useState<SafetySetting[]>(DEFAULT_API_CONFIG.safetySettings);
  const [autoGenerateNpcAvatars, setAutoGenerateNpcAvatars] = useState<boolean>(DEFAULT_API_CONFIG.autoGenerateNpcAvatars);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  useEffect(() => {
    const loadedSettings = getApiSettings();
    setCurrentApiKeySource(loadedSettings.apiKeySource);
    setUserApiKeyInput(loadedSettings.userApiKey);
    setSelectedModel(loadedSettings.model);
    setSelectedImageModel(loadedSettings.imageModel || DEFAULT_IMAGE_MODEL_ID); // Load image model
    setSafetySettings(loadedSettings.safetySettings);
    setAutoGenerateNpcAvatars(loadedSettings.autoGenerateNpcAvatars);
  }, []);

  const handleUserApiKeyChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserApiKeyInput(e.target.value);
    if (error) setError(''); 
    if (successMessage) setSuccessMessage('');
  };

  const handleModelChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedModel(e.target.value);
    if (successMessage) setSuccessMessage('');
  };

  const handleImageModelChange = (e: ChangeEvent<HTMLSelectElement>) => { // New handler
    setSelectedImageModel(e.target.value);
    if (successMessage) setSuccessMessage('');
  };

  const handleSafetySettingChange = (category: HarmCategory, newThresholdValue: string) => {
    const newThreshold = newThresholdValue as HarmBlockThreshold;
    setSafetySettings(prevSettings =>
      prevSettings.map(setting =>
        setting.category === category ? { ...setting, threshold: newThreshold } : setting
      )
    );
    if (successMessage) setSuccessMessage('');
  };

  const handleApiKeySourceChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCurrentApiKeySource(e.target.value as 'system' | 'user');
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleAutoGenerateNpcAvatarsChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAutoGenerateNpcAvatars(e.target.checked);
    if (successMessage) setSuccessMessage('');
  };

  const handleSaveSettings = () => {
    if (currentApiKeySource === 'user' && !userApiKeyInput.trim()) {
      setError(VIETNAMESE.apiKeyRequiredError);
      return;
    }
    setError('');
    
    const settingsToSave: ApiConfig = { 
      apiKeySource: currentApiKeySource,
      userApiKey: currentApiKeySource === 'user' ? userApiKeyInput.trim() : '', 
      model: selectedModel,
      imageModel: selectedImageModel, // Save image model
      safetySettings: safetySettings,
      autoGenerateNpcAvatars: autoGenerateNpcAvatars,
    };
    localStorage.setItem(API_SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
    
    setSuccessMessage(VIETNAMESE.settingsSavedMessage);
    onSettingsSaved(); 
  };
  
  const apiInfoText = currentApiKeySource === 'system' ? VIETNAMESE.apiInfoSystem : VIETNAMESE.apiInfoUser;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
      <div className="w-full max-w-lg bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-500 to-indigo-600 mb-8">
          {VIETNAMESE.apiSettingsTitle}
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
              {VIETNAMESE.apiKeySourceLabel}
            </label>
            <div className="space-y-2">
              <label htmlFor="apiKeySourceSystem" className="flex items-center p-3 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600/70 transition-colors cursor-pointer">
                <input
                  type="radio"
                  id="apiKeySourceSystem"
                  name="apiKeySource"
                  value="system"
                  checked={currentApiKeySource === 'system'}
                  onChange={handleApiKeySourceChange}
                  className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"
                />
                <span className="ml-3 text-sm text-gray-200">{VIETNAMESE.apiKeySourceSystem}</span>
              </label>
              <label htmlFor="apiKeySourceUser" className="flex items-center p-3 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600/70 transition-colors cursor-pointer">
                <input
                  type="radio"
                  id="apiKeySourceUser"
                  name="apiKeySource"
                  value="user"
                  checked={currentApiKeySource === 'user'}
                  onChange={handleApiKeySourceChange}
                  className="h-4 w-4 text-indigo-600 border-gray-500 focus:ring-indigo-500"
                />
                <span className="ml-3 text-sm text-gray-200">{VIETNAMESE.apiKeySourceUser}</span>
              </label>
            </div>
          </div>

          {currentApiKeySource === 'user' && (
            <div>
              <label htmlFor="userApiKey" className="block text-sm font-medium text-gray-300 mb-1">
                {VIETNAMESE.geminiUserApiKeyLabel}
              </label>
              <input
                type="password" 
                id="userApiKey"
                value={userApiKeyInput}
                onChange={handleUserApiKeyChange}
                placeholder={VIETNAMESE.geminiApiKeyPlaceholder}
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-400 transition-colors duration-150"
                aria-required="true"
                aria-describedby={error && currentApiKeySource === 'user' ? "api-key-error" : undefined}
              />
              {error && currentApiKeySource === 'user' && <p id="api-key-error" className="mt-1 text-xs text-red-400">{error}</p>}
            </div>
          )}

          <div>
            <label htmlFor="geminiModel" className="block text-sm font-medium text-gray-300 mb-1">
              {VIETNAMESE.geminiModelLabel}
            </label>
            <select
              id="geminiModel"
              value={selectedModel}
              onChange={handleModelChange}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150"
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="geminiImageModel" className="block text-sm font-medium text-gray-300 mb-1">
              {VIETNAMESE.geminiImageModelLabel}
            </label>
            <select
              id="geminiImageModel"
              value={selectedImageModel}
              onChange={handleImageModelChange}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150"
            >
              {AVAILABLE_IMAGE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <label htmlFor="autoGenerateNpcAvatars" className="flex items-center cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  id="autoGenerateNpcAvatars"
                  className="sr-only" // Hide default checkbox
                  checked={autoGenerateNpcAvatars}
                  onChange={handleAutoGenerateNpcAvatarsChange}
                />
                <div className={`block w-10 h-6 rounded-full transition-colors ${autoGenerateNpcAvatars ? 'bg-indigo-600' : 'bg-gray-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoGenerateNpcAvatars ? 'transform translate-x-full' : ''}`}></div>
              </div>
              <span className="ml-3 text-sm font-medium text-gray-300">{VIETNAMESE.autoGenerateNpcAvatarsLabel}</span>
            </label>
            <p className="text-xs text-gray-400 mt-1 ml-10">{VIETNAMESE.autoGenerateNpcAvatarsInfo}</p>
          </div>


          <div>
            <h3 className="text-xl font-semibold text-gray-200 mb-3 pt-4 border-t border-gray-700 mt-6">
              {VIETNAMESE.safetySettingsLabel}
            </h3>
            {safetySettings.map((setting) => {
              const categoryInfo = HARM_CATEGORIES.find(cat => cat.id === setting.category);
              return (
                <div key={setting.category} className="mb-4">
                  <label htmlFor={`safety-${setting.category}`} className="block text-sm font-medium text-gray-300 mb-1">
                    {categoryInfo?.label || setting.category}
                  </label>
                  <select
                    id={`safety-${setting.category}`}
                    value={setting.threshold}
                    onChange={(e) => handleSafetySettingChange(setting.category, e.target.value)}
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150"
                  >
                    {HARM_BLOCK_THRESHOLDS.map(thresholdOpt => (
                      <option key={thresholdOpt.id} value={thresholdOpt.id}>
                        {thresholdOpt.label}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>

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
              size="lg" 
              onClick={handleSaveSettings}
              className="w-full sm:w-auto"
            >
              {VIETNAMESE.saveSettingsButton}
            </Button>
          </div>
        </div>
      </div>
       <p className="mt-8 text-xs text-gray-500 text-center max-w-md px-2">
        {apiInfoText}
      </p>
      {autoGenerateNpcAvatars && (
        <p className="mt-2 text-xs text-yellow-400 text-center max-w-md px-2">{VIETNAMESE.cloudinaryInfo}</p>
      )}
    </div>
  );
};

export default ApiSettingsScreen;