

import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, KnowledgeBase, GameMessage, WorldSettings, PlayerStats, Item, Skill, Quest, NPC, GameLocation, ParsedAiResponse, AiChoice, QuestObjective, Companion, WorldLoreEntry, ApiConfig, FirebaseUser, SaveGameData, PlayerActionInputType, ResponseLength, StorageSettings, StorageType, FirebaseUserConfig, SaveGameMeta, Faction, TurnHistoryEntry, StyleSettings } from './types'; 
import InitialScreen from './components/InitialScreen';
import GameSetupScreen from './components/GameSetupScreen';
import GameplayScreen from './components/GameplayScreen';
import ApiSettingsScreen from './components/ApiSettingsScreen';
import LoadGameScreen from './components/LoadGameScreen'; 
import StorageSettingsScreen from './components/StorageSettingsScreen'; 
import ImportExportScreen from './components/ImportExportScreen'; 
import Spinner from './components/ui/Spinner';
import Button from './components/ui/Button'; 
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, DEFAULT_PLAYER_STATS, APP_VERSION, DEFAULT_STORAGE_SETTINGS, STORAGE_SETTINGS_STORAGE_KEY, TURNS_PER_PAGE, MAX_TURN_HISTORY_LENGTH, DEFAULT_STYLE_SETTINGS, STYLE_SETTINGS_STORAGE_KEY } from './constants'; 
import { 
  generateInitialStory, 
  generateNextTurn, 
  getApiSettings,
  summarizeTurnHistory,
  // generateWorldDetailsFromStory // Import for logging its prompt (already imported)
} from './services/geminiService';
import { 
  initializeFirebaseServices, 
  onAuthUserChanged, 
  signInUserAnonymously, 
  signOutUser,
  saveGameToFirestore,
  loadGamesFromFirestore, 
  loadSpecificGameFromFirestore,
  deleteGameFromFirestore, 
  isAuthInitialized, 
  importGameToFirestore 
} from './services/firebaseService';
import {
  saveGameToIndexedDB,
  loadGamesFromIndexedDB,
  loadSpecificGameFromIndexedDB,
  deleteGameFromIndexedDB,
  importGameToIndexedDB 
} from './services/indexedDBService';
import * as GameTemplates from './templates';


