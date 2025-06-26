
import { useState, useEffect, useCallback } from 'react';
import { StorageSettings, StyleSettings } from '../types';
import { DEFAULT_STORAGE_SETTINGS, STORAGE_SETTINGS_STORAGE_KEY, DEFAULT_STYLE_SETTINGS, STYLE_SETTINGS_STORAGE_KEY } from '../constants';
// Firebase imports removed

export const useAppInitialization = () => {
  const [storageSettings, setStorageSettingsState] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [styleSettings, setStyleSettingsState] = useState<StyleSettings>(DEFAULT_STYLE_SETTINGS);
  // firebaseUser and setFirebaseUser removed
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [storageInitError, setStorageInitError] = useState<string | null>(null); // Still useful for IndexedDB errors

  const setStorageSettings = useCallback((newSettings: StorageSettings) => {
    // Ensure storageType is always 'local'
    const localOnlySettings = { ...newSettings, storageType: 'local' as 'local' };
    localStorage.setItem(STORAGE_SETTINGS_STORAGE_KEY, JSON.stringify(localOnlySettings));
    setStorageSettingsState(localOnlySettings);
  }, []);
  
  const setStyleSettings = useCallback((newSettings: StyleSettings) => {
    localStorage.setItem(STYLE_SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    setStyleSettingsState(newSettings);
  }, []);

  useEffect(() => {
    const loadAndInitialize = async () => {
      setIsInitialLoading(true);
      setStorageInitError(null);

      // Load Style Settings
      const storedStyleSettingsRaw = localStorage.getItem(STYLE_SETTINGS_STORAGE_KEY);
      if (storedStyleSettingsRaw) {
        try {
          const parsedStyleSettings = JSON.parse(storedStyleSettingsRaw);
          setStyleSettingsState(parsedStyleSettings);
        } catch(e) {
          console.error("Failed to parse style settings, using defaults.", e);
          setStyleSettingsState(DEFAULT_STYLE_SETTINGS);
        }
      } else {
        setStyleSettingsState(DEFAULT_STYLE_SETTINGS);
      }

      // Load Storage Settings (will always be local)
      let loadedSettings = DEFAULT_STORAGE_SETTINGS;
      const storedSettingsRaw = localStorage.getItem(STORAGE_SETTINGS_STORAGE_KEY);
      if (storedSettingsRaw) {
        try {
          const parsed = JSON.parse(storedSettingsRaw) as StorageSettings;
          // Force local storage
          loadedSettings = { ...parsed, storageType: 'local' };
        } catch (e) {
          console.error("Failed to parse storage settings, using defaults.", e);
          loadedSettings = { ...DEFAULT_STORAGE_SETTINGS, storageType: 'local' };
        }
      } else {
        loadedSettings = { ...DEFAULT_STORAGE_SETTINGS, storageType: 'local' };
      }
      setStorageSettingsState(loadedSettings);

      // No Firebase initialization needed
      // Simulate a small delay for IndexedDB readiness if necessary, though usually instant
      await new Promise(resolve => setTimeout(resolve, 50)); 

      setIsInitialLoading(false);
    };

    loadAndInitialize();
  }, []);

  return {
    storageSettings,
    styleSettings,
    setStorageSettings,
    setStyleSettings,
    // firebaseUser removed
    // setFirebaseUser removed
    isInitialLoading,
    storageInitError,
    // reInitializeFirebase removed
  };
};