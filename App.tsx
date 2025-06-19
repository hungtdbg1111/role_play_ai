

import React, { useState, useEffect, useCallback } from 'react';
import { GameScreen, KnowledgeBase, GameMessage, WorldSettings, PlayerStats, Item, Skill, Quest, NPC, GameLocation, ParsedAiResponse, AiChoice, QuestObjective, Companion, WorldLoreEntry, ApiConfig, FirebaseUser, SaveGameData, PlayerActionInputType, ResponseLength } from './types';
import InitialScreen from './components/InitialScreen';
import GameSetupScreen from './components/GameSetupScreen';
import GameplayScreen from './components/GameplayScreen';
import ApiSettingsScreen from './components/ApiSettingsScreen';
import LoadGameScreen from './components/LoadGameScreen'; 
import Spinner from './components/ui/Spinner';
import Button from './components/ui/Button'; 
import { INITIAL_KNOWLEDGE_BASE, VIETNAMESE, DEFAULT_PLAYER_STATS, APP_VERSION } from './constants';
import { generateInitialStory, generateNextTurn, getApiSettings } from './services/geminiService';
import { 
  initFirebase, 
  onAuthUserChanged, 
  signInUserAnonymously, 
  signOutUser,
  saveGameToFirestore,
  loadSpecificGameFromFirestore
} from './services/firebaseService';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.Initial);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(INITIAL_KNOWLEDGE_BASE);
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null);
  const [rawAiResponsesLog, setRawAiResponsesLog] = useState<string[]>([]);
  
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseLoading, setIsFirebaseLoading] = useState<boolean>(true);
  const [isSavingGame, setIsSavingGame] = useState<boolean>(false); 
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);


  useEffect(() => {
    const initializeAppServices = async () => {
      setIsFirebaseLoading(true);
      try {
        await initFirebase(); 

        const unsubscribe = onAuthUserChanged(async (user) => {
          if (user) {
            setFirebaseUser(user);
            setIsFirebaseLoading(false); 
          } else {
            try {
                const anonUser = await signInUserAnonymously();
                setFirebaseUser(anonUser);
            } catch (e) {
                console.error("Anonymous sign-in failed on initial load:", e);
                setError("Lỗi đăng nhập vào hệ thống lưu trữ.");
                showNotification("Lỗi đăng nhập vào hệ thống lưu trữ.", 'error');
            } finally {
                setIsFirebaseLoading(false); 
            }
          }
        });
        return () => unsubscribe(); 
      } catch (initError) {
        console.error("Critical: Failed to initialize Firebase services.", initError);
        const firebaseErrorMsg = `Lỗi nghiêm trọng: Không thể khởi tạo dịch vụ Firebase (${initError instanceof Error ? initError.message : String(initError)}). Một số tính năng sẽ không hoạt động. Vui lòng kiểm tra file firebaseconfig.json và kết nối mạng.`;
        setError(firebaseErrorMsg);
        showNotification(firebaseErrorMsg, 'error');
        setIsFirebaseLoading(false); 
      }
    };

    initializeAppServices();
  }, []);
  
  const showNotification = useCallback((message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), type === 'error' ? 6000 : 3000); 
  }, []);


  const addMessage = useCallback((type: GameMessage['type'], content: string, choices?: AiChoice[], isPlayerInput?: boolean) => {
    setGameMessages(prev => [...prev, { id: Date.now().toString() + Math.random().toString(36).substr(2, 9), type, content, timestamp: Date.now(), choices, isPlayerInput }]);
  }, []);

  const parseTagValue = useCallback((tagValue: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const paramRegex = /(\w+)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^,]*?)(?=\s*,\s*\w+\s*=|$))/g;
  
    let match;
    while ((match = paramRegex.exec(tagValue)) !== null) {
      const key = match[1].trim().toLowerCase();
      let value = match[2] !== undefined ? match[2] : 
                  match[3] !== undefined ? match[3] : 
                  match[4] !== undefined ? match[4].trim() : '';
      
      value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
      
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
      }
      
      result[key] = value;
    }
    return result;
  }, []);


  const processTags = useCallback((tags: string[]) => {
    if (!tags || tags.length === 0) return;

    setKnowledgeBase(prevKb => {
      const newKb: KnowledgeBase = {
        ...prevKb,
        playerStats: { ...prevKb.playerStats },
        inventory: prevKb.inventory.map(item => ({ ...item })),
        playerSkills: prevKb.playerSkills.map(skill => ({ ...skill })),
        allQuests: prevKb.allQuests.map(quest => ({ 
          ...quest, 
          objectives: quest.objectives.map(obj => ({ ...obj })) 
        })),
        discoveredNPCs: prevKb.discoveredNPCs.map(npc => ({ ...npc })),
        discoveredLocations: prevKb.discoveredLocations.map(loc => ({ ...loc })),
        realmProgressionList: [...prevKb.realmProgressionList],
        worldConfig: prevKb.worldConfig ? { ...prevKb.worldConfig } : null,
        companions: prevKb.companions.map(comp => ({ ...comp })),
        worldLore: prevKb.worldLore.map(lore => ({ ...lore })),
      };

      const newRawLogs: string[] = [];

      tags.forEach(tag => {
        const match = tag.match(/\[(.*?):\s*(.*)\]$/s); 

        if (!match || !match[1] || match[2] === undefined) {
             const simpleMatch = tag.match(/\[(.*?)\]/);
            if (simpleMatch && simpleMatch[1] && !simpleMatch[1].includes(':')) { 
            } else {
                console.warn("Could not parse tag structure:", tag);
            }
            return;
        }

        const tagName = match[1].trim().toUpperCase(); 
        const tagFullValue = match[2].trim(); 
        
        if (tagName === 'DEBUG_RAW_AI_RESPONSE' || tagName === 'DEBUG_ERROR_DETAILS') {
            newRawLogs.push(`[${tagName}]: ${tagFullValue}`);
        }
        
        const tagParams = parseTagValue(tagFullValue);
        
        try {
            switch (tagName) {
            case 'DEBUG_RAW_AI_RESPONSE':
            case 'DEBUG_SYSTEM_COMMANDS':
            case 'DEBUG_RAW_AI_RESPONSE_ON_ERROR':
            case 'DEBUG_ERROR_DETAILS':
                console.debug(`Debug Tag Processed: [${tagName}]`);
                break;
            case 'PLAYER_STATS_INIT':
            case 'STATS_UPDATE':
                const statsUpdates: Partial<PlayerStats> = {};
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
                break;
            
            case 'ITEM_ACQUIRED':
                if (tagParams.name && tagParams.type && tagParams.description) {
                    const existingItemIndex = newKb.inventory.findIndex(i => i.name === tagParams.name);
                    const quantity = parseInt(tagParams.quantity || "1", 10);
                    if (isNaN(quantity) || quantity < 1) {
                        console.warn(`Invalid quantity for ITEM_ACQUIRED: ${tagParams.quantity}`);
                        break; 
                    }

                    if (existingItemIndex > -1) {
                        newKb.inventory[existingItemIndex].quantity += quantity;
                    } else {
                        const newItem: Item = {
                            id: Date.now().toString() + tagParams.name,
                            name: tagParams.name,
                            type: tagParams.type,
                            description: tagParams.description,
                            quantity: quantity,
                        };

                        if (tagParams.effect !== undefined) {
                            newItem.effect = tagParams.effect;
                        }
                        if (tagParams.usable !== undefined) {
                            newItem.usable = tagParams.usable.toLowerCase() === 'true';
                        }
                        if (tagParams.consumable !== undefined) {
                            newItem.consumable = tagParams.consumable.toLowerCase() === 'true';
                        }
                        if (tagParams.slot !== undefined) {
                            newItem.slot = tagParams.slot;
                        }
                        newKb.inventory.push(newItem);
                    }
                } else {
                    console.warn("ITEM_ACQUIRED tag missing required params (name, type, or description):", tagParams);
                }
                break;

            case 'ITEM_CONSUMED':
                if (tagParams.name) {
                    const itemIndex = newKb.inventory.findIndex(i => i.name === tagParams.name);
                    if (itemIndex > -1) {
                        const quantityToConsume = parseInt(tagParams.quantity || "1", 10);
                         if (isNaN(quantityToConsume) || quantityToConsume < 1) {
                            console.warn(`Invalid quantity for ITEM_CONSUMED: ${tagParams.quantity}`);
                            break;
                        }
                        newKb.inventory[itemIndex].quantity -= quantityToConsume;
                        if (newKb.inventory[itemIndex].quantity <= 0) {
                            newKb.inventory.splice(itemIndex, 1); 
                        }
                    } else {
                        console.warn(`Attempted to consume non-existent item: ${tagParams.name}`);
                    }
                }
                break;
            
            case 'SKILL_LEARNED':
                if (tagParams.name && tagParams.type && tagParams.description && tagParams.effect) {
                    if (!newKb.playerSkills.find(s => s.name === tagParams.name)) {
                        const newSkill: Skill = {
                            id: Date.now().toString() + tagParams.name,
                            name: tagParams.name,
                            type: tagParams.type,
                            description: tagParams.description,
                            effect: tagParams.effect,
                            currentCooldown: 0, 
                        };

                        if (tagParams.manacost !== undefined) {
                            const manaCost = parseInt(tagParams.manacost, 10);
                            if (!isNaN(manaCost)) {
                                newSkill.manaCost = manaCost;
                            }
                        }
                        if (tagParams.cooldown !== undefined) {
                            const cooldown = parseInt(tagParams.cooldown, 10);
                            if (!isNaN(cooldown)) {
                                newSkill.cooldown = cooldown;
                            }
                        }
                        newKb.playerSkills.push(newSkill);
                    } else {
                         addMessage('system', `Bạn đã biết kỹ năng "${tagParams.name}" rồi.`);
                    }
                } else {
                     console.warn("SKILL_LEARNED tag missing required params (name, type, description, or effect):", tagParams);
                }
                break;
            case 'REALM_LIST':
                newKb.realmProgressionList = tagFullValue.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
                break;
            case 'MESSAGE':
                 addMessage('system', tagParams.message || tagFullValue.replace(/^"|"$/g, '')); 
                 break;
            
            case 'LORE_NPC':
                if (tagParams.name) {
                    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === tagParams.name);
                    const npcDataToUpdate: Partial<NPC> = {}; 

                    if (tagParams.description !== undefined) {
                        npcDataToUpdate.description = tagParams.description;
                    }
                    if (tagParams.hp !== undefined) {
                        const parsedHp = parseInt(tagParams.hp, 10);
                        if (!isNaN(parsedHp)) npcDataToUpdate.hp = parsedHp;
                    }
                    if (tagParams.atk !== undefined) {
                        const parsedAtk = parseInt(tagParams.atk, 10);
                        if (!isNaN(parsedAtk)) npcDataToUpdate.atk = parsedAtk;
                    }
                    
                    if (existingNpcIndex > -1) {
                         newKb.discoveredNPCs[existingNpcIndex] = { 
                           ...newKb.discoveredNPCs[existingNpcIndex], 
                           ...npcDataToUpdate 
                         };
                         if (newKb.discoveredNPCs[existingNpcIndex].description === undefined) {
                             newKb.discoveredNPCs[existingNpcIndex].description = "Chưa có thông tin.";
                         }
                    } else {
                        const newNpc: NPC = {
                            id: Date.now().toString() + tagParams.name,
                            name: tagParams.name,
                            description: npcDataToUpdate.description !== undefined ? npcDataToUpdate.description : "Chưa có thông tin.",
                        };
                        if (npcDataToUpdate.hp !== undefined) newNpc.hp = npcDataToUpdate.hp;
                        if (npcDataToUpdate.atk !== undefined) newNpc.atk = npcDataToUpdate.atk;
                        newKb.discoveredNPCs.push(newNpc);
                    }
                }
                break;
            case 'LORE_LOCATION':
                 if (tagParams.name) {
                    const existingLocIndex = newKb.discoveredLocations.findIndex(l => l.name === tagParams.name);
                     if (existingLocIndex > -1) {
                        if (tagParams.description !== undefined) newKb.discoveredLocations[existingLocIndex].description = tagParams.description;
                        else newKb.discoveredLocations[existingLocIndex].description = "Một nơi bí ẩn."; 
                    } else {
                        newKb.discoveredLocations.push({
                            id: Date.now().toString() + tagParams.name,
                            name: tagParams.name,
                            description: tagParams.description !== undefined ? tagParams.description : "Một nơi bí ẩn.",
                        });
                    }
                }
                break;
            case 'QUEST_ASSIGNED':
                if (tagParams.title && tagParams.description && tagParams.objectives) {
                    const objectivesTexts = tagParams.objectives.split('|').map((objText: string) => objText.trim());
                    const newObjectives: QuestObjective[] = objectivesTexts.map((text, index) => ({
                        id: `${Date.now()}-${tagParams.title}-obj-${index}`,
                        text: text,
                        completed: false,
                    }));
                    if (!newKb.allQuests.find(q => q.title === tagParams.title)) {
                        newKb.allQuests.push({
                            id: Date.now().toString() + tagParams.title,
                            title: tagParams.title,
                            description: tagParams.description,
                            status: 'active',
                            objectives: newObjectives,
                        });
                        addMessage('system', `Nhiệm vụ mới: ${tagParams.title}`);
                    }
                }
                break;

            case 'QUEST_UPDATED':
                if (tagParams.title && tagParams.objectivetext) {
                    const questIndex = newKb.allQuests.findIndex(q => q.title === tagParams.title && q.status === 'active');
                    if (questIndex > -1) {
                        const objectiveIndex = newKb.allQuests[questIndex].objectives.findIndex(obj => obj.text === tagParams.objectivetext);
                        if (objectiveIndex > -1) {
                            newKb.allQuests[questIndex].objectives[objectiveIndex].completed = (tagParams.completed === 'true');
                            addMessage('system', `Cập nhật nhiệm vụ "${tagParams.title}": Mục tiêu "${tagParams.objectivetext}" đã ${tagParams.completed === 'true' ? 'hoàn thành' : 'chưa hoàn thành'}.`);

                            const allObjectivesCompleted = newKb.allQuests[questIndex].objectives.every(obj => obj.completed);
                            if (allObjectivesCompleted) {
                                newKb.allQuests[questIndex].status = 'completed';
                                addMessage('system', `Hoàn thành nhiệm vụ: ${newKb.allQuests[questIndex].title}!`);
                            }
                        } else {
                             addMessage('system', `Không tìm thấy mục tiêu "${tagParams.objectivetext}" trong nhiệm vụ "${tagParams.title}".`);
                        }
                    }
                }
                break;

            case 'QUEST_COMPLETED':
                if (tagParams.title) {
                    const questIndex = newKb.allQuests.findIndex(q => q.title === tagParams.title && q.status === 'active');
                    if (questIndex > -1) {
                        newKb.allQuests[questIndex].status = 'completed';
                        newKb.allQuests[questIndex].objectives.forEach(obj => obj.completed = true);
                        addMessage('system', `Hoàn thành nhiệm vụ: ${tagParams.title}!`);
                    }
                }
                break;

            case 'QUEST_FAILED':
                if (tagParams.title) {
                    const questIndex = newKb.allQuests.findIndex(q => q.title === tagParams.title && q.status === 'active');
                    if (questIndex > -1) {
                        newKb.allQuests[questIndex].status = 'failed';
                        addMessage('system', `Nhiệm vụ thất bại: ${tagParams.title}.`);
                    }
                }
                break;
            
            case 'COMPANION_JOIN':
                if (tagParams.name && tagParams.description && 
                    tagParams.hp !== undefined && tagParams.maxhp !== undefined && 
                    tagParams.mana !== undefined && tagParams.maxmana !== undefined && tagParams.atk !== undefined) {
                    
                    const hp = parseInt(tagParams.hp, 10);
                    const maxHp = parseInt(tagParams.maxhp, 10);
                    const mana = parseInt(tagParams.mana, 10);
                    const maxMana = parseInt(tagParams.maxmana, 10);
                    const atk = parseInt(tagParams.atk, 10);

                    if ([hp, maxHp, mana, maxMana, atk].some(isNaN)) {
                        console.warn("COMPANION_JOIN received NaN for numeric stats:", tagParams);
                        break;
                    }

                    if (!newKb.companions.find(c => c.name === tagParams.name)) {
                        newKb.companions.push({
                            id: Date.now().toString() + tagParams.name,
                            name: tagParams.name,
                            description: tagParams.description,
                            hp: hp,
                            maxHp: maxHp,
                            mana: mana,
                            maxMana: maxMana,
                            atk: atk,
                        });
                        addMessage('system', `${tagParams.name} đã gia nhập đội của bạn!`);
                    }
                } else {
                     console.warn("COMPANION_JOIN tag missing required params or numeric values are undefined:", tagParams);
                }
                break;
            case 'COMPANION_LEAVE':
                if (tagParams.name) {
                    const companionIndex = newKb.companions.findIndex(c => c.name === tagParams.name);
                    if (companionIndex > -1) {
                        addMessage('system', `${newKb.companions[companionIndex].name} đã rời khỏi đội.`);
                        newKb.companions.splice(companionIndex, 1);
                    }
                }
                break;
            case 'COMPANION_STATS_UPDATE':
                if (tagParams.name) {
                    const compIndex = newKb.companions.findIndex(c => c.name === tagParams.name);
                    if (compIndex > -1) {
                        const companion = newKb.companions[compIndex];
                        let changed = false;
                        for (const key of ['hp', 'mana', 'atk', 'maxhp', 'maxmana'] as const) { 
                            if (tagParams[key] !== undefined) { 
                                const valueStr = tagParams[key];
                                let newValue: number;
                                if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                                    newValue = (companion[key as keyof Omit<Companion, 'id'|'name'|'description'>] || 0) + parseInt(valueStr, 10);
                                } else {
                                    newValue = parseInt(valueStr, 10);
                                }
                                if (!isNaN(newValue)) { 
                                    (companion as any)[key] = newValue;
                                    changed = true;
                                }
                            }
                        }
                        if (changed) {
                             if (companion.maxHp !== undefined) companion.hp = Math.max(0, Math.min(companion.hp, companion.maxHp));
                             else companion.hp = Math.max(0, companion.hp); 
                             
                             if (companion.maxMana !== undefined) companion.mana = Math.max(0, Math.min(companion.mana, companion.maxMana));
                             else companion.mana = Math.max(0, companion.mana);

                             addMessage('system', `Chỉ số của ${companion.name} đã được cập nhật.`);
                        }
                    }
                }
                break;
            case 'WORLD_LORE_ADD':
                if (tagParams.title && tagParams.content) {
                    if (!newKb.worldLore.find(l => l.title === tagParams.title)) {
                        newKb.worldLore.push({
                            id: Date.now().toString() + tagParams.title,
                            title: tagParams.title,
                            content: tagParams.content,
                        });
                         addMessage('system', `Bạn đã khám phá ra tri thức mới: "${tagParams.title}".`);
                    }
                }
                break;
            }
        } catch (e) {
            console.error(`Error processing tag: ${tag}`, e);
            addMessage('error', `Lỗi xử lý tag AI: ${tag}. Chi tiết: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
      
      if (newRawLogs.length > 0) {
        setRawAiResponsesLog(prevLog => [...prevLog, ...newRawLogs].slice(-50)); 
      }

      while (newKb.playerStats.exp >= newKb.playerStats.maxExp) {
        const oldMaxExp = newKb.playerStats.maxExp;
        
        newKb.playerStats.level += 1;
        newKb.playerStats.exp -= oldMaxExp; 

        newKb.playerStats.maxExp = Math.floor(oldMaxExp * 1.5) + 50 * newKb.playerStats.level;
        newKb.playerStats.maxHp += (15 + Math.floor(newKb.playerStats.level * 2.5));
        newKb.playerStats.maxMana += (8 + Math.floor(newKb.playerStats.level * 1.5));
        newKb.playerStats.atk += (1 + Math.floor(newKb.playerStats.level * 0.3));
        
        newKb.playerStats.hp = newKb.playerStats.maxHp;
        newKb.playerStats.mana = newKb.playerStats.maxMana;

        const currentRealmIndex = newKb.realmProgressionList.indexOf(newKb.playerStats.realm);
        if (newKb.playerStats.level % 5 === 0 && currentRealmIndex < newKb.realmProgressionList.length - 1) {
            newKb.playerStats.realm = newKb.realmProgressionList[currentRealmIndex + 1];
            addMessage('system', `Chúc mừng! Bạn đã đột phá cảnh giới, tiến vào ${newKb.playerStats.realm}! Sức mạnh tăng vọt!`);
            newKb.playerStats.maxHp += 50 * (currentRealmIndex + 1);
            newKb.playerStats.maxMana += 25 * (currentRealmIndex + 1);
            newKb.playerStats.atk += 5 * (currentRealmIndex + 1);
            newKb.playerStats.hp = newKb.playerStats.maxHp;
            newKb.playerStats.mana = newKb.playerStats.maxMana;
        } else {
             addMessage('system', `Chúc mừng! Bạn đã đạt đến cấp độ ${newKb.playerStats.level}!`);
        }
      }

      newKb.playerStats.hp = Math.max(0, Math.min(newKb.playerStats.hp, newKb.playerStats.maxHp));
      newKb.playerStats.mana = Math.max(0, Math.min(newKb.playerStats.mana, newKb.playerStats.maxMana));

      return newKb;
    });
  }, [addMessage, parseTagValue]);


  const handleAiResponse = useCallback((response: ParsedAiResponse) => {
    processTags(response.tags); 
    
    if (response.narration) {
      addMessage('narration', response.narration, response.choices);
    }
    if (response.systemMessage && !response.tags.some(t => t.toUpperCase().includes("[MESSAGE:"))) {
      addMessage('system', response.systemMessage);
    }

  }, [processTags, addMessage]); 


  const checkApiKeyAndSetError = useCallback(() => {
    const { apiKeySource, userApiKey } = getApiSettings();
    // Only show API key missing error if user has explicitly chosen to use their own key and it's not provided.
    // If 'system' is chosen, we assume process.env.API_KEY is handled, and errors will surface during API calls.
    if (apiKeySource === 'user' && !userApiKey.trim()) {
      const apiKeyErrorMsg = VIETNAMESE.apiKeyMissing;
      setError(apiKeyErrorMsg);
      if (!gameMessages.some(msg => msg.content === apiKeyErrorMsg && msg.type === 'error')) {
        if (currentScreen === GameScreen.Gameplay && isLoading && gameMessages.length === 0) {
            // GameplayScreen might handle its own initial loading message
        } else if (currentScreen !== GameScreen.ApiSettings) {
             addMessage('error', apiKeyErrorMsg);
        }
      }
      return false;
    }
    setError(null); // Clear previous API key specific errors
    return true;
  }, [addMessage, gameMessages, currentScreen, isLoading]);


  useEffect(() => {
    // Avoid checking API key during Firebase init or if there's a critical Firebase error.
    // Also, don't check on ApiSettingsScreen itself, as user is there to configure it.
    if (currentScreen !== GameScreen.ApiSettings && !isFirebaseLoading && !error?.startsWith("Lỗi nghiêm trọng: Không thể khởi tạo dịch vụ Firebase")) {
      checkApiKeyAndSetError();
    }
  }, [currentScreen, checkApiKeyAndSetError, isFirebaseLoading, error]);


  const startGame = useCallback(async (settings: WorldSettings) => {
    if (error?.startsWith("Lỗi nghiêm trọng: Không thể khởi tạo dịch vụ Firebase")) {
        showNotification(error, 'error');
        return;
    }
    if (!checkApiKeyAndSetError()) { // This now correctly checks based on apiKeySource
      setCurrentScreen(GameScreen.ApiSettings);
      const apiSettings = getApiSettings();
      const message = apiSettings.apiKeySource === 'user' ? VIETNAMESE.apiKeyMissing : VIETNAMESE.apiKeySystemUnavailable;
      showNotification("Không thể bắt đầu game. " + message, 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setRawAiResponsesLog([]); 
    setKnowledgeBase({
      ...INITIAL_KNOWLEDGE_BASE,
      playerStats: { ...DEFAULT_PLAYER_STATS, turn: 0 }, 
      worldConfig: settings,
      appVersion: APP_VERSION, 
    });
    setGameMessages([]); 
    addMessage('system', VIETNAMESE.generatingStory);

    try {
      const response = await generateInitialStory(settings);
      handleAiResponse(response);
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : "Lỗi không xác định khi bắt đầu game.";
      setError(errorMsg); // Set general error state
      addMessage('error', errorMsg);
      showNotification(errorMsg, 'error'); // Show as notification
      // If error message indicates an API key problem (user or system), redirect to API settings
      if (errorMsg.includes(VIETNAMESE.apiKeyMissing) || errorMsg.includes(VIETNAMESE.apiKeySystemUnavailable)) {
         setCurrentScreen(GameScreen.ApiSettings);
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleAiResponse, addMessage, checkApiKeyAndSetError, showNotification, error]);

  const handlePlayerAction = useCallback(async (actionText: string, isChoice: boolean = false, inputType: PlayerActionInputType = 'action', responseLength: ResponseLength = 'default') => {
    if (error?.startsWith("Lỗi nghiêm trọng: Không thể khởi tạo dịch vụ Firebase")) {
        showNotification(error, 'error');
        return;
    }
    if (!checkApiKeyAndSetError()) {
      const apiSettings = getApiSettings();
      const message = apiSettings.apiKeySource === 'user' ? VIETNAMESE.apiKeyMissing : VIETNAMESE.apiKeySystemUnavailable;
      showNotification(message, 'error');
      return;
    }
    if (!knowledgeBase.worldConfig) {
        addMessage('error', "Lỗi: WorldConfig không tồn tại. Không thể tiếp tục.");
        showNotification("Lỗi: WorldConfig không tồn tại.", 'error');
        return;
    }
    setIsLoading(true);
    setError(null);
    addMessage(isChoice ? 'player_action' : 'player_action', actionText, undefined, true); 

    try {
      const currentKnowledgeBase = knowledgeBase; 
      const response = await generateNextTurn(currentKnowledgeBase, actionText, inputType, responseLength);
      handleAiResponse(response);
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : "Lỗi không xác định khi xử lý hành động.";
      setError(errorMsg);
      addMessage('error', errorMsg);
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [knowledgeBase, handleAiResponse, addMessage, checkApiKeyAndSetError, showNotification, error]);

  const handleQuitGame = () => {
    setCurrentScreen(GameScreen.Initial);
    const initialKbClone = JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE));
    setKnowledgeBase({...initialKbClone, appVersion: APP_VERSION});
    setGameMessages([]);
    setRawAiResponsesLog([]);
    setError(null); 
  };
  
  const onApiSettingsSaved = () => {
    checkApiKeyAndSetError(); 
    setCurrentScreen(GameScreen.Initial); 
    showNotification(VIETNAMESE.settingsSavedMessage, 'success');
  };

  const handleSignOut = async () => {
    if (error?.startsWith("Lỗi nghiêm trọng: Không thể khởi tạo dịch vụ Firebase")) {
        showNotification("Không thể đăng xuất do lỗi Firebase.", 'error');
        return;
    }
    setIsFirebaseLoading(true);
    await signOutUser();
    setFirebaseUser(null); 
    try {
        const anonUser = await signInUserAnonymously();
        setFirebaseUser(anonUser);
    } catch (e) {
        console.error("Anonymous sign-in failed after sign out:", e);
        setError("Lỗi đăng nhập lại vào hệ thống lưu trữ.");
        showNotification("Lỗi đăng nhập lại.", 'error');
    } finally {
        setIsFirebaseLoading(false);
        setCurrentScreen(GameScreen.Initial); 
    }
  };

  const handleSaveGame = async () => {
    if (error?.startsWith("Lỗi nghiêm trọng: Không thể khởi tạo dịch vụ Firebase")) {
        showNotification("Không thể lưu game do lỗi Firebase.", 'error');
        return;
    }
    if (!firebaseUser) {
      showNotification(VIETNAMESE.signInRequiredForSave, 'error');
      return;
    }
    if (!knowledgeBase.worldConfig) {
      showNotification("Không có dữ liệu game để lưu.", 'error');
      return;
    }
    setIsSavingGame(true);
    try {
      const kbToSave = { ...knowledgeBase, appVersion: APP_VERSION };
      await saveGameToFirestore(firebaseUser.uid, kbToSave, gameMessages);
      showNotification(VIETNAMESE.gameSavedSuccess, 'success');
    } catch (e) {
      console.error("Error saving game:", e);
      showNotification(VIETNAMESE.errorSavingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
    } finally {
      setIsSavingGame(false);
    }
  };

  const handleLoadSelectedGame = async (saveId: string) => {
    if (error?.startsWith("Lỗi nghiêm trọng: Không thể khởi tạo dịch vụ Firebase")) {
        showNotification("Không thể tải game do lỗi Firebase.", 'error');
        return;
    }
    if (!firebaseUser) {
      showNotification(VIETNAMESE.signInRequiredForLoad, 'error');
      setCurrentScreen(GameScreen.Initial); 
      return;
    }
    setIsLoading(true); 
    try {
      const loadedData = await loadSpecificGameFromFirestore(firebaseUser.uid, saveId);
      if (loadedData) {
        setKnowledgeBase(loadedData.knowledgeBase);
        setGameMessages(loadedData.gameMessages);
        setRawAiResponsesLog([]); 
        setCurrentScreen(GameScreen.Gameplay);
        showNotification(VIETNAMESE.gameLoadedSuccess, 'success');
        setError(null); 
      } else {
        showNotification(VIETNAMESE.errorLoadingGame + ": Không tìm thấy file lưu.", 'error');
        setCurrentScreen(GameScreen.LoadGameSelection); 
      }
    } catch (e) {
      console.error(`Error loading game data for save ID ${saveId}:`, e);
      showNotification(VIETNAMESE.errorLoadingGame + (e instanceof Error ? `: ${e.message}` : ''), 'error');
      setCurrentScreen(GameScreen.LoadGameSelection); 
    } finally {
      setIsLoading(false);
    }
  };

  const renderNotification = () => {
    if (!notification) return null;
    return (
      <div 
        className={`fixed top-5 right-5 p-4 rounded-md shadow-lg text-white z-50
                    ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}
                    transition-all duration-300 ease-in-out transform animate-fadeInOut`}
        style={{maxWidth: 'calc(100% - 40px)'}}
      >
        <style>{`
          @keyframes fadeInOut {
            0% { opacity: 0; transform: translateY(-20px); }
            10%, 90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-20px); }
          }
          .animate-fadeInOut {
            animation: fadeInOut ${notification.type === 'error' ? '6s' : '3s'} forwards;
          }
        `}</style>
        {notification.message}
      </div>
    );
  };

  const renderGlobalError = () => {
    if (!error || notification?.message === error) return null; 
    return (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-red-800 text-white text-sm text-center z-50">
            {error}
            {error.includes("firebaseconfig.json") && 
              <button 
                onClick={() => {
                  setCurrentScreen(GameScreen.Initial);
                  window.location.reload(); 
                }}
                className="ml-2 underline hover:text-red-200"
              >
                Thử lại
              </button>
            }
        </div>
    );
  };
  
  if (isFirebaseLoading && currentScreen === GameScreen.Initial) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
        {renderNotification()}
        <Spinner text={VIETNAMESE.signingInAnonymously} size="lg" />
         {error && <p className="text-red-400 mt-4 text-sm max-w-md">{error}</p>}
      </div>
    );
  }
  
  switch (currentScreen) {
    case GameScreen.Initial:
      return (
        <>
          {renderNotification()}
          {renderGlobalError()}
          <InitialScreen 
            setCurrentScreen={setCurrentScreen} 
            firebaseUser={firebaseUser}
            onSignOut={handleSignOut}
            isFirebaseLoading={isFirebaseLoading}
          />
        </>
      );
    case GameScreen.GameSetup:
      return (
        <>
          {renderNotification()}
          {renderGlobalError()}
          <GameSetupScreen setCurrentScreen={setCurrentScreen} onSetupComplete={startGame} />
        </>
      );
    case GameScreen.Gameplay:
      if (!knowledgeBase.worldConfig) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6 text-center">
                {renderNotification()}
                {renderGlobalError()}
                <Spinner text="Đang tải dữ liệu trò chơi..." size="lg" />
                <p className="text-red-500 mt-4">Lỗi: Cấu hình thế giới không tồn tại. Đang thử quay lại...</p>
                {/* {setTimeout(() => setCurrentScreen(GameScreen.Initial), 2000)} */}
            </div>
        );
      }
      return (
        <>
          {renderNotification()}
          {renderGlobalError()}
          <GameplayScreen
            knowledgeBase={knowledgeBase}
            gameMessages={gameMessages}
            isLoading={isLoading}
            onPlayerAction={handlePlayerAction}
            onQuit={handleQuitGame}
            rawAiResponsesLog={rawAiResponsesLog}
            firebaseUser={firebaseUser}
            onSaveGame={handleSaveGame}
            isSavingGame={isSavingGame}
          />
        </>
      );
    case GameScreen.ApiSettings:
      return (
        <>
          {renderNotification()}
          {renderGlobalError()}
          <ApiSettingsScreen 
            setCurrentScreen={setCurrentScreen} 
            onSettingsSaved={onApiSettingsSaved}
          />
        </>
      );
    case GameScreen.LoadGameSelection:
      if (!firebaseUser && !isFirebaseLoading) { 
        setCurrentScreen(GameScreen.Initial);
         showNotification(VIETNAMESE.signInRequiredForLoad, 'error');
        return (
          <>
           {renderNotification()}
           {renderGlobalError()}
           <Spinner text="Chuyển hướng..." />
          </>
        );
      }
       if (isFirebaseLoading) { 
        return (
           <>
            {renderNotification()}
            {renderGlobalError()}
            <Spinner text="Đang kiểm tra đăng nhập..." />
          </>
        );
      }
      return (
        <>
          {renderNotification()}
          {renderGlobalError()}
          <LoadGameScreen 
            setCurrentScreen={setCurrentScreen} 
            firebaseUser={firebaseUser!} 
            onLoadGame={handleLoadSelectedGame}
            notify={showNotification}
          />
        </>
      );
    default:
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-6">
          {renderNotification()}
          {renderGlobalError()}
          <p className="text-red-500">Lỗi: Màn hình không xác định.</p>
          <Button onClick={() => setCurrentScreen(GameScreen.Initial)} className="mt-4">
            Quay lại màn hình chính
          </Button>
        </div>
      );
  }
};

export default App;