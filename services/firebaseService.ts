
import { initializeApp, FirebaseApp } from 'firebase/app';
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
// import { getAnalytics } from 'firebase/analytics'; // Optional: if you plan to use analytics

import { SaveGameData, SaveGameMeta, KnowledgeBase, GameMessage } from '../types';
import { APP_VERSION } from '../constants';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth;
let firestoreDB: Firestore;
let loadedFirebaseConfig: any = null; // To cache the loaded config

// Function to load Firebase config from firebaseconfig.json
async function loadAndCacheFirebaseConfig(): Promise<any> {
  if (loadedFirebaseConfig) {
    return loadedFirebaseConfig;
  }
  try {
    const response = await fetch('/firebaseconfig.json');
    if (!response.ok) {
      throw new Error(`Failed to fetch firebaseconfig.json: ${response.statusText} (${response.status})`);
    }
    const config = await response.json();
    if (!config.apiKey || !config.projectId) {
      console.error("Invalid Firebase config loaded:", config);
      throw new Error("Invalid Firebase config: apiKey or projectId missing.");
    }
    loadedFirebaseConfig = config;
    return loadedFirebaseConfig;
  } catch (error) {
    console.error("Error loading or parsing Firebase configuration:", error);
    throw error; // Re-throw to be caught by initFirebase
  }
}

export const initFirebase = async (): Promise<void> => {
  if (firebaseApp) { // Already initialized
    return;
  }
  try {
    const config = await loadAndCacheFirebaseConfig();
    // No need to check for !config here, as loadAndCacheFirebaseConfig will throw on error.
    
    const app = initializeApp(config);
    firebaseApp = app; // Assign here
    firebaseAuth = getAuth(app);
    firestoreDB = getFirestore(app);
    // getAnalytics(app); // Initialize analytics if needed
    console.log("Firebase initialized with config from firebaseconfig.json");
  } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      // This error will be propagated to App.tsx to handle UI feedback
      throw error; 
  }
};

export const onAuthUserChanged = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  if (!firebaseAuth) {
    // This case should ideally not happen if initFirebase is called first and succeeds.
    console.error("Firebase Auth not initialized. Cannot set up onAuthUserChanged listener.");
    return () => {}; // Return a no-op unsubscribe function
  }
  return onAuthStateChanged(firebaseAuth, callback);
};

export const signInUserAnonymously = async (): Promise<FirebaseUser | null> => {
  if (!firebaseAuth) throw new Error("Firebase Auth not initialized.");
  try {
    const userCredential = await signInAnonymously(firebaseAuth);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    return null;
  }
};

export const signOutUser = async (): Promise<void> => {
  if (!firebaseAuth) throw new Error("Firebase Auth not initialized.");
  try {
    await signOut(firebaseAuth);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

export const getCurrentUser = (): FirebaseUser | null => {
  if (!firebaseAuth) return null;
  return firebaseAuth.currentUser;
};

const SAVES_COLLECTION = 'saves';
const USERS_COLLECTION = 'users';

// Utility function to recursively remove undefined fields
function removeUndefinedFields(obj: any): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    // Process each item in the array and filter out any standalone undefined values
    return obj.map(item => removeUndefinedFields(item)).filter(item => item !== undefined);
  }

  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (value !== undefined) {
        const cleanedValue = removeUndefinedFields(value);
        // Only add the key back if the cleaned value is not undefined
        // This handles cases where a nested object might become entirely undefined after cleaning
        if (cleanedValue !== undefined) {
          newObj[key] = cleanedValue;
        }
      }
    }
  }
  // If an object becomes empty after removing undefined fields, Firestore treats it as an empty map, which is fine.
  return newObj;
}


export const saveGameToFirestore = async (userId: string, knowledgeBase: KnowledgeBase, gameMessages: GameMessage[]): Promise<string> => {
  if (!firestoreDB) throw new Error("Firestore not initialized.");
  if (!userId) throw new Error("User ID is required to save game.");
  try {
    const now = new Date();
    const saveName = `Lưu ngày ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`;
    
    // Sanitize data before saving
    const cleanedKnowledgeBase = removeUndefinedFields(knowledgeBase);
    const cleanedGameMessages = removeUndefinedFields(gameMessages);

    const gameData: SaveGameData = {
      name: saveName,
      timestamp: serverTimestamp(),
      knowledgeBase: cleanedKnowledgeBase,
      gameMessages: cleanedGameMessages,
      appVersion: APP_VERSION,
    };
    
    const userSavesCollectionRef = collection(firestoreDB, USERS_COLLECTION, userId, SAVES_COLLECTION);
    const newSaveDocRef = doc(userSavesCollectionRef); // Auto-generate ID
    await setDoc(newSaveDocRef, gameData);
    console.log("Game saved successfully with ID:", newSaveDocRef.id);
    return newSaveDocRef.id;
  } catch (error) {
    console.error("Error saving game to Firestore:", error);
    throw error;
  }
};

export const loadGamesFromFirestore = async (userId: string): Promise<SaveGameMeta[]> => {
  if (!firestoreDB) throw new Error("Firestore not initialized.");
  if (!userId) throw new Error("User ID is required to load games.");
  try {
    const userSavesCollectionRef = collection(firestoreDB, USERS_COLLECTION, userId, SAVES_COLLECTION);
    const q = query(userSavesCollectionRef, orderBy('timestamp', 'desc'), limit(20)); // Get latest 20 saves
    
    const querySnapshot = await getDocs(q);
    const saves: SaveGameMeta[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<SaveGameData, 'id'>; // Data from Firestore won't have the id field itself
      if (data.timestamp) { // Ensure timestamp exists
        saves.push({
          id: docSnap.id,
          name: data.name || `Lưu ngày ${ (data.timestamp as Timestamp).toDate().toLocaleString('vi-VN')}`,
          timestamp: (data.timestamp as Timestamp).toDate(), // Convert Firestore Timestamp to JS Date
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
  if (!firestoreDB) throw new Error("Firestore not initialized.");
  if (!userId || !saveId) throw new Error("User ID and Save ID are required.");
  try {
    const saveDocRef = doc(firestoreDB, USERS_COLLECTION, userId, SAVES_COLLECTION, saveId);
    const docSnap = await getDoc(saveDocRef);

    if (docSnap.exists()) {
      const firestoreData = docSnap.data() as Omit<SaveGameData, 'id' | 'timestamp'> & { timestamp: Timestamp };
      // Firestore data is assumed to be clean on read.
      return {
        ...firestoreData,
        id: docSnap.id,
        timestamp: firestoreData.timestamp.toDate(), // Convert Firestore Timestamp to JS Date
      };
    } else {
      console.log("No such save document!");
      return null;
    }
  } catch (error) {
    console.error("Error loading specific game from Firestore:", error);
    throw error;
  }
};

export const deleteGameFromFirestore = async (userId: string, saveId: string): Promise<void> => {
  if (!firestoreDB) throw new Error("Firestore not initialized.");
  if (!userId || !saveId) throw new Error("User ID and Save ID are required for deletion.");
  try {
    const saveDocRef = doc(firestoreDB, USERS_COLLECTION, userId, SAVES_COLLECTION, saveId);
    await deleteDoc(saveDocRef);
    console.log("Save game deleted successfully:", saveId);
  } catch (error) {
    console.error("Error deleting game from Firestore:", error);
    throw error;
  }
};
