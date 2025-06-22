
import { KnowledgeBase, PlayerStats, WorldSettings, SafetySetting, PlayerActionInputType, ResponseLength, ApiConfig, StartingSkill, StartingItem, StartingNPC, StartingLore, StorageType, FirebaseUserConfig, StorageSettings, GameMessage, Faction, StyleSettings, StartingLocation, RealmBaseStatDefinition } from './types'; // Added StartingLocation, RealmBaseStatDefinition
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { VIETNAMESE as AllTranslations } from './translations'; 
import { PROMPT_FUNCTIONS as AllPrompts } from './prompts/index'; // Updated import path

export const GAME_TITLE = "Role Play AI";
export const APP_VERSION = "1.1.0";
export const TURNS_PER_PAGE = 20; // Number of turns before a new page is started
export const MAX_TURN_HISTORY_LENGTH = 30; // Maximum number of turns to keep in history for rollback
export const MAX_TOKENS_FANFIC = 800000; // Maximum tokens for fanfiction TXT file upload

export const SUB_REALM_NAMES = ["Nhất Trọng", "Nhị Trọng", "Tam Trọng", "Tứ Trọng", "Ngũ Trọng", "Lục Trọng", "Thất Trọng", "Bát Trọng", "Cửu Trọng", "Đỉnh Phong"];

// Save System Constants
export const AUTO_SAVE_INTERVAL_TURNS = 5;
export const MAX_AUTO_SAVE_SLOTS = 10;


// New: Default tiered stats for dynamic assignment to realms based on RealmBaseStatDefinition
const generateTieredStats = (): RealmBaseStatDefinition[] => {
  const tiers: RealmBaseStatDefinition[] = [];

  // Tier 0 (e.g., Phàm Nhân) - User's example
  tiers.push({
    hpBase: 100, hpInc: 20,
    mpBase: 50, mpInc: 10,
    atkBase: 10, atkInc: 2,
    expBase: 100, expInc: 20,
  });

  // Tier 1 (e.g., Luyện Khí) - User's example
  tiers.push({
    hpBase: 1000, hpInc: 200,
    mpBase: 500, mpInc: 100,
    atkBase: 100, atkInc: 20,
    expBase: 1000, expInc: 200,
  });

  // Growth factors for subsequent tiers
  const baseMultiplier = 5.0; // Multiplier for Base stats (hpBase, mpBase, atkBase, expBase) - CHANGED
  const incMultiplier = 2.0;  // Multiplier for Increment stats (hpInc, mpInc, atkInc, expInc) - CHANGED

  for (let i = 2; i < 30; i++) {
    const prevTier = tiers[i - 1];
    tiers.push({
      hpBase: Math.floor(prevTier.hpBase * baseMultiplier),
      hpInc: Math.floor(prevTier.hpInc * incMultiplier),
      mpBase: Math.floor(prevTier.mpBase * baseMultiplier),
      mpInc: Math.floor(prevTier.mpInc * incMultiplier),
      atkBase: Math.floor(prevTier.atkBase * baseMultiplier),
      atkInc: Math.floor(prevTier.atkInc * incMultiplier),
      expBase: Math.floor(prevTier.expBase * baseMultiplier),
      expInc: Math.floor(prevTier.expInc * incMultiplier),
    });
  }
  return tiers;
};

export const DEFAULT_TIERED_STATS: RealmBaseStatDefinition[] = generateTieredStats();


export const DEFAULT_PLAYER_STATS: PlayerStats = {
  sinhLuc: 100,
  maxSinhLuc: 100,
  linhLuc: 50,
  maxLinhLuc: 50,
  sucTanCong: 10,
  kinhNghiem: 0,
  maxKinhNghiem: 100, // Will be dynamically calculated
  realm: "Phàm Nhân Nhất Trọng", // Updated to new format
  currency: 0,
  isInCombat: false,
  turn: 0,
  hieuUngBinhCanh: false,
};

export const INITIAL_KNOWLEDGE_BASE: KnowledgeBase = {
  playerStats: { ...DEFAULT_PLAYER_STATS },
  inventory: [],
  playerSkills: [],
  allQuests: [],
  discoveredNPCs: [],
  discoveredLocations: [],
  discoveredFactions: [],
  realmProgressionList: ["Phàm Nhân - Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần"], // Example, will be set by worldConfig
  currentRealmBaseStats: {}, // Initialize as empty, will be populated in App.tsx
  worldConfig: null,
  companions: [],
  worldLore: [],
  pageSummaries: {},
  currentPageHistory: [1],
  lastSummarizedTurn: 0,
  turnHistory: [], // Added for rollback
  // New save system fields
  autoSaveTurnCounter: 0,
  currentAutoSaveSlotIndex: 0,
  autoSaveSlotIds: Array(MAX_AUTO_SAVE_SLOTS).fill(null),
  manualSaveId: null,
  manualSaveName: null,
};

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
    saveGameName: "", // Added default save game name
    theme: "",
    settingDescription: "",
    writingStyle: "",
    difficulty: "Thường",
    currencyName: "Linh Thạch",
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
    startingLocations: [],
    nsfwMode: false,
    originalStorySummary: "",
    heThongCanhGioi: "Phàm Nhân - Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần - Luyện Hư - Hợp Thể - Đại Thừa - Độ Kiếp", // Default realm system
    canhGioiKhoiDau: "Phàm Nhân Nhất Trọng", // Updated to new format
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
export const VIETNAMESE = {
    ...AllTranslations,
    saveGameNameLabel: "Tên File Lưu Game",
    saveGameNamePlaceholder: "Ví dụ: Cuộc phiêu lưu của [Tên Nhân Vật]",
    saveGameNameRequiredError: "Vui lòng nhập tên cho file lưu game.",
    exportWorldSettingsButton: "Xuất Thiết Lập Thế Giới",
    importWorldSettingsButton: "Nhập Thiết Lập Thế Giới",
    worldSettingsExportedSuccess: "Thiết lập thế giới đã được xuất thành công!",
    errorExportingWorldSettings: "Lỗi khi xuất thiết lập thế giới.",
    selectJsonFileForWorldSettings: "Chọn file .json chứa thiết lập thế giới:",
    worldSettingsImportedSuccess: "Thiết lập thế giới đã được nhập thành công!",
    errorImportingWorldSettings: "Lỗi khi nhập thiết lập thế giới. File có thể không hợp lệ.",
    invalidWorldSettingsFile: "File thiết lập thế giới không hợp lệ hoặc bị lỗi.",
    confirmImportWorldSettings: "Bạn có chắc muốn nhập thiết lập thế giới từ file? Các cài đặt hiện tại sẽ bị ghi đè.",
    autoSaveInProgress: "Đang tự động lưu...",
    autoSaveSuccess: (slotName: string) => `Game đã tự động lưu vào "${slotName}".`,
    autoSaveError: (slotName: string) => `Lỗi khi tự động lưu vào "${slotName}".`,
    manualSaveErrorNoName: "Không thể lưu, tên file lưu không được để trống.",
};

// Re-export with the original name PROMPT_TEMPLATES for compatibility
export const PROMPT_TEMPLATES = AllPrompts;