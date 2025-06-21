

import { KnowledgeBase, PlayerStats, WorldSettings, SafetySetting, PlayerActionInputType, ResponseLength, ApiConfig, StartingSkill, StartingItem, StartingNPC, StartingLore, StorageType, FirebaseUserConfig, StorageSettings, GameMessage, Faction, StyleSettings, StartingLocation } from './types'; // Added StartingLocation
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { VIETNAMESE as AllTranslations } from './translations'; // Import from new location
import { PROMPT_TEMPLATES as AllPrompts } from './prompts'; // Import from new location

export const GAME_TITLE = "Role Play AI";
export const APP_VERSION = "1.0.0";
export const TURNS_PER_PAGE = 20; // Number of turns before a new page is started
export const MAX_TURN_HISTORY_LENGTH = 30; // Maximum number of turns to keep in history for rollback
export const MAX_TOKENS_FANFIC = 800000; // Maximum tokens for fanfiction TXT file upload

export const DEFAULT_PLAYER_STATS: PlayerStats = {
  hp: 100,
  maxHp: 100,
  mana: 50,
  maxMana: 50,
  atk: 10,
  exp: 0,
  maxExp: 100,
  level: 1,
  realm: "Phàm Nhân Cảnh",
  currency: 0,
  isInCombat: false,
  turn: 0,
};

export const INITIAL_KNOWLEDGE_BASE: KnowledgeBase = {
  playerStats: { ...DEFAULT_PLAYER_STATS },
  inventory: [],
  playerSkills: [],
  allQuests: [],
  discoveredNPCs: [],
  discoveredLocations: [],
  discoveredFactions: [],
  realmProgressionList: ["Phàm Nhân Cảnh", "Luyện Khí Kỳ", "Trúc Cơ Kỳ", "Kim Đan Kỳ", "Nguyên Anh Kỳ", "Hóa Thần Kỳ"],
  worldConfig: null,
  companions: [],
  worldLore: [],
  pageSummaries: {},
  currentPageHistory: [1],
  lastSummarizedTurn: 0,
  turnHistory: [], // Added for rollback
};

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
    theme: "",
    settingDescription: "",
    writingStyle: "",
    difficulty: "Thường",
    currencyName: "",
    playerName: "",
    playerGender: "Nam",
    playerPersonality: "",
    playerBackstory: "",
    playerGoal: "",
    playerStartingTraits: "",
    startingSkills: [],
    startingItems: [],
    startingNPCs: [],
    startingLore: [],
    startingLocations: [], // Added starting locations
    nsfwMode: false,
    originalStorySummary: "", // Renamed
};

// API Settings Constants
export const API_SETTINGS_STORAGE_KEY = 'daoDoAiApiSettings_v2';
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  { id: 'gemini-2.5-flash-preview-04-17', name: 'gemini-2.5-flash-preview-04-17' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
];
export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id;
export const DEFAULT_API_KEY_SOURCE: 'system' | 'user' = 'system';

export const GEMINI_MODEL_TEXT = DEFAULT_MODEL_ID;

export const HARM_CATEGORIES = [
  { id: HarmCategory.HARM_CATEGORY_HARASSMENT, label: "Quấy Rối" },
  { id: HarmCategory.HARM_CATEGORY_HATE_SPEECH, label: "Phát Ngôn Thù Ghét" },
  { id: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, label: "Nội Dung Khiêu Dâm" },
  { id: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, label: "Nội Dung Nguy Hiểm" },
];

export const HARM_BLOCK_THRESHOLDS = [
  { id: HarmBlockThreshold.BLOCK_NONE, label: "Không Chặn (Rủi Ro Cao Nhất)" },
  { id: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE, label: "Chặn Ngưỡng Thấp và Cao Hơn" },
  { id: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, label: "Chặn Ngưỡng Trung Bình và Cao Hơn" },
  { id: HarmBlockThreshold.BLOCK_ONLY_HIGH, label: "Chặn Chỉ Ngưỡng Cao" },
];

export const DEFAULT_SAFETY_SETTINGS: SafetySetting[] = HARM_CATEGORIES.map(category => ({
  category: category.id,
  threshold: HarmBlockThreshold.BLOCK_NONE,
}));

export const DEFAULT_API_CONFIG: ApiConfig = {
  apiKeySource: DEFAULT_API_KEY_SOURCE,
  userApiKey: '',
  model: DEFAULT_MODEL_ID,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
};

// Storage Settings Constants
export const STORAGE_SETTINGS_STORAGE_KEY = 'daoDoAiStorageSettings_v1';
export const DEFAULT_STORAGE_TYPE: StorageType = 'local';
export const DEFAULT_FIREBASE_USER_CONFIG: FirebaseUserConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};
export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  storageType: DEFAULT_STORAGE_TYPE,
  firebaseUserConfig: null,
};

// Style Settings Constants
export const STYLE_SETTINGS_STORAGE_KEY = 'daoDoAiStyleSettings_v1';
export const AVAILABLE_FONTS = ['Inter', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Comic Sans MS', 'inherit'];
export const AVAILABLE_FONT_SIZES = ['12px', '13px', '14px', '15px', '16px', '17px', '18px', '20px', '22px', '24px', 'inherit'];

export const DEFAULT_STYLE_SETTINGS: StyleSettings = {
  narration: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px', // Tailwind 'text-base' is often 16px
    textColor: '#F3F4F6', // Tailwind text-gray-100
    backgroundColor: '#374151', // Tailwind bg-gray-700
  },
  playerAction: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    textColor: '#FFFFFF', // Tailwind text-white
    backgroundColor: '#4F46E5', // Tailwind bg-indigo-600
  },
  choiceButton: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px', // Tailwind 'text-sm'
    textColor: '#D1D5DB', // Tailwind text-gray-300 for ghost variant
    backgroundColor: 'transparent', // Consistent with Button variant="ghost"
  },
  keywordHighlight: {
    fontFamily: undefined, // Inherits by default
    fontSize: undefined,   // Inherits by default
    textColor: '#FACC15',  // Tailwind yellow-400
    backgroundColor: undefined, // Transparent by default
  },
};

// Re-export the translations and prompts
export const VIETNAMESE = AllTranslations;
export const PROMPT_TEMPLATES = AllPrompts;