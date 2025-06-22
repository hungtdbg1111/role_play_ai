
import { SaveGameData, SaveGameMeta, KnowledgeBase, GameMessage } from '../types';
import { APP_VERSION, VIETNAMESE, MAX_AUTO_SAVE_SLOTS } from '../constants';

const DB_NAME = 'DaoDoAIDB';
const DB_VERSION = 1; // Keep version 1 if schema doesn't change for auto-save fields
const SAVES_STORE_NAME = 'gameSaves_v2'; // Changed store name to avoid conflicts with old saves if any structure changes were made implicitly by new KB fields. If no structure change, can keep old name.
const LOCAL_USER_ID = 'local_player'; // Generic ID for local saves

let dbPromise: Promise<IDBDatabase> | null = null;

const getDb = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      // console.log(`[DEBUG_IDB] Opening IndexedDB: ${DB_NAME}, Version: ${DB_VERSION}`);
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        // console.error('[DEBUG_IDB] IndexedDB error on open:', request.error);
        reject('Error opening IndexedDB.');
        dbPromise = null; // Reset promise on error
      };

      request.onsuccess = () => {
        // console.log('[DEBUG_IDB] IndexedDB opened successfully.');
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        // console.log('[DEBUG_IDB] IndexedDB upgrade needed.');
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(SAVES_STORE_NAME)) {
          // console.log(`[DEBUG_IDB] Creating object store: ${SAVES_STORE_NAME}`);
          const store = db.createObjectStore(SAVES_STORE_NAME, { keyPath: 'id', autoIncrement: true });
          // console.log(`[DEBUG_IDB] Creating index 'name_userId' on ${SAVES_STORE_NAME}`);
          store.createIndex('name_userId', ['name', 'userId']); 
          // console.log(`[DEBUG_IDB] Creating index 'userId_timestamp' on ${SAVES_STORE_NAME}`);
          store.createIndex('userId_timestamp', ['userId', 'timestamp']);
        } else {
          // console.log(`[DEBUG_IDB] Object store ${SAVES_STORE_NAME} already exists. Checking indices.`);
          const transaction = (event.target as IDBOpenDBRequest).transaction;
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
  saveName: string, // Name for the save (user-defined or "Auto Save Slot X")
  existingSaveId: string | number | null // Pass string or number ID for existing save to update
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
    // If existingSaveId is string, try to parse, else use as is (if store uses string IDs)
    const idToUse = typeof existingSaveId === 'string' ? parseInt(existingSaveId, 10) : existingSaveId;
    if (isNaN(idToUse as number) && typeof existingSaveId === 'string') {
        // console.warn(`[SAVE_DEBUG_DB] Attempting to use non-numeric ID "${existingSaveId}" for update. This might fail if store uses auto-incrementing numeric keys.`);
        gameDataToStore.id = existingSaveId as string; // Keep original string ID
    } else if (!isNaN(idToUse as number)) {
         gameDataToStore.id = idToUse as number; // Use numeric ID for update
    } else {
        // existingSaveId was null/undefined or unparsable for numeric key, so treat as new add
        // This case should be caught by `existingSaveId !== null` but added for safety
    }
    // console.log(`[SAVE_DEBUG_DB] Performing 'put' (update/insert) operation with ID: ${gameDataToStore.id}`);
    operation = store.put(gameDataToStore); // .put() updates if key exists, adds if not.
  } else {
    // No existing ID, so it's a new save. 'id' will be auto-generated by IndexedDB.
    // We must remove 'id' from gameDataToStore if it's undefined for 'add' to work with autoIncrement.
    const { id, ...dataWithoutId } = gameDataToStore;
    // console.log("[SAVE_DEBUG_DB] Performing 'add' (new save) operation.");
    operation = store.add(dataWithoutId);
  }

  return new Promise<string>((resolve, reject) => {
    operation.onsuccess = () => {
      // console.log("[SAVE_DEBUG_DB] Save/Update to IndexedDB successful. Resulting key:", operation.result);
      resolve(operation.result.toString());
    };
    operation.onerror = () => {
      const errorMsg = `Failed to save/update game locally. Details: ${operation.error?.message || 'Unknown error'}`;
      // console.error('[SAVE_DEBUG_DB] Error saving/updating game to IndexedDB:', operation.error);
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
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // All saves, UI will decide how many to show or if needs slicing
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
            id: data.id?.toString(), // ensure ID is string
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
        // Consider resolving if not found, as the goal is for it to be gone. Or reject as "not found".
        // For now, rejecting as it implies an issue if we expected it to be there.
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
  
  // Fetch existing save names to handle collisions
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
    name: finalSaveName, // Use the generated unique name
    timestamp: new Date(), // New timestamp for the imported save
    knowledgeBase: { ...gameDataToImport.knowledgeBase, appVersion: APP_VERSION },
    gameMessages: gameDataToImport.gameMessages,
    appVersion: gameDataToImport.appVersion || APP_VERSION,
    userId: LOCAL_USER_ID,
  };
  // console.log("[DEBUG_IDB] Data prepared for import with unique name:", gameData);

  return new Promise<string>((resolve, reject) => {
    const request = store.add(gameData); // ID will be auto-generated
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


// Function to clear the IndexedDB promise for testing or re-initialization scenarios
export const resetDBConnection = () => {
  // console.log("[DEBUG_IDB] Resetting IndexedDB connection promise.");
  dbPromise = null;
};
