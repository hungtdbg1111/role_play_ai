
import { useState, useEffect, useCallback } from 'react';
import { StorageSettings, StyleSettings, FirebaseUser, FirebaseUserConfig } from '../types';
import { DEFAULT_STORAGE_SETTINGS, STORAGE_SETTINGS_STORAGE_KEY, DEFAULT_STYLE_SETTINGS, STYLE_SETTINGS_STORAGE_KEY } from '../constants';
import { initializeFirebaseServices, onAuthUserChanged, signInUserAnonymously, isAuthInitialized } from '../services/firebaseService';

export const useAppInitialization = () => {
  const [storageSettings, setStorageSettingsState] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [styleSettings, setStyleSettingsState] = useState<StyleSettings>(DEFAULT_STYLE_SETTINGS);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [storageInitError, setStorageInitError] = useState<string | null>(null);

  const setStorageSettings = useCallback((newSettings: StorageSettings) => {
    localStorage.setItem(STORAGE_SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    setStorageSettingsState(newSettings);
  }, []);
  
  const setStyleSettings = useCallback((newSettings: StyleSettings) => {
    localStorage.setItem(STYLE_SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
    setStyleSettingsState(newSettings);
  }, []);

  useEffect(() => {
    const loadAndInitialize = async () => {
      setIsInitialLoading(true);
      setStorageInitError(null);

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

      let loadedSettings = DEFAULT_STORAGE_SETTINGS;
      const storedSettingsRaw = localStorage.getItem(STORAGE_SETTINGS_STORAGE_KEY);
      if (storedSettingsRaw) {
        try {
          loadedSettings = JSON.parse(storedSettingsRaw) as StorageSettings;
        } catch (e) {
          console.error("Failed to parse storage settings, using defaults.", e);
        }
      }
      setStorageSettingsState(loadedSettings);

      try {
        if (loadedSettings.storageType === 'cloud' && loadedSettings.firebaseUserConfig) {
          await initializeFirebaseServices(loadedSettings.firebaseUserConfig);
          if (isAuthInitialized()) {
            onAuthUserChanged(async (user) => {
              if (user) {
                setFirebaseUser(user);
              } else {
                try {
                  const anonUser = await signInUserAnonymously();
                  setFirebaseUser(anonUser);
                } catch (e) {
                  console.warn("Anonymous sign-in failed during cloud setup:", e);
                }
              }
            });
          } else {
             console.warn("Firebase Auth not initialized after cloud setup attempt.");
          }
        } else {
           await initializeFirebaseServices(null); // Initialize with null to ensure any old instance is cleared
           if(isAuthInitialized()){ // If auth was minimally initialized (e.g. for guest)
             const anonUser = await signInUserAnonymously();
             setFirebaseUser(anonUser); 
           } else {
             console.log("Local storage selected or Firebase config missing. Firebase Auth not available for anonymous sign-in.");
           }
        }
      } catch (initError) {
        console.error("Critical: Failed to initialize services.", initError);
        const errorMsg = `Lỗi khởi tạo dịch vụ: ${initError instanceof Error ? initError.message : String(initError)}.`;
        setStorageInitError(errorMsg);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadAndInitialize();
  }, []);

  return {
    storageSettings,
    styleSettings,
    setStorageSettings,
    setStyleSettings,
    firebaseUser,
    setFirebaseUser, // Expose setter for sign out
    isInitialLoading,
    storageInitError,
    reInitializeFirebase: async (config: FirebaseUserConfig | null) => { // Added for StorageSettingsScreen
        setIsInitialLoading(true);
        setStorageInitError(null);
        try {
            await initializeFirebaseServices(config);
             if (isAuthInitialized()) {
                onAuthUserChanged(async (user) => {
                  if (user) {
                    setFirebaseUser(user);
                  } else {
                    try {
                      const anonUser = await signInUserAnonymously();
                      setFirebaseUser(anonUser);
                    } catch (e) { console.warn("Anon sign-in failed after re-init:", e); }
                  }
                });
             } else if (config) { // If cloud config was provided but auth didn't init
                 console.warn("Firebase Auth not initialized after re-init with new config.");
             }
        } catch (initError) {
            const errorMsg = `Lỗi khởi tạo lại dịch vụ: ${initError instanceof Error ? initError.message : String(initError)}.`;
            setStorageInitError(errorMsg);
        } finally {
            setIsInitialLoading(false);
        }
    }
  };
};
