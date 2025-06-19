

import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold } from "@google/genai"; 
import { KnowledgeBase, ParsedAiResponse, AiChoice, WorldSettings, ApiConfig, SafetySetting, PlayerActionInputType, ResponseLength, StartingSkill, StartingItem, StartingNPC, StartingLore } from '../types'; 
import { PROMPT_TEMPLATES, VIETNAMESE, API_SETTINGS_STORAGE_KEY, DEFAULT_MODEL_ID, HARM_CATEGORIES, DEFAULT_API_CONFIG, GeneratedWorldElements } from '../constants'; 

let ai: GoogleGenAI | null = null;
let lastUsedEffectiveApiKey: string | null = null; 
let lastUsedApiKeySource: 'system' | 'user' | null = null;

// Helper to get API settings from localStorage
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

      return {
        apiKeySource: parsed.apiKeySource || DEFAULT_API_CONFIG.apiKeySource,
        userApiKey: parsed.userApiKey || '', 
        model: parsed.model || DEFAULT_API_CONFIG.model,
        safetySettings: validSafetySettings ? parsed.safetySettings : DEFAULT_API_CONFIG.safetySettings,
      };
    } catch (e) {
      console.error("Failed to parse API settings from localStorage", e);
    }
  }
  return { ...DEFAULT_API_CONFIG }; // Return a copy of default config
};

const getAiClient = (): GoogleGenAI => {
  const settings = getApiSettings();
  let effectiveApiKey: string;

  if (settings.apiKeySource === 'system') {
    // Per guidelines, assume process.env.API_KEY is pre-configured, valid, and accessible.
    // If it's not actually available in the environment, new GoogleGenAI() will throw,
    // and this will be caught by callGeminiAPI.
    if (typeof process.env.API_KEY !== 'string' || process.env.API_KEY.trim() === '') {
        // This case should ideally not be hit if environment is set up as assumed.
        // If it is, it means the assumption is broken.
        console.error("System API Key is selected, but process.env.API_KEY is not available or empty.");
        throw new Error(VIETNAMESE.apiKeySystemUnavailable);
    }
    effectiveApiKey = process.env.API_KEY;
  } else { // 'user'
    if (!settings.userApiKey) {
      console.error("User API Key is selected but not configured. Please set it in API Settings.");
      throw new Error(VIETNAMESE.apiKeyMissing); 
    }
    effectiveApiKey = settings.userApiKey;
  }
  
  if (!ai || lastUsedApiKeySource !== settings.apiKeySource || (settings.apiKeySource === 'user' && lastUsedEffectiveApiKey !== effectiveApiKey)) {
    try {
      ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      lastUsedEffectiveApiKey = settings.apiKeySource === 'user' ? effectiveApiKey : null; 
      lastUsedApiKeySource = settings.apiKeySource;
    } catch (initError) {
        console.error("Failed to initialize GoogleGenAI client:", initError);
        // Propagate a user-friendly error or a specific error type
        if (settings.apiKeySource === 'system') {
            throw new Error(`${VIETNAMESE.apiKeySystemUnavailable} Details: ${initError instanceof Error ? initError.message : String(initError)}`);
        } else {
            throw new Error(`Lỗi khởi tạo API Key người dùng: ${initError instanceof Error ? initError.message : String(initError)}`);
        }
    }
  }
  return ai;
};

