

import { GoogleGenAI, GenerateContentResponse, HarmCategory, HarmBlockThreshold, CountTokensResponse } from "@google/genai"; 
import { KnowledgeBase, ParsedAiResponse, AiChoice, WorldSettings, ApiConfig, SafetySetting, PlayerActionInputType, ResponseLength, StartingSkill, StartingItem, StartingNPC, StartingLore, GameMessage } from '../types'; 
import { PROMPT_TEMPLATES, VIETNAMESE, API_SETTINGS_STORAGE_KEY, DEFAULT_MODEL_ID, HARM_CATEGORIES, DEFAULT_API_CONFIG, GeneratedWorldElements, MAX_TOKENS_FANFIC } from '../constants'; 

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
    // Prioritize GEMINI_API_KEY, then API_KEY from process.env
    const systemApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (typeof systemApiKey !== 'string' || systemApiKey.trim() === '') {
        console.error("System API Key is selected, but neither process.env.GEMINI_API_KEY nor process.env.API_KEY is available or empty.");
        throw new Error(VIETNAMESE.apiKeySystemUnavailable + " (GEMINI_API_KEY or API_KEY not found in environment)");
    }
    effectiveApiKey = systemApiKey;
  } else { // 'user'
    if (!settings.userApiKey) {
      console.error("User API Key is selected but not configured. Please set it in API Settings.");
      throw new Error(VIETNAMESE.apiKeyMissing); 
    }
    effectiveApiKey = settings.userApiKey;
  }
  
  if (!ai || lastUsedApiKeySource !== settings.apiKeySource || (settings.apiKeySource === 'user' && lastUsedEffectiveApiKey !== effectiveApiKey) || (settings.apiKeySource === 'system' && lastUsedEffectiveApiKey !== effectiveApiKey)) {
    try {
      ai = new GoogleGenAI({ apiKey: effectiveApiKey });
      lastUsedEffectiveApiKey = effectiveApiKey; 
      lastUsedApiKeySource = settings.apiKeySource;
    } catch (initError) {
        console.error("Failed to initialize GoogleGenAI client:", initError);
        if (settings.apiKeySource === 'system') {
            throw new Error(`${VIETNAMESE.apiKeySystemUnavailable} Details: ${initError instanceof Error ? initError.message : String(initError)} (Using system key: ${process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'API_KEY'})`);
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
  const gameStateTags: string[] = []; // Tags like STATS_UPDATE, ITEM_ACQUIRED etc.
  let systemMessage: string | undefined;

  // Regex to find any [...] tag and its content
  const allTagsRegex = /\[(.*?)\]/g;
  const foundRawTags: {fullTag: string, content: string}[] = [];
  let tempMatch;
  while ((tempMatch = allTagsRegex.exec(responseText)) !== null) {
    foundRawTags.push({fullTag: tempMatch[0], content: tempMatch[1].trim()});
  }

  for (const tagInfo of foundRawTags) {
    const { fullTag, content } = tagInfo;
    
    // Attempt to remove the tag from narration text.
    // This simple replace might be problematic if the same tag appears multiple times.
    // A more robust solution would involve replacing based on indices or unique IDs if possible.
    // For now, this is a common approach but be mindful of its limitations.
    if (narration.includes(fullTag)) {
        narration = narration.replace(fullTag, '');
    }

    const upperContent = content.toUpperCase();

    if (upperContent.startsWith('CHOICE:')) {
      try {
        const choiceText = content.substring('CHOICE:'.length).trim().replace(/^"|"$/g, '');
        if (choiceText) { // Ensure choice text is not empty
            choices.push({ text: choiceText });
        }
      } catch (e) {
        console.warn("Could not parse CHOICE tag content:", content, e);
      }
    } else if (upperContent.startsWith('MESSAGE:')) {
      try {
        systemMessage = content.substring('MESSAGE:'.length).trim().replace(/^"|"$/g, '');
      } catch (e) {
        console.warn("Could not parse MESSAGE tag content:", content, e);
      }
    } else if (!upperContent.startsWith('GENERATED_')) { 
      // This is a game state tag if not CHOICE, MESSAGE, or GENERATED_
      gameStateTags.push(fullTag);
    }
  }

  // Clean up narration: remove extra newlines and trim whitespace
  narration = narration.replace(/\n\s*\n/g, '\n').trim(); 

  return { narration, choices, tags: gameStateTags, systemMessage };
};


// Utility to parse key-value pairs from a tag's content string
const parseTagParams = (paramString: string): Record<string, string> => {
    const params: Record<string, string> = {};
    const paramRegex = /(\w+)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([^,]*?)(?=\s*,\s*\w+\s*=|$))/g;
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


export const callGeminiAPI = async (
  prompt: string, 
  onPromptConstructed?: (constructedPrompt: string) => void
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
  
  if (onPromptConstructed) {
    onPromptConstructed(prompt);
  }

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
    return responseText; 

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

export const generateInitialStory = async (
  worldConfig: WorldSettings,
  onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> => {
  const prompt = PROMPT_TEMPLATES.initial(worldConfig);
  const rawText = await callGeminiAPI(prompt, onPromptConstructed);
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
  lastNarrationFromPreviousPage?: string, // New parameter
  onPromptConstructed?: (prompt: string) => void
): Promise<{response: ParsedAiResponse, rawText: string}> => {
  const prompt = PROMPT_TEMPLATES.continue(
    knowledgeBase, 
    playerAction, 
    inputType, 
    responseLength,
    currentPageMessagesLog,
    previousPageSummaries,
    lastNarrationFromPreviousPage // Pass to template
  );
  const rawText = await callGeminiAPI(prompt, onPromptConstructed);
  const parsedResponse = parseAiResponseText(rawText);
  return {response: parsedResponse, rawText};
};

export const generateWorldDetailsFromStory = async (
  storyIdea: string,
  onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string}> => {
  const prompt = PROMPT_TEMPLATES.generateWorldDetails(storyIdea);
  const rawText = await callGeminiAPI(prompt, onPromptConstructed);
  const parsedResponse = parseGeneratedWorldDetails(rawText);
  return {response: parsedResponse, rawText};
};

export const generateFanfictionWorldDetails = async (
  sourceMaterial: string,
  isSourceContent: boolean,
  playerInputDescription?: string,
  onPromptConstructed?: (prompt: string) => void
): Promise<{response: GeneratedWorldElements, rawText: string}> => {
  const prompt = PROMPT_TEMPLATES.generateFanfictionWorldDetails(sourceMaterial, isSourceContent, playerInputDescription);
  const rawText = await callGeminiAPI(prompt, onPromptConstructed);
  const parsedResponse = parseGeneratedWorldDetails(rawText); // Reuses the same parser
  return {response: parsedResponse, rawText};
};

export const summarizeTurnHistory = async (
  messagesToSummarize: GameMessage[],
  worldTheme: string,
  playerName: string,
  onPromptConstructed?: (prompt: string) => void
): Promise<string> => {
  if (!messagesToSummarize || messagesToSummarize.length === 0) {
    return "Không có diễn biến nào đáng kể trong trang này.";
  }
  const prompt = PROMPT_TEMPLATES.summarizePage(messagesToSummarize, worldTheme, playerName);
  try {
    const rawSummary = await callGeminiAPI(prompt, onPromptConstructed);
    // Basic cleaning, remove potential markdown if AI wraps it
    return rawSummary.replace(/```json\s*|\s*```/g, '').trim();
  } catch (error) {
    console.error("Error generating page summary:", error);
    return `Lỗi tóm tắt trang: ${error instanceof Error ? error.message : "Không rõ"}`;
  }
};

export const countTokens = async (text: string): Promise<number> => {
  let client: GoogleGenAI;
  try {
    client = getAiClient();
  } catch (clientError) {
    console.error("Error obtaining AI client for token counting:", clientError);
    throw new Error(`Lỗi API Client khi đếm token: ${clientError instanceof Error ? clientError.message : String(clientError)}`);
  }

  const { model: configuredModel } = getApiSettings();

  try {
    const response: CountTokensResponse = await client.models.countTokens({
      model: configuredModel,
      contents: text, 
    });
    return response.totalTokens;
  } catch (error) {
    console.error("Error counting tokens with Gemini API:", error);
    throw new Error(`Lỗi khi đếm token bằng Gemini API: ${error instanceof Error ? error.message : String(error)}`);
  }
};
