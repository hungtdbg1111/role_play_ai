
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
import Button from './components/ui/Button'; // Ensured relative path
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, DEFAULT_PLAYER_STATS, APP_VERSION, DEFAULT_STORAGE_SETTINGS, STORAGE_SETTINGS_STORAGE_KEY, TURNS_PER_PAGE, MAX_TURN_HISTORY_LENGTH, DEFAULT_STYLE_SETTINGS, STYLE_SETTINGS_STORAGE_KEY, PROMPT_TEMPLATES, GAME_TITLE } from './constants';
import {
  generateInitialStory,
  generateNextTurn,
  getApiSettings,
  summarizeTurnHistory,
  countTokens,
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


export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.Initial);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)));
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rawAiResponsesLog, setRawAiResponsesLog] = useState<string[]>([]);
  const [sentPromptsLog, setSentPromptsLog] = useState<string[]>([]);
  const [latestPromptTokenCount, setLatestPromptTokenCount] = useState<number | null | string>(null);
  const [summarizationResponsesLog, setSummarizationResponsesLog] = useState<string[]>([]);


  const [storageSettings, setStorageSettings] = useState<StorageSettings>(DEFAULT_STORAGE_SETTINGS);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isSavingGame, setIsSavingGame] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [storageInitError, setStorageInitError] = useState<string | null>(null);

  const [currentPageDisplay, setCurrentPageDisplay] = useState<number>(1);
  const [isSummarizingOnLoad, setIsSummarizingOnLoad] = useState<boolean>(false); 
  const [isSummarizingNextPageTransition, setIsSummarizingNextPageTransition] = useState<boolean>(false); 
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [styleSettings, setStyleSettings] = useState<StyleSettings>(DEFAULT_STYLE_SETTINGS);

  const [messageIdBeingEdited, setMessageIdBeingEdited] = useState<string | null>(null);


  const calculateTotalPages = useCallback((kb: KnowledgeBase): number => {
    return Math.max(1, kb.currentPageHistory?.length || 1);
  }, []);

  const totalPages = calculateTotalPages(knowledgeBase);

  const logSentPrompt = useCallback((prompt: string) => {
    setSentPromptsLog(prev => [prompt, ...prev].slice(0, 10));
    
    const { model: currentModel } = getApiSettings();
    
    if (currentModel === 'gemini-1.5-flash') {
      setLatestPromptTokenCount('N/A (model)'); 
    } else {
      setLatestPromptTokenCount('Đang tính...'); 
      countTokens(prompt)
        .then(count => setLatestPromptTokenCount(count)) 
        .catch(err => {
          console.warn("Could not count tokens for prompt:", err);
          setLatestPromptTokenCount('Lỗi'); 
        });
    }
  }, []);

  const logSummarizationResponse = useCallback((response: string) => {
    setSummarizationResponsesLog(prev => [response, ...prev].slice(0, 10)); 
  }, []);

  useEffect(() => {
    const loadAndInitialize = async () => {
      setIsInitialLoading(true);
      setStorageInitError(null);

      const storedStyleSettingsRaw = localStorage.getItem(STYLE_SETTINGS_STORAGE_KEY);
      if (storedStyleSettingsRaw) {
        try {
          const parsedStyleSettings = JSON.parse(storedStyleSettingsRaw);
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

  const addMessageAndUpdateState = useCallback((
    newMessages: GameMessage[],
    newKnowledgeBase: KnowledgeBase,
    callback?: () => void
  ) => {
    setGameMessages(prev => [...prev, ...newMessages]);
    setKnowledgeBase(newKnowledgeBase);
    if (callback) callback();
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
    
    // For the last page, kb.playerStats.turn is the *next* turn, so events of current turn are up to kb.playerStats.turn - 1
    // However, if we are loading, kb.playerStats.turn is the turn of the last event.
    // The most reliable endTurn is defined by the start of the *next* page, or if it's the very last page, up to the highest turn number in messages.
    const endTurnOfPage = (pageNumber === kb.currentPageHistory.length)
                          ? Infinity // Show all messages from startTurnOfPage onwards for the current active page
                          : kb.currentPageHistory[pageNumber] - 1; 
    
    return allMessages.filter(msg => msg.turnNumber >= startTurnOfPage && msg.turnNumber <= endTurnOfPage);
  }, []);

  const performTagProcessing = useCallback((currentKb: KnowledgeBase, tagBatch: string[], turnForSystemMessages: number): {
    newKb: KnowledgeBase;
    turnIncrementedByTag: boolean;
    systemMessagesFromTags: GameMessage[];
  } => {
    const newKb: KnowledgeBase = JSON.parse(JSON.stringify(currentKb));
    if (!newKb.discoveredFactions) newKb.discoveredFactions = [];
    if (!newKb.worldLore) newKb.worldLore = []; 
    if (!newKb.allQuests) newKb.allQuests = []; 
    if (!newKb.discoveredLocations) newKb.discoveredLocations = []; 

    let turnIncrementedByTag = false;
    const systemMessagesFromTags: GameMessage[] = [];

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
                    } else if (key === 'turn') {
                        if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                            (statsUpdates as any)[key] = oldTurnForThisTagProcessing + parseInt(valueStr, 10);
                        } else {
                            (statsUpdates as any)[key] = parseInt(valueStr, 10);
                        }
                        if (statsUpdates.turn! > oldTurnForThisTagProcessing) {
                           turnIncrementedByTag = true;
                        }
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
                 systemMessagesFromTags.push({
                    id: 'tag-message-' + Date.now() + Math.random(),
                    type: 'system',
                    content: tagParams.message || tagFullValue.replace(/^"|"$/g, ''),
                    timestamp: Date.now(),
                    turnNumber: turnForSystemMessages
                 });
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
                        if (npc.stats) {
                            if (hp !== undefined && !isNaN(hp)) npc.stats.hp = hp;
                            if (atk !== undefined && !isNaN(atk)) npc.stats.atk = atk;
                        } else if (hp !== undefined || atk !== undefined) {
                           npc.stats = {}; 
                           if (hp !== undefined && !isNaN(hp)) npc.stats.hp = hp;
                           if (atk !== undefined && !isNaN(atk)) npc.stats.atk = atk;
                        }

                    } else { 
                        const newNpc: NPC = {
                            id: Date.now().toString() + (tagParams.name || 'npc').replace(/\s/g, ''),
                            name: tagParams.name,
                            description: npcDesc || "Chưa có mô tả cụ thể.",
                            personalityTraits: personalityTraits || [],
                            affinity: !isNaN(affinity) ? Math.max(-100, Math.min(100, affinity)) : 0,
                            factionId: factionId, 
                            title: title, 
                            hp: hp,
                            atk: atk,
                            stats: (hp !== undefined || atk !== undefined) ? { hp, atk } : undefined,
                        };
                        newKb.discoveredNPCs.push(newNpc);
                    }
                } else { console.warn("LORE_NPC tag missing name", tagParams); }
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
                        const newLocation: GameLocation = {
                            id: Date.now().toString() + (tagParams.name || 'loc').replace(/\s/g, ''),
                            name: tagParams.name,
                            description: locDesc || "Chưa có mô tả.",
                            isSafeZone: isSafeZone !== undefined ? isSafeZone : false, 
                            regionId: regionId
                        };
                        newKb.discoveredLocations.push(newLocation);
                    }
                } else { console.warn("LORE_LOCATION tag missing name", tagParams); }
                break;
            case 'WORLD_LORE_ADD':
                if (tagParams.title && tagParams.content) {
                    if (!newKb.worldLore.find(l => l.title === tagParams.title)) {
                        newKb.worldLore.push({
                            id: Date.now().toString() + (tagParams.title || 'lore').replace(/\s/g, ''),
                            title: tagParams.title,
                            content: tagParams.content
                        });
                    }
                } else { console.warn("WORLD_LORE_ADD missing params", tagParams); }
                break;
            case 'QUEST_ASSIGNED':
                if (tagParams.title && tagParams.description && tagParams.objectives) {
                    const objectivesArray = tagParams.objectives.split('|').map((objText, index) => ({
                        id: `${tagParams.title?.replace(/\s/g, '') || 'obj'}-${index}-${Date.now()}`,
                        text: objText.trim(),
                        completed: false
                    }));
                    const newQuest: Quest = {
                        id: Date.now().toString() + (tagParams.title?.replace(/\s/g, '') || 'quest'),
                        title: tagParams.title,
                        description: tagParams.description,
                        status: 'active',
                        objectives: objectivesArray
                    };
                    if (!newKb.allQuests.find(q => q.title === newQuest.title)) {
                        newKb.allQuests.push(newQuest);
                    }
                } else { console.warn("QUEST_ASSIGNED missing params", tagParams); }
                break;
            default:
              break;
            }
        } catch (e) {
            console.error(`Error processing tag: ${tag} (Name: ${tagName}, Params: ${JSON.stringify(tagParams)})`, e);
        }
    });

    return { newKb, turnIncrementedByTag, systemMessagesFromTags };
  }, [parseTagValue]);

   const handleSetupComplete = (settings: WorldSettings) => {
    setIsLoading(true);
    setError(null);
    setGameMessages([]);
    setRawAiResponsesLog([]);
    setSentPromptsLog([]);
    setLatestPromptTokenCount(null);
    setSummarizationResponsesLog([]);


    const initialKB: KnowledgeBase = {
      ...INITIAL_KNOWLEDGE_BASE,
      playerStats: { ...DEFAULT_PLAYER_STATS, turn: 0 }, 
      worldConfig: settings, 
      appVersion: APP_VERSION,
      pageSummaries: {},
      currentPageHistory: [1], 
      lastSummarizedTurn: 0,
      turnHistory: [],
    };
    
    setCurrentPageDisplay(1);


    generateInitialStory(settings, logSentPrompt)
      .then(({response, rawText}) => {
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
        
        // Process tags. Initial playerStats.turn is 0.
        const { newKb: kbAfterTags, turnIncrementedByTag, systemMessagesFromTags: systemMessagesFromInitialTags } = performTagProcessing(initialKB, response.tags, 1);
        
        let finalKbForSetup = kbAfterTags;
        let turnForInitialMessages = 1;

        if (turnIncrementedByTag && finalKbForSetup.playerStats.turn > 0) {
            turnForInitialMessages = finalKbForSetup.playerStats.turn;
        } else {
            finalKbForSetup.playerStats.turn = 1;
            turnForInitialMessages = 1;
        }
        
        if (finalKbForSetup.currentPageHistory?.length === 1 && finalKbForSetup.currentPageHistory[0] !== turnForInitialMessages) {
            finalKbForSetup.currentPageHistory = [turnForInitialMessages];
        } else if (!finalKbForSetup.currentPageHistory || finalKbForSetup.currentPageHistory.length === 0) {
            finalKbForSetup.currentPageHistory = [turnForInitialMessages];
        }
        
        const newMessages: GameMessage[] = [];
        newMessages.push({
          id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration, 
          timestamp: Date.now(), choices: response.choices, turnNumber: turnForInitialMessages
        });
        if (response.systemMessage) {
          newMessages.push({
            id: Date.now().toString() + Math.random(), type: 'system', content: response.systemMessage, 
            timestamp: Date.now(), turnNumber: turnForInitialMessages
          });
        }
        newMessages.push(...systemMessagesFromInitialTags.map(m => ({...m, turnNumber: turnForInitialMessages })));

        if (!turnIncrementedByTag && finalKbForSetup.playerStats.turn === 1 && initialKB.playerStats.turn === 0 && !response.tags.some(t => t.toUpperCase().includes('PLAYER_STATS_INIT:') && t.toUpperCase().includes('TURN=1'))) {
           // If turn was not set by PLAYER_STATS_INIT, but we manually set it to 1
        }
        
        addMessageAndUpdateState(newMessages, finalKbForSetup, () => {
             setCurrentScreen(GameScreen.Gameplay);
             setIsLoading(false);
        });

      })
      .catch(err => {
        setError(err.message);
        console.error(err);
        setIsLoading(false);
      });
  };


  const handlePlayerAction = useCallback(async (
    action: string, 
    isChoice: boolean,
    inputType: PlayerActionInputType,
    responseLength: ResponseLength
  ) => {
    setIsLoading(true);
    setError(null);
    
    const turnOfPlayerAction = knowledgeBase.playerStats.turn; // This is the turn the player is acting IN.
    const knowledgeBaseAtActionStart = JSON.parse(JSON.stringify(knowledgeBase)); // KB state *before* this turn's events
    const gameMessagesBeforePlayerAction = [...gameMessages]; // Messages *before* this turn's events

    const playerActionMessage: GameMessage = {
      id: Date.now().toString() + Math.random(),
      type: 'player_action',
      content: action,
      timestamp: Date.now(),
      isPlayerInput: true,
      turnNumber: turnOfPlayerAction
    };
    
    const messagesForCurrentPagePrompt = getMessagesForPage(currentPageDisplay, knowledgeBase, [...gameMessages, playerActionMessage]);
    let currentPageMessagesLog = messagesForCurrentPagePrompt
        .map(msg => {
            let prefix = "";
            if (msg.type === 'player_action') prefix = `${knowledgeBase.worldConfig?.playerName || 'Người chơi'} ${msg.isPlayerInput ? 'đã làm' : 'đã chọn'}: `;
            else if (msg.type === 'narration') prefix = "AI kể: ";
            else if (msg.type === 'system' && !msg.content.includes("Tóm tắt") && !msg.content.includes("trang")) prefix = "Hệ thống: ";
            return prefix + msg.content;
        })
        .join("\n---\n");
    // The playerActionMessage is already part of messagesForCurrentPagePrompt if currentPageDisplay is the latest page.
    // If not, ensure it's added. But usually it should be.
    // No, currentPageMessagesLog here refers to log *before* AI response, but *after* player action.
    // So the map function above IS correct to build the prompt log.

    const previousPageNumbers = knowledgeBase.currentPageHistory?.slice(0, -1) || [];
    const previousPageSummariesContent: string[] = previousPageNumbers
        .map((_, index) => knowledgeBase.pageSummaries?.[index + 1])
        .filter((summary): summary is string => !!summary);
    
    const lastPageNumberForPrompt = (knowledgeBase.currentPageHistory?.length || 1) -1;
    let lastNarrationFromPreviousPage: string | undefined = undefined;
    if (lastPageNumberForPrompt > 0 && currentPageDisplay > lastPageNumberForPrompt) { 
        const messagesOfLastSummarizedPagePrompt = getMessagesForPage(lastPageNumberForPrompt, knowledgeBase, gameMessages);
        lastNarrationFromPreviousPage = [...messagesOfLastSummarizedPagePrompt].reverse().find(msg => msg.type === 'narration')?.content;
    }

    try {
        const { response, rawText } = await generateNextTurn(
            knowledgeBase, // Pass KB state *before* this turn's action
            action,
            inputType,
            responseLength,
            currentPageMessagesLog,
            previousPageSummariesContent,
            lastNarrationFromPreviousPage,
            logSentPrompt
        );
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
        
        // process tags using KB state *before* this turn's action
        const { newKb: kbAfterTags, turnIncrementedByTag, systemMessagesFromTags } = performTagProcessing(knowledgeBase, response.tags, turnOfPlayerAction);
        
        let finalKbStateForThisTurn = JSON.parse(JSON.stringify(kbAfterTags));
        let manualTurnIncrementMessage: GameMessage | null = null;

        if (turnIncrementedByTag) {
            // AI handled turn increment via tag, ensure it's valid
            if (finalKbStateForThisTurn.playerStats.turn <= turnOfPlayerAction) {
                 // Invalid turn update from AI, manually fix
                finalKbStateForThisTurn.playerStats.turn = turnOfPlayerAction + 1;
                 manualTurnIncrementMessage = {
                    id: 'manual-fix-turn-' + Date.now(), type: 'system', 
                    content: `Hệ thống: Lượt chơi đã được điều chỉnh thành ${finalKbStateForThisTurn.playerStats.turn} (do AI tag không hợp lệ).`, 
                    timestamp: Date.now(), turnNumber: turnOfPlayerAction
                };
            }
        } else {
            // AI did not increment turn, do it manually
            finalKbStateForThisTurn.playerStats.turn = turnOfPlayerAction + 1;
            manualTurnIncrementMessage = {
                id: 'manual-increment-turn-' + Date.now(), type: 'system', 
                content: "Hệ thống: Lượt chơi +1.", 
                timestamp: Date.now(), turnNumber: turnOfPlayerAction
            };
        }
        
        const { turnHistory: _excludedTurnHistoryFromSnapshot, ...kbForSnapshot } = knowledgeBaseAtActionStart;
        const newTurnHistoryEntry: TurnHistoryEntry = {
            knowledgeBaseSnapshot: kbForSnapshot, 
            gameMessagesSnapshot: gameMessagesBeforePlayerAction 
        };

        let updatedTurnHistory = [...(finalKbStateForThisTurn.turnHistory || [])];
        if (updatedTurnHistory.length >= MAX_TURN_HISTORY_LENGTH) {
            updatedTurnHistory.shift(); 
        }
        updatedTurnHistory.push(newTurnHistoryEntry);
        finalKbStateForThisTurn.turnHistory = updatedTurnHistory;

        const newMessagesForThisCycle: GameMessage[] = [playerActionMessage];
        newMessagesForThisCycle.push({
            id: Date.now().toString() + Math.random(), type: 'narration', content: response.narration,
            timestamp: Date.now(), choices: response.choices, turnNumber: turnOfPlayerAction
        });
        if (response.systemMessage) {
          newMessagesForThisCycle.push({
            id: Date.now().toString() + Math.random(), type: 'system', content: response.systemMessage,
            timestamp: Date.now(), turnNumber: turnOfPlayerAction
          });
        }
        newMessagesForThisCycle.push(...systemMessagesFromTags); // These already have turnOfPlayerAction
        if (manualTurnIncrementMessage) {
            newMessagesForThisCycle.push(manualTurnIncrementMessage);
        }
        
        const turnCompleted = turnOfPlayerAction;
        const shouldSummarizeAndPaginateNow = 
            turnCompleted > 0 &&
            turnCompleted % TURNS_PER_PAGE === 0 &&
            turnCompleted > (knowledgeBase.lastSummarizedTurn || 0); // Use KB before this turn's summary for lastSummarizedTurn check

        if (shouldSummarizeAndPaginateNow) {
            const pageToSummarize = turnCompleted / TURNS_PER_PAGE;
            
            if (!finalKbStateForThisTurn.pageSummaries?.[pageToSummarize]) { // Check against the potentially updated KB
                setIsSummarizingNextPageTransition(true);
                newMessagesForThisCycle.push({
                     id: 'summarizing-notice-' + Date.now(), type: 'system', 
                     content: VIETNAMESE.summarizingAndPreparingNextPage, 
                     timestamp: Date.now(), turnNumber: turnCompleted
                });

                const startTurnOfSummaryPageActual = (pageToSummarize - 1) * TURNS_PER_PAGE + 1;
                const endTurnOfSummaryPageActual = turnCompleted;
                
                // Collect all messages that belong to the page being summarized, including the ones just generated for this turn
                const allMessagesForSummaryCalc = [...gameMessagesBeforePlayerAction, ...newMessagesForThisCycle];
                const actualMessagesToSummarize = allMessagesForSummaryCalc.filter(
                    msg => msg.turnNumber >= startTurnOfSummaryPageActual && msg.turnNumber <= endTurnOfSummaryPageActual
                );
                
                if (actualMessagesToSummarize.length > 0) {
                    try {
                        const summaryResult = await summarizeTurnHistory(
                            actualMessagesToSummarize,
                            finalKbStateForThisTurn.worldConfig?.theme || "Không rõ",
                            finalKbStateForThisTurn.worldConfig?.playerName || "Người chơi",
                            logSentPrompt
                        );
                        logSummarizationResponse(summaryResult.rawText);
                        const summary = summaryResult.processedSummary;

                        if (!finalKbStateForThisTurn.pageSummaries) finalKbStateForThisTurn.pageSummaries = {};
                        finalKbStateForThisTurn.pageSummaries[pageToSummarize] = summary;
                        finalKbStateForThisTurn.lastSummarizedTurn = turnCompleted;
                        
                        const nextPageStartTurn = turnCompleted + 1;
                        if (!finalKbStateForThisTurn.currentPageHistory) finalKbStateForThisTurn.currentPageHistory = [1];
                        if (!finalKbStateForThisTurn.currentPageHistory.includes(nextPageStartTurn)) {
                            finalKbStateForThisTurn.currentPageHistory.push(nextPageStartTurn);
                        }
                        
                        newMessagesForThisCycle.push({
                            id: 'page-summary-' + Date.now(), type: 'page_summary',
                            content: `${VIETNAMESE.pageSummaryTitle(pageToSummarize)}: ${summary}`,
                            timestamp: Date.now(), turnNumber: turnCompleted
                        });
                        addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
                            setCurrentPageDisplay(pageToSummarize + 1);
                            setIsSummarizingNextPageTransition(false);
                            setIsLoading(false);
                        });
                        return; // Exit early as state update is handled in callback
                    } catch (summaryError) {
                        console.error("Error summarizing page:", summaryError);
                         newMessagesForThisCycle.push({
                            id: 'summary-error-' + Date.now(), type: 'error',
                            content: `Lỗi tóm tắt trang ${pageToSummarize}. Tiếp tục không có tóm tắt.`,
                            timestamp: Date.now(), turnNumber: turnCompleted
                        });
                        const nextPageStartTurn = turnCompleted + 1;
                        if (!finalKbStateForThisTurn.currentPageHistory) finalKbStateForThisTurn.currentPageHistory = [1];
                        if (!finalKbStateForThisTurn.currentPageHistory.includes(nextPageStartTurn)) {
                            finalKbStateForThisTurn.currentPageHistory.push(nextPageStartTurn);
                        }
                        addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
                            setCurrentPageDisplay(pageToSummarize + 1);
                             setIsSummarizingNextPageTransition(false);
                             setIsLoading(false);
                        });
                        return; // Exit early
                    }
                } else { 
                     // No actual messages to summarize, but still need to paginate
                     if (!finalKbStateForThisTurn.pageSummaries) finalKbStateForThisTurn.pageSummaries = {};
                     finalKbStateForThisTurn.pageSummaries[pageToSummarize] = VIETNAMESE.noContentToSummarize || "Không có nội dung.";
                     finalKbStateForThisTurn.lastSummarizedTurn = turnCompleted;
                     const nextPageStartTurn = turnCompleted + 1;
                     if (!finalKbStateForThisTurn.currentPageHistory) finalKbStateForThisTurn.currentPageHistory = [1];
                     if (!finalKbStateForThisTurn.currentPageHistory.includes(nextPageStartTurn)) {
                        finalKbStateForThisTurn.currentPageHistory.push(nextPageStartTurn);
                     }
                     newMessagesForThisCycle.push({
                        id: 'no-content-summary-' + Date.now(), type: 'page_summary',
                        content: `${VIETNAMESE.pageSummaryTitle(pageToSummarize)}: ${VIETNAMESE.noContentToSummarize || "Không có nội dung."}`,
                        timestamp: Date.now(), turnNumber: turnCompleted
                     });
                     addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
                        setCurrentPageDisplay(pageToSummarize + 1);
                        setIsSummarizingNextPageTransition(false);
                        setIsLoading(false);
                    });
                    return; // Exit early
                }
            }
        }
        // If not summarizing or summary already exists, just update state
        addMessageAndUpdateState(newMessagesForThisCycle, finalKbStateForThisTurn, () => {
             setIsLoading(false);
        });

    } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error(err);
        // Restore KB to state before this failed action if needed, or simply don't update messages
        // For now, player action message might remain, but AI response won't. Error will be shown.
        setIsLoading(false); 
        if (isAutoPlaying) {
          setIsAutoPlaying(false);
          showNotification(VIETNAMESE.autoPlayStoppedOnError || "Đã dừng tự động chơi do có lỗi.", 'error');
        }
    }
  }, [
      knowledgeBase, 
      gameMessages, 
      addMessageAndUpdateState,
      performTagProcessing, 
      logSentPrompt,
      logSummarizationResponse, 
      getMessagesForPage, 
      currentPageDisplay,
      isAutoPlaying,
      showNotification
    ]);
  
  useEffect(() => {
    let autoPlayTimeoutId: NodeJS.Timeout | undefined;

    if (isAutoPlaying && !isLoading && !isSummarizingNextPageTransition && !isSummarizingOnLoad && currentScreen === GameScreen.Gameplay && currentPageDisplay === totalPages) {
      const latestMessageWithChoices = [...gameMessages].reverse().find(
        (msg) => msg.type === 'narration' && msg.choices && msg.choices.length > 0
      );

      let actionToTake: string | null = null;
      let isChoiceAction = false;
      let actionType: PlayerActionInputType = 'action';

      if (latestMessageWithChoices && latestMessageWithChoices.choices && latestMessageWithChoices.choices.length > 0) {
        actionToTake = latestMessageWithChoices.choices[0].text; 
        isChoiceAction = true;
        actionType = 'action';
      } else {
        actionToTake = VIETNAMESE.autoPlayContinueAction || "Tiếp tục diễn biến.";
        isChoiceAction = false;
        actionType = 'story'; 
      }

      if (actionToTake) {
        autoPlayTimeoutId = setTimeout(() => {
          if (isAutoPlaying && !isLoading && !isSummarizingNextPageTransition && !isSummarizingOnLoad && currentScreen === GameScreen.Gameplay && currentPageDisplay === totalPages) {
            handlePlayerAction(actionToTake!, isChoiceAction, actionType, 'default');
          }
        }, 1000); 
      }
    }
    return () => {
      if (autoPlayTimeoutId) {
        clearTimeout(autoPlayTimeoutId);
      }
    };
  }, [
    isAutoPlaying, 
    isLoading, 
    gameMessages, 
    currentScreen, 
    handlePlayerAction,
    isSummarizingNextPageTransition,
    isSummarizingOnLoad,
    currentPageDisplay,
    totalPages
  ]);

  const handleToggleAutoPlay = () => {
    setIsAutoPlaying(prev => {
      const newAutoPlayingState = !prev;
      showNotification(newAutoPlayingState ? VIETNAMESE.autoPlayEnabledNotification : VIETNAMESE.autoPlayDisabledNotification, 'info');
      return newAutoPlayingState;
    });
  };

  const handleStartEditMessage = (messageId: string) => {
    setMessageIdBeingEdited(messageId);
  };

  const handleCancelEditMessage = () => {
    setMessageIdBeingEdited(null);
  };

  const handleSaveEditedMessage = (messageId: string, newContent: string) => {
    setGameMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId ? { ...msg, content: newContent, timestamp: Date.now() } : msg
      )
    );
    setMessageIdBeingEdited(null);
    showNotification(VIETNAMESE.messageEditedSuccess, 'success');
  };


  if (isInitialLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-900"><Spinner text="Đang tải và khởi tạo..." /></div>;
  }
  
  if (storageInitError && currentScreen !== GameScreen.StorageSettings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
        <h1 className="text-3xl font-bold text-red-500 mb-4">{VIETNAMESE.errorInitializingStorage}</h1>
        <p className="text-lg text-gray-300 mb-6">{storageInitError}</p>
        <Button onClick={() => setCurrentScreen(GameScreen.StorageSettings)}>
          {VIETNAMESE.storageSettings}
        </Button>
      </div>
    );
  }


  const handleSaveGame = async () => {
    setIsSavingGame(true);
    try {
        let saveId: string;
        if (storageSettings.storageType === 'cloud') {
            if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForSave);
            saveId = await saveGameToFirestore(firebaseUser.uid, knowledgeBase, gameMessages);
        } else {
            saveId = await saveGameToIndexedDB(knowledgeBase, gameMessages);
        }
        showNotification(VIETNAMESE.gameSavedSuccess + ` (ID: ${saveId.substring(0,10)}...)`, 'success');
    } catch (e) {
        console.error("Error in handleSaveGame:", e);
        showNotification(VIETNAMESE.errorSavingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
        setIsSavingGame(false);
    }
  };

  const handleLoadGame = async (saveId: string) => {
    setIsLoading(true); 
    setError(null);
    setIsSummarizingOnLoad(false); 
    try {
        let gameData: SaveGameData | null = null;
        if (storageSettings.storageType === 'cloud') {
            if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
            gameData = await loadSpecificGameFromFirestore(firebaseUser.uid, saveId);
        } else {
            gameData = await loadSpecificGameFromIndexedDB(saveId);
        }

        if (gameData) {
            setGameMessages(gameData.gameMessages); 
            
            const loadedKb = gameData.knowledgeBase;
            const requiredSummariesUpToPage = Math.floor( ( (loadedKb.lastSummarizedTurn || 0) ) / TURNS_PER_PAGE );
            let missingSummaryFound = false;

            for (let i = 1; i <= requiredSummariesUpToPage; i++) {
                if (!loadedKb.pageSummaries?.[i]) {
                    missingSummaryFound = true;
                    break;
                }
            }
            const lastCompletedPageByTurn = Math.floor( (loadedKb.playerStats.turn) / TURNS_PER_PAGE );
            if (lastCompletedPageByTurn > 0 && !loadedKb.pageSummaries?.[lastCompletedPageByTurn] && loadedKb.playerStats.turn % TURNS_PER_PAGE === 0 && (loadedKb.lastSummarizedTurn || 0) < loadedKb.playerStats.turn) {
                 missingSummaryFound = true;
            }


            if(missingSummaryFound) {
                setIsSummarizingOnLoad(true);
                const tempGameMessagesWithNotice = [...gameData.gameMessages, {
                    id: 'missing-summary-notice-' + Date.now(),
                    type: 'system' as const,
                    content: VIETNAMESE.creatingMissingSummary,
                    timestamp: Date.now(),
                    turnNumber: loadedKb.playerStats.turn
                }];
                setGameMessages(tempGameMessagesWithNotice);
                
                let tempKb = JSON.parse(JSON.stringify(loadedKb));

                const pagesThatShouldBeSummarized = Math.floor(tempKb.playerStats.turn / TURNS_PER_PAGE);

                for (let pageNum = 1; pageNum <= pagesThatShouldBeSummarized; pageNum++) {
                    if (!tempKb.pageSummaries?.[pageNum] && (tempKb.lastSummarizedTurn || 0) < (pageNum * TURNS_PER_PAGE) ) {
                         const startTurn = (pageNum - 1) * TURNS_PER_PAGE + 1;
                         const endTurn = pageNum * TURNS_PER_PAGE;
                         const messagesForSummary = tempGameMessagesWithNotice.filter(
                             msg => msg.turnNumber >= startTurn && msg.turnNumber <= endTurn
                         );

                         if (messagesForSummary.length > 0) {
                            try {
                                const summaryResult = await summarizeTurnHistory(
                                    messagesForSummary,
                                    tempKb.worldConfig?.theme || "Không rõ",
                                    tempKb.worldConfig?.playerName || "Người chơi",
                                    logSentPrompt
                                );
                                logSummarizationResponse(summaryResult.rawText);
                                const summary = summaryResult.processedSummary;

                                if (!tempKb.pageSummaries) tempKb.pageSummaries = {};
                                tempKb.pageSummaries[pageNum] = summary;
                                tempKb.lastSummarizedTurn = Math.max(tempKb.lastSummarizedTurn || 0, endTurn);
                            } catch (summaryError) {
                                console.error(`Error re-summarizing page ${pageNum} on load:`, summaryError);
                            }
                         } else {
                            if (!tempKb.pageSummaries) tempKb.pageSummaries = {};
                            tempKb.pageSummaries[pageNum] = VIETNAMESE.noContentToSummarize;
                            tempKb.lastSummarizedTurn = Math.max(tempKb.lastSummarizedTurn || 0, endTurn);
                         }
                    }
                }
                setKnowledgeBase(tempKb); 
                setIsSummarizingOnLoad(false);
            } else {
                 setKnowledgeBase(loadedKb);
            }
            
            const loadedTotalPages = Math.max(1, loadedKb.currentPageHistory?.length || 1);
            setCurrentPageDisplay(loadedTotalPages); 
            setCurrentScreen(GameScreen.Gameplay);
            showNotification(VIETNAMESE.gameLoadedSuccess, 'success');
        } else {
            throw new Error("Không tìm thấy dữ liệu game.");
        }
    } catch (e) {
        console.error("Error in handleLoadGame:", e);
        setError(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''));
        showNotification(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
        setCurrentScreen(GameScreen.LoadGameSelection); 
    } finally {
        setIsLoading(false);
        setIsSummarizingOnLoad(false); 
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

  const handleImportGameData = async (gameDataToImport: Omit<SaveGameData, 'id' | 'timestamp'>) => {
    try {
      if (storageSettings.storageType === 'cloud') {
        if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
        await importGameToFirestore(firebaseUser.uid, gameDataToImport);
      } else {
        await importGameToIndexedDB(gameDataToImport);
      }
      showNotification(VIETNAMESE.dataImportedSuccess, 'success');
    } catch (e) {
      console.error("Error importing game in App.tsx:", e);
      throw e; 
    }
  };
  
   const handleRollbackTurn = () => {
        if (isLoading || isSummarizingNextPageTransition || isSummarizingOnLoad) { 
            showNotification("Không thể lùi lượt khi hệ thống đang xử lý. Nút dừng nên được vô hiệu hóa.", 'warning');
            return;
        }

        if (knowledgeBase.turnHistory && knowledgeBase.turnHistory.length > 0) {
             const isAtVeryBeginning = knowledgeBase.playerStats.turn === 1 && 
                                   knowledgeBase.turnHistory.length === 1 && 
                                   knowledgeBase.turnHistory[0].knowledgeBaseSnapshot.playerStats.turn === 0 &&
                                   gameMessages.filter(m => m.type === 'player_action' || m.type === 'narration').length <=1; 
            
            if (isAtVeryBeginning) {
                 showNotification(VIETNAMESE.cannotRollbackFurther + " (Không thể lùi về trước khi truyện bắt đầu).", 'warning');
                 return;
            }

            const lastHistoryEntry = knowledgeBase.turnHistory[knowledgeBase.turnHistory.length - 1];
            
            setKnowledgeBase(lastHistoryEntry.knowledgeBaseSnapshot);
            setGameMessages(lastHistoryEntry.gameMessagesSnapshot);
            
            const rolledBackKb = lastHistoryEntry.knowledgeBaseSnapshot;
            const newTotalPages = Math.max(1, rolledBackKb.currentPageHistory?.length || 1);
            let newCurrentPage = newTotalPages; 
            if (rolledBackKb.currentPageHistory) {
                for (let i = rolledBackKb.currentPageHistory.length - 1; i >= 0; i--) {
                    if (rolledBackKb.playerStats.turn >= rolledBackKb.currentPageHistory[i]) {
                        newCurrentPage = i + 1;
                        break;
                    }
                }
            }
            setCurrentPageDisplay(newCurrentPage);

            showNotification(VIETNAMESE.rollbackSuccess, 'success');
        } else {
            showNotification(VIETNAMESE.cannotRollbackFurther, 'warning');
        }
    };


  switch (currentScreen) {
    case GameScreen.Initial:
      return <InitialScreen 
                setCurrentScreen={setCurrentScreen} 
                firebaseUser={firebaseUser}
                onSignOut={async () => { await signOutUser(); setFirebaseUser(null); }}
                isFirebaseLoading={isInitialLoading && storageSettings.storageType === 'cloud'}
             />;
    case GameScreen.GameSetup:
      return <GameSetupScreen setCurrentScreen={setCurrentScreen} onSetupComplete={handleSetupComplete} />;
    case GameScreen.Gameplay:
      return <GameplayScreen
                knowledgeBase={knowledgeBase}
                gameMessages={gameMessages}
                isLoading={isLoading || isSummarizingNextPageTransition || isSummarizingOnLoad}
                onPlayerAction={handlePlayerAction}
                onQuit={() => {
                  setKnowledgeBase(JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)));
                  setGameMessages([]);
                  setCurrentScreen(GameScreen.Initial);
                  setRawAiResponsesLog([]);
                  setSentPromptsLog([]);
                  setLatestPromptTokenCount(null);
                  setSummarizationResponsesLog([]);
                  setCurrentPageDisplay(1);
                  setIsAutoPlaying(false);
                  setMessageIdBeingEdited(null); 
                }}
                rawAiResponsesLog={rawAiResponsesLog}
                sentPromptsLog={sentPromptsLog}
                latestPromptTokenCount={latestPromptTokenCount}
                summarizationResponsesLog={summarizationResponsesLog}
                firebaseUser={firebaseUser}
                onSaveGame={handleSaveGame}
                isSavingGame={isSavingGame}
                storageType={storageSettings.storageType}
                currentPageDisplay={currentPageDisplay}
                setCurrentPageDisplay={setCurrentPageDisplay}
                totalPages={totalPages}
                onGoToNextPage={() => setCurrentPageDisplay(prev => Math.min(prev + 1, totalPages))}
                onGoToPrevPage={() => setCurrentPageDisplay(prev => Math.max(prev - 1, 1))}
                onJumpToPage={(page) => setCurrentPageDisplay(Math.max(1, Math.min(page, totalPages)))}
                isSummarizing={isSummarizingNextPageTransition || isSummarizingOnLoad}
                getMessagesForPage={(pageNum) => getMessagesForPage(pageNum, knowledgeBase, gameMessages)}
                isCurrentlyActivePage={currentPageDisplay === totalPages}
                onRollbackTurn={handleRollbackTurn}
                isAutoPlaying={isAutoPlaying}
                onToggleAutoPlay={handleToggleAutoPlay}
                styleSettings={styleSettings}
                onUpdateStyleSettings={(newSettings) => {
                    setStyleSettings(newSettings);
                    localStorage.setItem(STYLE_SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
                    showNotification("Cài đặt hiển thị đã được cập nhật.", "success");
                }}
                messageIdBeingEdited={messageIdBeingEdited}
                onStartEditMessage={handleStartEditMessage}
                onSaveEditedMessage={handleSaveEditedMessage}
                onCancelEditMessage={handleCancelEditMessage}
             />;
    case GameScreen.ApiSettings:
      return <ApiSettingsScreen 
                setCurrentScreen={setCurrentScreen} 
                onSettingsSaved={() => {
                  showNotification("Cài đặt API đã được lưu. Các thay đổi sẽ có hiệu lực ngay.", "success");
                }}
             />;
    case GameScreen.LoadGameSelection:
        return <LoadGameScreen
                setCurrentScreen={setCurrentScreen}
                firebaseUser={firebaseUser}
                onLoadGame={handleLoadGame}
                notify={showNotification}
                storageType={storageSettings.storageType}
               />;
    case GameScreen.StorageSettings:
        return <StorageSettingsScreen
                setCurrentScreen={setCurrentScreen}
                onSettingsSaved={(newSettings) => {
                    setStorageSettings(newSettings);
                    initializeFirebaseServices(newSettings.storageType === 'cloud' ? newSettings.firebaseUserConfig : null)
                        .then(() => {
                             showNotification(VIETNAMESE.storageSettingsSavedMessage + (newSettings.storageType === 'cloud' ? " Thay đổi Firebase có thể cần tải lại trang." : ""), 'success');
                             if (newSettings.storageType === 'cloud' && newSettings.firebaseUserConfig && isAuthInitialized()) {
                                 onAuthUserChanged(async (user) => {
                                      if (user) {
                                        setFirebaseUser(user);
                                      } else {
                                        try {
                                          const anonUser = await signInUserAnonymously();
                                          setFirebaseUser(anonUser);
                                        } catch (e) { /* silent fail */ }
                                      }
                                 });
                             }
                        })
                        .catch(err => {
                            showNotification(`Lỗi khi áp dụng cài đặt lưu trữ mới: ${err.message}`, 'error');
                        });
                }}
               />;
     case GameScreen.ImportExport:
        return <ImportExportScreen
                setCurrentScreen={setCurrentScreen}
                storageType={storageSettings.storageType}
                firebaseUser={firebaseUser}
                notify={showNotification}
                fetchSaveGames={fetchSaveGamesForImportExport}
                loadSpecificGameData={loadSpecificGameDataForExport}
                importGameData={handleImportGameData}
                />;
    default:
      return <div>Error: Unknown screen</div>;
  }
};