// This parser is for general game state tags like CHOICE, MESSAGE, STATS_UPDATE, etc.
export const parseAiResponseText = (responseText: string): ParsedAiResponse => {
  const tags: string[] = [];
  const choices: AiChoice[] = [];
  let narration = responseText;
  let systemMessage: string | undefined;

  // Regex specifically for game state tags (not GENERATED_ tags)
  const tagRegex = /\[(?!GENERATED_)([^:]+?:\s*.*?|[^:]*?)\]/g;
  let match;
  let mutableNarration = narration;

  while ((match = tagRegex.exec(responseText)) !== null) {
    const fullTag = match[0];
    const tagContent = match[1]; // Content inside brackets, excluding GENERATED_ tags

    if (tagContent.startsWith('CHOICE:')) {
      try {
        const choiceText = tagContent.substring('CHOICE:'.length).trim().replace(/^"|"$/g, '');
        choices.push({ text: choiceText });
        mutableNarration = mutableNarration.replace(fullTag, '').trim();
      } catch (e) {
        console.warn("Could not parse CHOICE tag content:", tagContent);
      }
    } else if (tagContent.startsWith('MESSAGE:')) {
      try {
        systemMessage = tagContent.substring('MESSAGE:'.length).trim().replace(/^"|"$/g, '');
        mutableNarration = mutableNarration.replace(fullTag, '').trim();
      } catch (e) {
        console.warn("Could not parse MESSAGE tag content:", tagContent);
      }
    } else if (!tagContent.startsWith('GENERATED_')) { // Ensure it's not a GENERATED tag
      tags.push(fullTag);
      mutableNarration = mutableNarration.replace(fullTag, '').trim();
    }
  }

  narration = mutableNarration.replace(/\n\n+/g, '\n').trim();

  // Add all original tags (including GENERATED_ ones if any were passed, though they shouldn't be by design)
  // back for debugging or further specific processing if needed.
  // The primary goal here is that `parseAiResponseText` correctly extracts narration, choices, and game-state tags.
  const allOriginalTagsRegex = /\[(.*?)\]/g;
  let originalTagMatch;
  const allOriginalTags : string[] = [];
   while ((originalTagMatch = allOriginalTagsRegex.exec(responseText)) !== null) {
       if (!originalTagMatch[1].startsWith('CHOICE:') && !originalTagMatch[1].startsWith('MESSAGE:')) {
           allOriginalTags.push(originalTagMatch[0]);
       }
   }
  
  return { narration, choices, tags: allOriginalTags, systemMessage };
};


