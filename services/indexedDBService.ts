import { SaveGameData, SaveGameMeta, KnowledgeBase, GameMessage, TurnHistoryEntry } from '../types';
import { APP_VERSION, VIETNAMESE, MAX_AUTO_SAVE_SLOTS } from '../constants';

const DB_NAME = 'DaoDoAIDB';
const DB_VERSION = 2; 
const SAVES_STORE_NAME = 'gameSaves_v2'; 
const LOCAL_USER_ID = 'local_player'; 

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error on open:', request.error);
        reject('Error opening IndexedDB.');
        dbPromise = null; 
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;

        if (!db.objectStoreNames.contains(SAVES_STORE_NAME)) {
          const store = db.createObjectStore(SAVES_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('name_userId', ['name', 'userId']);
          store.createIndex('userId_timestamp', ['userId', 'timestamp']);
        } else {
          if (transaction) {
            const store = transaction.objectStore(SAVES_STORE_NAME);
            if (!store.indexNames.contains('name_userId')) {
              store.createIndex('name_userId', ['name', 'userId']);
            }
             if (!store.indexNames.contains('userId_timestamp')) {
              store.createIndex('userId_timestamp', ['userId', 'timestamp']);
            }
          }
        }
      };
    });
  }
  return dbPromise;
};

export const saveGameToIndexedDB = async (
  knowledgeBase: KnowledgeBase,
  gameMessages: GameMessage[],
  saveName: string, 
  existingSaveId: string | number | null 
): Promise<string> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);

  // Deep clone and prepare KnowledgeBase for DB
  const kbForDb = JSON.parse(JSON.stringify(knowledgeBase)) as KnowledgeBase;

  // Optimize TurnHistory for DB storage
  if (kbForDb.turnHistory) {
    kbForDb.turnHistory = kbForDb.turnHistory.map((entry: TurnHistoryEntry) => {
      if (entry.type === 'delta') {
        // For delta entries, remove the full snapshots to save space
        // Keep deltas, turnNumber, type
        const { knowledgeBaseSnapshot, gameMessagesSnapshot, ...deltaEntryForDb } = entry;
        return {
            ...deltaEntryForDb,
            // Ensure deltas are present, or store empty arrays if somehow undefined
            knowledgeBaseDelta: entry.knowledgeBaseDelta || [], 
            gameMessagesDelta: entry.gameMessagesDelta || [],
        } as unknown as TurnHistoryEntry; // Cast because we are intentionally changing the shape for DB
      }
      // Keyframes keep their full snapshots
      // Ensure deltas are undefined or empty for keyframes to be clean
      return {
        ...entry,
        knowledgeBaseDelta: undefined,
        gameMessagesDelta: undefined,
      };
    });
  }
  
  // Ensure playerAvatarData only stores Cloudinary URL if available from worldConfig
  if (kbForDb.worldConfig?.playerAvatarUrl && kbForDb.worldConfig.playerAvatarUrl.startsWith('https://res.cloudinary.com')) {
    kbForDb.playerAvatarData = kbForDb.worldConfig.playerAvatarUrl;
  } else if (kbForDb.playerAvatarData && !kbForDb.playerAvatarData.startsWith('https://res.cloudinary.com') && !kbForDb.playerAvatarData.startsWith('data:image')) {
    // If playerAvatarData is neither Cloudinary URL nor base64, clear it if a non-Cloudinary URL is in worldConfig
    // or if worldConfig has no URL (to avoid saving invalid data)
    if (kbForDb.worldConfig?.playerAvatarUrl && !kbForDb.worldConfig.playerAvatarUrl.startsWith('https://res.cloudinary.com')){
         kbForDb.playerAvatarData = undefined; // Clear potentially invalid data
    } else if (!kbForDb.worldConfig?.playerAvatarUrl) {
         kbForDb.playerAvatarData = undefined;
    }
    // If playerAvatarData is base64 (data:image), it's likely a temporary upload state, don't save it long-term unless no Cloudinary URL.
    // The app logic should handle converting base64 to Cloudinary URL and updating worldConfig.playerAvatarUrl.
    // If worldConfig has a cloudinary URL, that takes precedence.
  }


  const gameDataToStore: Omit<SaveGameData, 'id'> & { userId: string, id?: string | number } = {
    name: saveName,
    timestamp: new Date(),
    knowledgeBase: { ...kbForDb, appVersion: APP_VERSION }, // Use the modified kbForDb
    gameMessages,
    appVersion: APP_VERSION,
    userId: LOCAL_USER_ID,
  };

  let operation: IDBRequest;
  if (existingSaveId !== null && existingSaveId !== undefined) {
    const idToUse = typeof existingSaveId === 'string' ? parseInt(existingSaveId, 10) : existingSaveId;
    if (isNaN(idToUse as number) && typeof existingSaveId === 'string') {
        gameDataToStore.id = existingSaveId as string; 
    } else if (!isNaN(idToUse as number)) {
         gameDataToStore.id = idToUse as number; 
    }
    operation = store.put(gameDataToStore); 
  } else {
    const { id, ...dataWithoutId } = gameDataToStore;
    operation = store.add(dataWithoutId);
  }

  return new Promise<string>((resolve, reject) => {
    operation.onsuccess = () => {
      resolve(operation.result.toString());
    };
    operation.onerror = () => {
      const errorMsg = `Failed to save/update game locally. Details: ${operation.error?.message || 'Unknown error'}`;
      reject(new Error(errorMsg));
    };
  });
};


