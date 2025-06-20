

import { initializeApp, FirebaseApp, deleteApp } from 'firebase/app';
import { 
  getAuth, 
  Auth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signOut, 
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';

import { SaveGameData, SaveGameMeta, KnowledgeBase, GameMessage, FirebaseUserConfig } from '../types';
import { APP_VERSION, VIETNAMESE } from '../constants';

let firebaseAppInstance: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;
let firestoreDBInstance: Firestore | null = null;
let isFirestoreReadyForUse: boolean = false;

// Function to initialize Firebase services
// This function can be called multiple times if settings change, it will try to re-initialize.
export const initializeFirebaseServices = async (userConfig?: FirebaseUserConfig | null): Promise<void> => {
  // If Firebase is already initialized, delete the old app instance before re-initializing
  if (firebaseAppInstance) {
    try {
      await deleteApp(firebaseAppInstance);
      console.log("Previous Firebase app instance deleted.");
    } catch (error) {
      console.error("Error deleting previous Firebase app instance:", error);
      // Continue, as re-initialization might still work or a new error will be thrown
    }
    firebaseAppInstance = null;
    firebaseAuthInstance = null;
    firestoreDBInstance = null;
    isFirestoreReadyForUse = false;
  }

  if (userConfig && userConfig.apiKey && userConfig.projectId) { // Check for essential config fields
    console.log("Attempting to initialize Firebase with user-provided configuration...");
    try {
      const app = initializeApp(userConfig);
      firebaseAppInstance = app;
      firebaseAuthInstance = getAuth(app);
      firestoreDBInstance = getFirestore(app);
      isFirestoreReadyForUse = true;
      console.log("Firebase initialized successfully with user-provided configuration. Firestore is ready.");
    } catch (error) {
      console.error("Failed to initialize Firebase with user-provided configuration:", error);
      isFirestoreReadyForUse = false;
      // Propagate the error to be handled by the caller (App.tsx)
      throw new Error(`Lỗi khởi tạo Firebase với cấu hình tùy chỉnh: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // No valid user config for Firebase, or local storage is selected.
    // We can still initialize Auth for anonymous sign-in if needed for other features (e.g., API key security with Gemini)
    // For now, let's assume if no userConfig, Firestore is not used.
    // We could have a minimal default config for Auth only if strictly necessary.
    console.log("Firebase user configuration not provided or incomplete. Firestore will not be initialized or used. Initializing Auth for anonymous access (if possible with minimal config).");
    isFirestoreReadyForUse = false;
     try {
        // A minimal config just for auth, if we decide to keep anonymous sign-in globally
        // This part is tricky without a default apiKey/projectId for auth only.
        // For simplicity, if no userConfig, we won't initialize Auth either through this function directly.
        // App.tsx might handle anonymous sign-in separately if needed.
        // For now, if no userConfig, firebaseAuthInstance remains null from this function.
        // If an app requires anonymous sign in for other features, that should be handled explicitly.
        // The prompt focuses on user-provided config for cloud saves.
        const minimalConfigForAuth = { apiKey: "placeholder", projectId: "placeholder" }; // This won't work without actual values
        // If a real minimal auth-only config is available, it could be used here.
        // For now, simply:
        // firebaseAuthInstance = getAuth(); // This would use a default app if one was pre-configured, which it isn't here.
        console.warn("Auth-only Firebase initialization skipped as no default minimal config is defined for it without user-provided full config.");
        // This means if user selects local storage, Firebase Auth might not be available unless App.tsx handles it.
     } catch (authError) {
        console.error("Error during minimal Firebase Auth initialization (if attempted):", authError);
     }
  }
};


// Auth-related functions now check if firebaseAuthInstance is available
export const onAuthUserChanged = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  if (!firebaseAuthInstance) {
    console.warn("Firebase Auth not initialized. Cannot set up onAuthUserChanged listener. This may be normal if local storage is active or Firebase setup is pending/failed.");
    return () => console.warn("Attempted to unsubscribe from auth changes, but Auth was not initialized.");
  }
  return onAuthStateChanged(firebaseAuthInstance, callback);
};

export const signInUserAnonymously = async (): Promise<FirebaseUser | null> => {
  if (!firebaseAuthInstance) {
     console.warn("Firebase Auth not initialized. Cannot sign in anonymously. User needs to configure cloud storage with Firebase for this.");
     // throw new Error("Firebase Auth not initialized. Configure cloud storage with Firebase to enable this.");
     return null; // Or throw, depending on how critical anon sign-in is outside of cloud saves
  }
  try {
    const userCredential = await signInAnonymously(firebaseAuthInstance);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    return null;
  }
};

export const signOutUser = async (): Promise<void> => {
  if (!firebaseAuthInstance) {
    console.warn("Firebase Auth not initialized. Cannot sign out.");
    return;
  }
  try {
    await signOut(firebaseAuthInstance);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  if (!firebaseAuthInstance) return null;
  return firebaseAuthInstance.currentUser;
};


const SAVES_COLLECTION = 'saves_v2'; // Changed to avoid conflict with old data structure if any
const USERS_COLLECTION = 'users_v2';

function removeUndefinedFields(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item)).filter(item => item !== undefined);
  }
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        const cleanedValue = removeUndefinedFields(value);
        if (cleanedValue !== undefined) {
          newObj[key] = cleanedValue;
        }
      }
    }
  }
  return newObj;
}

// Firestore-dependent functions
export const saveGameToFirestore = async (userId: string, knowledgeBase: KnowledgeBase, gameMessages: GameMessage[]): Promise<string> => {
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    throw new Error("Firestore is not configured or ready. Please check storage settings.");
  }
  if (!userId) throw new Error("User ID is required to save game to Firestore.");
  try {
    const now = new Date();
    const saveName = `Lưu ngày ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`;
    
    const cleanedKnowledgeBase = removeUndefinedFields(knowledgeBase);
    const cleanedGameMessages = removeUndefinedFields(gameMessages);

    const gameData: SaveGameData = {
      name: saveName,
      timestamp: serverTimestamp(),
      knowledgeBase: cleanedKnowledgeBase,
      gameMessages: cleanedGameMessages,
      appVersion: APP_VERSION,
    };
    
    const userSavesCollectionRef = collection(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION);
    const newSaveDocRef = doc(userSavesCollectionRef);
    await setDoc(newSaveDocRef, gameData);
    return newSaveDocRef.id;
  } catch (error) {
    console.error("Error saving game to Firestore:", error);
    throw error;
  }
};

export const loadGamesFromFirestore = async (userId: string): Promise<SaveGameMeta[]> => {
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    throw new Error("Firestore is not configured or ready. Cannot load games.");
  }
  if (!userId) throw new Error("User ID is required to load games from Firestore.");
  try {
    const userSavesCollectionRef = collection(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION);
    const q = query(userSavesCollectionRef, orderBy('timestamp', 'desc'), limit(20));
    
    const querySnapshot = await getDocs(q);
    const saves: SaveGameMeta[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<SaveGameData, 'id'>; // Data from Firestore
      if (data.timestamp) { // Ensure timestamp exists
        let estimatedSize = 0;
        try {
          // Exclude the server timestamp object itself from size calculation if it's large/complex
          const dataForSizing = { ...data };
          delete (dataForSizing as any).timestamp; // Remove serverTimestamp before stringify for more accurate payload size
          estimatedSize = JSON.stringify(dataForSizing).length;
        } catch (e) {
          console.warn("Could not estimate size for Firestore document:", docSnap.id, e);
        }

        saves.push({
          id: docSnap.id,
          name: data.name || `Lưu ngày ${ (data.timestamp as Timestamp).toDate().toLocaleString('vi-VN')}`,
          timestamp: (data.timestamp as Timestamp).toDate(),
          size: estimatedSize,
        });
      }
    });
    return saves;
  } catch (error) {
    console.error("Error loading games from Firestore:", error);
    throw error;
  }
};

export const loadSpecificGameFromFirestore = async (userId: string, saveId: string): Promise<SaveGameData | null> => {
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    throw new Error("Firestore is not configured or ready. Cannot load specific game.");
  }
  if (!userId || !saveId) throw new Error("User ID and Save ID are required.");
  try {
    const saveDocRef = doc(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION, saveId);
    const docSnap = await getDoc(saveDocRef);

    if (docSnap.exists()) {
      const firestoreData = docSnap.data() as Omit<SaveGameData, 'id' | 'timestamp'> & { timestamp: Timestamp };
      return {
        ...firestoreData,
        id: docSnap.id,
        timestamp: firestoreData.timestamp.toDate(),
      };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error loading specific game from Firestore:", error);
    throw error;
  }
};

export const deleteGameFromFirestore = async (userId: string, saveId: string): Promise<void> => {
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    throw new Error("Firestore is not configured or ready. Cannot delete game.");
  }
  if (!userId || !saveId) throw new Error("User ID and Save ID are required for deletion.");
  try {
    const saveDocRef = doc(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION, saveId);
    await deleteDoc(saveDocRef);
  } catch (error) {
    console.error("Error deleting game from Firestore:", error);
    throw error;
  }
};

export const importGameToFirestore = async (userId: string, gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'>): Promise<string> => {
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    throw new Error("Firestore is not configured or ready. Please check storage settings.");
  }
  if (!userId) throw new Error("User ID is required to import game to Firestore.");
  try {
    const now = new Date();
    const saveName = `${VIETNAMESE.importFileButton} - ${gameDataToImport.name || 'Game đã nhập'} - ${now.toLocaleDateString('vi-VN')}`;
    
    const cleanedKnowledgeBase = removeUndefinedFields(gameDataToImport.knowledgeBase);
    const cleanedGameMessages = removeUndefinedFields(gameDataToImport.gameMessages);

    const gameData: SaveGameData = {
      name: saveName,
      timestamp: serverTimestamp(), // New timestamp for the imported save
      knowledgeBase: { ...cleanedKnowledgeBase, appVersion: APP_VERSION },
      gameMessages: cleanedGameMessages,
      appVersion: gameDataToImport.appVersion || APP_VERSION, // Use imported version or current
    };
    
    const userSavesCollectionRef = collection(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION);
    const newSaveDocRef = doc(userSavesCollectionRef); // Firestore generates new ID
    await setDoc(newSaveDocRef, gameData);
    return newSaveDocRef.id;
  } catch (error) {
    console.error("Error importing game to Firestore:", error);
    throw error;
  }
};


// Check if Firebase Auth is initialized (mainly for UI components that might want to offer sign-in/out)
export const isAuthInitialized = (): boolean => {
    return !!firebaseAuthInstance;
};