// Utility to parse key-value pairs from a tag's content string
const parseTagParams = (paramString: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const paramRegex = /(\w+)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^,]*?)(?=\s*,\s*\w+\s*=|$))/g;
    let match;
    while ((match = paramRegex.exec(paramString)) !== null) {
        const key = match[1].trim();
        let value = match[2] !== undefined ? match[2].replace(/\\"/g, '"') : // Handle escaped quotes within double-quoted strings
                    match[3] !== undefined ? match[3].replace(/\\'/g, "'") : // Handle escaped quotes within single-quoted strings
                    match[4] !== undefined ? match[4].trim() : '';
        params[key] = value;
    }
    return params;
};


// This parser is specifically for [GENERATED_...] tags
export const parseGeneratedWorldDetails = (responseText: string): GeneratedWorldElements => {
  const GWD_SKILL = 'GENERATED_SKILL:';
  const GWD_ITEM = 'GENERATED_ITEM:';
  const GWD_NPC = 'GENERATED_NPC:';
  const GWD_LORE = 'GENERATED_LORE:';
  const GWD_PLAYER_NAME = 'GENERATED_PLAYER_NAME:';
  const GWD_PLAYER_PERSONALITY = 'GENERATED_PLAYER_PERSONALITY:';
  const GWD_PLAYER_BACKSTORY = 'GENERATED_PLAYER_BACKSTORY:';
  const GWD_PLAYER_GOAL = 'GENERATED_PLAYER_GOAL:';
  const GWD_PLAYER_STARTING_TRAITS = 'GENERATED_PLAYER_STARTING_TRAITS:';
  const GWD_WORLD_THEME = 'GENERATED_WORLD_THEME:';
  const GWD_WORLD_SETTING_DESCRIPTION = 'GENERATED_WORLD_SETTING_DESCRIPTION:';
  const GWD_WORLD_WRITING_STYLE = 'GENERATED_WORLD_WRITING_STYLE:';
  const GWD_CURRENCY_NAME = 'GENERATED_CURRENCY_NAME:';


  const generated: GeneratedWorldElements = {
    startingSkills: [],
    startingItems: [],
    startingNPCs: [],
    startingLore: [],
  };

  const lines = responseText.split('\n');
  lines.forEach(line => {
    line = line.trim();
    if (line.startsWith(`[${GWD_SKILL}`)) {
        const content = line.substring(line.indexOf(GWD_SKILL) + GWD_SKILL.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.name && params.description) {
            generated.startingSkills.push({ name: params.name, description: params.description });
        }
    } else if (line.startsWith(`[${GWD_ITEM}`)) {
        const content = line.substring(line.indexOf(GWD_ITEM) + GWD_ITEM.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const quantity = parseInt(params.quantity || "1", 10);
        if (params.name && params.description && params.type && !isNaN(quantity)) {
            generated.startingItems.push({ 
                name: params.name, 
                description: params.description, 
                quantity: quantity > 0 ? quantity : 1, 
                type: params.type 
            });
        }
    } else if (line.startsWith(`[${GWD_NPC}`)) {
        const content = line.substring(line.indexOf(GWD_NPC) + GWD_NPC.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        const initialAffinity = parseInt(params.initialAffinity || "0", 10);
        if (params.name && params.personality && params.details && !isNaN(initialAffinity)) {
            generated.startingNPCs.push({ 
                name: params.name, 
                personality: params.personality, 
                initialAffinity: Math.max(-100, Math.min(100, initialAffinity)), 
                details: params.details 
            });
        }
    } else if (line.startsWith(`[${GWD_LORE}`)) {
        const content = line.substring(line.indexOf(GWD_LORE) + GWD_LORE.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.title && params.content) {
            generated.startingLore.push({ title: params.title, content: params.content });
        }
    } else if (line.startsWith(`[${GWD_PLAYER_NAME}`)) {
        const content = line.substring(line.indexOf(GWD_PLAYER_NAME) + GWD_PLAYER_NAME.length, line.lastIndexOf(']')).trim();
        const params = parseTagParams(content);
        if (params.name) generated.playerName = params.name;
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
    }
  });

  return generated;
};


export const callGeminiAPI = async (prompt: string): Promise<string> => { // Returns raw text
  let client: GoogleGenAI;
  try {
    client = getAiClient(); // This can throw if API key is misconfigured
  } catch (clientError) {
    console.error("Error obtaining AI client:", clientError);
    const errorMessage = clientError instanceof Error ? clientError.message : String(clientError);
    throw new Error(`Lỗi API Client: ${errorMessage}`);
  }
  
  const { model: configuredModel, safetySettings } = getApiSettings(); 
  
  try {
    const response: GenerateContentResponse = await client.models.generateContent({
      model: configuredModel,
      contents: prompt,
      config: { 
        safetySettings: safetySettings,
      }
    });

    const responseText = response.text;

    if (!responseText) {
      throw new Error("AI response was empty.");
    }
    return responseText; // Return raw text

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    let detailedErrorMessage = error instanceof Error ? error.message : String(error);
    // @ts-ignore
    if (error && (error as any).response && (error as any).response.candidates) {
        // @ts-ignore
        const candidates = (error as any).response.candidates;
        if (candidates && candidates.length > 0 && candidates[0].finishReason === "SAFETY") {
            detailedErrorMessage = "Nội dung đã bị chặn do cài đặt an toàn. Vui lòng điều chỉnh trong Thiết Lập API.";
             if(candidates[0].safetyRatings) {
                const blockedCategories = candidates[0].safetyRatings.filter((r: any) => r.blocked).map((r:any) => r.category);
                if(blockedCategories.length > 0) {
                    detailedErrorMessage += ` (Các danh mục bị ảnh hưởng: ${blockedCategories.join(', ')})`;
                }
             }
        }
    }
    throw new Error(`${VIETNAMESE.errorOccurred} ${detailedErrorMessage}`);
  }
};

export const generateInitialStory = async (worldConfig: WorldSettings): Promise<ParsedAiResponse> => {
  const prompt = PROMPT_TEMPLATES.initial(worldConfig);
  const rawText = await callGeminiAPI(prompt);
  const parsedResponse = parseAiResponseText(rawText);
  // Add the raw response to tags for debugging in App.tsx
  parsedResponse.tags.push(`[DEBUG_RAW_AI_RESPONSE: "${rawText.replace(/"/g, '\\"') }"]`);
  return parsedResponse;
};

export const generateNextTurn = async (knowledgeBase: KnowledgeBase, playerAction: string, inputType: PlayerActionInputType, responseLength: ResponseLength): Promise<ParsedAiResponse> => {
  const prompt = PROMPT_TEMPLATES.continue(knowledgeBase, playerAction, inputType, responseLength);
  const rawText = await callGeminiAPI(prompt);
  const parsedResponse = parseAiResponseText(rawText);
  parsedResponse.tags.push(`[DEBUG_RAW_AI_RESPONSE: "${rawText.replace(/"/g, '\\"') }"]`);
  return parsedResponse;
};

export const generateWorldDetailsFromStory = async (storyIdea: string): Promise<GeneratedWorldElements> => {
  const prompt = PROMPT_TEMPLATES.generateWorldDetails(storyIdea);
  const rawText = await callGeminiAPI(prompt);
  // console.log("Raw AI response for world details:", rawText); // For debugging
  return parseGeneratedWorldDetails(rawText);
};
