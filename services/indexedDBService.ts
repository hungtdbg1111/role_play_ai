
import { SaveGameData, SaveGameMeta, KnowledgeBase, GameMessage } from '../types';
import { APP_VERSION, VIETNAMESE } from '../constants';

const DB_NAME = 'DaoDoAIDB';
const DB_VERSION = 1;
const SAVES_STORE_NAME = 'gameSaves';
const LOCAL_USER_ID = 'local_player'; // Generic ID for local saves

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject('Error opening IndexedDB.');
        dbPromise = null; // Reset promise on error
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SAVES_STORE_NAME)) {
          const store = db.createObjectStore(SAVES_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('userId_timestamp', ['userId', 'timestamp']); // For user-specific sorting if needed
        }
      };
    });
  }
  return dbPromise;
};

export const saveGameToIndexedDB = async (
  knowledgeBase: KnowledgeBase,
  gameMessages: GameMessage[]
): Promise<string> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);

  const now = new Date();
  const saveName = `Lưu cục bộ ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`;

  // Ensure appVersion is part of the saved data
  const gameData: Omit<SaveGameData, 'id'> & { userId: string } = { // id is auto-incremented by IndexedDB
    name: saveName,
    timestamp: now, // Store as Date object
    knowledgeBase: { ...knowledgeBase, appVersion: APP_VERSION }, // Ensure appVersion in KB
    gameMessages,
    appVersion: APP_VERSION, // Top-level appVersion
    userId: LOCAL_USER_ID,
  };

  return new Promise<string>((resolve, reject) => {
    const request = store.add(gameData);
    request.onsuccess = () => {
      resolve(request.result.toString()); // The key of the newly added record
    };
    request.onerror = () => {
      console.error('Error saving game to IndexedDB:', request.error);
      reject('Failed to save game locally.');
    };
  });
};

export const loadGamesFromIndexedDB = async (): Promise<SaveGameMeta[]> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  const index = store.index('userId_timestamp'); // Use the compound index

  // Create a key range for the local user, sorting by timestamp (part of the compound index)
  // Since timestamp is the second part of the key, we query for [LOCAL_USER_ID, earliest_date] to [LOCAL_USER_ID, latest_date]
  // For descending order, we iterate in reverse.
  const range = IDBKeyRange.bound([LOCAL_USER_ID, new Date(0)], [LOCAL_USER_ID, new Date()]);

  return new Promise<SaveGameMeta[]>((resolve, reject) => {
    const request = index.getAll(range); // Get all for local user
    
    request.onsuccess = () => {
      const saves: SaveGameMeta[] = request.result
        .filter(item => item.userId === LOCAL_USER_ID) // Double check userId, though index should handle it
        .map(item => {
          let estimatedSize = 0;
          try {
            estimatedSize = JSON.stringify(item).length;
          } catch (e) {
            console.warn("Could not estimate size for IndexedDB item:", item.id, e);
          }
          return {
            id: item.id.toString(),
            name: item.name,
            timestamp: new Date(item.timestamp), // Ensure it's a Date object
            size: estimatedSize,
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()) // Sort descending by time
        .slice(0, 20); // Limit to 20 most recent
      resolve(saves);
    };
    request.onerror = () => {
      console.error('Error loading games from IndexedDB:', request.error);
      reject('Failed to load local games.');
    };
  });
};

export const loadSpecificGameFromIndexedDB = async (saveId: string): Promise<SaveGameData | null> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  
  // IndexedDB keys are often numbers if autoIncrement is used. Convert if necessary.
  const numericId = parseInt(saveId, 10);
  if (isNaN(numericId)) {
      console.warn("loadSpecificGameFromIndexedDB: saveId is not a number, attempting to use as string if keyPath allows.");
      // If your keyPath is not autoIncrementing number, this might be fine.
      // But with autoIncrement, keys are numbers.
  }

  return new Promise<SaveGameData | null>((resolve, reject) => {
    const request = store.get(isNaN(numericId) ? saveId : numericId);
    request.onsuccess = () => {
      if (request.result && request.result.userId === LOCAL_USER_ID) {
        const data = request.result as SaveGameData;
        resolve({
            ...data,
            timestamp: new Date(data.timestamp) // Ensure timestamp is a Date object
        });
      } else {
        resolve(null);
      }
    };
    request.onerror = () => {
      console.error('Error loading specific game from IndexedDB:', request.error);
      reject('Failed to load specific local game.');
    };
  });
};

export const deleteGameFromIndexedDB = async (saveId: string): Promise<void> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  
  const numericId = parseInt(saveId, 10);
   if (isNaN(numericId)) {
      console.warn("deleteGameFromIndexedDB: saveId is not a number. This might fail if keys are numeric.");
  }

  return new Promise<void>((resolve, reject) => {
    // Check if item exists and belongs to local_user before deleting (optional, but good for safety)
    const getRequest = store.get(isNaN(numericId) ? saveId : numericId);
    getRequest.onsuccess = () => {
        if (getRequest.result && getRequest.result.userId === LOCAL_USER_ID) {
            const deleteRequest = store.delete(isNaN(numericId) ? saveId : numericId);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => {
                console.error('Error deleting game from IndexedDB:', deleteRequest.error);
                reject('Failed to delete local game.');
            };
        } else if (getRequest.result) {
            reject('Attempted to delete a game save not belonging to local user or invalid ID.');
        } else {
             reject('Game save not found for deletion.');
        }
    }
    getRequest.onerror = () => {
        console.error('Error checking game before deletion:', getRequest.error);
        reject('Failed to check local game before deletion.');
    }
  });
};

export const importGameToIndexedDB = async (
  gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'>
): Promise<string> => {
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);

  const now = new Date();
  const saveName = `${VIETNAMESE.importFileButton} - ${gameDataToImport.name || 'Game đã nhập'} - ${now.toLocaleDateString('vi-VN')}`;

  const gameData: Omit<SaveGameData, 'id'> & { userId: string } = {
    name: saveName,
    timestamp: now, // New timestamp for the imported save
    knowledgeBase: { ...gameDataToImport.knowledgeBase, appVersion: APP_VERSION },
    gameMessages: gameDataToImport.gameMessages,
    appVersion: gameDataToImport.appVersion || APP_VERSION,
    userId: LOCAL_USER_ID,
  };

  return new Promise<string>((resolve, reject) => {
    const request = store.add(gameData); // ID will be auto-generated
    request.onsuccess = () => {
      resolve(request.result.toString());
    };
    request.onerror = () => {
      console.error('Error importing game to IndexedDB:', request.error);
      reject('Failed to import game locally.');
    };
  });
};


// Function to clear the IndexedDB promise for testing or re-initialization scenarios
export const resetDBConnection = () => {
  dbPromise = null;
};