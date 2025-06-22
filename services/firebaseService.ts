
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
  Timestamp,
  updateDoc
} from 'firebase/firestore';

import { SaveGameData, SaveGameMeta, KnowledgeBase, GameMessage, FirebaseUserConfig } from '../types';
import { APP_VERSION, VIETNAMESE, MAX_AUTO_SAVE_SLOTS } from '../constants';

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
      // console.log("Previous Firebase app instance deleted.");
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
    // console.log("Attempting to initialize Firebase with user-provided configuration...");
    try {
      const app = initializeApp(userConfig);
      firebaseAppInstance = app;
      firebaseAuthInstance = getAuth(app);
      firestoreDBInstance = getFirestore(app);
      isFirestoreReadyForUse = true;
      // console.log("Firebase initialized successfully with user-provided configuration. Firestore is ready.");
    } catch (error) {
      console.error("Failed to initialize Firebase with user-provided configuration:", error);
      isFirestoreReadyForUse = false;
      // Propagate the error to be handled by the caller (App.tsx)
      throw new Error(`Lỗi khởi tạo Firebase với cấu hình tùy chỉnh: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    // console.log("Firebase user configuration not provided or incomplete. Firestore will not be initialized or used. Initializing Auth for anonymous access (if possible with minimal config).");
    isFirestoreReadyForUse = false;
     try {
        // console.warn("Auth-only Firebase initialization skipped as no default minimal config is defined for it without user-provided full config.");
     } catch (authError) {
        console.error("Error during minimal Firebase Auth initialization (if attempted):", authError);
     }
  }
};


// Auth-related functions now check if firebaseAuthInstance is available
export const onAuthUserChanged = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  if (!firebaseAuthInstance) {
    // console.warn("Firebase Auth not initialized. Cannot set up onAuthUserChanged listener. This may be normal if local storage is active or Firebase setup is pending/failed.");
    return () => console.warn("Attempted to unsubscribe from auth changes, but Auth was not initialized.");
  }
  return onAuthStateChanged(firebaseAuthInstance, callback);
};

export const signInUserAnonymously = async (): Promise<FirebaseUser | null> => {
  if (!firebaseAuthInstance) {
     // console.warn("Firebase Auth not initialized. Cannot sign in anonymously. User needs to configure cloud storage with Firebase for this.");
     return null; 
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
    // console.warn("Firebase Auth not initialized. Cannot sign out.");
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


const SAVES_COLLECTION = 'saves_v3'; // Incremented version for new save structure if needed
const USERS_COLLECTION = 'users_v2'; // Keep user collection same unless its structure changes

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
  // Ensure specific KnowledgeBase fields for save system are present even if null
  const kbSpecificFields = ['autoSaveTurnCounter', 'currentAutoSaveSlotIndex', 'autoSaveSlotIds', 'manualSaveId', 'manualSaveName'];
  if (typeof obj === 'object' && obj !== null && 'playerStats' in obj && 'inventory' in obj) { // Heuristic for KB object
    kbSpecificFields.forEach(field => {
      if (obj[field] === undefined) {
        // This part is tricky, we don't want to add them if it's not a KB object.
        // The cleaning should primarily remove undefined, not add defaults.
        // Defaults are handled at INITIAL_KNOWLEDGE_BASE.
      }
    });
  }


  return newObj;
}

// Firestore-dependent functions
export const saveGameToFirestore = async (
  userId: string,
  knowledgeBase: KnowledgeBase,
  gameMessages: GameMessage[],
  saveName: string,
  existingSaveId: string | null
): Promise<string> => {
  // console.log(`[SAVE_DEBUG_FS] saveGameToFirestore called. UserID: ${userId}, Name: "${saveName}", ExistingID: ${existingSaveId}`);
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    // console.error("[SAVE_DEBUG_FS] Firestore not configured or ready.");
    throw new Error("Firestore is not configured or ready. Please check storage settings.");
  }
  if (!userId) {
    // console.error("[SAVE_DEBUG_FS] User ID is required.");
    throw new Error("User ID is required to save game to Firestore.");
  }
  try {
    const cleanedKnowledgeBase = removeUndefinedFields(knowledgeBase);
    const cleanedGameMessages = removeUndefinedFields(gameMessages);

    const gameDataForStorage: Omit<SaveGameData, 'id'> = { // id is not part of the data payload for setDoc if new, or comes from existingSaveId
      name: saveName,
      timestamp: serverTimestamp(), // Always update timestamp on save/overwrite
      knowledgeBase: cleanedKnowledgeBase,
      gameMessages: cleanedGameMessages,
      appVersion: APP_VERSION,
    };
    // console.log("[SAVE_DEBUG_FS] Game data to store (partial):", JSON.stringify(gameDataForStorage).substring(0, 500) + "...");

    
    const userSavesCollectionRef = collection(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION);
    let saveDocRef;

    if (existingSaveId) {
      // console.log(`[SAVE_DEBUG_FS] Updating existing document with ID: ${existingSaveId}`);
      saveDocRef = doc(userSavesCollectionRef, existingSaveId);
      // Overwrite existing document with new data
      await setDoc(saveDocRef, gameDataForStorage); 
      // console.log("[SAVE_DEBUG_FS] Firestore document updated successfully.");
      return existingSaveId;
    } else {
      // console.log("[SAVE_DEBUG_FS] Creating new document in Firestore.");
      // Create new document
      saveDocRef = doc(userSavesCollectionRef); // Firestore generates new ID
      await setDoc(saveDocRef, gameDataForStorage);
      // console.log("[SAVE_DEBUG_FS] New Firestore document created successfully. ID:", saveDocRef.id);
      return saveDocRef.id;
    }
  } catch (error) {
    // console.error("[SAVE_DEBUG_FS] Error saving/updating game to Firestore:", error);
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
    // Load more to see all auto-saves and manual save
    const q = query(userSavesCollectionRef, orderBy('timestamp', 'desc'), limit(MAX_AUTO_SAVE_SLOTS + 5)); 
    
    const querySnapshot = await getDocs(q);
    const saves: SaveGameMeta[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Partial<Omit<SaveGameData, 'id'>>; 
      if (data.timestamp) { 
        let estimatedSize = 0;
        try {
          const dataForSizing = { ...data };
          delete (dataForSizing as any).timestamp; 
          estimatedSize = JSON.stringify(dataForSizing).length;
        } catch (e) {
          // console.warn("Could not estimate size for Firestore document:", docSnap.id, e);
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
    // console.error("Error loading games from Firestore:", error);
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
    // console.error("Error loading specific game from Firestore:", error);
    throw error;
  }
};

export const deleteGameFromFirestore = async (userId: string, saveId: string): Promise<void> => {
  // console.log(`[DEBUG_DELETE_FS] deleteGameFromFirestore called. UserID: ${userId}, SaveID: ${saveId}`);
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    // console.error("[DEBUG_DELETE_FS] Firestore not configured or ready.");
    throw new Error("Firestore is not configured or ready. Cannot delete game.");
  }
  if (!userId || !saveId) {
    // console.error("[DEBUG_DELETE_FS] User ID and Save ID are required for deletion.");
    throw new Error("User ID and Save ID are required for deletion.");
  }
  try {
    const saveDocRef = doc(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION, saveId);
    // console.log(`[DEBUG_DELETE_FS] Attempting to delete document at path: ${saveDocRef.path}`);
    await deleteDoc(saveDocRef);
    // console.log(`[DEBUG_DELETE_FS] Document ${saveId} deleted successfully from Firestore.`);
  } catch (error) {
    // console.error(`[DEBUG_DELETE_FS] Error deleting game ${saveId} from Firestore:`, error);
    throw error; // Re-throw the error to be caught by the caller
  }
};

export const importGameToFirestore = async (userId: string, gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'>): Promise<string> => {
  if (!isFirestoreReadyForUse || !firestoreDBInstance) {
    throw new Error("Firestore is not configured or ready. Please check storage settings.");
  }
  if (!userId) throw new Error("User ID is required to import game to Firestore.");
  
  try {
    const baseName = gameDataToImport.name || 'Game đã nhập';
    const existingSaves = await loadGamesFromFirestore(userId);
    const existingNames = existingSaves.map(s => s.name);

    let finalSaveName = baseName;
    let counter = 1;
    while (existingNames.includes(finalSaveName)) {
      finalSaveName = `${baseName} (${counter})`;
      counter++;
    }
    // console.log(`[DEBUG_FS] Importing game. Base name: "${baseName}", Final unique name: "${finalSaveName}"`);
    
    const cleanedKnowledgeBase = removeUndefinedFields(gameDataToImport.knowledgeBase);
    const cleanedGameMessages = removeUndefinedFields(gameDataToImport.gameMessages);

    // Reset save-specific IDs from the imported KB to ensure it's treated as a new save lineage.
    const kbForImport: KnowledgeBase = {
        ...cleanedKnowledgeBase,
        appVersion: APP_VERSION, // Always update to current app version on import
        manualSaveId: null,
        manualSaveName: null, // Will be set to finalSaveName by App.tsx after load if needed
        autoSaveSlotIds: Array(MAX_AUTO_SAVE_SLOTS).fill(null),
        currentAutoSaveSlotIndex: 0,
        autoSaveTurnCounter: 0,
    };


    const gameData: Omit<SaveGameData, 'id'> = {
      name: finalSaveName, // Use the generated unique name
      timestamp: serverTimestamp(), // New timestamp for the imported save
      knowledgeBase: kbForImport,
      gameMessages: cleanedGameMessages,
      appVersion: gameDataToImport.appVersion || APP_VERSION, 
    };
    
    const userSavesCollectionRef = collection(firestoreDBInstance, USERS_COLLECTION, userId, SAVES_COLLECTION);
    const newSaveDocRef = doc(userSavesCollectionRef); // Firestore generates new ID
    await setDoc(newSaveDocRef, gameData);
    return newSaveDocRef.id;
  } catch (error) {
    // console.error("Error importing game to Firestore:", error);
    throw error;
  }
};


// Check if Firebase Auth is initialized (mainly for UI components that might want to offer sign-in/out)
export const isAuthInitialized = (): boolean => {
    return !!firebaseAuthInstance;
};
