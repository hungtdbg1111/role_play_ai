

import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold, CountTokensResponse } from "@google/genai";
import { KnowledgeBase, ParsedAiResponse, AiChoice, WorldSettings, ApiConfig, SafetySetting, PlayerActionInputType, ResponseLength, StartingSkill, StartingItem, StartingNPC, StartingLore, GameMessage, GeneratedWorldElements, StartingLocation, StartingFaction, PlayerStats, Item as ItemType, GenreType } from '../types'; 
import { PROMPT_TEMPLATES, VIETNAMESE, API_SETTINGS_STORAGE_KEY, DEFAULT_MODEL_ID, HARM_CATEGORIES, DEFAULT_API_CONFIG, MAX_TOKENS_FANFIC, ALL_FACTION_ALIGNMENTS, AVAILABLE_GENRES, CUSTOM_GENRE_VALUE, AVAILABLE_MODELS, AVAILABLE_IMAGE_MODELS, DEFAULT_IMAGE_MODEL_ID } from '../constants';
import * as GameTemplates from '../templates';
import { generateImageWithImagen3 } from './ImageGenerator'; 
import { generateImageWithGemini2Flash } from './imagegengemini2.0';

let ai: GoogleGenAI | null = null;
let lastUsedEffectiveApiKey: string | null = null;
let lastUsedApiKeySource: 'system' | 'user' | null = null;
let lastUsedModelForClient: string | null = null;

export const getApiSettings = (): ApiConfig => {
  const storedSettings = localStorage.getItem(API_SETTINGS_STORAGE_KEY);
  if (storedSettings) {
    try {
      const parsed = JSON.parse(storedSettings);

      const validSafetySettings =
        parsed.safetySettings &&
        Array.isArray(parsed.safetySettings) &&
        parsed.safetySettings.length === HARM_CATEGORIES.length &&
        parsed.safetySettings.every((setting: any) =>
          typeof setting.category === 'string' &&
          typeof setting.threshold === 'string' &&
          HARM_CATEGORIES.some(cat => cat.id === setting.category)
        );
      
      const modelExists = AVAILABLE_MODELS.some(m => m.id === parsed.model);
      const imageModelExists = AVAILABLE_IMAGE_MODELS.some(m => m.id === parsed.imageModel);


      return {
        apiKeySource: parsed.apiKeySource || DEFAULT_API_CONFIG.apiKeySource,
        userApiKey: parsed.userApiKey || '',
        model: modelExists ? parsed.model : DEFAULT_API_CONFIG.model,
        imageModel: imageModelExists ? parsed.imageModel : DEFAULT_API_CONFIG.imageModel,
        safetySettings: validSafetySettings ? parsed.safetySettings : DEFAULT_API_CONFIG.safetySettings,
        autoGenerateNpcAvatars: parsed.autoGenerateNpcAvatars === undefined ? DEFAULT_API_CONFIG.autoGenerateNpcAvatars : parsed.autoGenerateNpcAvatars,
      };
    } catch (e) {
      console.error("Failed to parse API settings from localStorage", e);
    }
  }
  return { ...DEFAULT_API_CONFIG }; 
};

const getAiClient = (): GoogleGenAI => {
  const settings = getApiSettings();
  let effectiveApiKey: string;

  if (settings.apiKeySource === 'system') {
    const systemApiKey = process.env.API_KEY; 

    if (typeof systemApiKey !== 'string' || systemApiKey.trim() === '') {
        console.error("System API Key is selected, but process.env.API_KEY is not available or empty.");
        throw new Error(VIETNAMESE.apiKeySystemUnavailable + " (API_KEY not found in environment)");
    }
    effectiveApiKey = systemApiKey;
  } else {
    if (!settings.userApiKey) {
      console.error("User API Key is selected but not configured. Please set it in API Settings.");
      throw new Error(VIETNAMESE.apiKeyMissing);
    }
    effectiveApiKey = settings.userApiKey;
  }

  if (!ai || lastUsedApiKeySource !== settings.apiKeySource || lastUsedEffectiveApiKey !== effectiveApiKey || lastUsedModelForClient !== settings.model) {
    try {
      ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      lastUsedEffectiveApiKey = effectiveApiKey;
      lastUsedApiKeySource = settings.apiKeySource;
      lastUsedModelForClient = settings.model; // Store last used model to re-init if model changes
    } catch (initError) {
        console.error("Failed to initialize GoogleGenAI client:", initError);
        if (settings.apiKeySource === 'system') {
            throw new Error(`${VIETNAMESE.apiKeySystemUnavailable} Details: ${initError instanceof Error ? initError.message : String(initError)} (Using system key: API_KEY)`);
        } else {
            throw new Error(`Lỗi khởi tạo API Key người dùng: ${initError instanceof Error ? initError.message : String(initError)}`);
        }
    }
  }
  return ai;
};

