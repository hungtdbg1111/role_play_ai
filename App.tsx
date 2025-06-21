
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
  const [latestPromptTokenCount, setLatestPromptTokenCount] = useState<number | null>(null);

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
    countTokens(prompt)
      .then(setLatestPromptTokenCount)
      .catch(err => {
        console.warn("Could not count tokens for prompt:", err);
        setLatestPromptTokenCount(null); 
      });
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
                          ? kb.playerStats.turn 
                          : kb.currentPageHistory[pageNumber] - 1; 
    
    return allMessages.filter(msg => msg.turnNumber >= startTurnOfPage && msg.turnNumber <= endTurnOfPage);
  }, []);

  const performTagProcessing = useCallback((currentKb: KnowledgeBase, tagBatch: string[]): {
    newKb: KnowledgeBase;
    turnIncrementedThisBatch: boolean;
  } => {
    const newKb: KnowledgeBase = JSON.parse(JSON.stringify(currentKb));
    if (!newKb.discoveredFactions) newKb.discoveredFactions = [];
    if (!newKb.worldLore) newKb.worldLore = []; 
    if (!newKb.allQuests) newKb.allQuests = []; 
    if (!newKb.discoveredLocations) newKb.discoveredLocations = []; // Ensure discoveredLocations is initialized

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
                        // Update existing location
                        const loc = newKb.discoveredLocations[existingLocIndex];
                        if (locDesc !== undefined) loc.description = locDesc;
                        if (isSafeZone !== undefined) loc.isSafeZone = isSafeZone;
                        if (regionId !== undefined) loc.regionId = regionId;
                    } else {
                        // Add new location
                        // No need for: if (!newKb.discoveredLocations) newKb.discoveredLocations = []; because it's initialized at the top of the function
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

    return { newKb, turnIncrementedThisBatch };
  }, [parseTagValue, addRawMessage]);

   const handleSetupComplete = (settings: WorldSettings) => {
    setIsLoading(true);
    setError(null);
    setGameMessages([]);
    setRawAiResponsesLog([]);
    setSentPromptsLog([]);
    setLatestPromptTokenCount(null);


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
    setKnowledgeBase(initialKB);
    setCurrentPageDisplay(1);


    generateInitialStory(settings, logSentPrompt)
      .then(({response, rawText}) => {
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
        const { newKb, turnIncrementedThisBatch } = performTagProcessing(initialKB, response.tags);
        
        let finalKb = newKb;
        if (finalKb.playerStats.turn === 0 && response.tags.some(tag => tag.toUpperCase().includes("PLAYER_STATS_INIT:"))) {
            finalKb = JSON.parse(JSON.stringify(newKb));
            finalKb.playerStats.turn = 1;
             if (finalKb.currentPageHistory?.length === 1 && finalKb.currentPageHistory[0] === 0) {
                 finalKb.currentPageHistory = [1];
            }
        } else if (!turnIncrementedThisBatch && !response.tags.some(tag => tag.toUpperCase().includes("PLAYER_STATS_INIT:"))) {
            finalKb = JSON.parse(JSON.stringify(newKb)); 
            finalKb.playerStats.turn = 1;
             if (finalKb.currentPageHistory?.length === 1 && finalKb.currentPageHistory[0] === 0) { // Should be 0 if turn was 0
                 finalKb.currentPageHistory = [1];
            } else if (!finalKb.currentPageHistory || finalKb.currentPageHistory.length === 0) {
                 finalKb.currentPageHistory = [1];
            }
            addRawMessage('system', "Hệ thống: Khởi tạo lượt chơi = 1.", 1);
        }
        setKnowledgeBase(finalKb);
        addRawMessage('narration', response.narration, finalKb.playerStats.turn, response.choices);
        if (response.systemMessage) {
          addRawMessage('system', response.systemMessage, finalKb.playerStats.turn);
        }
        setCurrentScreen(GameScreen.Gameplay);
      })
      .catch(err => {
        setError(err.message);
        console.error(err);
      })
      .finally(() => setIsLoading(false));
  };


  const handlePlayerAction = async (
    action: string,
    isChoice: boolean,
    inputType: PlayerActionInputType,
    responseLength: ResponseLength
  ) => {
    setIsLoading(true);
    setError(null);

    const currentTurn = knowledgeBase.playerStats.turn;
    addRawMessage('player_action', action, currentTurn, undefined, true);

    const messagesForCurrentPage = getMessagesForPage(currentPageDisplay, knowledgeBase, gameMessages);
    let currentPageMessagesLog = messagesForCurrentPage
        .map(msg => {
            let prefix = "";
            if (msg.type === 'player_action') prefix = `${knowledgeBase.worldConfig?.playerName || 'Người chơi'} ${msg.isPlayerInput ? 'đã làm' : 'đã chọn'}: `;
            else if (msg.type === 'narration') prefix = "AI kể: ";
            else if (msg.type === 'system' && !msg.content.includes("Tóm tắt") && !msg.content.includes("trang")) prefix = "Hệ thống: ";
            return prefix + msg.content;
        })
        .join("\n---\n");

    const previousPageNumbers = knowledgeBase.currentPageHistory?.slice(0, -1) || [];
    const previousPageSummariesContent: string[] = previousPageNumbers
        .map((_, index) => knowledgeBase.pageSummaries?.[index + 1])
        .filter((summary): summary is string => !!summary);
    
    const lastPageNumber = (knowledgeBase.currentPageHistory?.length || 1) -1;
    let lastNarrationFromPreviousPage: string | undefined = undefined;
    if (lastPageNumber > 0 && currentPageDisplay > lastPageNumber) { 
        const messagesOfLastSummarizedPage = getMessagesForPage(lastPageNumber, knowledgeBase, gameMessages);
        lastNarrationFromPreviousPage = [...messagesOfLastSummarizedPage].reverse().find(msg => msg.type === 'narration')?.content;
    }


    try {
        const { response, rawText } = await generateNextTurn(
            knowledgeBase,
            action,
            inputType,
            responseLength,
            currentPageMessagesLog,
            previousPageSummariesContent,
            lastNarrationFromPreviousPage,
            logSentPrompt
        );
        setRawAiResponsesLog(prev => [rawText, ...prev].slice(0,50));
        
        const { newKb: kbAfterTags, turnIncrementedThisBatch } = performTagProcessing(knowledgeBase, response.tags);
        
        let finalKb = kbAfterTags;
        if (!turnIncrementedThisBatch && !response.tags.some(t => t.toUpperCase().includes('TURN=+1'))) {
            finalKb = JSON.parse(JSON.stringify(kbAfterTags)); 
            finalKb.playerStats.turn += 1;
            addRawMessage('system', "Hệ thống: Lượt chơi +1.", finalKb.playerStats.turn);
        }
        
        if (finalKb.turnHistory && finalKb.turnHistory.length >= MAX_TURN_HISTORY_LENGTH) {
            finalKb.turnHistory.shift(); 
        }
        finalKb.turnHistory = [
            ...(finalKb.turnHistory || []),
            {
                knowledgeBaseSnapshot: JSON.parse(JSON.stringify(knowledgeBase)), 
                gameMessagesSnapshot: JSON.parse(JSON.stringify(gameMessages))   
            }
        ];
        if (finalKb.turnHistory.length > MAX_TURN_HISTORY_LENGTH) {
          finalKb.turnHistory = finalKb.turnHistory.slice(-MAX_TURN_HISTORY_LENGTH);
        }

        setKnowledgeBase(finalKb);
        addRawMessage('narration', response.narration, finalKb.playerStats.turn, response.choices);
        if (response.systemMessage) {
            addRawMessage('system', response.systemMessage, finalKb.playerStats.turn);
        }

        if (finalKb.playerStats.turn % TURNS_PER_PAGE === 1 && finalKb.playerStats.turn > 1 && finalKb.playerStats.turn > (knowledgeBase.lastSummarizedTurn || 0)) {
            const pageToSummarize = Math.floor((finalKb.playerStats.turn - 2) / TURNS_PER_PAGE) + 1;
            
            if (!finalKb.pageSummaries?.[pageToSummarize]) {
                setIsSummarizingNextPageTransition(true);
                addRawMessage('system', VIETNAMESE.summarizingAndPreparingNextPage, finalKb.playerStats.turn);

                const messagesForSummary = getMessagesForPage(pageToSummarize, finalKb, [...gameMessages, {id:'current-narration', type:'narration', content:response.narration, timestamp:Date.now(), turnNumber: finalKb.playerStats.turn}]);
                
                try {
                    const summary = await summarizeTurnHistory(
                        messagesForSummary,
                        finalKb.worldConfig?.theme || "Không rõ",
                        finalKb.worldConfig?.playerName || "Người chơi"
                    );
                    setKnowledgeBase(prevKb => {
                        const updatedKb = JSON.parse(JSON.stringify(prevKb));
                        if (!updatedKb.pageSummaries) updatedKb.pageSummaries = {};
                        updatedKb.pageSummaries[pageToSummarize] = summary;
                        updatedKb.lastSummarizedTurn = finalKb.playerStats.turn -1; 
                        
                        if (!updatedKb.currentPageHistory.includes(finalKb.playerStats.turn)) {
                            updatedKb.currentPageHistory.push(finalKb.playerStats.turn);
                        }
                        return updatedKb;
                    });
                    setCurrentPageDisplay(pageToSummarize + 1);
                    addRawMessage('page_summary', `${VIETNAMESE.pageSummaryTitle(pageToSummarize)}: ${summary}`, finalKb.playerStats.turn -1); 
                } catch (summaryError) {
                    console.error("Error summarizing page:", summaryError);
                     addRawMessage('error', `Lỗi tóm tắt trang ${pageToSummarize}. Tiếp tục không có tóm tắt.`, finalKb.playerStats.turn);
                     setKnowledgeBase(prevKb => { 
                        const updatedKb = JSON.parse(JSON.stringify(prevKb));
                        if (!updatedKb.currentPageHistory.includes(finalKb.playerStats.turn)) {
                            updatedKb.currentPageHistory.push(finalKb.playerStats.turn);
                        }
                        return updatedKb;
                    });
                     setCurrentPageDisplay(pageToSummarize + 1);
                } finally {
                    setIsSummarizingNextPageTransition(false);
                }
            } else {
                 if (!finalKb.currentPageHistory.includes(finalKb.playerStats.turn)) {
                    finalKb.currentPageHistory.push(finalKb.playerStats.turn);
                    setKnowledgeBase(finalKb); 
                 }
                 setCurrentPageDisplay(pageToSummarize + 1);
            }
        }


    } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        console.error(err);
    } finally {
        setIsLoading(false);
    }
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
    try {
        let gameData: SaveGameData | null = null;
        if (storageSettings.storageType === 'cloud') {
            if (!firebaseUser) throw new Error(VIETNAMESE.signInRequiredForLoad);
            gameData = await loadSpecificGameFromFirestore(firebaseUser.uid, saveId);
        } else {
            gameData = await loadSpecificGameFromIndexedDB(saveId);
        }

        if (gameData) {
            setKnowledgeBase(gameData.knowledgeBase);
            setGameMessages(gameData.gameMessages);
            setRawAiResponsesLog([]); 
            setSentPromptsLog([]);
            setLatestPromptTokenCount(null);
            
            const loadedTotalPages = Math.max(1, gameData.knowledgeBase.currentPageHistory?.length || 1);
            setCurrentPageDisplay(loadedTotalPages); 

            const loadedKb = gameData.knowledgeBase;
            const requiredSummariesUpTo = (loadedKb.currentPageHistory?.length || 1) -1;
            let missingSummaryFound = false;
            for (let i = 1; i <= requiredSummariesUpTo; i++) {
                if (!loadedKb.pageSummaries?.[i]) {
                    missingSummaryFound = true;
                    break;
                }
            }

            if(missingSummaryFound) {
                setIsSummarizingOnLoad(true);
                addRawMessage('system', VIETNAMESE.creatingMissingSummary, loadedKb.playerStats.turn);
                let tempKb = JSON.parse(JSON.stringify(loadedKb));

                for (let pageNum = 1; pageNum <= requiredSummariesUpTo; pageNum++) {
                    if (!tempKb.pageSummaries?.[pageNum]) {
                         const messagesForSummary = getMessagesForPage(pageNum, tempKb, gameData.gameMessages);
                         if (messagesForSummary.length > 0) {
                            try {
                                const summary = await summarizeTurnHistory(
                                    messagesForSummary,
                                    tempKb.worldConfig?.theme || "Không rõ",
                                    tempKb.worldConfig?.playerName || "Người chơi"
                                );
                                if (!tempKb.pageSummaries) tempKb.pageSummaries = {};
                                tempKb.pageSummaries[pageNum] = summary;
                            } catch (summaryError) {
                                console.error(`Error re-summarizing page ${pageNum} on load:`, summaryError);
                            }
                         }
                    }
                }
                setKnowledgeBase(tempKb); 
                setIsSummarizingOnLoad(false);
            }


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
        if (isLoading) { 
            showNotification("Không thể lùi lượt khi AI đang xử lý. Nút dừng nên được vô hiệu hóa.", 'warning');
            return;
        }

        if (knowledgeBase.turnHistory && knowledgeBase.turnHistory.length > 0) {
            if (knowledgeBase.playerStats.turn === 1 && knowledgeBase.turnHistory.length === 1 && knowledgeBase.turnHistory[0].knowledgeBaseSnapshot.playerStats.turn === 0) {
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
                  setCurrentPageDisplay(1);
                  setIsAutoPlaying(false);
                  setMessageIdBeingEdited(null); // Reset edit state on quit
                }}
                rawAiResponsesLog={rawAiResponsesLog}
                sentPromptsLog={sentPromptsLog}
                latestPromptTokenCount={latestPromptTokenCount}
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
                onToggleAutoPlay={() => setIsAutoPlaying(prev => !prev)}
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