export const loadGamesFromIndexedDB = async (): Promise<SaveGameMeta[]> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  const index = store.index('userId_timestamp');

  const range = IDBKeyRange.bound([LOCAL_USER_ID, new Date(0)], [LOCAL_USER_ID, new Date()]);

  return new Promise<SaveGameMeta[]>((resolve, reject) => {
    const request = index.getAll(range); 
    
    request.onsuccess = () => {
      const saves: SaveGameMeta[] = request.result
        .filter(item => item.userId === LOCAL_USER_ID) 
        .map(item => {
          let estimatedSize = 0;
          try {
            // Estimate size based on knowledgeBase and gameMessages only for better performance
            const sizeRelevantData = { kb: item.knowledgeBase, gm: item.gameMessages };
            estimatedSize = JSON.stringify(sizeRelevantData).length;
          } catch (e) {
            // Size estimation error
          }
          return {
            id: item.id.toString(),
            name: item.name,
            timestamp: new Date(item.timestamp), 
            size: estimatedSize,
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); 
      resolve(saves);
    };
    request.onerror = () => {
      console.error('Error loading games from IndexedDB:', request.error);
      reject(new Error(`Failed to load local games. Details: ${request.error?.message || 'Unknown error'}`));
    };
  });
};

export const loadSpecificGameFromIndexedDB = async (saveId: string): Promise<SaveGameData | null> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  
  const numericId = parseInt(saveId, 10);

  return new Promise<SaveGameData | null>((resolve, reject) => {
    const keyToLoad = isNaN(numericId) ? saveId : numericId;
    const request = store.get(keyToLoad);

    request.onsuccess = () => {
      if (request.result && request.result.userId === LOCAL_USER_ID) {
        const data = request.result as SaveGameData;
        
        // Ensure turnHistory entries are valid, even if delta snapshots are missing (they will be reconstructed later)
        if (data.knowledgeBase && data.knowledgeBase.turnHistory) {
          data.knowledgeBase.turnHistory = data.knowledgeBase.turnHistory.map(entry => ({
            ...entry,
            // Deltas are expected to have deltas and no snapshots from DB
            knowledgeBaseDelta: entry.type === 'delta' ? (entry.knowledgeBaseDelta || []) : undefined,
            gameMessagesDelta: entry.type === 'delta' ? (entry.gameMessagesDelta || []) : undefined,
            // Keyframes are expected to have snapshots and no deltas from DB
            knowledgeBaseSnapshot: entry.type === 'keyframe' ? entry.knowledgeBaseSnapshot : ({} as KnowledgeBase), // Placeholder if missing, will be reconstructed
            gameMessagesSnapshot: entry.type === 'keyframe' ? entry.gameMessagesSnapshot : [], // Placeholder
          }));
        }

        resolve({
            ...data,
            id: data.id?.toString(), 
            timestamp: new Date(data.timestamp) 
        });
      } else if (request.result) { 
        resolve(null); 
      }
      else { 
        resolve(null);
      }
    };
    request.onerror = () => {
      console.error(`Error loading specific game (key: ${keyToLoad}) from IndexedDB:`, request.error);
      reject(new Error(`Failed to load specific local game. Details: ${request.error?.message || 'Unknown error'}`));
    };
  });
};

export const deleteGameFromIndexedDB = async (saveId: string): Promise<void> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  
  const numericId = parseInt(saveId, 10);
  const keyToDelete = isNaN(numericId) ? saveId : numericId;

  return new Promise<void>((resolve, reject) => {
    const getRequest = store.get(keyToDelete); 
    
    getRequest.onsuccess = () => {
      if (getRequest.result) { 
        if (getRequest.result.userId === LOCAL_USER_ID) { 
          const deleteRequest = store.delete(keyToDelete);
          deleteRequest.onsuccess = () => {
            resolve();
          };
          deleteRequest.onerror = () => {
            const errorMsg = `Failed to delete local game data. Details: ${deleteRequest.error?.message || 'Unknown IndexedDB error'}`;
            console.error(`Error deleting from IndexedDB:`, deleteRequest.error);
            reject(new Error(errorMsg));
          };
        } else { 
          const errorMsg = `Attempted to delete a game save (key: ${keyToDelete}) not belonging to the local user.`;
          reject(new Error(errorMsg));
        }
      } else { 
        const errorMsg = `Game save not found for key: ${keyToDelete}. Cannot delete.`;
        reject(new Error(errorMsg));
      }
    };
    
    getRequest.onerror = () => {
      const errorMsg = `Failed to check local game (key: ${keyToDelete}) before deletion. Details: ${getRequest.error?.message || 'Unknown IndexedDB error'}`;
      console.error(`Error getting record before delete:`, getRequest.error);
      reject(new Error(errorMsg));
    };
  });
};

export const importGameToIndexedDB = async (
  gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'> & { name: string } // Ensure name is present
): Promise<string> => {
  const db = await getDb();
  
  const existingSaves = await loadGamesFromIndexedDB();
  const existingNames = existingSaves.map(s => s.name);

  let finalSaveName = gameDataToImport.name;
  let counter = 1;
  // Ensure unique name for imported save
  while (existingNames.includes(finalSaveName)) {
    finalSaveName = `${gameDataToImport.name} (${counter})`;
    counter++;
  }

  // The saveGameToIndexedDB function will handle the delta optimization logic.
  // The gameDataToImport should have full snapshots if it came from a standard JSON export.
  // If it came from an optimized (gzipped) export, its delta entries might already lack full snapshots.
  // saveGameToIndexedDB is designed to handle this: it derives deltas if snapshots are present and type is 'delta',
  // or preserves existing deltas if snapshots are missing but deltas are present.
  return saveGameToIndexedDB(
    gameDataToImport.knowledgeBase,
    gameDataToImport.gameMessages,
    finalSaveName,
    null // Always create as new save on import
  );
};


export const resetDBConnection = () => {
  dbPromise = null;
};