const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.Initial);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)));
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null); 
  const [rawAiResponsesLog, setRawAiResponsesLog] = useState<string[]>([]); 
  const [sentPromptsLog, setSentPromptsLog] = useState<string[]>([]);
  
  const [storageSettings, setStorageSettings] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true); 
  const [isSavingGame, setIsSavingGame] = useState<boolean>(false); 
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [storageInitError, setStorageInitError] = useState<string | null>(null); 
  
  const [currentPageDisplay, setCurrentPageDisplay] = useState<number>(1);
  const [isSummarizingOnLoad, setIsSummarizingOnLoad] = useState<boolean>(false); // For summaries generated when loading a game
  const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false); // For summaries at page end
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [styleSettings, setStyleSettings] = useState<StyleSettings>(DEFAULT_STYLE_SETTINGS);


  const calculateTotalPages = useCallback((kb: KnowledgeBase): number => {
    return Math.max(1, kb.currentPageHistory?.length || 1);
  }, []);

  const totalPages = calculateTotalPages(knowledgeBase);

  const logSentPrompt = useCallback((prompt: string) => {
    setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10)); 
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
          // Basic validation for parsedStyleSettings structure if necessary
          setStyleSettings(parsedStyleSettings);
        } catch(e) {
          console.error("Failed to parse style settings, using defaults.", e);
          setStyleSettings(DEFAULT_STYLE_SETTINGS);
        }
      } else {
        setStyleSettings(DEFAULT_STYLE_SETTINGS);
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
      setStorageSettings(loadedSettings);

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
             console.warn("Firebase Auth not initialized after cloud setup attempt. User login might be required.");
          }
        } else {
           await initializeFirebaseServices(null); 
           if(isAuthInitialized()){ 
             const anonUser = await signInUserAnonymously();
             setFirebaseUser(anonUser);
           }
           console.log("Local storage selected or Firebase config missing. Firebase Firestore for saves is not active.");
        }
      } catch (initError) {
        console.error("Critical: Failed to initialize services.", initError);
        const errorMsg = `Lỗi khởi tạo dịch vụ: ${initError instanceof Error ? initError.message : String(initError)}. Vui lòng kiểm tra cài đặt.`;
        setStorageInitError(errorMsg);
        showNotification(errorMsg, 'error');
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadAndInitialize();
  }, []); 
  
  const showNotification = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'error' || type === 'warning' ? 7000 : 4000); 
  }, []);

  const addRawMessage = useCallback((type: GameMessage['type'], content: string, turn: number, choices?: AiChoice[], isPlayerInput?: boolean) => {
    setGameMessages(prev => [...prev, { 
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9), 
      type, 
      content, 
      timestamp: Date.now(), 
      choices, 
      isPlayerInput,
      turnNumber: turn
    }]);
  }, []);

  const parseTagValue = useCallback((tagValue: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const paramRegex = /(\w+(?:\.\w+)*)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\{.*?\}|\[.*?\]|[^,]*?)(?=\s*,\s*\w+\s*=|$)))/g;
    let match;
    while ((match = paramRegex.exec(tagValue)) !== null) {
      const key = match[1].trim(); 
      let value = match[2] !== undefined ? match[2] : 
                  match[3] !== undefined ? match[3] : 
                  match[4] !== undefined ? match[4].trim() : ''; 
      if (!(value.startsWith('{') && value.endsWith('}')) && !(value.startsWith('[') && value.endsWith(']'))) {
        value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.substring(1, value.length - 1);
        }
      }
      result[key] = value;
    }
    return result;
  }, []);

  const getMessagesForPage = useCallback((pageNumber: number, kb: KnowledgeBase, allMessages: GameMessage[]): GameMessage[] => {
    if (!kb.currentPageHistory || pageNumber < 1 || pageNumber > kb.currentPageHistory.length) return [];

    const startTurnOfPage = kb.currentPageHistory[pageNumber - 1];
    
    const endTurnOfPage = (pageNumber === kb.currentPageHistory.length) 
                          ? kb.playerStats.turn // For the current active page, show all turns up to player's current turn
                          : kb.currentPageHistory[pageNumber] - 1; // For past pages, show turns up to before next page started
    
    return allMessages.filter(msg => msg.turnNumber >= startTurnOfPage && msg.turnNumber <= endTurnOfPage);
  }, []);

  const performTagProcessing = useCallback((currentKb: KnowledgeBase, tagBatch: string[]): {
    newKb: KnowledgeBase;
    turnIncrementedThisBatch: boolean;
  } => {
    const newKb: KnowledgeBase = JSON.parse(JSON.stringify(currentKb)); 
    if (!newKb.discoveredFactions) newKb.discoveredFactions = [];

    let turnIncrementedThisBatch = false;

    tagBatch.forEach(tag => {
        const match = tag.match(/\[(.*?):\s*(.*)\]$/s);
        if (!match || !match[1] || match[2] === undefined) { console.warn("Could not parse tag:", tag); return; }
        const tagName = match[1].trim().toUpperCase();
        const tagFullValue = match[2].trim();
        
        const tagParams = parseTagValue(tagFullValue);
        
        try {
            switch (tagName) {
            case 'PLAYER_STATS_INIT':
            case 'STATS_UPDATE':
                const statsUpdates: Partial<PlayerStats> = {};
                const oldTurnForThisTagProcessing = newKb.playerStats.turn; 

                Object.keys(tagParams).forEach(rawKey => {
                    const key = rawKey.trim().toLowerCase() as keyof PlayerStats;
                    const valueStr = tagParams[rawKey].trim();
                    const existingStatValue = newKb.playerStats[key];

                    if (key === 'isInCombat') {
                       (statsUpdates as any)[key] = valueStr.toLowerCase() === 'true';
                    } else if (typeof existingStatValue === 'number' || 
                               (key in DEFAULT_PLAYER_STATS && typeof DEFAULT_PLAYER_STATS[key] === 'number' && !isNaN(parseInt(valueStr,10))) ) {
                        const baseValue = (typeof existingStatValue === 'number') ? existingStatValue : (newKb.playerStats as any)[key] || 0; 
                        if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                            (statsUpdates as any)[key] = baseValue + parseInt(valueStr, 10);
                        } else {
                            (statsUpdates as any)[key] = parseInt(valueStr, 10);
                        }
                    } else if (typeof existingStatValue === 'string' || (key in DEFAULT_PLAYER_STATS && typeof DEFAULT_PLAYER_STATS[key] === 'string') ) {
                        (statsUpdates as any)[key] = valueStr; 
                    } else { 
                       if (!isNaN(parseInt(valueStr, 10)) && (valueStr.match(/^-?\d+$/) || valueStr.match(/^[+-]\d+$/)) ) { 
                            const baseValue = (typeof (newKb.playerStats as any)[key] === 'number') ? (newKb.playerStats as any)[key] : 0;
                            if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                               (statsUpdates as any)[key] = baseValue + parseInt(valueStr, 10);
                            } else {
                               (statsUpdates as any)[key] = parseInt(valueStr, 10);
                            }
                       } else if (valueStr.toLowerCase() === 'true' || valueStr.toLowerCase() === 'false') { 
                           (statsUpdates as any)[key] = valueStr.toLowerCase() === 'true';
                       } else { 
                           (statsUpdates as any)[key] = valueStr; 
                       }
                    }
                });

                newKb.playerStats = { ...newKb.playerStats, ...statsUpdates };
                
                if (statsUpdates.turn && statsUpdates.turn > oldTurnForThisTagProcessing) {
                    turnIncrementedThisBatch = true;
                }
                if (tagName === 'PLAYER_STATS_INIT' && statsUpdates.turn) {
                   if (newKb.currentPageHistory?.length === 1 && newKb.currentPageHistory[0] > newKb.playerStats.turn) {
                       newKb.currentPageHistory = [newKb.playerStats.turn]; 
                   } else if (!newKb.currentPageHistory || newKb.currentPageHistory.length === 0) {
                       newKb.currentPageHistory = [newKb.playerStats.turn];
                   }
                }
                break;
            case 'ITEM_ACQUIRED':
                if (tagParams.name && tagParams.description) {
                    let quantity = parseInt(tagParams.quantity || "1", 10);
                    if (isNaN(quantity) || quantity < 1) quantity = 1;

                    const existingItemIndex = newKb.inventory.findIndex(i => i.name === tagParams.name);
                    if (existingItemIndex > -1) {
                        newKb.inventory[existingItemIndex].quantity += quantity;
                    } else {
                        const newItemId = Date.now().toString() + tagParams.name.replace(/\s/g, '');
                        const aiType = tagParams.type?.toLowerCase() || "";
                        let itemCategory: GameTemplates.ItemCategoryValues = GameTemplates.ItemCategory.MISCELLANEOUS;
                        let equipmentType: GameTemplates.EquipmentTypeValues | undefined;
                        let potionType: GameTemplates.PotionTypeValues | undefined;
                        let materialType: GameTemplates.MaterialTypeValues | undefined;
                        let slot: string | undefined;

                        if (aiType.includes("vũ khí") || aiType.includes("kiếm") || aiType.includes("trượng") || aiType.includes("cung") || aiType.includes("đao") || aiType.includes("thương")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.VU_KHI; slot = "Vũ Khí Chính";
                        } else if (aiType.includes("giáp đầu") || aiType.includes("nón")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_DAU; slot = "Đầu";
                        } else if (aiType.includes("giáp thân") || aiType.includes("áo") || aiType.includes("y phục")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_THAN; slot = "Thân";
                        } else if (aiType.includes("giáp tay") || aiType.includes("găng")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_TAY; slot = "Tay";
                        } else if (aiType.includes("giáp chân") || aiType.includes("giày") || aiType.includes("ủng")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_CHAN; slot = "Chân";
                        } else if (aiType.includes("trang sức") || aiType.includes("nhẫn") || aiType.includes("dây chuyền") || aiType.includes("ngọc bội")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.TRANG_SUC; slot = "Trang Sức";
                        } else if (aiType.includes("pháp bảo")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.PHAP_BAO; slot = "Pháp Bảo";
                        } else if (aiType.includes("đan") || aiType.includes("thuốc") || aiType.includes("linh dược")) {
                            itemCategory = GameTemplates.ItemCategory.POTION;
                            if (aiType.includes("hồi phục") || aiType.includes("trị thương")) potionType = GameTemplates.PotionType.HOI_PHUC;
                            else if (aiType.includes("tăng cường") || aiType.includes("buff")) potionType = GameTemplates.PotionType.TANG_CUONG;
                            else if (aiType.includes("giải độc")) potionType = GameTemplates.PotionType.GIAI_DOC;
                            else potionType = GameTemplates.PotionType.DAC_BIET;
                        } else if (aiType.includes("linh thảo")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.LINH_THAO;
                        } else if (aiType.includes("khoáng thạch")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.KHOANG_THACH;
                        } else if (aiType.includes("yêu đan")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.YEU_DAN;
                        } else if (aiType.includes("da") || aiType.includes("xương")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.DA_XUONG_YEU_THU;
                        } else if (aiType.includes("linh hồn")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.LINH_HON;
                        } else if (aiType.includes("nguyên liệu")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.VAT_LIEU_CHE_TAO_CHUNG;
                        } else if (aiType.includes("nhiệm vụ")) {
                            itemCategory = GameTemplates.ItemCategory.QUEST_ITEM;
                        }
                        
                        const rarity = (tagParams.rarity as GameTemplates.EquipmentRarity) || "Phổ Thông";
                        const value = parseInt(tagParams.value || "0", 10);

                        let newItem: GameTemplates.InventoryItem;
                        const baseItemData = { id: newItemId, name: tagParams.name, description: tagParams.description, rarity, value, quantity, stackable: true };

                        if (itemCategory === GameTemplates.ItemCategory.EQUIPMENT && equipmentType) {
                            let parsedStatBonuses: Partial<PlayerStats> = {};
                            if (tagParams.statBonuses) {
                                try {
                                    parsedStatBonuses = JSON.parse(tagParams.statBonuses);
                                } catch (e) {
                                    console.warn("Could not parse statBonuses JSON from tag:", tagParams.statBonuses, e);
                                }
                            }
                            
                            const equipData: Omit<GameTemplates.EquipmentTemplate, 'id' | 'name' | 'description' | 'rarity' | 'value' | 'quantity' | 'stackable' | 'category'> = {
                                equipmentType,
                                slot: slot, 
                                statBonuses: parsedStatBonuses, 
                                uniqueEffects: [], 
                                usable: tagParams.usable?.toLowerCase() === 'true',
                                consumable: tagParams.consumable?.toLowerCase() === 'true',
                            };
                            newItem = {
                                ...baseItemData,
                                category: GameTemplates.ItemCategory.EQUIPMENT,
                                ...equipData
                            };
                            if (Object.keys((newItem as GameTemplates.EquipmentTemplate).statBonuses).length === 0) {
                                const statsMatch = tagParams.description.match(/tăng ([\w\s]+?) ([+-]?\d+)/gi);
                                if (statsMatch) {
                                    statsMatch.forEach(m => {
                                        const parts = m.match(/tăng ([\w\s]+?) ([+-]?\d+)/i);
                                        if (parts && parts[1] && parts[2]) {
                                            const statName = parts[1].trim().toLowerCase();
                                            const statValue = parseInt(parts[2], 10);
                                            if (statName === "công" || statName === "tấn công") (newItem as GameTemplates.EquipmentTemplate).statBonuses.atk = ((newItem as GameTemplates.EquipmentTemplate).statBonuses.atk || 0) + statValue;
                                            else if (statName === "hp" || statName === "sinh lực") (newItem as GameTemplates.EquipmentTemplate).statBonuses.hp = ((newItem as GameTemplates.EquipmentTemplate).statBonuses.hp || 0) + statValue;
                                            else if (statName === "mana" || statName === "linh lực") (newItem as GameTemplates.EquipmentTemplate).statBonuses.mana = ((newItem as GameTemplates.EquipmentTemplate).statBonuses.mana || 0) + statValue;
                                        }
                                    });
                                }
                            }
                        } else if (itemCategory === GameTemplates.ItemCategory.POTION && potionType) {
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.POTION, potionType, effects: [tagParams.description], isConsumedOnUse: true, usable: true, consumable: true };
                        } else if (itemCategory === GameTemplates.ItemCategory.MATERIAL && materialType) {
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.MATERIAL, materialType, usable: false, consumable: false };
                        } else if (itemCategory === GameTemplates.ItemCategory.QUEST_ITEM) {
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.QUEST_ITEM, questIdAssociated: "unknown", usable: false, consumable: false };
                        } else { 
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.MISCELLANEOUS, usable: tagParams.usable?.toLowerCase() === 'true', consumable: tagParams.consumable?.toLowerCase() === 'true' };
                        }
                        newKb.inventory.push(newItem);
                    }
                } else { console.warn("ITEM_ACQUIRED tag missing params", tagParams); }
                break;
            case 'ITEM_CONSUMED':
                if (tagParams.name) {
                    const itemIndex = newKb.inventory.findIndex(i => i.name === tagParams.name);
                    if (itemIndex > -1) {
                        const quantityToConsume = parseInt(tagParams.quantity || "1", 10);
                         if (isNaN(quantityToConsume) || quantityToConsume < 1) break;
                        newKb.inventory[itemIndex].quantity -= quantityToConsume;
                        if (newKb.inventory[itemIndex].quantity <= 0) newKb.inventory.splice(itemIndex, 1); 
                    }
                }
                break;
            case 'SKILL_LEARNED':
                if (tagParams.name && tagParams.description && tagParams.effect) {
                    if (!newKb.playerSkills.find(s => s.name === tagParams.name)) {
                        const skillTypeStr = tagParams.type?.trim() || "";
                        let skillType: GameTemplates.SkillTypeValues = GameTemplates.SkillType.KHAC;
                        
                        if (skillTypeStr.includes("Tấn Công")) skillType = GameTemplates.SkillType.CHUDONG_TANCONG;
                        else if (skillTypeStr.includes("Phòng Ngự")) skillType = GameTemplates.SkillType.CHUDONG_PHONGNGU;
                        else if (skillTypeStr.includes("Hỗ Trợ")) skillType = GameTemplates.SkillType.CHUDONG_HOTRO;
                        else if (skillTypeStr.includes("Bị Động")) skillType = GameTemplates.SkillType.BIDONG;
                        else if (skillTypeStr.includes("Công Pháp")) skillType = GameTemplates.SkillType.TULUYEN_CONGPHAP;
                        else if (skillTypeStr.includes("Thân Pháp")) skillType = GameTemplates.SkillType.THANPHAP;
                        
                        const newSkill: Skill = {
                            id: Date.now().toString() + tagParams.name.replace(/\s/g, ''),
                            name: tagParams.name,
                            description: tagParams.description,
                            skillType: skillType,
                            detailedEffect: tagParams.effect,
                            manaCost: parseInt(tagParams.manaCost || "0", 10),
                            baseDamage: parseInt(tagParams.baseDamage || "0", 10),
                            healingAmount: parseInt(tagParams.healingAmount || "0", 10),
                            cooldown: parseInt(tagParams.cooldown || "0", 10),
                            currentCooldown: 0,
                            damageMultiplier: 0, 
                        };
                        newKb.playerSkills.push(newSkill);
                    }
                } else { console.warn("SKILL_LEARNED missing params", tagParams); }
                break;
            case 'REALM_LIST':
                newKb.realmProgressionList = tagFullValue.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                break;
            case 'MESSAGE':
                 addRawMessage('system', tagParams.message || tagFullValue.replace(/^"|"$/g, ''), newKb.playerStats.turn); 
                 break;
            case 'LORE_NPC':
                if (tagParams.name) {
                    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === tagParams.name);
                    const npcDesc = tagParams.description; 
                    const personalityTraits = tagParams.personality ? tagParams.personality.split(',').map(p => p.trim()) : undefined;
                    const affinity = parseInt(tagParams.affinity || "0", 10); 
                    const factionId = tagParams.factionId;
                    const hp = tagParams.hp ? parseInt(tagParams.hp, 10) : undefined;
                    const atk = tagParams.atk ? parseInt(tagParams.atk, 10) : undefined;
                    const title = tagParams.title;
                    
                    if (existingNpcIndex > -1) { 
                        const npc = newKb.discoveredNPCs[existingNpcIndex];
                        if (npcDesc !== undefined) npc.description = npcDesc;
                        if (personalityTraits !== undefined) npc.personalityTraits = personalityTraits;
                        if (!isNaN(affinity)) npc.affinity = affinity;
                        if (factionId !== undefined) npc.factionId = factionId;
                        if (hp !== undefined && !isNaN(hp)) npc.hp = hp;
                        if (atk !== undefined && !isNaN(atk)) npc.atk = atk;
                        if (title !== undefined) npc.title = title;
                    } else { 
                        const newNpc: NPC = {
                            id: Date.now().toString() + tagParams.name.replace(/\s/g, ''),
                            name: tagParams.name,
                            description: npcDesc || "", 
                            personalityTraits: personalityTraits || [],
                            affinity: !isNaN(affinity) ? affinity : 0,
                            factionId,
                            hp: (hp !== undefined && !isNaN(hp) && hp > 0) ? hp : undefined,
                            atk: (atk !== undefined && !isNaN(atk) && atk > 0) ? atk : undefined,
                            title,
                        };
                        newKb.discoveredNPCs.push(newNpc);
                    }
                }
                break;
            case 'LORE_LOCATION':
                 if (tagParams.name) {
                    const existingLocIndex = newKb.discoveredLocations.findIndex(l => l.name === tagParams.name);
                    const locDesc = tagParams.description; 
                    const isSafeZone = tagParams.isSafeZone ? tagParams.isSafeZone.toLowerCase() === 'true' : undefined;
                    const regionId = tagParams.regionId;

                     if (existingLocIndex > -1) { 
                        const loc = newKb.discoveredLocations[existingLocIndex];
                        if (locDesc !== undefined) loc.description = locDesc;
                        if (isSafeZone !== undefined) loc.isSafeZone = isSafeZone;
                        if (regionId !== undefined) loc.regionId = regionId;
                     } else { 
                        newKb.discoveredLocations.push({
                            id: Date.now().toString() + tagParams.name.replace(/\s/g, ''),
                            name: tagParams.name,
                            description: locDesc || "", 
                            isSafeZone: isSafeZone || false,
                            regionId,
                        });
                    }
                }
                break;
            case 'FACTION_DISCOVERED':
                if (tagParams.name && tagParams.description && tagParams.alignment) {
                    if (!newKb.discoveredFactions.find(f => f.name === tagParams.name)) {
                        const newFaction: Faction = {
                            id: Date.now().toString() + tagParams.name.replace(/\s/g, ''),
                            name: tagParams.name,
                            description: tagParams.description,
                            alignment: tagParams.alignment as GameTemplates.FactionAlignmentValues,
                            playerReputation: parseInt(tagParams.playerReputation || "0", 10),
                            leaderNPCId: tagParams.leaderNPCId,
                            baseLocationId: tagParams.baseLocationId,
                        };
                        newKb.discoveredFactions.push(newFaction);
                        addRawMessage('system', `Khám phá phe phái mới: ${newFaction.name}.`, newKb.playerStats.turn);
                    }
                }
                break;
            case 'NPC_UPDATE':
                if (tagParams.name) {
                    const npcIndex = newKb.discoveredNPCs.findIndex(n => n.name === tagParams.name);
                    if (npcIndex > -1) {
                        const npcToUpdate = newKb.discoveredNPCs[npcIndex];
                        if (tagParams.affinity) npcToUpdate.affinity = npcToUpdate.affinity + parseInt(tagParams.affinity, 10);
                        if (tagParams.description) npcToUpdate.description = tagParams.description;
                        if (tagParams.factionId) npcToUpdate.factionId = tagParams.factionId;
                        if (tagParams.title) npcToUpdate.title = tagParams.title;
                        if (tagParams.hp) npcToUpdate.hp = (npcToUpdate.hp || 0) + parseInt(tagParams.hp, 10);
                        if (tagParams.atk) npcToUpdate.atk = (npcToUpdate.atk || 0) + parseInt(tagParams.atk, 10);
                        if (tagParams.personality) npcToUpdate.personalityTraits = tagParams.personality.split(',').map(p => p.trim());
                        addRawMessage('system', `Thông tin NPC ${tagParams.name} đã được cập nhật.`, newKb.playerStats.turn);
                    } else { console.warn(`NPC_UPDATE: NPC not found - ${tagParams.name}`); }
                }
                break;
            case 'ITEM_UPDATE':
                if (tagParams.name && tagParams.field) {
                    const itemIndex = newKb.inventory.findIndex(i => i.name === tagParams.name);
                    if (itemIndex > -1) {
                        const itemToUpdate = newKb.inventory[itemIndex] as any; 
                        const fieldParts = tagParams.field.split('.');
                        let targetObject = itemToUpdate;
                        for (let i = 0; i < fieldParts.length - 1; i++) {
                            if (!targetObject[fieldParts[i]]) targetObject[fieldParts[i]] = {}; 
                            targetObject = targetObject[fieldParts[i]];
                        }
                        const finalField = fieldParts[fieldParts.length - 1];
                        if (tagParams.newValue !== undefined) {
                            if (typeof targetObject[finalField] === 'number' || !isNaN(Number(tagParams.newValue))) {
                                targetObject[finalField] = Number(tagParams.newValue);
                            } else if (typeof targetObject[finalField] === 'boolean' || tagParams.newValue.toLowerCase() === 'true' || tagParams.newValue.toLowerCase() === 'false') {
                                targetObject[finalField] = tagParams.newValue.toLowerCase() === 'true';
                            } else {
                                targetObject[finalField] = tagParams.newValue;
                            }
                        } else if (tagParams.change && typeof targetObject[finalField] === 'number') {
                            targetObject[finalField] += Number(tagParams.change);
                        }
                        if (itemToUpdate.category === GameTemplates.ItemCategory.EQUIPMENT && finalField === "durability" && itemToUpdate.durability < 0) {
                            itemToUpdate.durability = 0;
                        }
                        addRawMessage('system', `Vật phẩm ${tagParams.name} đã được cập nhật (${tagParams.field}).`, newKb.playerStats.turn);
                    } else { console.warn(`ITEM_UPDATE: Item not found - ${tagParams.name}`); }
                }
                break;
            case 'SKILL_UPDATE':
                 if (tagParams.name && tagParams.field) {
                    const skillIndex = newKb.playerSkills.findIndex(s => s.name === tagParams.name);
                    if (skillIndex > -1) {
                        const skillToUpdate = newKb.playerSkills[skillIndex] as any;
                        const fieldToChange = tagParams.field as keyof Skill;
                        if (tagParams.newValue !== undefined) {
                            if (typeof skillToUpdate[fieldToChange] === 'number' || !isNaN(Number(tagParams.newValue))) {
                                skillToUpdate[fieldToChange] = Number(tagParams.newValue);
                            } else {
                                skillToUpdate[fieldToChange] = tagParams.newValue;
                            }
                        } else if (tagParams.change && typeof skillToUpdate[fieldToChange] === 'number') {
                            (skillToUpdate[fieldToChange] as number) += Number(tagParams.change);
                        }
                         addRawMessage('system', `Kỹ năng ${tagParams.name} đã được cập nhật (${tagParams.field}).`, newKb.playerStats.turn);
                    } else { console.warn(`SKILL_UPDATE: Skill not found - ${tagParams.name}`);}
                }
                break;
            case 'LOCATION_UPDATE':
                if (tagParams.name) {
                    const locIndex = newKb.discoveredLocations.findIndex(l => l.name === tagParams.name);
                    if (locIndex > -1) {
                        const locToUpdate = newKb.discoveredLocations[locIndex];
                        if (tagParams.description) locToUpdate.description = tagParams.description;
                        if (tagParams.environmentalEffects) (locToUpdate as any).environmentalEffects = tagParams.environmentalEffects.split(','); 
                        if (tagParams.isSafeZone !== undefined) locToUpdate.isSafeZone = tagParams.isSafeZone.toLowerCase() === 'true';
                        addRawMessage('system', `Địa điểm ${tagParams.name} đã được cập nhật.`, newKb.playerStats.turn);
                    } else { console.warn(`LOCATION_UPDATE: Location not found - ${tagParams.name}`); }
                }
                break;
            case 'FACTION_UPDATE':
                if (tagParams.name) {
                    const factionIndex = newKb.discoveredFactions.findIndex(f => f.name === tagParams.name);
                    if (factionIndex > -1) {
                        const factionToUpdate = newKb.discoveredFactions[factionIndex];
                        if (tagParams.playerReputation) factionToUpdate.playerReputation += parseInt(tagParams.playerReputation, 10);
                        if (tagParams.description) factionToUpdate.description = tagParams.description;
                        if (tagParams.alignment) factionToUpdate.alignment = tagParams.alignment as GameTemplates.FactionAlignmentValues;
                        addRawMessage('system', `Phe phái ${tagParams.name} đã được cập nhật.`, newKb.playerStats.turn);
                    } else { console.warn(`FACTION_UPDATE: Faction not found - ${tagParams.name}`); }
                }
                break;
            case 'QUEST_ASSIGNED':
                if (tagParams.title && tagParams.description && tagParams.objectives) {
                    const objectivesTexts = tagParams.objectives.split('|').map((objText: string) => objText.trim());
                    const newObjectives: QuestObjective[] = objectivesTexts.map((text, index) => ({ id: `${Date.now()}-obj-${index}`, text, completed: false }));
                    if (!newKb.allQuests.find(q => q.title === tagParams.title)) {
                        newKb.allQuests.push({ id: Date.now().toString() + tagParams.title, title: tagParams.title, description: tagParams.description, status: 'active', objectives: newObjectives });
                        addRawMessage('system', `Nhiệm vụ mới: ${tagParams.title}`, newKb.playerStats.turn);
                    }
                }
                break;
            case 'QUEST_UPDATED':
                if (tagParams.title && tagParams.objectivetext) {
                    const qIdx = newKb.allQuests.findIndex(q => q.title === tagParams.title && q.status === 'active');
                    if (qIdx > -1) {
                        const oIdx = newKb.allQuests[qIdx].objectives.findIndex(obj => obj.text === tagParams.objectivetext);
                        if (oIdx > -1) {
                            newKb.allQuests[qIdx].objectives[oIdx].completed = (tagParams.completed === 'true');
                            addRawMessage('system', `Cập nhật "${tagParams.title}": mục tiêu "${tagParams.objectivetext}" ${tagParams.completed === 'true' ? 'hoàn thành' : 'chưa xong'}.`, newKb.playerStats.turn);
                            if (newKb.allQuests[qIdx].objectives.every(obj => obj.completed)) {
                                newKb.allQuests[qIdx].status = 'completed';
                                addRawMessage('system', `Hoàn thành nhiệm vụ: ${newKb.allQuests[qIdx].title}!`, newKb.playerStats.turn);
                            }
                        }
                    }
                }
                break;
            case 'QUEST_COMPLETED':
            case 'QUEST_FAILED':
                if (tagParams.title) {
                    const qIdx = newKb.allQuests.findIndex(q => q.title === tagParams.title);
                    if (qIdx > -1) {
                        newKb.allQuests[qIdx].status = tagName === 'QUEST_COMPLETED' ? 'completed' : 'failed';
                        if(tagName === 'QUEST_COMPLETED') newKb.allQuests[qIdx].objectives.forEach(obj => obj.completed = true);
                        addRawMessage('system', `Nhiệm vụ ${newKb.allQuests[qIdx].title} ${tagName === 'QUEST_COMPLETED' ? 'hoàn thành' : 'thất bại'}!`, newKb.playerStats.turn);
                    }
                }
                break;
            case 'SET_COMBAT_STATUS':
                newKb.playerStats.isInCombat = tagParams.status?.toLowerCase() === 'true' || tagFullValue.toLowerCase() === 'true';
                addRawMessage('system', `Trạng thái chiến đấu: ${newKb.playerStats.isInCombat ? 'Bắt đầu' : 'Kết thúc'}.`, newKb.playerStats.turn);
                break;
            case 'COMPANION_JOIN':
                if (tagParams.name && tagParams.description && tagParams.hp && tagParams.maxhp && tagParams.mana && tagParams.maxmana && tagParams.atk) {
                    const stats = (({hp,maxHp,mana,maxMana,atk}) => ({hp:parseInt(hp!),maxHp:parseInt(maxHp!),mana:parseInt(mana!),maxMana:parseInt(maxMana!),atk:parseInt(atk!)}))(tagParams);
                    if (Object.values(stats).some(isNaN)) break;
                    if (!newKb.companions.find(c => c.name === tagParams.name)) {
                        newKb.companions.push({ id: Date.now().toString()+tagParams.name, name: tagParams.name, description: tagParams.description, ...stats });
                        addRawMessage('system', `${tagParams.name} đã gia nhập!`, newKb.playerStats.turn);
                    }
                }
                break;
            case 'COMPANION_LEAVE':
                if (tagParams.name) {
                    const compIdx = newKb.companions.findIndex(c => c.name === tagParams.name);
                    if (compIdx > -1) {
                        addRawMessage('system', `${newKb.companions[compIdx].name} đã rời đi.`, newKb.playerStats.turn);
                        newKb.companions.splice(compIdx, 1);
                    }
                }
                break;
            case 'COMPANION_STATS_UPDATE':
                if (tagParams.name) {
                    const cIdx = newKb.companions.findIndex(c => c.name === tagParams.name);
                    if (cIdx > -1) {
                        const comp = newKb.companions[cIdx];
                        let changed = false;
                        (['hp','mana','atk','maxhp','maxmana'] as const).forEach(k => {
                            if(tagParams[k]){
                                const val = parseInt(tagParams[k]!);
                                if(!isNaN(val)){
                                    if(tagParams[k]!.startsWith('+') || tagParams[k]!.startsWith('-')) (comp as any)[k] = ((comp as any)[k] || 0) + val;
                                    else (comp as any)[k] = val;
                                    changed = true;
                                }
                            }
                        });
                        if(changed){
                            comp.hp = Math.max(0, Math.min(comp.hp, comp.maxHp));
                            comp.mana = Math.max(0, Math.min(comp.mana, comp.maxMana));
                            addRawMessage('system', `Chỉ số của ${comp.name} cập nhật.`, newKb.playerStats.turn);
                        }
                    }
                }
                break;
            case 'WORLD_LORE_ADD':
                if (tagParams.title && tagParams.content) {
                    if (!newKb.worldLore.find(l => l.title === tagParams.title)) {
                        newKb.worldLore.push({ id: Date.now().toString()+tagParams.title, title: tagParams.title, content: tagParams.content });
                        addRawMessage('system', `Khám phá tri thức mới: "${tagParams.title}".`, newKb.playerStats.turn);
                    }
                }
                break;
            default:
                break;
            }
        } catch (e) {
            console.error(`Error processing tag: ${tag}`, e);
            addRawMessage('error', `Lỗi xử lý tag AI: ${tag}. Chi tiết: ${e instanceof Error ? e.message : String(e)}`, newKb.playerStats.turn);
        }
    });
    
    while (newKb.playerStats.exp >= newKb.playerStats.maxExp && newKb.playerStats.maxExp > 0) {
        const oldMaxExp = newKb.playerStats.maxExp;
        newKb.playerStats.level += 1;
        newKb.playerStats.exp -= oldMaxExp; 
        newKb.playerStats.maxExp = Math.floor(oldMaxExp * 1.5) + 50 * newKb.playerStats.level;
        newKb.playerStats.maxHp += (15 + Math.floor(newKb.playerStats.level * 2.5));
        newKb.playerStats.maxMana += (8 + Math.floor(newKb.playerStats.level * 1.5));
        newKb.playerStats.atk += (1 + Math.floor(newKb.playerStats.level * 0.3));
        newKb.playerStats.hp = newKb.playerStats.maxHp;
        newKb.playerStats.mana = newKb.playerStats.maxMana;
        const cRealmIdx = newKb.realmProgressionList.indexOf(newKb.playerStats.realm);
        if (newKb.playerStats.level > 0 && newKb.playerStats.level % 5 === 0 && cRealmIdx < newKb.realmProgressionList.length - 1) {
            newKb.playerStats.realm = newKb.realmProgressionList[cRealmIdx + 1];
            addRawMessage('system', `Chúc mừng! Đột phá cảnh giới ${newKb.playerStats.realm}!`, newKb.playerStats.turn);
        } else { addRawMessage('system', `Chúc mừng! Đạt cấp ${newKb.playerStats.level}!`, newKb.playerStats.turn); }
    }
    newKb.playerStats.hp = Math.max(0, Math.min(newKb.playerStats.hp, newKb.playerStats.maxHp));
    newKb.playerStats.mana = Math.max(0, Math.min(newKb.playerStats.mana, newKb.playerStats.maxMana));
    
    return { newKb, turnIncrementedThisBatch };
  }, [addRawMessage, parseTagValue]);

