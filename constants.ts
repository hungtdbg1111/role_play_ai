

import { KnowledgeBase, PlayerStats, WorldSettings, SafetySetting, PlayerActionInputType, ResponseLength, ApiConfig, StartingSkill, StartingItem, StartingNPC, StartingLore, StorageType, FirebaseUserConfig, StorageSettings, GameMessage, Faction, StyleSettings, StartingLocation, RealmBaseStatDefinition, StartingFaction, EquipmentSlotId, EquipmentSlotConfig, GenreType } from './types';
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { VIETNAMESE as AllTranslations } from './translations'; 
import { PROMPT_FUNCTIONS as AllPrompts } from './prompts/index';
import * as GameTemplates from './templates';


export const GAME_TITLE = "Role Play AI";
export const APP_VERSION = "1.2.3"; // Version bump for Cloudinary API Key uploads
export const TURNS_PER_PAGE = 20; 
export const MAX_TURN_HISTORY_LENGTH = 30; 
export const MAX_TOKENS_FANFIC = 800000; 

export const SUB_REALM_NAMES = ["Nhất Trọng", "Nhị Trọng", "Tam Trọng", "Tứ Trọng", "Ngũ Trọng", "Lục Trọng", "Thất Trọng", "Bát Trọng", "Cửu Trọng", "Đỉnh Phong"];

// Save System Constants
export const AUTO_SAVE_INTERVAL_TURNS = 5;
export const MAX_AUTO_SAVE_SLOTS = 10;

export const CUSTOM_GENRE_VALUE = "Khác (Tự định nghĩa)";

// Define with 'as const' to break circular dependency for GenreType derivation
const _AVAILABLE_GENRES_LITERAL = [
  "Tu Tiên (Mặc định)",
  "Võ Hiệp",
  "Tiên Hiệp",
  "Huyền Huyễn",
  "Cung Đấu",
  "Linh Dị",
  "Khoa Huyễn",
  "Tây Phương Fantasy",
  "Ngôn Tình",
  "Đô Thị",
  "Mạt Thế",
  "Võng Du",
  "Thể Thao",
  "Kinh Dị",
  CUSTOM_GENRE_VALUE 
] as const;

// Export for use in types.ts and elsewhere
export const AVAILABLE_GENRES: typeof _AVAILABLE_GENRES_LITERAL = _AVAILABLE_GENRES_LITERAL;


export const DEFAULT_MORTAL_STATS: Pick<PlayerStats, 'baseMaxSinhLuc' | 'baseMaxLinhLuc' | 'baseSucTanCong' | 'baseMaxKinhNghiem' | 'realm' | 'linhLuc' | 'maxLinhLuc' | 'kinhNghiem' | 'maxKinhNghiem' | 'hieuUngBinhCanh' | 'activeStatusEffects'> = {
  baseMaxSinhLuc: 100,
  baseMaxLinhLuc: 0, // Mortals might not have mana/spirit energy
  baseSucTanCong: 10,
  baseMaxKinhNghiem: 100, // General experience or skill points
  realm: "Người Thường", // Default realm for mortals
  linhLuc: 0,
  maxLinhLuc: 0,
  kinhNghiem: 0,
  maxKinhNghiem: 100,
  hieuUngBinhCanh: false,
  activeStatusEffects: [],
};


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

  const baseMultiplier = 5.0; 
  const incMultiplier = 2.0;  

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
  baseMaxSinhLuc: 100,
  baseMaxLinhLuc: 50,
  baseSucTanCong: 10,
  baseMaxKinhNghiem: 100,

  sinhLuc: 100,
  maxSinhLuc: 100,
  linhLuc: 50,
  maxLinhLuc: 50,
  sucTanCong: 10,
  kinhNghiem: 0,
  maxKinhNghiem: 100, 
  realm: "Phàm Nhân Nhất Trọng", 
  currency: 0,
  isInCombat: false,
  turn: 0,
  hieuUngBinhCanh: false,
  activeStatusEffects: [],
};

export const INITIAL_KNOWLEDGE_BASE: KnowledgeBase = {
  playerStats: { ...DEFAULT_PLAYER_STATS },
  inventory: [],
  equippedItems: {
    mainWeapon: null,
    offHandWeapon: null,
    head: null,
    body: null,
    hands: null,
    legs: null,
    artifact: null,
    pet: null,
    accessory1: null,
    accessory2: null,
  },
  playerSkills: [],
  allQuests: [],
  discoveredNPCs: [],
  discoveredLocations: [],
  discoveredFactions: [],
  realmProgressionList: [], // Populated by worldConfig or defaults
  currentRealmBaseStats: {}, 
  worldConfig: null,
  companions: [],
  worldLore: [],
  pageSummaries: {},
  currentPageHistory: [1],
  lastSummarizedTurn: 0,
  turnHistory: [], 
  autoSaveTurnCounter: 0,
  currentAutoSaveSlotIndex: 0,
  autoSaveSlotIds: Array(MAX_AUTO_SAVE_SLOTS).fill(null),
  manualSaveId: null,
  manualSaveName: null,
  playerAvatarData: undefined, // Base64 data or Cloudinary URL post-upload
};

