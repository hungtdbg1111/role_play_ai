
import { SaveGameData, SaveGameMeta, KnowledgeBase, GameMessage } from '../types';
import { APP_VERSION, VIETNAMESE, MAX_AUTO_SAVE_SLOTS } from '../constants';

const DB_NAME = 'DaoDoAIDB';
const DB_VERSION = 2; // Incremented version
const SAVES_STORE_NAME = 'gameSaves_v2'; 
const LOCAL_USER_ID = 'local_player'; 

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      // console.log(`[DEBUG_IDB] Opening IndexedDB: ${DB_NAME}, Version: ${DB_VERSION}`);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        // console.error('[DEBUG_IDB] IndexedDB error on open:', request.error);
        reject('Error opening IndexedDB.');
        dbPromise = null; 
      };

      request.onsuccess = () => {
        // console.log('[DEBUG_IDB] IndexedDB opened successfully.');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        // console.log(`[DEBUG_IDB] IndexedDB upgrade needed. Old version: ${event.oldVersion}, New version: ${event.newVersion}`);
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = (event.target as IDBOpenDBRequest).transaction;

        if (!db.objectStoreNames.contains(SAVES_STORE_NAME)) {
          // console.log(`[DEBUG_IDB] Creating object store: ${SAVES_STORE_NAME}`);
          const store = db.createObjectStore(SAVES_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          // console.log(`[DEBUG_IDB] Creating index 'name_userId' on ${SAVES_STORE_NAME}`);
          store.createIndex('name_userId', ['name', 'userId']);
          // console.log(`[DEBUG_IDB] Creating index 'userId_timestamp' on ${SAVES_STORE_NAME}`);
          store.createIndex('userId_timestamp', ['userId', 'timestamp']);
        } else {
          // console.log(`[DEBUG_IDB] Object store ${SAVES_STORE_NAME} already exists. Checking indices.`);
          if (transaction) {
            const store = transaction.objectStore(SAVES_STORE_NAME);
            if (!store.indexNames.contains('name_userId')) {
              // console.log(`[DEBUG_IDB] Creating index 'name_userId' on existing store ${SAVES_STORE_NAME}`);
              store.createIndex('name_userId', ['name', 'userId']);
            }
             if (!store.indexNames.contains('userId_timestamp')) {
              // console.log(`[DEBUG_IDB] Creating index 'userId_timestamp' on existing store ${SAVES_STORE_NAME}`);
              store.createIndex('userId_timestamp', ['userId', 'timestamp']);
            }
          } else {
            // console.warn("[DEBUG_IDB] onupgradeneeded: transaction is null, cannot check/create indices on existing store if it already existed with an older schema but same name.");
          }
        }
        // console.log('[DEBUG_IDB] IndexedDB upgrade complete.');
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
  // console.log(`[SAVE_DEBUG_DB] saveGameToIndexedDB called. Name: "${saveName}", ExistingID: ${existingSaveId}`);
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);

  const gameDataToStore: Omit<SaveGameData, 'id'> & { userId: string, id?: string | number } = {
    name: saveName,
    timestamp: new Date(),
    knowledgeBase: { ...knowledgeBase, appVersion: APP_VERSION },
    gameMessages,
    appVersion: APP_VERSION,
    userId: LOCAL_USER_ID,
  };
  // console.log("[SAVE_DEBUG_DB] Game data to store:", JSON.stringify(gameDataToStore).substring(0, 500) + "...");


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
  // console.log("[DEBUG_IDB] loadGamesFromIndexedDB called.");
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  const index = store.index('userId_timestamp');
  // console.log("[DEBUG_IDB] Using index 'userId_timestamp' for loading games.");

  const range = IDBKeyRange.bound([LOCAL_USER_ID, new Date(0)], [LOCAL_USER_ID, new Date()]);
  // console.log("[DEBUG_IDB] Query range for local user:", range);

  return new Promise<SaveGameMeta[]>((resolve, reject) => {
    const request = index.getAll(range); 
    // console.log("[DEBUG_IDB] getAll request initiated from index.");
    
    request.onsuccess = () => {
      // console.log("[DEBUG_IDB] getAll request successful. Result count:", request.result.length);
      const saves: SaveGameMeta[] = request.result
        .filter(item => item.userId === LOCAL_USER_ID) 
        .map(item => {
          let estimatedSize = 0;
          try {
            estimatedSize = JSON.stringify(item).length;
          } catch (e) {
            // console.warn("[DEBUG_IDB] Could not estimate size for IndexedDB item:", item.id, e);
          }
          return {
            id: item.id.toString(),
            name: item.name,
            timestamp: new Date(item.timestamp), 
            size: estimatedSize,
          };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); 
      // console.log("[DEBUG_IDB] Processed and sorted saves:", saves);
      resolve(saves);
    };
    request.onerror = () => {
      // console.error('[DEBUG_IDB] Error loading games from IndexedDB:', request.error);
      reject(new Error(`Failed to load local games. Details: ${request.error?.message || 'Unknown error'}`));
    };
  });
};

export const loadSpecificGameFromIndexedDB = async (saveId: string): Promise<SaveGameData | null> => {
  // console.log(`[DEBUG_IDB] loadSpecificGameFromIndexedDB called. SaveID: ${saveId}`);
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readonly');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  
  const numericId = parseInt(saveId, 10);
  if (isNaN(numericId) && typeof saveId === 'string') {
      // console.warn("[DEBUG_IDB] loadSpecificGameFromIndexedDB: saveId is a non-numeric string, using as string key.", saveId);
  }

  return new Promise<SaveGameData | null>((resolve, reject) => {
    const keyToLoad = isNaN(numericId) ? saveId : numericId;
    // console.log(`[DEBUG_IDB] Attempting to get game with key: ${JSON.stringify(keyToLoad)}`);
    const request = store.get(keyToLoad);

    request.onsuccess = () => {
      // console.log(`[DEBUG_IDB] Get request successful for key ${keyToLoad}. Result:`, request.result);
      if (request.result && request.result.userId === LOCAL_USER_ID) {
        const data = request.result as SaveGameData;
        resolve({
            ...data,
            id: data.id?.toString(), 
            timestamp: new Date(data.timestamp) 
        });
      } else if (request.result) { 
        // console.warn(`[DEBUG_IDB] Game found with key ${keyToLoad} but userId mismatch. Found: "${request.result.userId}", Expected: "${LOCAL_USER_ID}"`);
        resolve(null); 
      }
      else { 
        // console.log(`[DEBUG_IDB] No game found for key ${keyToLoad}.`);
        resolve(null);
      }
    };
    request.onerror = () => {
      // console.error(`[DEBUG_IDB] Error loading specific game (key: ${keyToLoad}) from IndexedDB:`, request.error);
      reject(new Error(`Failed to load specific local game. Details: ${request.error?.message || 'Unknown error'}`));
    };
  });
};

export const deleteGameFromIndexedDB = async (saveId: string): Promise<void> => {
  // console.log(`[DEBUG_DELETE_IDB] deleteGameFromIndexedDB called. SaveID: ${saveId}`);
  const db = await getDb();
  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);
  
  const numericId = parseInt(saveId, 10);
  const keyToDelete = isNaN(numericId) ? saveId : numericId;
  // console.log(`[DEBUG_DELETE_IDB] Determined key to delete: ${JSON.stringify(keyToDelete)} (original saveId: "${saveId}")`);

  return new Promise<void>((resolve, reject) => {
    // console.log(`[DEBUG_DELETE_IDB] Attempting to get record with key: ${keyToDelete} before deletion.`);
    const getRequest = store.get(keyToDelete); 
    
    getRequest.onsuccess = () => {
      // console.log(`[DEBUG_DELETE_IDB] getRequest.onsuccess. Result for key ${keyToDelete}:`, getRequest.result);
      if (getRequest.result) { 
        if (getRequest.result.userId === LOCAL_USER_ID) { 
          // console.log(`[DEBUG_DELETE_IDB] Record found and userId matches. Proceeding with delete operation for key: ${keyToDelete}`);
          const deleteRequest = store.delete(keyToDelete);
          deleteRequest.onsuccess = () => {
            // console.log(`[DEBUG_DELETE_IDB] deleteRequest.onsuccess for key: ${keyToDelete}. Deletion successful.`);
            resolve();
          };
          deleteRequest.onerror = () => {
            const errorMsg = `Failed to delete local game data. Details: ${deleteRequest.error?.message || 'Unknown IndexedDB error'}`;
            // console.error(`[DEBUG_DELETE_IDB] deleteRequest.onerror for key ${keyToDelete}:`, deleteRequest.error);
            reject(new Error(errorMsg));
          };
        } else { 
          const errorMsg = `Attempted to delete a game save (key: ${keyToDelete}) not belonging to the local user. Expected user: "${LOCAL_USER_ID}", found: "${getRequest.result.userId}".`;
          // console.warn(`[DEBUG_DELETE_IDB] ${errorMsg}`);
          reject(new Error(errorMsg));
        }
      } else { 
        const errorMsg = `Game save not found for key: ${keyToDelete}. Cannot delete. This might indicate the key was already deleted or never existed.`;
        // console.warn(`[DEBUG_DELETE_IDB] ${errorMsg}`);
        reject(new Error(errorMsg));
      }
    };
    
    getRequest.onerror = () => {
      const errorMsg = `Failed to check local game (key: ${keyToDelete}) before deletion. Details: ${getRequest.error?.message || 'Unknown IndexedDB error'}`;
      // console.error(`[DEBUG_DELETE_IDB] getRequest.onerror for key ${keyToDelete}:`, getRequest.error);
      reject(new Error(errorMsg));
    };
  });
};