const handlePageEndSummary = useCallback(async (currentKbForSummary: KnowledgeBase): Promise<KnowledgeBase> => {
    const currentTurn = currentKbForSummary.playerStats.turn;
    let kbAfterSummary = JSON.parse(JSON.stringify(currentKbForSummary));
    kbAfterSummary.currentPageHistory = kbAfterSummary.currentPageHistory || [1];


    if (currentTurn > 0 && currentTurn % TURNS_PER_PAGE === 0) {
        const pageNumberToSummarize = Math.floor(currentTurn / TURNS_PER_PAGE);
        const nextPageStartTurn = currentTurn + 1;

        if (kbAfterSummary.worldConfig && 
            (!kbAfterSummary.pageSummaries?.[pageNumberToSummarize] || (kbAfterSummary.lastSummarizedTurn || 0) < currentTurn)) {
            
            addRawMessage('system', VIETNAMESE.summarizingAndPreparingNextPage, currentTurn);
            setIsSummarizingNextPageTransition(true);

            const startTurnOfPageToSummarize = kbAfterSummary.currentPageHistory[pageNumberToSummarize -1] || ((pageNumberToSummarize - 1) * TURNS_PER_PAGE + 1);
            const endTurnOfPageToSummarize = currentTurn;

            const messagesToSummarize = gameMessages.filter(
                msg => msg.turnNumber >= startTurnOfPageToSummarize && msg.turnNumber <= endTurnOfPageToSummarize
            );

            try {
                const summaryText = await summarizeTurnHistory(
                    messagesToSummarize,
                    kbAfterSummary.worldConfig.theme,
                    kbAfterSummary.worldConfig.playerName,
                    logSentPrompt
                );

                kbAfterSummary.pageSummaries = {
                    ...(kbAfterSummary.pageSummaries || {}),
                    [pageNumberToSummarize]: summaryText
                };
                kbAfterSummary.lastSummarizedTurn = Math.max(kbAfterSummary.lastSummarizedTurn || 0, endTurnOfPageToSummarize);
                
                addRawMessage('page_summary', `${VIETNAMESE.pageSummaryTitle(pageNumberToSummarize)}:\n${summaryText}`, endTurnOfPageToSummarize);

            } catch (summaryError) {
                console.error("Error summarizing page at page end:", summaryError);
                addRawMessage('error', `Lỗi tóm tắt trang ${pageNumberToSummarize}: ${summaryError instanceof Error ? summaryError.message : "Không rõ"}`, endTurnOfPageToSummarize);
            } finally {
                setIsSummarizingNextPageTransition(false);
            }
        }
        // Always ensure the next page start turn is in history after a page boundary is reached and processed.
        if (!kbAfterSummary.currentPageHistory.includes(nextPageStartTurn)) {
            kbAfterSummary.currentPageHistory = [...new Set([...kbAfterSummary.currentPageHistory, nextPageStartTurn])].sort((a,b) => a-b);
        }
    }
    return kbAfterSummary;
  }, [gameMessages, addRawMessage, logSentPrompt]);


  const handleAiResponse = useCallback(async (response: ParsedAiResponse, rawResponseText: string, kbBeforeAiProcessing: KnowledgeBase) => {
    setRawAiResponsesLog(prev => [rawResponseText, ...prev].slice(0, 50));

    const narrationTurn = kbBeforeAiProcessing.playerStats.turn + 1; // Assuming turn increments after AI response tags

    if (response.narration) {
        addRawMessage('narration', response.narration, narrationTurn, response.choices);
    }
    if (response.systemMessage && !response.tags.some(t => t.toUpperCase().includes("[MESSAGE:"))) {
        addRawMessage('system', response.systemMessage!, narrationTurn);
    }

    const { newKb: kbAfterTags, turnIncrementedThisBatch } = performTagProcessing(kbBeforeAiProcessing, response.tags);
    let kbToProcessForSummary = kbAfterTags;

    if (turnIncrementedThisBatch && 
        kbToProcessForSummary.playerStats.turn > 0 && 
        kbToProcessForSummary.playerStats.turn % TURNS_PER_PAGE === 0) {
        
        kbToProcessForSummary = await handlePageEndSummary(kbToProcessForSummary);
    }
    
    setKnowledgeBase(kbToProcessForSummary);
        
    const lastTurnInGame = kbToProcessForSummary.playerStats.turn;
    const pageHistory = kbToProcessForSummary.currentPageHistory || [1];
    let displayPage = 1;

    if (lastTurnInGame > 0 && lastTurnInGame % TURNS_PER_PAGE === 0 && turnIncrementedThisBatch) {
       // If a summary was just processed and a new page started, move to that new page.
       displayPage = Math.floor(lastTurnInGame / TURNS_PER_PAGE) +1;
    } else {
        // Otherwise, find current page based on turn and history
        for (let i = 0; i < pageHistory.length; i++) {
            if (lastTurnInGame >= pageHistory[i]) {
                displayPage = i + 1;
            } else {
                break;
            }
        }
    }
    setCurrentPageDisplay(Math.max(1, Math.min(displayPage, calculateTotalPages(kbToProcessForSummary))));

    // Auto-save logic after AI response processing
    if (isAutoPlaying && kbToProcessForSummary.playerStats.turn > 0 && kbToProcessForSummary.playerStats.turn % 5 === 0) {
        if (!isSavingGame) {
            handleSaveGame().then(() => {
                showNotification(VIETNAMESE.autoSavingNotification, 'info');
            }).catch(e => console.error("Auto-save failed:", e));
        }
    }

  }, [addRawMessage, performTagProcessing, handlePageEndSummary, calculateTotalPages, isAutoPlaying, isSavingGame, showNotification]);