export const parseAiResponseText = (responseText: string): ParsedAiResponse => {
  let narration = responseText;
  const choices: AiChoice[] = [];
  const gameStateTags: string[] = [];
  let systemMessage: string | undefined;

  // STEP 0.A: Pre-filter lines that are ONLY backticks
  narration = narration
    .split('\n')
    .filter(line => !/^\s*`+\s*$/.test(line))
    .join('\n');

  // STEP 0.B: Pre-filter lines that are ONLY asterisks
  narration = narration
    .split('\n')
    .filter(line => !/^\s*\*+\s*$/.test(line)) // Remove lines like "****", " *** "
    .join('\n');

  // STEP 0.C: Pre-filter lines that are ONLY hyphens (Markdown HR)
  narration = narration
    .split('\n')
    .filter(line => !/^\s*-{3,}\s*$/.test(line)) // Remove lines like "---", " --- ", "----"
    .join('\n');

  // STEP 1: Extract and remove CHOICE lines (primarily for choices on their own lines)
  const lines = narration.split('\n');
  const remainingLinesForNarration: string[] = [];

  for (const line of lines) {
    let currentLineForChoiceParsing = line.trim();
    let choiceContent: string | null = null;

    const wrapperMatch = currentLineForChoiceParsing.match(/^(?:\s*(`{1,3}|\*{2,})\s*)(.*?)(\s*\1\s*)$/);
    if (wrapperMatch && wrapperMatch[2] && wrapperMatch[2].toUpperCase().includes("[CHOICE:")) {
        currentLineForChoiceParsing = wrapperMatch[2].trim(); 
    }
    
    const choiceTagMatch = currentLineForChoiceParsing.match(/^(?:\[CHOICE:\s*)(.*?)(\]?)?$/i);

    if (choiceTagMatch && choiceTagMatch[1]) {
      choiceContent = choiceTagMatch[1].trim();
      choiceContent = choiceContent.replace(/(\s*(?:`{1,3}|\*{2,})\s*)$/, "").trim();
      choiceContent = choiceContent.replace(/^["']|["']$/g, '');
      choiceContent = choiceContent.replace(/\\'/g, "'");
      choiceContent = choiceContent.replace(/\\(?![btnfrv'"\\])/g, "");
      choices.push({ text: choiceContent });
    } else {
      remainingLinesForNarration.push(line); 
    }
  }
  narration = remainingLinesForNarration.join('\n');
  
  // STEP 2: Find all remaining tags (including potentially embedded choices)
  const allTagsRegex = /\[(.*?)\]/g;
  const foundRawTags: {fullTag: string, content: string}[] = [];
  let tempMatch;
  
  while ((tempMatch = allTagsRegex.exec(narration)) !== null) {
      foundRawTags.push({fullTag: tempMatch[0], content: tempMatch[1].trim()});
  }

  // STEP 3: Process foundRawTags, remove them from narration, and extract embedded choices
  for (const tagInfo of foundRawTags) {
    const { fullTag, content } = tagInfo; 
    
    if (narration.includes(fullTag)) {
        narration = narration.replace(fullTag, ''); 
    }

    // Robustly get tag name (part before first colon) and value (part after)
    const colonIndex = content.indexOf(':');
    const tagNamePart = (colonIndex === -1 ? content : content.substring(0, colonIndex)).trim().toUpperCase();
    const tagValuePart = colonIndex === -1 ? "" : content.substring(colonIndex + 1).trim();

    if (tagNamePart === 'MESSAGE') {
      try {
        systemMessage = tagValuePart.replace(/^["']|["']$/g, '');
      } catch (e) { console.warn("Could not parse MESSAGE tag content:", content, e); }
    } else if (tagNamePart === 'CHOICE') {
      let choiceText = tagValuePart;
      // Clean choiceText (same logic as in Step 1 for consistency)
      choiceText = choiceText.replace(/(\s*(?:`{1,3}|\*{2,})\s*)$/, "").trim(); 
      choiceText = choiceText.replace(/^["']|["']$/g, ''); 
      choiceText = choiceText.replace(/\\'/g, "'"); 
      choiceText = choiceText.replace(/\\(?![btnfrv'"\\])/g, ""); 
      choices.push({ text: choiceText });
    } else if (!tagNamePart.startsWith('GENERATED_')) { 
      // Only add to gameStateTags if it's not MESSAGE, CHOICE, or GENERATED_
      gameStateTags.push(fullTag); 
    }
  }

  // STEP 4: Final cleanup of narration
  narration = narration.replace(/\\/g, ''); 
  narration = narration.replace(/`/g, '');   
  narration = narration.replace(/"/g, ''); // Remove all double quotes
  narration = narration.replace(/\*/g, ''); // Remove all asterisks


  narration = narration
    .split('\n')
    .filter(line => line.trim() !== '') 
    .join('\n');
  narration = narration.replace(/\n\s*\n/g, '\n').trim(); 

  return { narration, choices, tags: gameStateTags, systemMessage };
};


const parseTagParams = (paramString: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const paramRegex = /(\w+)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\{.*?\}|\[.*?\]|[^,]*?)(?=\s*,\s*\w+\s*=|$)))/g;
    let match;
    while ((match = paramRegex.exec(paramString)) !== null) {
        const key = match[1].trim();
        let value = match[2] !== undefined ? match[2].replace(/\\"/g, '"') :
                    match[3] !== undefined ? match[3].replace(/\\'/g, "'") :
                    match[4] !== undefined ? match[4].trim() : '';
        params[key] = value;
    }
    return params;
};


export const parseGeneratedWorldDetails = (responseText: string): GeneratedWorldElements => {
  const GWD_SKILL = 'GENERATED_SKILL:';
  const GWD_ITEM = 'GENERATED_ITEM:';
  const GWD_NPC = 'GENERATED_NPC:';
  const GWD_LORE = 'GENERATED_LORE:';
  const GWD_LOCATION = 'GENERATED_LOCATION:';
  const GWD_FACTION = 'GENERATED_FACTION:';
  const GWD_PLAYER_NAME = 'GENERATED_PLAYER_NAME:';
  const GWD_PLAYER_GENDER = 'GENERATED_PLAYER_GENDER:'; // New
  const GWD_PLAYER_PERSONALITY = 'GENERATED_PLAYER_PERSONALITY:';
  const GWD_PLAYER_BACKSTORY = 'GENERATED_PLAYER_BACKSTORY:';
  const GWD_PLAYER_GOAL = 'GENERATED_PLAYER_GOAL:';
  const GWD_PLAYER_STARTING_TRAITS = 'GENERATED_PLAYER_STARTING_TRAITS:';
  const GWD_PLAYER_AVATAR_URL = 'GENERATED_PLAYER_AVATAR_URL:'; 
  const GWD_WORLD_THEME = 'GENERATED_WORLD_THEME:';
  const GWD_WORLD_SETTING_DESCRIPTION = 'GENERATED_WORLD_SETTING_DESCRIPTION:';
  const GWD_WORLD_WRITING_STYLE = 'GENERATED_WORLD_WRITING_STYLE:';
  const GWD_CURRENCY_NAME = 'GENERATED_CURRENCY_NAME:';
  const GWD_ORIGINAL_STORY_SUMMARY = 'GENERATED_ORIGINAL_STORY_SUMMARY:';
  const GWD_HE_THONG_CANH_GIOI = 'GENERATED_HE_THONG_CANH_GIOI:';
  const GWD_CANH_GIOI_KHOI_DAU = 'GENERATED_CANH_GIOI_KHOI_DAU:';
  const GWD_GENRE = 'GENERATED_GENRE:';
  const GWD_CUSTOM_GENRE_NAME = 'GENERATED_CUSTOM_GENRE_NAME:'; 
  const GWD_IS_CULTIVATION_ENABLED = 'GENERATED_IS_CULTIVATION_ENABLED:';


  const generated: GeneratedWorldElements = {
    startingSkills: [],
    startingItems: [],
    startingNPCs: [],
    startingLore: [],
    startingLocations: [],
    startingFactions: [],
    genre: AVAILABLE_GENRES[0], 
    isCultivationEnabled: true, 
  };

  const originalStorySummaryRegex = /\[GENERATED_ORIGINAL_STORY_SUMMARY:\s*text\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)')\s*\]/is;
  const originalStorySummaryMatch = responseText.match(originalStorySummaryRegex);

  if (originalStorySummaryMatch) {
    let summaryText = originalStorySummaryMatch[1] !== undefined ? originalStorySummaryMatch[1] : originalStorySummaryMatch[2];
    if (summaryText !== undefined) {
      generated.originalStorySummary = summaryText
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
    }
    responseText = responseText.replace(originalStorySummaryMatch[0], '');
  }

  const lines = responseText.split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith(`[${GWD_SKILL}`)) {
        const content = line.substring(line.indexOf(GWD_SKILL) + GWD_SKILL.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const name = params.name;
        if (!name) {
            console.warn("Skipping GENERATED_SKILL due to missing 'name' parameter:", line);
            return;
        }
        const description = params.description || "Kỹ năng do AI tạo, chưa có mô tả.";
        generated.startingSkills.push({ name, description });

    } else if (line.startsWith(`[${GWD_ITEM}`)) {
        const content = line.substring(line.indexOf(GWD_ITEM) + GWD_ITEM.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const name = params.name;
        if (!name) {
            console.warn("Skipping GENERATED_ITEM due to missing 'name' parameter:", line);
            return;
        }
        const description = params.description || "Vật phẩm do AI tạo, chưa có mô tả.";
        const quantity = parseInt(params.quantity || "1", 10);
         if (isNaN(quantity) || quantity < 1) {
            console.warn("Skipping GENERATED_ITEM due to invalid 'quantity':", line);
            return;
        }
        
        const category = params.category as GameTemplates.ItemCategoryValues;
        if (!category || !Object.values(GameTemplates.ItemCategory).includes(category)) {
            console.warn(`Skipping GENERATED_ITEM "${name}" due to missing or invalid 'category': "${params.category}". Line: ${line}`);
            return;
        }
        
        const rarity = params.rarity as GameTemplates.EquipmentRarity || GameTemplates.ItemRarity.PHO_THONG;
        const value = params.value ? parseInt(params.value, 10) : 0;

        const startingItem: StartingItem = {
            name,
            description,
            quantity,
            category,
            rarity: Object.values(GameTemplates.ItemRarity).includes(rarity) ? rarity : GameTemplates.ItemRarity.PHO_THONG,
            value: !isNaN(value) ? value : 0,
            aiPreliminaryType: params.type 
        };

        if (category === GameTemplates.ItemCategory.EQUIPMENT) {
            const equipmentType = params.equipmentType as GameTemplates.EquipmentTypeValues;
            if (equipmentType && Object.values(GameTemplates.EquipmentType).includes(equipmentType)) {
                startingItem.equipmentDetails = {
                    type: equipmentType,
                    slot: params.slot,
                    uniqueEffectsString: params.uniqueEffectsList 
                };
                if (params.statBonusesJSON) {
                    startingItem.equipmentDetails.statBonusesString = params.statBonusesJSON;
                } else if (params.statBonuses) { 
                     startingItem.equipmentDetails.statBonusesString = params.statBonuses;
                }
            } else {
                 console.warn(`GENERATED_ITEM "${name}" is Equipment but 'equipmentType' is missing or invalid: "${params.equipmentType}". Line: ${line}`);
            }
        } else if (category === GameTemplates.ItemCategory.POTION) {
            const potionType = params.potionType as GameTemplates.PotionTypeValues;
             if (potionType && Object.values(GameTemplates.PotionType).includes(potionType)) {
                startingItem.potionDetails = {
                    type: potionType,
                    effectsString: params.effectsList, 
                    durationTurns: params.durationTurns ? parseInt(params.durationTurns, 10) : undefined,
                    cooldownTurns: params.cooldownTurns ? parseInt(params.cooldownTurns, 10) : undefined,
                };
            } else {
                console.warn(`GENERATED_ITEM "${name}" is Potion but 'potionType' is missing or invalid: "${params.potionType}". Line: ${line}`);
            }
        } else if (category === GameTemplates.ItemCategory.MATERIAL) {
            const materialType = params.materialType as GameTemplates.MaterialTypeValues;
            if (materialType && Object.values(GameTemplates.MaterialType).includes(materialType)) {
                startingItem.materialDetails = { type: materialType };
            } else {
                 console.warn(`GENERATED_ITEM "${name}" is Material but 'materialType' is missing or invalid: "${params.materialType}". Defaulting to "Khác". Line: ${line}`);
                 startingItem.materialDetails = { type: GameTemplates.MaterialType.KHAC }; // Default to "Khác"
            }
        } else if (category === GameTemplates.ItemCategory.QUEST_ITEM) {
            startingItem.questItemDetails = { questIdAssociated: params.questIdAssociated };
        } else if (category === GameTemplates.ItemCategory.MISCELLANEOUS) {
            startingItem.miscDetails = {
                usable: params.usable?.toLowerCase() === 'true',
                consumable: params.consumable?.toLowerCase() === 'true',
            };
        }
        generated.startingItems.push(startingItem);

    } else if (line.startsWith(`[${GWD_NPC}`)) {
        const content = line.substring(line.indexOf(GWD_NPC) + GWD_NPC.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const name = params.name;
        if (!name) {
            console.warn("Skipping GENERATED_NPC due to missing 'name' parameter:", line);
            return;
        }
        const personality = params.personality || "Bí ẩn";
        const details = params.details || "Không có thông tin chi tiết.";
        const initialAffinity = parseInt(params.initialAffinity || "0", 10);
        const gender = params.gender as StartingNPC['gender'] || 'Không rõ';
        const realm = params.realm;
        const avatarUrl = params.avatarUrl; // Now we parse the avatar URL if AI suggests it

        if (!isNaN(initialAffinity)) {
            generated.startingNPCs.push({
                name,
                personality,
                initialAffinity: Math.max(-100, Math.min(100, initialAffinity)),
                details,
                gender,
                realm,
                avatarUrl: avatarUrl || undefined // Store the suggested avatar URL
            });
        } else {
             console.warn("Skipping GENERATED_NPC due to invalid 'initialAffinity':", line);
        }

    } else if (line.startsWith(`[${GWD_LORE}`)) {
        const content = line.substring(line.indexOf(GWD_LORE) + GWD_LORE.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const title = params.title;
        if (!title) {
            console.warn("Skipping GENERATED_LORE due to missing 'title' parameter:", line);
            return;
        }
        const loreContent = params.content || "Nội dung tri thức chưa được cung cấp.";
        generated.startingLore.push({ title, content: loreContent });

    } else if (line.startsWith(`[${GWD_LOCATION}`)) {
        const content = line.substring(line.indexOf(GWD_LOCATION) + GWD_LOCATION.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const name = params.name;
        if(!name){
            console.warn("Skipping GENERATED_LOCATION due to missing 'name' parameter:", line);
            return;
        }
        const description = params.description || "Địa điểm chưa có mô tả.";
        
        if (!generated.startingLocations) {
            generated.startingLocations = [];
        }
        generated.startingLocations.push({
            name,
            description,
            isSafeZone: params.isSafeZone?.toLowerCase() === 'true',
            regionId: params.regionId || undefined
        });
    } else if (line.startsWith(`[${GWD_FACTION}`)) { 
        const content = line.substring(line.indexOf(GWD_FACTION) + GWD_FACTION.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const name = params.name;
        if (!name) {
            console.warn("Skipping GENERATED_FACTION due to missing 'name' parameter:", line);
            return;
        }
        const description = params.description || "Phe phái chưa có mô tả.";
        let alignment = params.alignment as GameTemplates.FactionAlignmentValues || GameTemplates.FactionAlignment.TRUNG_LAP;
        
        if (!ALL_FACTION_ALIGNMENTS.includes(alignment)) {
            console.warn(`Skipping GENERATED_FACTION due to invalid 'alignment': "${alignment}". Using default. Original line:`, line);
            alignment = GameTemplates.FactionAlignment.TRUNG_LAP;
        }

        const initialPlayerReputation = parseInt(params.initialPlayerReputation || "0", 10);
        if (isNaN(initialPlayerReputation)) {
            console.warn("Skipping GENERATED_FACTION due to invalid 'initialPlayerReputation':", line);
            return; 
        }

        if (!generated.startingFactions) {
            generated.startingFactions = [];
        }
        generated.startingFactions.push({
            name,
            description,
            alignment,
            initialPlayerReputation: Math.max(-100, Math.min(100, initialPlayerReputation))
        });
    } else if (line.startsWith(`[${GWD_PLAYER_NAME}`)) {
        const content = line.substring(line.indexOf(GWD_PLAYER_NAME) + GWD_PLAYER_NAME.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.name) generated.playerName = params.name;
    } else if (line.startsWith(`[${GWD_PLAYER_GENDER}`)) {
        const content = line.substring(line.indexOf(GWD_PLAYER_GENDER) + GWD_PLAYER_GENDER.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.gender && ['Nam', 'Nữ', 'Khác'].includes(params.gender)) {
            generated.playerGender = params.gender as 'Nam' | 'Nữ' | 'Khác';
        }
    } else if (line.startsWith(`[${GWD_PLAYER_PERSONALITY}`)) {
        const content = line.substring(line.indexOf(GWD_PLAYER_PERSONALITY) + GWD_PLAYER_PERSONALITY.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.playerPersonality = params.text;
    } else if (line.startsWith(`[${GWD_PLAYER_BACKSTORY}`)) {
        const content = line.substring(line.indexOf(GWD_PLAYER_BACKSTORY) + GWD_PLAYER_BACKSTORY.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.playerBackstory = params.text;
    } else if (line.startsWith(`[${GWD_PLAYER_GOAL}`)) {
        const content = line.substring(line.indexOf(GWD_PLAYER_GOAL) + GWD_PLAYER_GOAL.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.playerGoal = params.text;
    } else if (line.startsWith(`[${GWD_PLAYER_STARTING_TRAITS}`)) {
        const content = line.substring(line.indexOf(GWD_PLAYER_STARTING_TRAITS) + GWD_PLAYER_STARTING_TRAITS.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.playerStartingTraits = params.text;
    } else if (line.startsWith(`[${GWD_PLAYER_AVATAR_URL}`)) { 
        const content = line.substring(line.indexOf(GWD_PLAYER_AVATAR_URL) + GWD_PLAYER_AVATAR_URL.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.url) generated.playerAvatarUrl = params.url; // Store AI suggested player avatar URL
    } else if (line.startsWith(`[${GWD_WORLD_THEME}`)) {
        const content = line.substring(line.indexOf(GWD_WORLD_THEME) + GWD_WORLD_THEME.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.worldTheme = params.text;
    } else if (line.startsWith(`[${GWD_WORLD_SETTING_DESCRIPTION}`)) {
        const content = line.substring(line.indexOf(GWD_WORLD_SETTING_DESCRIPTION) + GWD_WORLD_SETTING_DESCRIPTION.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.worldSettingDescription = params.text;
    } else if (line.startsWith(`[${GWD_WORLD_WRITING_STYLE}`)) {
        const content = line.substring(line.indexOf(GWD_WORLD_WRITING_STYLE) + GWD_WORLD_WRITING_STYLE.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.worldWritingStyle = params.text;
    } else if (line.startsWith(`[${GWD_CURRENCY_NAME}`)) {
        const content = line.substring(line.indexOf(GWD_CURRENCY_NAME) + GWD_CURRENCY_NAME.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.name) generated.currencyName = params.name;
    } else if (line.startsWith(`[${GWD_HE_THONG_CANH_GIOI}`)) {
        const content = line.substring(line.indexOf(GWD_HE_THONG_CANH_GIOI) + GWD_HE_THONG_CANH_GIOI.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.heThongCanhGioi = params.text;
    } else if (line.startsWith(`[${GWD_CANH_GIOI_KHOI_DAU}`)) {
        const content = line.substring(line.indexOf(GWD_CANH_GIOI_KHOI_DAU) + GWD_CANH_GIOI_KHOI_DAU.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.canhGioiKhoiDau = params.text;
    } else if (line.startsWith(`[${GWD_GENRE}`)) {
        const content = line.substring(line.indexOf(GWD_GENRE) + GWD_GENRE.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text && (AVAILABLE_GENRES.includes(params.text as GenreType) || params.text === CUSTOM_GENRE_VALUE) ) {
            generated.genre = params.text as GenreType;
        }
    } else if (line.startsWith(`[${GWD_CUSTOM_GENRE_NAME}`)) {
        const content = line.substring(line.indexOf(GWD_CUSTOM_GENRE_NAME) + GWD_CUSTOM_GENRE_NAME.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.text) generated.customGenreName = params.text;
    } else if (line.startsWith(`[${GWD_IS_CULTIVATION_ENABLED}`)) {
        const content = line.substring(line.indexOf(GWD_IS_CULTIVATION_ENABLED) + GWD_IS_CULTIVATION_ENABLED.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.value) {
            generated.isCultivationEnabled = params.value.toLowerCase() === 'true';
        }
    }
  });

  return generated;
};


export const callGeminiAPI = async (
  prompt: string,
  onPromptConstructedForLog?: (constructedPrompt: string) => void 
): Promise<string> => {
  let client: GoogleGenAI;
  try {
    client = getAiClient();
  } catch (clientError) {
    console.error("Error obtaining AI client:", clientError);
    const errorMessage = clientError instanceof Error ? clientError.message : String(clientError);
    throw new Error(`Lỗi API Client: ${errorMessage}`);
  }

  const { model: configuredModel, safetySettings } = getApiSettings();

  if (onPromptConstructedForLog) { 
    onPromptConstructedForLog(prompt);
  }

  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: configuredModel, // Use the model from settings
      contents: prompt,
      config: {
        safetySettings: safetySettings,
        // For gemini-2.5-flash-preview-04-17, if needed for other tasks later:
        // ...(configuredModel === 'gemini-2.5-flash-preview-04-17' ? { thinkingConfig: { thinkingBudget: 0 } } : {}) 
      }
    });

    const responseText = response.text;

    if (!responseText) {
      console.warn("AI response was empty. This could be due to safety settings or an issue with the prompt/model. Response object:", response);
      throw new Error("Phản hồi từ AI trống rỗng. Điều này có thể do cài đặt an toàn nội dung đã chặn phản hồi, hoặc có vấn đề với prompt/model.");
    }
    return responseText;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    let detailedErrorMessage = error instanceof Error ? error.message : String(error);
    // @ts-ignore
    if (error && error.response && error.response.promptFeedback && error.response.promptFeedback.blockReason) {
         // @ts-ignore
        detailedErrorMessage = `Nội dung đã bị chặn do cài đặt an toàn. Lý do: ${error.response.promptFeedback.blockReason}. Vui lòng điều chỉnh trong Thiết Lập API.`;
         // @ts-ignore
        if (error.response.promptFeedback.safetyRatings && error.response.promptFeedback.safetyRatings.length > 0) {
             // @ts-ignore
            const blockedCategories = error.response.promptFeedback.safetyRatings.filter((r: any) => r.probability !== "NEGLIGIBLE").map((r:any) => `${r.category} (${r.probability})`);
            if(blockedCategories.length > 0) {
                detailedErrorMessage += ` (Các danh mục bị ảnh hưởng: ${blockedCategories.join(', ')})`;
            }
        }
    }
    throw new Error(`${VIETNAMESE.errorOccurred} ${detailedErrorMessage}`);
  }
};

export const generateInitialStory = async (
  worldConfig: WorldSettings,
  onPromptConstructedForLog?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> => {
  const prompt = PROMPT_TEMPLATES.initial(worldConfig);
  const rawText = await callGeminiAPI(prompt, onPromptConstructedForLog);
  const parsedResponse = parseAiResponseText(rawText);
  return {response: parsedResponse, rawText};
};

export const generateNextTurn = async (
  knowledgeBase: KnowledgeBase,
  playerAction: string,
  inputType: PlayerActionInputType,
  responseLength: ResponseLength,
  currentPageMessagesLog: string,
  previousPageSummaries: string[],
  lastNarrationFromPreviousPage?: string,
  onPromptConstructedForLog?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> => {
  const prompt = PROMPT_TEMPLATES.continue(
    knowledgeBase,
    playerAction,
    inputType,
    responseLength,
    currentPageMessagesLog,
    previousPageSummaries,
    lastNarrationFromPreviousPage
  );
  const rawText = await callGeminiAPI(prompt, onPromptConstructedForLog);
  const parsedResponse = parseAiResponseText(rawText);
  return {response: parsedResponse, rawText};
};

export const generateWorldDetailsFromStory = async (
  storyIdea: string,
  isNsfwIdea: boolean,
  genre: GenreType,
  isCultivationEnabled: boolean,
  customGenreName?: string, 
  onPromptConstructedForLog?: (prompt: string) => void 
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> => {
  const constructedPrompt = PROMPT_TEMPLATES.generateWorldDetails(storyIdea, isNsfwIdea, genre, isCultivationEnabled, customGenreName);
  
  if (onPromptConstructedForLog) {
    onPromptConstructedForLog(constructedPrompt); 
  }
  const rawText = await callGeminiAPI(constructedPrompt, undefined); 
  const parsedResponse = parseGeneratedWorldDetails(rawText);
  return {response: parsedResponse, rawText, constructedPrompt};
};

export const generateFanfictionWorldDetails = async (
  sourceMaterial: string,
  isSourceContent: boolean,
  playerInputDescription?: string,
  isNsfwIdea?: boolean,
  genre?: GenreType,
  isCultivationEnabled?: boolean,
  customGenreName?: string, 
  onPromptConstructedForLog?: (prompt: string) => void 
): Promise<{response: GeneratedWorldElements, rawText: string, constructedPrompt: string}> => {
  const constructedPrompt = PROMPT_TEMPLATES.generateFanfictionWorldDetails(sourceMaterial, isSourceContent, playerInputDescription, isNsfwIdea, genre, isCultivationEnabled, customGenreName);
  if (onPromptConstructedForLog) {
    onPromptConstructedForLog(constructedPrompt);
  }
  const rawText = await callGeminiAPI(constructedPrompt, undefined);
  const parsedResponse = parseGeneratedWorldDetails(rawText);
  return {response: parsedResponse, rawText, constructedPrompt};
};

export const summarizeTurnHistory = async (
  messagesToSummarize: GameMessage[],
  worldTheme: string,
  playerName: string,
  genre?: GenreType, 
  customGenreName?: string, 
  onPromptConstructedForLog?: (prompt: string) => void,
  onSummarizationResponseForLog?: (response: string) => void 
): Promise<{ processedSummary: string, rawSummary: string }> => {
  const prompt = PROMPT_TEMPLATES.summarizePage(messagesToSummarize, worldTheme, playerName, genre, customGenreName);
  const rawText = await callGeminiAPI(prompt, onPromptConstructedForLog);
  if(onSummarizationResponseForLog) onSummarizationResponseForLog(rawText);
  // For now, processed summary is same as raw. Can add more processing if needed.
  return { processedSummary: rawText, rawSummary: rawText };
};

export const countTokens = async (text: string): Promise<number> => {
  const client = getAiClient(); // Gets the client, initializes if necessary with user/system key
  const { model: configuredModel } = getApiSettings();
  try {
    const response: CountTokensResponse = await client.models.countTokens({
      model: configuredModel, // Use the same model as for generation for more accurate count
      contents: text,
    });
    return response.totalTokens;
  } catch (error) {
    console.error("Error counting tokens:", error);
    // Depending on how critical token count is, rethrow or return a specific value like -1
    throw new Error(`Error counting tokens: ${error instanceof Error ? error.message : String(error)}`);
  }
};

export const generateCraftedItemViaAI = async (
  desiredCategory: GameTemplates.ItemCategoryValues,
  requirements: string,
  materials: Array<{ name: string; description: string; category: GameTemplates.ItemCategoryValues; materialType?: GameTemplates.MaterialTypeValues }>,
  playerStats: PlayerStats, 
  playerName?: string,
  genre?: GenreType,
  isCultivationEnabled?: boolean,
  customGenreName?: string,
  onPromptConstructedForLog?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> => {
  const prompt = PROMPT_TEMPLATES.craftItem(desiredCategory, requirements, materials, playerStats, playerName, genre, isCultivationEnabled, customGenreName);
  const rawText = await callGeminiAPI(prompt, onPromptConstructedForLog);
  const parsedResponse = parseAiResponseText(rawText); // Parse for narration and ITEM_ACQUIRED tag
  return {response: parsedResponse, rawText};
};

/**
 * Generates an image based on the selected image model in API settings.
 * @param prompt The text prompt to generate the image from.
 * @returns A Promise that resolves to the base64 encoded string of the generated image (without data URI prefix).
 */
export async function generateImageUnified(prompt: string): Promise<string> {
  const settings = getApiSettings();
  const { imageModel } = settings;

  if (imageModel === 'imagen-3.0-generate-002') {
    return generateImageWithImagen3(prompt);
  } else if (imageModel === 'gemini-2.0-flash-preview-image-generation') {
    return generateImageWithGemini2Flash(prompt);
  } else {
    console.warn(`Unknown image model selected: ${imageModel}. Defaulting to Imagen 3.0.`);
    return generateImageWithImagen3(prompt);
  }
}