export const importGameToIndexedDB = async (
  gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'>
): Promise<string> => {
  // console.log("[DEBUG_IDB] importGameToIndexedDB called.");
  const db = await getDb();
  
  const existingSaves = await loadGamesFromIndexedDB();
  const existingNames = existingSaves.map(s => s.name);

  const baseName = gameDataToImport.name || 'Game đã nhập';
  let finalSaveName = baseName;
  let counter = 1;
  while (existingNames.includes(finalSaveName)) {
    finalSaveName = `${baseName} (${counter})`;
    counter++;
  }
  // console.log(`[DEBUG_IDB] Importing game. Base name: "${baseName}", Final unique name: "${finalSaveName}"`);

  const transaction = db.transaction(SAVES_STORE_NAME, 'readwrite');
  const store = transaction.objectStore(SAVES_STORE_NAME);

  const gameData: Omit<SaveGameData, 'id'> & { userId: string } = {
    name: finalSaveName, 
    timestamp: new Date(), 
    knowledgeBase: { ...gameDataToImport.knowledgeBase, appVersion: APP_VERSION },
    gameMessages: gameDataToImport.gameMessages,
    appVersion: gameDataToImport.appVersion || APP_VERSION,
    userId: LOCAL_USER_ID,
  };
  // console.log("[DEBUG_IDB] Data prepared for import with unique name:", gameData);

  return new Promise<string>((resolve, reject) => {
    const request = store.add(gameData); 
    // console.log("[DEBUG_IDB] Add request initiated for import.");
    request.onsuccess = () => {
      // console.log("[DEBUG_IDB] Import to IndexedDB successful. Resulting key:", request.result);
      resolve(request.result.toString());
    };
    request.onerror = () => {
      const errorMsg = `Failed to import game locally. Details: ${request.error?.message || 'Unknown error'}`;
      // console.error('[DEBUG_IDB] Error importing game to IndexedDB:', request.error);
      reject(new Error(errorMsg));
    };
  });
};


export const resetDBConnection = () => {
  // console.log("[DEBUG_IDB] Resetting IndexedDB connection promise.");
  dbPromise = null;
};