const handleInitialStory = useCallback(async (worldSettings: WorldSettings) => {
    setError(null);
    setIsLoading(true);
    
    const initialKbForHistory: KnowledgeBase = JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE));
    // For initial story, the snapshot for history is the pristine initial state.
    delete initialKbForHistory.turnHistory; 
    const initialMessagesForHistory: GameMessage[] = [];

    const newKnowledgeBase: KnowledgeBase = {
        ...JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)),
        worldConfig: worldSettings,
        appVersion: APP_VERSION,
        turnHistory: [{ // The very first history entry
            knowledgeBaseSnapshot: initialKbForHistory,
            gameMessagesSnapshot: initialMessagesForHistory,
        }],
        currentPageHistory: [0], 
    };
    setKnowledgeBase(newKnowledgeBase);
    setGameMessages([]);
    setCurrentPageDisplay(1);
    setRawAiResponsesLog([]);
    setSentPromptsLog([]);

    try {
        const { response, rawText } = await generateInitialStory(worldSettings, logSentPrompt);
        // Pass the KB that already has the initial history entry
        await handleAiResponse(response, rawText, newKnowledgeBase);
    } catch (e) {
        console.error("Error generating initial story:", e);
        setError(e instanceof Error ? e.message : String(e));
        showNotification(e instanceof Error ? e.message : String(e), 'error');
        // Rollback to setup if initial story fails by restoring the true initial KB.
        setKnowledgeBase(JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)));
        setGameMessages([]);
        setCurrentScreen(GameScreen.GameSetup); 
    } finally {
        setIsLoading(false);
    }
}, [logSentPrompt, handleAiResponse, showNotification]);