export const DEFAULT_WORLD_SETTINGS: WorldSettings = {
    saveGameName: "", 
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
    startingFactions: [], 
    nsfwMode: false,
    originalStorySummary: "",
    // Genre and Cultivation
    genre: AVAILABLE_GENRES[0], // Default to "Tu Tiên (Mặc định)"
    customGenreName: "", // Default empty
    isCultivationEnabled: true, // Default to enabled
    heThongCanhGioi: "Phàm Nhân - Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần - Luyện Hư - Hợp Thể - Đại Thừa - Độ Kiếp", 
    canhGioiKhoiDau: "Phàm Nhân Nhất Trọng", 
    playerAvatarUrl: undefined, 
};

// API Settings Constants
export const API_SETTINGS_STORAGE_KEY = 'daoDoAiApiSettings_v3'; // Incremented version
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Recommended)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Legacy)' }, // Kept for backward compatibility if needed
];
export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id; // Updated default to recommended model

export const AVAILABLE_IMAGE_MODELS = [
  { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Image Gen (Alternative)' },
  { id: 'imagen-3.0-generate-002', name: 'Imagen 3.0 (Recommended for Avatars)' }
];
export const DEFAULT_IMAGE_MODEL_ID = AVAILABLE_IMAGE_MODELS[0].id;

export const DEFAULT_API_KEY_SOURCE: 'system' | 'user' = 'system';
export const DEFAULT_AUTO_GENERATE_NPC_AVATARS = false; 

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
  imageModel: DEFAULT_IMAGE_MODEL_ID, // Added image model
  safetySettings: DEFAULT_SAFETY_SETTINGS,
  autoGenerateNpcAvatars: DEFAULT_AUTO_GENERATE_NPC_AVATARS, 
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
    fontSize: '16px', 
    textColor: '#F3F4F6', 
    backgroundColor: '#374151', 
  },
  playerAction: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '16px',
    textColor: '#FFFFFF', 
    backgroundColor: '#4F46E5', 
  },
  choiceButton: {
    fontFamily: 'Inter, sans-serif',
    fontSize: '14px', 
    textColor: '#D1D5DB', 
    backgroundColor: 'transparent', 
  },
  keywordHighlight: {
    fontFamily: undefined, 
    fontSize: undefined,   
    textColor: '#FACC15',  
    backgroundColor: undefined, 
  },
};

// Equipment Slot Configuration
export const EQUIPMENT_SLOTS_CONFIG: EquipmentSlotConfig[] = [
  { id: 'mainWeapon', labelKey: 'slotMainWeapon', accepts: [GameTemplates.EquipmentType.VU_KHI] },
  { id: 'offHandWeapon', labelKey: 'slotOffHandWeapon', accepts: [GameTemplates.EquipmentType.VU_KHI, GameTemplates.EquipmentType.PHAP_BAO] }, 
  { id: 'head', labelKey: 'slotHead', accepts: [GameTemplates.EquipmentType.GIAP_DAU] },
  { id: 'body', labelKey: 'slotBody', accepts: [GameTemplates.EquipmentType.GIAP_THAN] },
  { id: 'hands', labelKey: 'slotHands', accepts: [GameTemplates.EquipmentType.GIAP_TAY] },
  { id: 'legs', labelKey: 'slotLegs', accepts: [GameTemplates.EquipmentType.GIAP_CHAN] },
  { id: 'artifact', labelKey: 'slotArtifact', accepts: [GameTemplates.EquipmentType.PHAP_BAO] },
  { id: 'pet', labelKey: 'slotPet', accepts: [GameTemplates.EquipmentType.THU_CUNG] },
  { id: 'accessory1', labelKey: 'slotAccessory1', accepts: [GameTemplates.EquipmentType.TRANG_SUC] },
  { id: 'accessory2', labelKey: 'slotAccessory2', accepts: [GameTemplates.EquipmentType.TRANG_SUC] },
];

// Avatar Constants
export const FEMALE_AVATAR_BASE_URL = "https://res.cloudinary.com/drsm5jv45/image/upload/v1750815171/";
export const MAX_FEMALE_AVATAR_INDEX = 192;
export const MALE_AVATAR_PLACEHOLDER_URL = "https://via.placeholder.com/150/777777/FFFFFF?Text=Nam";

// Cloudinary Constants
export const CLOUDINARY_CLOUD_NAME = 'dropcqgvd'; // Provided by user