const onPlayerAction = useCallback(async (actionText: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => {
    setError(null);
    
    const knowledgeBaseAtActionStart = knowledgeBase;
    const gameMessagesAtActionStart = gameMessages;

    const currentTurnForPlayerMessage = knowledgeBaseAtActionStart.playerStats.turn;
    const playerActionContent = isChoice ? actionText : `${inputType === 'action' ? '' : '(Nói thầm với GM): '}${actionText}`;
    
    const newPlayerMessage: GameMessage = { 
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9), 
        type: 'player_action' as GameMessage['type'],
        content: playerActionContent, 
        timestamp: Date.now(), 
        isPlayerInput: !isChoice,
        turnNumber: currentTurnForPlayerMessage 
    };
    const gameMessagesAfterPlayerInput = [...gameMessagesAtActionStart, newPlayerMessage];
    setGameMessages(gameMessagesAfterPlayerInput);

    let kbSnapshotForStorage: KnowledgeBase;
    try {
        kbSnapshotForStorage = JSON.parse(JSON.stringify(knowledgeBaseAtActionStart));
        delete kbSnapshotForStorage.turnHistory; // CRITICAL FIX
    } catch (e) {
        console.error("Failed to stringify knowledgeBase for history snapshot:", e);
        setError(e instanceof Error ? e.message : String(e));
        showNotification(VIETNAMESE.errorOccurred + " khi tạo snapshot: " + (e instanceof Error ? e.message : String(e)), 'error');
        setGameMessages(gameMessagesAtActionStart); // Revert player message if snapshot fails
        setIsLoading(false);
        return; 
    }

    const messagesSnapshotForStorage: GameMessage[] = JSON.parse(JSON.stringify(gameMessagesAfterPlayerInput));

    const newTurnHistoryEntry: TurnHistoryEntry = {
        knowledgeBaseSnapshot: kbSnapshotForStorage,
        gameMessagesSnapshot: messagesSnapshotForStorage,
    };

    const knowledgeBaseForAICall: KnowledgeBase = {
        ...knowledgeBaseAtActionStart, 
        turnHistory: [...(knowledgeBaseAtActionStart.turnHistory || []), newTurnHistoryEntry].slice(-MAX_TURN_HISTORY_LENGTH),
    };
    setKnowledgeBase(knowledgeBaseForAICall);
    
    setIsLoading(true);

    try {
        const pageOfCurrentTurn = currentPageDisplay;
        const messagesForCurrentPageContext = getMessagesForPage(pageOfCurrentTurn, knowledgeBaseForAICall, gameMessagesAfterPlayerInput);
        
        let messagesLogForPrompt = messagesForCurrentPageContext
            .filter(msg => msg.type === 'narration' || msg.type === 'player_action')
            .map(msg => `${msg.type === 'player_action' ? `${knowledgeBaseForAICall.worldConfig?.playerName || 'Người chơi'}: ` : 'AI: '}${msg.content}`)
            .join('\n');

        const previousPageSummaries: string[] = [];
        if (knowledgeBaseForAICall.pageSummaries) {
            for (let i = 1; i < pageOfCurrentTurn; i++) {
                if (knowledgeBaseForAICall.pageSummaries[i]) {
                    previousPageSummaries.push(knowledgeBaseForAICall.pageSummaries[i]);
                }
            }
        }
        
        let lastNarrationFromPrevPage: string | undefined = undefined;
        if (pageOfCurrentTurn > 1 && knowledgeBaseForAICall.currentPageHistory && knowledgeBaseForAICall.currentPageHistory.length >= pageOfCurrentTurn) {
            const startTurnOfCurrentPage = knowledgeBaseForAICall.currentPageHistory[pageOfCurrentTurn -1];
            if (knowledgeBaseForAICall.playerStats.turn === startTurnOfCurrentPage) { 
                const endTurnOfPreviousPage = startTurnOfCurrentPage - 1;
                const prevPageMessages = gameMessagesAfterPlayerInput.filter(m => m.turnNumber <= endTurnOfPreviousPage && m.turnNumber >= (knowledgeBaseForAICall.currentPageHistory?.[pageOfCurrentTurn-2] || 0) );
                const lastNarration = [...prevPageMessages].reverse().find(m => m.type === 'narration');
                if (lastNarration) lastNarrationFromPrevPage = lastNarration.content;
            }
        }

        const { response, rawText } = await generateNextTurn(
            knowledgeBaseForAICall, 
            actionText, 
            inputType, 
            responseLength,
            messagesLogForPrompt,
            previousPageSummaries,
            lastNarrationFromPrevPage,
            logSentPrompt
        );
        await handleAiResponse(response, rawText, knowledgeBaseForAICall); 
    } catch (e) {
        console.error("Error during player action (AI call or response handling):", e);
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(errorMessage);
        showNotification(errorMessage, 'error');
        
        setKnowledgeBase(knowledgeBaseAtActionStart);
        setGameMessages(gameMessagesAtActionStart);
    } finally {
        setIsLoading(false);
    }
}, [knowledgeBase, gameMessages, currentPageDisplay, getMessagesForPage, logSentPrompt, handleAiResponse, showNotification]);


const handleRollbackTurn = useCallback(() => {
    setError(null);
    const currentKbTurnHistory = knowledgeBase.turnHistory;

    if (isLoading) { 
        if (currentKbTurnHistory && currentKbTurnHistory.length > 0) {
            // The last entry in turnHistory is the one *leading to* the current state (or the one being processed).
            // We want to restore the state captured in this last entry.
            const stateToRestoreFrom = currentKbTurnHistory[currentKbTurnHistory.length - 1];
            
            setKnowledgeBase({
                // Restore the KB snapshot from this history entry
                ...JSON.parse(JSON.stringify(stateToRestoreFrom.knowledgeBaseSnapshot)),
                // The turnHistory for the restored state should be the history *excluding* this last entry
                turnHistory: currentKbTurnHistory.slice(0, -1) 
            });
            setGameMessages(JSON.parse(JSON.stringify(stateToRestoreFrom.gameMessagesSnapshot)));

            const restoredTurn = stateToRestoreFrom.knowledgeBaseSnapshot.playerStats.turn;
            const restoredPageHistory = stateToRestoreFrom.knowledgeBaseSnapshot.currentPageHistory || [1];
            let newDisplayPage = 1;
            for (let i = 0; i < restoredPageHistory.length; i++) {
                if (restoredTurn >= restoredPageHistory[i]) {
                    newDisplayPage = i + 1;
                } else {
                    break;
                }
            }
            setCurrentPageDisplay(newDisplayPage);
            setIsLoading(false);
            showNotification(VIETNAMESE.actionStoppedAndRolledBack, 'success');
        } else {
            setIsLoading(false);
             if (knowledgeBase.playerStats.turn === 0 && (!currentKbTurnHistory || currentKbTurnHistory.length === 0)) {
                 showNotification(VIETNAMESE.initialStoryStopWarning, 'warning');
            } else {
                showNotification(VIETNAMESE.actionStopErrorNoHistory, 'warning');
            }
        }
        return;
    }

    if (currentKbTurnHistory && currentKbTurnHistory.length > 0) {
        // Prevent rolling back the very first "initial state" history entry if it's the only one.
        // This entry typically represents the state *before* turn 1.
        if (currentKbTurnHistory.length === 1 && currentKbTurnHistory[0].knowledgeBaseSnapshot.playerStats.turn === 0 && knowledgeBase.playerStats.turn <= 1) {
             // If current turn is 0 or 1, and only the initial (turn 0) snapshot exists, cannot rollback.
            showNotification(VIETNAMESE.cannotRollbackFurther, 'info');
            return;
        }


        const stateToRestoreFrom = currentKbTurnHistory[currentKbTurnHistory.length - 1];
        setKnowledgeBase({
            ...JSON.parse(JSON.stringify(stateToRestoreFrom.knowledgeBaseSnapshot)),
            turnHistory: currentKbTurnHistory.slice(0, -1)
        });
        setGameMessages(JSON.parse(JSON.stringify(stateToRestoreFrom.gameMessagesSnapshot)));

        const restoredTurn = stateToRestoreFrom.knowledgeBaseSnapshot.playerStats.turn;
        const restoredPageHistory = stateToRestoreFrom.knowledgeBaseSnapshot.currentPageHistory || [1];
        let newDisplayPage = 1;
        for (let i = 0; i < restoredPageHistory.length; i++) {
            if (restoredTurn >= restoredPageHistory[i]) {
                newDisplayPage = i + 1;
            } else {
                break;
            }
        }
        setCurrentPageDisplay(newDisplayPage);
        showNotification(VIETNAMESE.rollbackSuccess, 'success');
    } else {
        showNotification(VIETNAMESE.cannotRollbackFurther, 'info');
    }
}, [isLoading, knowledgeBase, showNotification, setIsLoading, setKnowledgeBase, setGameMessages, setCurrentPageDisplay, VIETNAMESE]);


  const handleQuitGame = () => {
    setKnowledgeBase(JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)));
    setGameMessages([]);
    setCurrentScreen(GameScreen.Initial);
    setCurrentPageDisplay(1);
    setError(null);
    setRawAiResponsesLog([]);
    setSentPromptsLog([]);
    setIsAutoPlaying(false); // Turn off auto play on quit
  };

  const handleSaveGame = async (): Promise<void> => {
    setIsSavingGame(true);
    setError(null);
    try {
      if (storageSettings.storageType === 'cloud') {
        if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForSave);
        await saveGameToFirestore(firebaseUser.uid, knowledgeBase, gameMessages);
      } else {
        await saveGameToIndexedDB(knowledgeBase, gameMessages);
      }
      // Notification for manual save is handled by calling context or here if preferred
      // For auto-save, specific notification is shown in handleAiResponse
      if (!isAutoPlaying || (knowledgeBase.playerStats.turn % 5 !== 0)) { // Avoid double notification for auto-save
        showNotification(VIETNAMESE.gameSavedSuccess, 'success');
      }
    } catch (e) {
      console.error("Error saving game:", e);
      const errorMsg = VIETNAMESE.errorSavingGame + (e instanceof Error ? `: ${e.message}` : '');
      setError(errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setIsSavingGame(false);
    }
  };
  