// **QUAN TRỌNG:** Cloudinary API Key và API Secret KHÔNG NÊN lưu trữ ở đây nếu sử dụng Netlify Functions.
// Thay vào đó, chúng nên được đặt làm BIẾN MÔI TRƯỜNG trong cài đặt Netlify của bạn:
// - CLOUDINARY_API_KEY
// - CLOUDINARY_API_SECRET
// Netlify Function (generate-cloudinary-signature.ts) sẽ đọc các biến môi trường này.
// Các giá trị dưới đây chỉ nên được coi là FALLBACK cho local dev nếu env vars không được set,
// và KHÔNG BAO GIỜ commit API Secret thật vào Git repository công khai.
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '1111'; // Fallback for local dev
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '1111'; // Fallback for local dev - DO NOT COMMIT REAL SECRET

// Tên thư mục mới cho Cloudinary uploads
export const CLOUDINARY_FOLDER_PLAYER = 'ai_rpg_avatars_player';
export const CLOUDINARY_FOLDER_NPC_MALE = 'ai_rpg_avatars_npc_male';
export const CLOUDINARY_FOLDER_NPC_WOMEN = 'ai_rpg_avatars_npc_women';


// Re-export the translations and prompts
export const VIETNAMESE = {
    ...AllTranslations,
    // Genre and Cultivation System
    genreLabel: "Thể Loại Thế Giới",
    customGenreNameLabel: "Nhập Tên Thể Loại Tự Định Nghĩa",
    customGenreNamePlaceholder: "Ví dụ: Cyberpunk Kiếm Hiệp, Horror Tu Chân...",
    enableCultivationSystemLabel: "Bật Hệ Thống Tu Luyện/Sức Mạnh Đặc Thù",
    cultivationSystemDisabledNote: "Khi tắt, nhân vật sẽ là người thường, không có cảnh giới/linh lực/kinh nghiệm tu luyện. Các chỉ số sẽ là cơ bản.",
    mortalRealmName: "Người Thường",
    noCultivationSystem: "Không có hệ thống tu luyện",
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

    startingFactionsSection: "Phe Phái Khởi Đầu",
    addStartingFaction: "+ Thêm Phe Phái",
    removeFaction: "Xóa Phe Phái",
    factionNameLabel: "Tên Phe Phái",
    factionDescriptionLabel: "Mô Tả Phe Phái",
    factionAlignmentLabel: "Chính/Tà",
    factionReputationLabel: "Uy Tín Ban Đầu (-100 đến 100)",

    equipmentScreenTitle: "Trang Bị Nhân Vật",
    equipmentButton: "Trang Bị",
    equipmentButtonShort: "Tr.Bị",
    equippedItemsSection: "Trang Bị Đang Dùng",
    equipmentInventorySection: "Trang Bị Trong Túi",
    playerStatsSection: "Chỉ Số Nhân Vật",
    dropHereToEquip: "Thả vào đây để trang bị",
    emptySlot: "Ô Trống",
    slotMainWeapon: "Vũ Khí Chính",
    slotOffHandWeapon: "Vũ Khí Phụ/Khiên",
    slotHead: "Giáp Đầu",
    slotBody: "Giáp Thân",
    slotHands: "Giáp Tay",
    slotLegs: "Giáp Chân",
    slotArtifact: "Pháp Bảo",
    slotPet: "Thú Cưng",
    slotAccessory1: "Trang Sức 1",
    slotAccessory2: "Trang Sức 2",
    dragToEquip: "Kéo thả để trang bị",
    itemEquipped: (itemName: string, slotName: string) => `${itemName} đã được trang bị vào ${slotName}.`,
    itemUnequipped: (itemName: string, slotName: string) => `${itemName} đã được gỡ khỏi ${slotName}.`,
    cannotEquipItem: (itemName: string, slotName: string, reason?: string) => `Không thể trang bị ${itemName} vào ${slotName}.${reason ? ` Lý do: ${reason}` : ''}`,
    invalidItemTypeForSlot: "Loại vật phẩm không phù hợp với ô này.",
    baseStatsLabel: "Chỉ số Cơ Bản",
    equipmentBonusLabel: "Cộng từ Trang Bị",
    totalStatsLabel: "Tổng Chỉ số",
    statDisplayFormat: (base: number, bonus: number, total: number) => `${total} (Cơ bản: ${base}, Trang bị: ${bonus > 0 ? '+' : ''}${bonus})`,

    craftingScreenTitle: "Luyện Chế Vật Phẩm",
    craftingButton: "Luyện Chế",
    craftingButtonShort: "L.Chế",
    desiredItemSection: "Vật Phẩm Muốn Luyện Chế",
    desiredItemCategoryLabel: "Loại Vật Phẩm Mong Muốn",
    desiredItemRequirementsLabel: "Yêu Cầu/Mô Tả Vật Phẩm",
    desiredItemRequirementsPlaceholder: "Ví dụ: Một thanh kiếm có khả năng gây bỏng, một bình đan dược hồi phục nhanh linh lực...",
    craftingMaterialsSection: "Nguyên Liệu Luyện Chế",
    addMaterialSlotButton: "+ Thêm Ô Nguyên Liệu",
    removeMaterialButton: "Xóa",
    dropMaterialHere: "Thả nguyên liệu vào đây",
    materialInventorySection: "Nguyên Liệu Trong Túi",
    craftItemButton: "Luyện Chế",
    craftingInProgress: "Đang luyện chế...",
    craftingSuccess: (itemName: string) => `Luyện chế thành công! Nhận được: ${itemName}.`,
    craftingFailure: "Luyện chế thất bại. Vật phẩm tạo ra không như ý.",
    materialsConsumed: (materialNames: string) => `Đã tiêu hao: ${materialNames}.`,
    notEnoughMaterials: "Không đủ nguyên liệu để luyện chế.",
    noMaterialsForCrafting: "Vui lòng chọn ít nhất một nguyên liệu để luyện chế.",
    errorCraftingItem: "Lỗi khi luyện chế vật phẩm.",
    selectItemCategory: "Chọn loại vật phẩm...",
    viewSentPromptButton: "Xem Prompt Đã Gửi (Tạo Thế Giới)",
    sentPromptModalTitle: "Prompt Đã Gửi Cho AI (Tạo Thế Giới)",
    statusEffectsSection: "Hiệu Ứng Hiện Tại",
    statusEffectApplied: (effectName: string) => `Bạn nhận được hiệu ứng: ${effectName}.`,
    statusEffectRemoved: (effectName: string) => `Hiệu ứng ${effectName} đã kết thúc.`,
    statusEffectDuration: (turns: number) => `(còn ${turns} lượt)`,
    statusEffectPermanent: "(Vĩnh viễn/Đặc biệt)",
    statusEffectTypeBuff: "Có Lợi",
    statusEffectTypeDebuff: "Bất Lợi",
    statusEffectTypeNeutral: "Trung Tính",
    npcGenderLabel: "Giới Tính NPC",
    npcRealmLabel: "Cảnh Giới NPC (Tùy chọn)",
    playerAvatarSectionTitle: "Ảnh Đại Diện Nhân Vật Chính",
    randomAvatarButtonLabel: "Chọn Ảnh Đại Diện Ngẫu Nhiên (Nữ)",
    uploadAvatarButtonLabel: "Tải Lên Ảnh Đại Diện",
    avatarPreviewLabel: "Xem trước:",
    npcAvatarLabel: "Ảnh đại diện NPC",
    changeAvatarButtonLabel: "Đổi Ảnh Đại Diện",
    removeUploadedAvatarButtonLabel: "Xóa Ảnh Đại Diện Hiện Tại",
    playerAvatarLabel: "Ảnh đại diện",
    aiAvatarPromptLabel: "Mô tả ảnh đại diện (AI)",
    aiAvatarPromptPlaceholder: "Ví dụ: một nữ hiệp tóc đen, mắt phượng, mặc áo giáp bạc...",
    generateAiAvatarButtonLabel: "Tạo Ảnh Đại Diện Bằng AI",
    generatingAiAvatarMessage: "Đang tạo ảnh đại diện bằng AI...",
    errorGeneratingAiAvatar: "Lỗi khi tạo ảnh đại diện bằng AI:",
    aiAvatarPromptRequiredError: "Vui lòng nhập mô tả cho ảnh đại diện để AI tạo.",
    autoGenerateNpcAvatarsLabel: "Tự động tạo ảnh NPC bằng AI (dùng Gemini & Cloudinary)",
    autoGenerateNpcAvatarsInfo: "Khi bật, hệ thống sẽ cố gắng tạo ảnh đại diện cho NPC mới dựa trên mô tả của họ và lưu trữ trên Cloudinary. Nếu tắt, ảnh NPC sẽ được chọn ngẫu nhiên (nếu có) hoặc dùng placeholder.",
    cloudinaryInfo: "Để sử dụng tính năng lưu trữ ảnh trên Cloudinary, bạn cần cấu hình Cloudinary Cloud Name trong constants.ts và đặt CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET làm biến môi trường trong Netlify. Việc lưu trữ API Secret ở client-side (trong constants.ts) rất không an toàn và chỉ nên dùng làm fallback tạm thời cho local development.",
    geminiImageModelLabel: "Chọn Model Tạo Ảnh (Cho Avatar)", // New translation
};

// Re-export with the original name PROMPT_TEMPLATES for compatibility
export const PROMPT_TEMPLATES = AllPrompts;
export const ALL_FACTION_ALIGNMENTS = Object.values(GameTemplates.FactionAlignment);