const handleLoadGame = async (saveId: string) => {
    setIsLoading(true); // Use main loading indicator
    setError(null);
    setIsAutoPlaying(false); // Turn off auto play when loading a new game
    try {
        let loadedData: SaveGameData | null = null;
        if (storageSettings.storageType === 'cloud') {
            if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
            loadedData = await loadSpecificGameFromFirestore(firebaseUser.uid, saveId);
        } else {
            loadedData = await loadSpecificGameFromIndexedDB(saveId);
        }

        if (loadedData) {
            let kbToLoad = loadedData.knowledgeBase;
             // Ensure essential fields exist, migrate if necessary
            kbToLoad.pageSummaries = kbToLoad.pageSummaries || {};
            kbToLoad.currentPageHistory = kbToLoad.currentPageHistory && kbToLoad.currentPageHistory.length > 0 ? kbToLoad.currentPageHistory : [1];
            kbToLoad.lastSummarizedTurn = kbToLoad.lastSummarizedTurn || 0;
            // Ensure turnHistory is an array and its snapshots are clean (if possible, though old saves might still be bloated)
            kbToLoad.turnHistory = (kbToLoad.turnHistory || []).map(entry => {
                if (entry.knowledgeBaseSnapshot && entry.knowledgeBaseSnapshot.turnHistory) {
                    // This is a superficial clean for loading; ideally, snapshots were saved clean
                    const cleanedSnapshot = { ...entry.knowledgeBaseSnapshot };
                    delete cleanedSnapshot.turnHistory; 
                    return { ...entry, knowledgeBaseSnapshot: cleanedSnapshot };
                }
                return entry;
            });
            kbToLoad.appVersion = kbToLoad.appVersion || "unknown";


            setGameMessages(loadedData.gameMessages);
            
            // Generate missing summaries if any
            if (kbToLoad.worldConfig && kbToLoad.playerStats.turn > 0) {
                const totalPagesCount = Math.ceil(kbToLoad.playerStats.turn / TURNS_PER_PAGE);
                let summariesMissing = false;
                for (let i = 1; i < totalPagesCount; i++) { // Summarize all pages except the current one if needed
                    if (!kbToLoad.pageSummaries[i]) {
                        summariesMissing = true;
                        break;
                    }
                }

                if (summariesMissing) {
                    setIsSummarizingOnLoad(true);
                    addRawMessage('system', VIETNAMESE.creatingMissingSummary, kbToLoad.playerStats.turn);
                    
                    let tempKbWithNewSummaries = JSON.parse(JSON.stringify(kbToLoad));

                    for (let pageNum = 1; pageNum < totalPagesCount; pageNum++) {
                        if (!tempKbWithNewSummaries.pageSummaries[pageNum]) {
                            const startTurnOfPage = tempKbWithNewSummaries.currentPageHistory[pageNum - 1] || ((pageNum - 1) * TURNS_PER_PAGE + 1);
                            const endTurnOfPage = Math.min(pageNum * TURNS_PER_PAGE, tempKbWithNewSummaries.playerStats.turn);
                            
                            const messagesForSummary = loadedData.gameMessages.filter(
                                msg => msg.turnNumber >= startTurnOfPage && msg.turnNumber <= endTurnOfPage
                            );
                            if (messagesForSummary.length > 0 && tempKbWithNewSummaries.worldConfig) {
                                try {
                                    const summaryText = await summarizeTurnHistory(
                                        messagesForSummary,
                                        tempKbWithNewSummaries.worldConfig.theme,
                                        tempKbWithNewSummaries.worldConfig.playerName,
                                        logSentPrompt
                                    );
                                    tempKbWithNewSummaries.pageSummaries[pageNum] = summaryText;
                                    tempKbWithNewSummaries.lastSummarizedTurn = Math.max(tempKbWithNewSummaries.lastSummarizedTurn || 0, endTurnOfPage);
                                } catch (summaryError) {
                                    console.error(`Error generating summary for page ${pageNum} on load:`, summaryError);
                                    // Continue without this summary
                                }
                            }
                        }
                    }
                    kbToLoad = tempKbWithNewSummaries;
                    setIsSummarizingOnLoad(false);
                }
            }
            setKnowledgeBase(kbToLoad);

            const lastTurn = kbToLoad.playerStats.turn;
            let displayPage = 1;
            const pageHistory = kbToLoad.currentPageHistory || [1];
            for (let i = 0; i < pageHistory.length; i++) {
                if (lastTurn >= pageHistory[i]) {
                    displayPage = i + 1;
                } else {
                    break;
                }
            }
            setCurrentPageDisplay(Math.max(1, displayPage));

            setCurrentScreen(GameScreen.Gameplay);
            showNotification(VIETNAMESE.gameLoadedSuccess, 'success');
        } else {
            throw new Error("Không tìm thấy dữ liệu lưu game.");
        }
    } catch (e) {
        console.error("Error loading game:", e);
        const errorMsg = VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : '');
        setError(errorMsg);
        showNotification(errorMsg, 'error');
        setCurrentScreen(GameScreen.LoadGameSelection); // Stay on load screen or go back
    } finally {
        setIsLoading(false);
        setIsSummarizingOnLoad(false);
    }
};

  const handleStorageSettingsSaved = (newSettings: StorageSettings) => {
    setStorageSettings(newSettings);
    // Force re-initialization of services by resetting and then letting useEffect run
    setIsInitialLoading(true); // Show loading while re-initializing
    // This effect will re-run due to isInitialLoading change or could be triggered by dummy state
    // For simplicity, we just set a loading state, the main useEffect will handle re-init.
    // The main useEffect depends on nothing, so it runs once.
    // To re-trigger it, we'd need to change a dependency or make it re-callable.
    // A page reload is simpler for user if Firebase config changes, as stated in message.
    // For now, internal state update is enough, app will use new settings for next ops.
    showNotification(VIETNAMESE.storageSettingsSavedMessage, 'success');
  };
  
   const handleApiSettingsSaved = () => {
    // API settings are read directly by geminiService, no app state needed typically.
    // However, if some components depend on it, update here.
    // For now, just a notification.
    showNotification(VIETNAMESE.settingsSavedMessage, 'success');
  };

  const handleGoToPage = (pageNumber: number) => {
    const targetPage = Math.max(1, Math.min(pageNumber, totalPages));
    setCurrentPageDisplay(targetPage);
  };
  
const handleImportGame = async (gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'>) => {
    setIsLoading(true);
    try {
        if (storageSettings.storageType === 'cloud') {
            if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForSave); // Importing is like saving
            await importGameToFirestore(firebaseUser.uid, gameDataToImport);
        } else {
            await importGameToIndexedDB(gameDataToImport);
        }
        showNotification(VIETNAMESE.dataImportedSuccess, 'success');
        // Optionally, navigate to load screen or refresh current screen's list
        if (currentScreen === GameScreen.ImportExport) {
            // The ImportExportScreen itself might re-fetch lists.
        }
    } catch (e) {
        const errorMsg = VIETNAMESE.errorImportingData + (e instanceof Error ? `: ${e.message}` : '');
        console.error(errorMsg, e);
        showNotification(errorMsg, 'error');
        throw e; // Re-throw so ImportExportScreen can also catch it if needed
    } finally {
        setIsLoading(false);
    }
};

const fetchSaveGamesForImportExport = async (): Promise<SaveGameMeta[]> => {
    if (storageSettings.storageType === 'cloud') {
        if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
        return loadGamesFromFirestore(firebaseUser.uid);
    } else {
        return loadGamesFromIndexedDB();
    }
};

const loadSpecificGameDataForExport = async (saveId: string): Promise<SaveGameData | null> => {
    if (storageSettings.storageType === 'cloud') {
        if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
        return loadSpecificGameFromFirestore(firebaseUser.uid, saveId);
    } else {
        return loadSpecificGameFromIndexedDB(saveId);
    }
};

const toggleAutoPlay = () => {
    setIsAutoPlaying(prev => {
        const newAutoPlayState = !prev;
        showNotification(
            newAutoPlayState ? VIETNAMESE.autoPlayEnabledNotification : VIETNAMESE.autoPlayDisabledNotification,
            'info'
        );
        return newAutoPlayState;
    });
};

const updateStyleSettings = (newStyles: StyleSettings) => {
    setStyleSettings(newStyles);
    localStorage.setItem(STYLE_SETTINGS_STORAGE_KEY, JSON.stringify(newStyles));
    showNotification("Cài đặt hiển thị đã được lưu!", 'success');
};


const anySummarizing = isSummarizingOnLoad || isSummarizingNextPageTransition;
const isCurrentlyActivePage = currentPageDisplay === totalPages;

useEffect(() => {
    let autoPlayTimeoutId: NodeJS.Timeout | null = null;

    if (isAutoPlaying && !isLoading && !anySummarizing && isCurrentlyActivePage && currentScreen === GameScreen.Gameplay) {
        const latestMessageWithChoices = [...gameMessages]
            .reverse()
            .find(msg => msg.type === 'narration' && msg.choices && msg.choices.length > 0);

        if (latestMessageWithChoices && latestMessageWithChoices.choices && latestMessageWithChoices.choices.length > 0) {
            const firstChoice = latestMessageWithChoices.choices[0];
            
            autoPlayTimeoutId = setTimeout(() => {
                // Double check conditions before dispatching action, as state might have changed during timeout
                if (isAutoPlaying && !isLoading && !anySummarizing && isCurrentlyActivePage && currentScreen === GameScreen.Gameplay) {
                     onPlayerAction(firstChoice.text, true, 'action', 'default');
                }
            }, 500); // 0.5 second delay
        }
    }
    return () => {
        if (autoPlayTimeoutId) {
            clearTimeout(autoPlayTimeoutId);
        }
    };
}, [isAutoPlaying, isLoading, anySummarizing, isCurrentlyActivePage, gameMessages, onPlayerAction, currentScreen]);


  // --- Render logic ---
  if (isInitialLoading) {
    return <div className="h-screen flex flex-col items-center justify-center bg-gray-900 text-gray-100 p-4">
               <Spinner text="Đang khởi tạo ứng dụng..." size="lg" />
               {storageInitError && <p className="mt-4 text-red-400 text-center">{storageInitError}</p>}
           </div>;
  }
  
  let screenContent = null;
  switch (currentScreen) {
    case GameScreen.Initial:
      screenContent = <InitialScreen 
                        setCurrentScreen={setCurrentScreen} 
                        firebaseUser={firebaseUser} 
                        onSignOut={async () => { await signOutUser(); setFirebaseUser(null); setIsAutoPlaying(false); }}
                        isFirebaseLoading={isInitialLoading && storageSettings.storageType === 'cloud'}
                      />;
      break;
    case GameScreen.GameSetup:
      screenContent = <GameSetupScreen 
                        setCurrentScreen={setCurrentScreen} 
                        onSetupComplete={(settings) => {
                            setKnowledgeBase(prev => ({...prev, worldConfig: settings}));
                            handleInitialStory(settings);
                        }} 
                      />;
      break;
    case GameScreen.Gameplay:
      screenContent = <GameplayScreen
                        knowledgeBase={knowledgeBase}
                        gameMessages={gameMessages} // Pass all for context, component filters by page
                        isLoading={isLoading || anySummarizing}
                        onPlayerAction={onPlayerAction}
                        onQuit={handleQuitGame}
                        rawAiResponsesLog={rawAiResponsesLog}
                        sentPromptsLog={sentPromptsLog}
                        firebaseUser={firebaseUser}
                        onSaveGame={handleSaveGame}
                        isSavingGame={isSavingGame}
                        storageType={storageSettings.storageType}
                        currentPageDisplay={currentPageDisplay}
                        setCurrentPageDisplay={setCurrentPageDisplay} 
                        totalPages={totalPages}
                        onGoToNextPage={() => handleGoToPage(currentPageDisplay + 1)}
                        onGoToPrevPage={() => handleGoToPage(currentPageDisplay - 1)}
                        onJumpToPage={handleGoToPage}
                        isSummarizing={anySummarizing}
                        getMessagesForPage={(pageNum) => getMessagesForPage(pageNum, knowledgeBase, gameMessages)}
                        isCurrentlyActivePage={isCurrentlyActivePage}
                        onRollbackTurn={handleRollbackTurn}
                        isAutoPlaying={isAutoPlaying}
                        onToggleAutoPlay={toggleAutoPlay}
                        styleSettings={styleSettings}
                        onUpdateStyleSettings={updateStyleSettings}
                      />;
      break;
    case GameScreen.ApiSettings:
      screenContent = <ApiSettingsScreen setCurrentScreen={setCurrentScreen} onSettingsSaved={handleApiSettingsSaved} />;
      break;
    case GameScreen.LoadGameSelection:
      screenContent = <LoadGameScreen 
                        setCurrentScreen={setCurrentScreen} 
                        firebaseUser={firebaseUser} 
                        onLoadGame={handleLoadGame}
                        notify={showNotification}
                        storageType={storageSettings.storageType}
                       />;
      break;
    case GameScreen.StorageSettings:
        screenContent = <StorageSettingsScreen 
                            setCurrentScreen={setCurrentScreen} 
                            onSettingsSaved={handleStorageSettingsSaved} 
                        />;
        break;
    case GameScreen.ImportExport:
        screenContent = <ImportExportScreen
                            setCurrentScreen={setCurrentScreen}
                            storageType={storageSettings.storageType}
                            firebaseUser={firebaseUser}
                            notify={showNotification}
                            fetchSaveGames={fetchSaveGamesForImportExport}
                            loadSpecificGameData={loadSpecificGameDataForExport}
                            importGameData={handleImportGame}
                        />;
        break;
    default:
      screenContent = <div>Màn hình không xác định</div>;
  }

  return (
    <>
      {screenContent}
      {notification && (
        <div 
            className={`fixed bottom-5 right-5 p-4 rounded-lg shadow-xl text-white text-sm z-[100]
                        ${notification.type === 'success' ? 'bg-green-600' : ''}
                        ${notification.type === 'error' ? 'bg-red-600' : ''}
                        ${notification.type === 'info' ? 'bg-blue-600' : ''}
                        ${notification.type === 'warning' ? 'bg-yellow-600 text-black' : ''}
                        transition-all duration-300 ease-in-out transform ${notification ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full'}`}
            role="alert"
            aria-live={notification.type === 'error' || notification.type === 'warning' ? "assertive" : "polite"}
        >
          {notification.message}
           <Button 
                onClick={() => setNotification(null)}
                variant="ghost" 
                size="sm" 
                className="absolute top-1 right-1 !p-1 text-current hover:bg-white/20"
                aria-label="Đóng thông báo"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </Button>
        </div>
      )}
      {error && currentScreen !== GameScreen.Gameplay && ( // Global error display for non-gameplay screens
            <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-red-700 text-white p-3 rounded-md shadow-lg text-sm z-[100] max-w-md w-full text-center">
                <p>{error}</p>
                 <Button 
                    onClick={() => setError(null)} 
                    variant="ghost" 
                    size="sm"
                    className="absolute top-1 right-1 !p-1 text-white hover:bg-white/20"
                    aria-label="Đóng lỗi"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </Button>
            </div>
        )}
    </>
  );
};

export default App;
