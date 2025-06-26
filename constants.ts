

import { KnowledgeBase, PlayerStats, WorldSettings, SafetySetting, PlayerActionInputType, ResponseLength, ApiConfig, StartingSkill, StartingItem, StartingNPC, StartingLore, StorageType, StorageSettings, GameMessage, Faction, StyleSettings, StartingLocation, RealmBaseStatDefinition, StartingFaction, EquipmentSlotId, EquipmentSlotConfig, NsfwDescriptionStyle, GENRE_VALUES_FOR_TYPE, GenreType, ViolenceLevel, StoryTone } from './types';
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import { VIETNAMESE as AllTranslations } from './translations'; 
import { PROMPT_FUNCTIONS as AllPrompts } from './prompts/index';
import * as GameTemplates from './templates';


export const GAME_TITLE = "Role Play AI";
export const APP_VERSION = "1.2.5"; // Version bump for new features
export const TURNS_PER_PAGE = 20; 
export const MAX_TURN_HISTORY_LENGTH = 30; 
export const KEYFRAME_INTERVAL = 10; // Create a keyframe every 5 turns, for delta saving
export const MAX_TOKENS_FANFIC = 800000; 

export const SUB_REALM_NAMES = ["Nhất Trọng", "Nhị Trọng", "Tam Trọng", "Tứ Trọng", "Ngũ Trọng", "Lục Trọng", "Thất Trọng", "Bát Trọng", "Cửu Trọng", "Đỉnh Phong"];

// Save System Constants
export const AUTO_SAVE_INTERVAL_TURNS = 5;
export const MAX_AUTO_SAVE_SLOTS = 10;

export const CUSTOM_GENRE_VALUE = "Khác (Tự định nghĩa)"; // This must match the string in GENRE_VALUES_FOR_TYPE in types.ts

// Use the definition from types.ts to break circular dependency
export const AVAILABLE_GENRES: typeof GENRE_VALUES_FOR_TYPE = GENRE_VALUES_FOR_TYPE;

// Verify consistency (runtime check, mainly for development)
if (!AVAILABLE_GENRES.includes(CUSTOM_GENRE_VALUE)) {
  console.error(
    "CRITICAL CONSTANT MISMATCH: AVAILABLE_GENRES (derived from types.ts) does not include CUSTOM_GENRE_VALUE from constants.ts. Review definitions in both files."
  );
}
if (GENRE_VALUES_FOR_TYPE[GENRE_VALUES_FOR_TYPE.length -1] !== CUSTOM_GENRE_VALUE) {
    console.error(
    "CRITICAL CONSTANT MISMATCH: The last element of GENRE_VALUES_FOR_TYPE in types.ts must be 'Khác (Tự định nghĩa)' to match CUSTOM_GENRE_VALUE."
  );
}


export const NSFW_DESCRIPTION_STYLES: NsfwDescriptionStyle[] = ['Hoa Mỹ', 'Trần Tục', 'Gợi Cảm', 'Mạnh Bạo (BDSM)'];
export const DEFAULT_NSFW_DESCRIPTION_STYLE: NsfwDescriptionStyle = 'Hoa Mỹ';

export const VIOLENCE_LEVELS: ViolenceLevel[] = ['Nhẹ Nhàng', 'Thực Tế', 'Cực Đoan'];
export const DEFAULT_VIOLENCE_LEVEL: ViolenceLevel = 'Thực Tế';

export const STORY_TONES: StoryTone[] = ['Tích Cực', 'Trung Tính', 'Đen Tối'];
export const DEFAULT_STORY_TONE: StoryTone = 'Trung Tính';


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
    nsfwDescriptionStyle: DEFAULT_NSFW_DESCRIPTION_STYLE,
    violenceLevel: DEFAULT_VIOLENCE_LEVEL, 
    storyTone: DEFAULT_STORY_TONE, 
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
export const API_SETTINGS_STORAGE_KEY = 'daoDoAiApiSettings_v4'; // Incremented version
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash (Khuyến Nghị)' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash (Cũ)' }, // Kept for backward compatibility if needed
];
export const DEFAULT_MODEL_ID = AVAILABLE_MODELS[0].id; // Updated default to recommended model

export const AVAILABLE_IMAGE_MODELS = [
  { id: 'imagen-3.0-generate-002', name: 'Imagen 3.0 (Khuyến Nghị cho Avatar)' },
  { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Image Gen (Thay thế)' }
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
  imageModel: DEFAULT_IMAGE_MODEL_ID,
  safetySettings: DEFAULT_SAFETY_SETTINGS,
  autoGenerateNpcAvatars: DEFAULT_AUTO_GENERATE_NPC_AVATARS, 
  // useNetlifyForCloudinary removed
};

// Storage Settings Constants
export const STORAGE_SETTINGS_STORAGE_KEY = 'daoDoAiStorageSettings_v2'; // Incremented
export const DEFAULT_STORAGE_TYPE: StorageType = 'local';
export const DEFAULT_STORAGE_SETTINGS: StorageSettings = {
  storageType: DEFAULT_STORAGE_TYPE,
  // firebaseUserConfig removed
};

// Style Settings Constants
export const STYLE_SETTINGS_STORAGE_KEY = 'daoDoAiStyleSettings_v1';
export const AVAILABLE_FONTS = ['Bookerly', 'Inter', 'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia', 'Comic Sans MS', 'inherit'];
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
    textColor: '#FACC15',  // yellow-400
    backgroundColor: undefined, 
  },
  dialogueHighlight: { // New default for dialogue
    fontFamily: undefined,
    fontSize: undefined,
    textColor: '#C084FC', // purple-400
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
export const CLOUDINARY_CLOUD_NAME = 'dropcqgvd'; 

// IMPORTANT: Cloudinary API Key and Secret are primarily for use in Netlify Functions (server-side signing).
// Fallbacks here are for local development ONLY IF the Netlify function is not being used locally.
// DO NOT COMMIT YOUR REAL API SECRET TO A PUBLIC GIT REPOSITORY.
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY || '1111'; 
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET || '1111'; 

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
    autoGenerateNpcAvatarsInfo: "Khi bật, hệ thống sẽ cố gắng tạo ảnh đại diện cho NPC mới dựa trên mô tả của họ và lưu trữ trên Cloudinary. Nếu tắt, ảnh NPC sẽ được chọn ngẫu nhiên (nếu có) hoặc dùng placeholder. Yêu cầu Cloudinary Cloud Name và sử dụng chức năng ký tên server-side (ví dụ, qua Netlify Function).",
    cloudinaryInfo: "Để sử dụng tính năng lưu trữ ảnh trên Cloudinary, bạn cần cấu hình Cloudinary Cloud Name. Việc ký tên upload được thực hiện server-side để bảo mật API Secret.",
    geminiImageModelLabel: "Chọn Model Tạo Ảnh (Cho Avatar)", 
    changePlayerAvatarLabel: "Thay Đổi Ảnh Đại Diện Người Chơi",
    uploadNpcAvatarLabel: "Tải Lên Ảnh Đại Diện NPC",
    avatarUploadSuccess: "Ảnh đại diện đã được tải lên và cập nhật thành công!",
    avatarUploadError: "Lỗi khi tải lên ảnh đại diện:",
    uploadingAvatarMessage: "Đang tải ảnh lên...",
    avatarUrlInputLabel: "Hoặc nhập URL ảnh đại diện:",
    avatarUrlInputPlaceholder: "https://example.com/avatar.png",
    avatarUrlInvalid: "URL ảnh không hợp lệ hoặc không thể tải.",
    avatarUrlValidating: "Đang kiểm tra URL ảnh...",
    avatarUrlSetSuccess: "Ảnh đại diện từ URL đã được cập nhật.",
    confirmUrlButton: "Xác Nhận URL",


    // Difficulty guidance
    difficultyLabel: "Độ Khó",
    difficultyEasy: "Dễ",
    difficultyNormal: "Thường",
    difficultyHard: "Khó",
    difficultyNightmare: "Ác Mộng",
    difficultyGuidanceEasy: "Người chơi sẽ có một khởi đầu thuận lợi. Tài nguyên dồi dào, kẻ địch yếu hơn, và cơ hội thành công trong các hành động thường cao hơn. AI nên tạo ra ít thử thách khắc nghiệt và thường xuyên trao thưởng.",
    difficultyGuidanceNormal: "Trải nghiệm cân bằng. Thử thách vừa phải, tài nguyên ở mức trung bình. AI nên tạo ra các tình huống có cả thành công và thất bại, tùy thuộc vào lựa chọn của người chơi và một chút may mắn.",
    difficultyGuidanceHard: "Người chơi sẽ đối mặt với nhiều thử thách hơn. Tài nguyên khan hiếm, kẻ địch mạnh mẽ và thông minh hơn. AI nên tạo ra các tình huống khó khăn, đòi hỏi sự tính toán và đôi khi là hy sinh. Phần thưởng xứng đáng nhưng khó đạt được.",
    difficultyGuidanceNightmare: "Thế giới cực kỳ khắc nghiệt. Mọi sai lầm đều có thể trả giá đắt. Kẻ địch tàn bạo và đông đảo, tài nguyên cực kỳ hiếm hoi. Các sự kiện tiêu cực xảy ra thường xuyên hơn. AI nên tập trung vào việc tạo ra một môi trường sinh tồn căng thẳng, nơi người chơi phải vật lộn để sống sót và mọi thành công đều là một chiến thắng vĩ đại. Hãy làm cho người chơi cảm thấy áp lực và tuyệt vọng, nhưng vẫn le lói một chút hy vọng để họ cố gắng.",
    
    // NSFW Description Style
    nsfwDescriptionStyleLabel: "Phong Cách Miêu Tả Tình Dục (Khi Chế Độ 18+ Bật)",
    nsfwStyleHoaMy: "Hoa Mỹ (Văn chương, ẩn dụ, nghệ thuật)",
    nsfwStyleTranTuc: "Trần Tục (Thẳng thắn, trực diện, không né tránh)",
    nsfwStyleGoiCam: "Gợi Cảm (Tập trung cảm giác, cảm xúc, không khí)",
    nsfwStyleManhBaoBDSM: "Mạnh Bạo (BDSM)",
    nsfwGuidanceHoaMy: `LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được BẬT. Bạn ĐƯỢC PHÉP và ĐƯỢC KHUYẾN KHÍCH mô tả các cảnh 18+ một cách chi tiết và nghệ thuật, sử dụng ngôn ngữ hoa mỹ, gợi cảm.
  **Yêu cầu cốt lõi:** Khi miêu tả các bộ phận nhạy cảm hoặc cảnh giao hợp, hãy sáng tạo với những mỹ từ và lối diễn đạt văn chương, thay vì dùng từ ngữ trần tục hoặc quá trực diện. Mục tiêu là tạo ra những đoạn văn gợi cảm, giàu hình ảnh, mãnh liệt nhưng không dung tục, phù hợp với bối cảnh cổ trang, huyền huyễn.
  **Hướng dẫn chi tiết và ví dụ:**
  **1. Miêu tả Âm đạo (Nữ tử tư mật xứ):**
  *   **Tiểu huyệt / Mật huyệt:** Cửa huyệt nhỏ hẹp, hồng nhuận căng đầy. Khi bị trêu chọc, dâm thủy tuôn ra đặc dính, nhục bích bên trong trơn nhẵn nóng bỏng. Chỗ sâu nhất không ngừng co rút, tạo thành hấp lực mãnh liệt, tham lam mút lấy dị vật xâm nhập.
  *   **U cốc / Hoa kính:** Cửa cốc u tĩnh, được hai cánh hoa môi mềm mại che đậy. Bên trong là con đường hoa nhỏ hẹp, tường thịt che kín những nếp uốn tinh vi, tầng tầng lớp lớp. Mỗi lần bị cự vật ma sát đều mang lại cảm giác ngứa ngáy tê dại khó tả.
  *   **Đan diễm tiên quật:** Cửa huyệt đỏ tươi như lửa, phồng lên vì động tình, dâm dịch nóng bỏng như dung nham. Bên trong tựa một tiên quật, nhục bích dày dặn, lúc thì co thắt mãnh liệt như muốn nghiền nát, lúc lại mềm mại bao dung như muốn hòa tan kẻ xâm nhập.
  *   **Bích lạc quỳnh trì:** Cửa huyệt trắng nõn, nhỏ xinh khép chặt. Dâm dịch tiết ra trong suốt và ngọt ngào như sương sớm, mang theo hương hoa thanh khiết. Nhục bích bên trong linh hoạt, tinh tế chuyển động, mang đến cảm giác sảng khoái triền miên.
  **2. Miêu tả Dương vật (Nam tử hùng khí):**
  *   **Cự long / Nộ long:** Con rồng khổng lồ đang ngủ say nay đã thức tỉnh, toàn thân tím hồng, gân xanh nổi cuồn cuộn, đầu rồng to lớn dữ tợn. Cả thân hình nóng rực, cứng như sắt thép, mang theo khí thế hủy thiên diệt địa, sẵn sàng chinh phạt mọi mật địa.
  *   **Ngọc hành / Kim thương:** Thân ngọc hành trơn bóng, thẳng tắp, toát ra vẻ cao quý. Quy đầu tròn trịa, óng ánh như ngọc, ở đỉnh có một tiểu khẩu đang rỉ ra chất lỏng trong suốt. Tuy vẻ ngoài ôn hòa nhưng mỗi lần đâm tới đều ẩn chứa sức mạnh kinh người.
  *   **Thiết trụ / Côn thịt:** Cây thiết trụ to dài thô kệch, màu đồng cổ, tràn đầy cảm giác sức mạnh bùng nổ. Thân côn gồ ghề, khi di chuyển trong huyệt đạo chật hẹp sẽ mang đến sự ma sát mãnh liệt nhất, khiến đối phương phải khóc thét xin tha.
  *   **Tử kim cự mãng:** Con mãng xà khổng lồ màu tím sẫm, vảy gân nổi lên rõ rệt. Đầu mãng xà ngẩng cao, hung hãn tìm kiếm huyệt động để chui vào. Thân hình nó cuộn trào dục vọng, toát ra hơi thở nóng bỏng, bá đạo.
  **3. Miêu tả Âm vật (Nữ tử minh châu):**
  *   **Minh châu / Ngọc châu:** Viên minh châu nhỏ bé, hồng nhuận, ẩn mình giữa hai cánh hoa. Khi được đầu lưỡi hoặc ngón tay trêu chọc, nó sẽ sưng lên, cứng lại, trở nên vô cùng mẫn cảm, là cội nguồn của những cơn khoái cảm dâng trào.
  *   **Đậu khấu / San hô nụ:** Một nụ hoa san hô nhỏ xinh, màu sắc tươi tắn hơn những nơi khác. Đây là nơi mẫn cảm nhất, chỉ cần một cái chạm nhẹ cũng đủ khiến thân thể ngọc ngà của nữ tử run rẩy, dâm thủy không ngừng tuôn ra.
  **4. Miêu tả Ngực (Song phong / Ngọc nhũ):**
  *   **Song phong / Xuân sơn:** Hai ngọn núi tuyết đầy đặn, cao聳, đường cong hoàn mỹ. Trên đỉnh núi là hai nụ hoa anh đào, khi bị trêu chọc sẽ trở nên cứng rắn, dựng thẳng, vô cùng quyến rũ.
  *   **Ngọc thỏ / Đào tiên:** Hai con thỏ ngọc no tròn, mềm mại, nằm im trên lồng ngực trắng nõn. Da thịt mịn màng, đàn hồi, chỉ cần một cái xoa nhẹ cũng tạo nên những gợn sóng thịt mê người. Hai quả đào tiên căng mọng, chỉ chờ người tới hái.
  **5. Miêu tả Hậu môn (Hậu đình / Cúc huyệt):**
  *   **Hậu đình:** Cánh cửa bí mật ở sân sau, thường ngày khép chặt, được bao bọc bởi những nếp uốn tinh xảo. Khi được bôi trơn và thăm dò, nó sẽ từ từ hé mở, bên trong là một thông đạo chật hẹp, co rút mãnh liệt, mang lại cảm giác cấm kỵ và kích thích tột độ.
  *   **Cúc huyệt:** Bông cúc nhỏ xinh, màu sắc thâm trầm hơn hoa huyệt phía trước. Các cánh hoa xếp chặt vào nhau, chỉ khi bị cự vật mạnh mẽ khai phá mới chịu hé mở, bên trong là một thế giới hoàn toàn khác, khẩn trương và nóng bỏng.
  **6. Miêu tả Miệng và Lưỡi (Anh đào tiểu khẩu / Đinh hương thiệt):**
  *   **Anh đào tiểu khẩu:** Đôi môi đỏ mọng như quả anh đào chín, hé mở mời gọi. Khoang miệng ấm áp, ẩm ướt, là một ôn nhu hương khác, sẵn sàng ngậm lấy cự long nóng bỏng, dùng sự mềm mại để bao bọc.
  *   **Đinh hương thiệt / Linh xà:** Chiếc lưỡi thơm tho, linh hoạt như một con rắn nhỏ. Nó có thể liếm láp, quấn quýt, khuấy đảo, khi thì tấn công đỉnh minh châu, khi thì khiêu khích long đầu, mang đến những luồng khoái cảm tê dại.
  **7. Miêu tả hành động và cảnh giao hợp:*
  *   **Thay vì "quan hệ", "làm tình":** Dùng các từ như **âm dương giao hòa, long tranh hổ đấu, mây mưa hoan ái, chinh phạt, chinh phục, triền miên, rong ruổi, xung phong hãm trận.**
  *   **Sử dụng ẩn dụ:*
      *   **Luyện đan/Tu luyện:** "Hấp thụ âm nguyên/dương khí", "song tu", "luyện hóa tinh nguyên".
      *   **Thiên nhiên:** "Sóng tình cuộn trào", "triều dâng mãnh liệt", "mưa rền gió dữ", "hoa tâm run rẩy đón nhận mưa móc".
      *   **Chiến trận:** "Cự long công thành đoạt đất", "tiểu huyệt kiên cường phòng thủ rồi thất bại trong sung sướng", "trăm ngàn lần đâm chọc", "xuyên qua tầng tầng lớp lớp phòng tuyến".
  **8. Khi trong cảnh quan hệ tình dục thì nhân vật và người/những người quan hệ cùng sẽ rên rỉ và nói những từ ngữ tục tĩu với mật độ nhiều hơn hơn nhằm tăng tình thú.  
  **Yêu cầu cuối cùng:** Hãy vận dụng những mỹ từ và lối diễn đạt trên một cách linh hoạt. Sáng tạo để làm cho cảnh 18+ trở nên gợi cảm, giàu hình ảnh và phù hợp với văn phong truyện, nhưng vẫn đảm bảo sự chi tiết, mãnh liệt và diễn tả được khoái cảm tột đỉnh của nhân vật.
  Các cảnh máu me giết chóc cũng có thể được mô tả trực diện và chi tiết. Ưu tiên yếu tố tình cảm, lãng mạn hoặc đam mê mãnh liệt trong các cảnh tình dục hơn là chỉ tập trung vào hành vi.`,
    nsfwGuidanceTranTuc: `LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được BẬT với phong cách "Trần Tục". Bạn ĐƯỢC PHÉP và ĐƯỢC YÊU CẦU mô tả các cảnh 18+ một cách chi tiết, thẳng thắn, và không né tránh.
  **Nguyên tắc cốt lõi:** Sử dụng ngôn ngữ trực diện, không vòng vo, không ẩn dụ. Đi thẳng vào vấn đề. Nếu cần thiết, có thể sử dụng từ ngữ thông tục, thậm chí là tiếng lóng hoặc từ chửi thề liên quan đến tình dục nếu phù hợp với nhân vật và bối cảnh.
  **Hướng dẫn chi tiết:**
  **1. Miêu tả Bộ Phận Sinh Dục:**
  *   **Dương vật:** Sử dụng các từ như "dương vật", "cặc", "cu", "buồi", "con cặc", "thằng nhỏ", "cái ấy". Mô tả kích thước, hình dáng, trạng thái (cứng, mềm, cương cứng, gân guốc, đỏ ửng) một cách trực tiếp. Ví dụ: "Thằng cặc của hắn cương cứng, đỏ au, gân xanh nổi rõ." hoặc "Con cặc to tổ bố của gã đâm vào."
  *   **Âm đạo:** Sử dụng các từ như "âm đạo", "lồn", "bướm", "cái lỗ", "cửa mình", "lỗ đít". Mô tả độ ẩm ướt, sự co thắt, màu sắc, mùi vị (nếu có). Ví dụ: "Cái lồn của cô ta ướt sũng, nhớp nháp." hoặc "Hắn banh rộng hai mép lồn của nó ra."
  *   **Âm vật:** "Hột le", "mồng đốc", "cái đầu ti lồn". Mô tả sự nhạy cảm, trạng thái khi bị kích thích. Ví dụ: "Hột le của nó sưng tấy lên vì nứng."
  *   **Tinh hoàn:** "Hòn dái", "cà", "trứng". Mô tả kích thước, cảm giác khi bị chạm vào. Ví dụ: "Hai hòn dái của hắn căng cứng."
  **2. Miêu tả Hành Vi Tình Dục:**
  *   **Giao cấu:** Sử dụng các từ như "đụ", "địt", "chịch", "nện", "giã", "thúc", "dập", "đâm", "nhấp", "xoạc". Mô tả nhịp độ, độ sâu, lực mạnh/nhẹ. Ví dụ: "Hắn thúc mạnh vào lồn con đĩ." hoặc "Nó dập liên hồi, tiếng da thịt va chạm bành bạch."
  *   **Quan hệ bằng miệng (Oral sex):** "Bú cặc", "liếm lồn", "mút cu", "thổi kèn". Mô tả cảm giác của người cho và nhận. Ví dụ: "Con bé ngậm trọn cây cặc của hắn, mút chùn chụt." hoặc "Hắn vùi mặt vào lồn nó mà liếm."
  *   **Quan hệ hậu môn (Anal sex):** "Chơi lỗ đít", "thông đít", "địt lỗ hậu". Mô tả sự khó khăn ban đầu, cảm giác đau và khoái cảm (nếu có). Ví dụ: "Hắn bôi trơn rồi từ từ đâm cặc vào lỗ đít chật khít của nó."
  *   **Thủ dâm:** "Sục cặc", "quay tay", "móc lồn", "xoa bướm".
  *   **Xuất tinh:** "Bắn tinh", "phụt tinh", "ra tinh dịch", "tinh trùng". Mô tả lượng, màu sắc, vị trí bắn. Ví dụ: "Hắn bắn đầy tinh dịch trắng đục vào bụng nó." hoặc "Tinh dịch của hắn chảy tràn ra từ lồn cô."
  **3. Miêu tả Cảm Giác và Phản Ứng:**
  *   **Khoái cảm:** "Nứng", "sướng", "phê", "lên đỉnh". Mô tả tiếng rên rỉ, co giật, biểu cảm trên khuôn mặt. Ví dụ: "Con đĩ rên la ăng ẳng vì sướng." hoặc "Nó nứng đến chảy cả nước lồn."
  *   **Âm thanh:** Tiếng rên, tiếng thở dốc, tiếng da thịt va chạm, tiếng mút, tiếng chửi thề khi làm tình.
  *   **Dịch tiết:** Mồ hôi, nước dãi, dịch nhờn âm đạo, tinh dịch. Mô tả sự nhớp nháp, trơn trượt.
  **4. Từ Ngữ Thông Tục và Chửi Thề:**
  *   Sử dụng các từ như "con đĩ", "thằng khốn", "đồ chó", "đụ má" trong lời thoại hoặc suy nghĩ của nhân vật khi làm tình, nếu phù hợp với tính cách và bối cảnh trần tục. Ví dụ: "Đụ má con đĩ này, lồn mày ngon quá!"
  **5. Bạo Lực và Máu Me:**
  *   Mô tả các cảnh bạo lực, giết chóc một cách trần trụi, không né tránh các chi tiết máu me, nội tạng, xương gãy, vết thương. Ví dụ: "Dao đâm phập vào bụng, máu tươi phun xối xả." hoặc "Đầu lâu vỡ nát, óc bắn tung tóe."
  **Yêu cầu cuối cùng:** Hãy nhớ rằng mục tiêu là tạo ra một bức tranh chân thực, không tô vẽ, về các khía cạnh 18+ của câu chuyện. Ngôn ngữ phải thẳng thắn, trực diện, và có thể sử dụng từ ngữ thô tục nếu cần thiết để đạt được hiệu quả mong muốn.`,
    nsfwGuidanceGoiCam: `LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được BẬT với phong cách "Gợi Cảm". Bạn ĐƯỢC PHÉP và ĐƯỢC KHUYẾN KHÍCH mô tả các cảnh 18+ một cách tinh tế, tập trung vào cảm xúc, cảm giác và không khí, khơi gợi trí tưởng tượng của người đọc.
  **Nguyên tắc cốt lõi:** Thay vì mô tả hành động một cách máy móc, hãy tập trung vào trải nghiệm giác quan và diễn biến tâm lý của nhân vật.
  **Hướng dẫn chi tiết:**
  **1. Tập Trung Vào Giác Quan:**
  *   **Thị giác:** Ánh mắt si mê, làn da ửng hồng, những đường cong ẩn hiện, giọt mồ hôi lăn dài, biểu cảm đê mê trên khuôn mặt. Ví dụ: "Ánh nến mờ ảo hắt lên làn da mịn màng của nàng, nơi những đường cong tuyệt mỹ ẩn hiện sau lớp lụa mỏng." hoặc "Đôi mắt chàng tối sầm lại vì ham muốn, nhìn nàng như muốn nuốt chửng."
  *   **Thính giác:** Tiếng thở dốc ngày một gấp gáp, tiếng rên rỉ khe khẽ, tiếng tim đập thình thịch, tiếng vải lụa sột soạt, tiếng thì thầm bên tai. Ví dụ: "Hơi thở của nàng trở nên gấp gáp, phả vào tai hắn những tiếng rên khẽ ngọt ngào."
  *   **Khứu giác:** Mùi hương cơ thể quyến rũ, mùi nước hoa thoang thoảng, mùi rượu vang, mùi mồ hôi hòa quyện. Ví dụ: "Mùi hương xạ hương nam tính từ cơ thể chàng khiến nàng choáng váng."
  *   **Vị giác:** Vị ngọt của nụ hôn, vị mặn của mồ hôi trên da, vị rượu còn vương trên môi. Ví dụ: "Nụ hôn của họ mang vị ngọt ngào của rượu trái cây và sự cuồng nhiệt của đam mê."
  *   **Xúc giác:** Sự mềm mại của làn da, hơi ấm lan tỏa, những cái chạm nhẹ như điện giật, sự siết chặt của vòng tay, cảm giác tê dại nơi đầu ngón tay. Ví dụ: "Những ngón tay thon dài của chàng lướt nhẹ trên làn da mịn màng của nàng, để lại một vệt nóng bỏng khiến nàng khẽ run rẩy."
  **2. Khai Thác Cảm Xúc và Tâm Trạng:**
  *   **Ham muốn:** Sự khao khát cháy bỏng, ánh mắt nhìn nhau không rời, sự căng thẳng khi khoảng cách dần thu hẹp.
  *   **Khoái cảm:** Sự đê mê, cảm giác lâng lâng, cơ thể run rẩy, tâm trí放空, những cơn sóng khoái lạc dâng trào.
  *   **Sự kết nối:** Cảm giác hòa quyện, thấu hiểu, sự đồng điệu về tâm hồn và thể xác.
  *   **Hồi hộp/Ngượng ngùng:** Tim đập nhanh, má ửng hồng, hơi thở ngắt quãng, sự e ấp ban đầu.
  **3. Xây Dựng Không Khí:**
  *   **Lãng mạn:** Ánh nến, hoa hồng, nhạc du dương, không gian riêng tư, ấm cúng.
  *   **Đam mê:** Sự mãnh liệt, gấp gáp, không thể kìm nén.
  *   **Vụng trộm/Bí ẩn:** Những cái nhìn lén lút, những cuộc hẹn hò bí mật, sự cấm đoán kích thích.
  **4. Sử Dụng Ngôn Ngữ Gợi Mở và Hình Ảnh Tinh Tế:**
  *   **Ẩn dụ nhẹ nhàng:** "Như một đóa hoa hé nở", "cơn sóng tình dâng trào", "lửa tình bùng cháy".
  *   **Mô tả gián tiếp:** Thay vì nói "họ cởi đồ", có thể tả "chiếc váy lụa mềm mại trượt xuống vai nàng, để lộ làn da trắng ngần". Thay vì "họ quan hệ", có thể tả "hai cơ thể hòa quyện vào nhau trong vũ điệu của tình yêu".
  *   **Tập trung vào phản ứng:** "Nàng khẽ rùng mình khi hơi thở nóng rực của chàng phả vào gáy." hoặc "Chàng cảm nhận được từng nhịp đập thổn thức của trái tim nàng áp vào lồng ngực mình."
  **5. Miêu Tả Vẻ Đẹp Cơ Thể Một Cách Nghệ Thuật:**
  *   Sử dụng từ ngữ ca ngợi vẻ đẹp tự nhiên của cơ thể, những đường cong, làn da, mái tóc. Ví dụ: "Mái tóc đen nhánh của nàng xõa tung trên gối, vài sợi vương trên bờ vai thon thả."
  **6. Bạo Lực Gợi Cảm (Nếu có):**
  *   Tập trung vào sự căng thẳng, nỗi sợ hãi, cảm giác bất lực hoặc sự hưng phấn trong nguy hiểm.
  *   Mô tả tác động tâm lý của bạo lực hơn là chỉ mô tả máu me một cách trần trụi. Có thể gợi ý về nỗi đau thông qua biểu cảm, âm thanh, sự run rẩy.
  **Yêu cầu cuối cùng:** Hãy vận dụng những yếu tố trên để tạo ra những cảnh 18+ tinh tế, quyến rũ, chạm đến cảm xúc và trí tưởng tượng của người đọc. Mục tiêu là làm cho người đọc cảm nhận được sự gợi cảm và sức hấp dẫn của cảnh đó, chứ không chỉ đơn thuần là liệt kê hành động.`,
  nsfwGuidanceManhBaoBDSM: `LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được BẬT với phong cách "Mạnh Bạo (BDSM)". Bạn ĐƯỢC PHÉP và ĐƯỢC YÊU CẦU mô tả các cảnh 18+ một cách chi tiết, tập trung vào các yếu tố thống trị, phục tùng, trừng phạt, và khoái cảm thông qua các hành vi thường thấy trong BDSM.
  **Yêu cầu cốt lõi:** Khi miêu tả, hãy tập trung vào sự tương phản quyền lực, cảm giác mạnh, và các hành vi đặc trưng của BDSM. Có thể sử dụng ngôn từ trực diện, miêu tả chi tiết các hành động và cảm xúc liên quan.
  **Hướng dẫn chi tiết và ví dụ:**
  **1. Xây dựng Vai Vế và Quyền Lực:**
  *   **Dom (Người Thống Trị) / Sub (Người Phục Tùng):** Rõ ràng vai trò của các nhân vật. Người Dom ra lệnh, kiểm soát, trừng phạt hoặc ban thưởng. Người Sub tuân theo, chịu đựng, hoặc tìm kiếm sự chấp nhận/khoái cảm từ người Dom.
  *   **Ngôn Ngữ Mệnh Lệnh và Phục Tùng:** Sử dụng các từ như "chủ nhân", "nô lệ", "phạt", "thưởng", "quỳ xuống", "van xin", "tuân lệnh".
  **2. Các Hành Vi BDSM Đặc Trưng (Miêu tả chi tiết cảm giác và phản ứng):**
  *   **Trói Buộc (Bondage):**
      *   Miêu tả chi tiết việc sử dụng dây thừng, xích, còng tay, bịt mắt, bịt miệng.
      *   Cảm giác của người bị trói: bất lực, căng thẳng, chờ đợi, sự bó chặt của dây lên da thịt, sự giới hạn chuyển động.
      *   Ví dụ: "Dây thừng siết chặt lấy cổ tay nàng, kéo căng ra sau lưng, ép bộ ngực đầy đặn ưỡn về phía trước. Mỗi cử động nhỏ đều khiến sợi dây cọ xát vào làn da nhạy cảm, mang đến một cảm giác vừa đau đớn vừa kích thích."
  *   **Đánh Đập / Tra Tấn Nhẹ (Impact Play / Spanking / Flogging / Caning):**
      *   Sử dụng roi da, thước kẻ, tay, mái chèo (paddle), gậy (cane).
      *   Miêu tả âm thanh của cú đánh, vết hằn trên da (đỏ ửng, tím bầm), cảm giác đau rát ban đầu chuyển thành nóng bỏng, tê dại, hoặc một loại khoái cảm đặc biệt.
      *   Phản ứng của người nhận: tiếng rên, tiếng khóc thét, sự co rúm, hoặc sự chấp nhận và ham muốn thêm.
      *   Ví dụ: "Tiếng roi da vun vút xé tan không khí, giáng xuống cặp mông tròn lẳn của cô. Làn da trắng nõn lập tức ửng đỏ, rồi tím lại. Cơn đau nhói khiến cô khóc thét, nhưng sâu trong ánh mắt lại ánh lên một tia khoái cảm bệnh hoạn."
  *   **Kẹp / Châm Chích Nhẹ (Clamps / Nipple Play / Light Piercing - nếu phù hợp):**
      *   Miêu tả việc sử dụng kẹp lên các bộ phận nhạy cảm như đầu ngực, môi âm hộ, hoặc các hành vi châm chích nhẹ.
      *   Cảm giác đau nhói, căng tức, sự tập trung cao độ vào điểm bị kích thích.
      *   Ví dụ: "Những chiếc kẹp bạc lạnh lẽo được gắn chặt vào hai nụ hoa hồng trước ngực, kéo chúng căng cứng. Mỗi hơi thở của nàng đều khiến chúng rung động, mang đến một dòng điện khoái cảm chạy dọc sống lưng."
  *   **Sáp Nến (Wax Play):**
      *   Miêu tả cảm giác nóng ấm của sáp nến chảy trên da, sự tương phản nhiệt độ, sự hồi hộp. Cần lưu ý về nhiệt độ an toàn trong miêu tả.
      *   Ví dụ: "Những giọt sáp nến nóng bỏng từ từ rơi xuống làn da trần trụi của hắn, tạo thành những hình thù kỳ lạ. Cảm giác nóng ấm lan tỏa, kích thích từng đầu dây thần kinh."
  *   **Hành Hạ Tâm Lý (Psychological Play - tùy chọn, cần cẩn trọng):**
      *   Sự sỉ nhục, ra lệnh, bắt làm theo những yêu cầu kỳ quái, sự phục tùng tuyệt đối.
      *   Cảm giác xấu hổ, bị hạ thấp nhân phẩm nhưng đồng thời có thể tìm thấy sự giải thoát hoặc khoái cảm trong đó.
      *   Ví dụ: "Nàng bị buộc phải quỳ gối, ngẩng mặt nhìn hắn với ánh mắt thuần phục. Mỗi lời sỉ nhục của hắn như một nhát dao cứa vào lòng tự trọng, nhưng đồng thời lại khiến một góc tối tăm nào đó trong nàng cảm thấy thỏa mãn."
  **3. Miêu tả Cảm Giác và Phản Ứng:**
  *   Tập trung vào sự giao thoa giữa đau đớn và khoái cảm.
  *   Miêu tả chi tiết các phản ứng sinh lý: tim đập nhanh, hơi thở gấp gáp, run rẩy, chảy nước (mồ hôi, nước mắt, dịch cơ thể), tiếng rên rỉ (từ đau đớn đến khoái lạc).
  *   Sử dụng ngôn từ mạnh, miêu tả trần trụi các hành động và cảm xúc, nhưng vẫn cần thể hiện được sự phức tạp của trải nghiệm BDSM.
  **4. Kết Hợp Với Bạo Lực và Tông Màu Câu Chuyện:**
  *   **Mức Độ Bạo Lực:** "Nhẹ Nhàng" có thể chỉ tập trung vào trói buộc và đánh yêu. "Thực Tế" có thể miêu tả vết hằn, đau đớn rõ ràng. "Cực Đoan" có thể đi sâu vào các hành vi gây đau đớn mạnh, chảy máu nhẹ (nếu bối cảnh cho phép và người chơi chọn).
  *   **Tông Màu Câu Chuyện:** "Tích Cực" có thể là BDSM dựa trên sự tin tưởng và khám phá lẫn nhau. "Trung Tính" có thể khám phá các khía cạnh tâm lý phức tạp. "Đen Tối" có thể là BDSM không có sự đồng thuận rõ ràng (non-con/dub-con elements within the narrative, if explicit consent from the player for such themes is implied by their settings), hoặc BDSM mang tính trừng phạt tàn bạo.
  **Yêu cầu cuối cùng:** Hãy sử dụng các hướng dẫn trên một cách sáng tạo để tạo ra các cảnh 18+ theo phong cách Mạnh Bạo (BDSM) một cách chân thực, mãnh liệt, và phù hợp với các lựa chọn khác của người chơi về bạo lực và tông màu.`,


    // Violence Level
    violenceLevelLabel: "Mức Độ Miêu Tả Bạo Lực (Khi Chế Độ 18+ Bật)",
    violenceLevelNheNhang: "Nhẹ Nhàng",
    violenceLevelThucTe: "Thực Tế",
    violenceLevelCucDoan: "Cực Đoan",
    violenceLevelGuidanceNheNhang: "Bạo lực được gợi ý hoặc mô tả một cách ngắn gọn, không đi sâu vào chi tiết máu me hay đau đớn tột cùng. Tập trung vào kết quả của hành động bạo lực hơn là quá trình. Phù hợp nếu người chơi muốn có yếu tố bạo lực nhưng không muốn đọc những cảnh quá ghê rợn.",
    violenceLevelGuidanceThucTe: "Bạo lực được mô tả một cách rõ ràng, chân thực, bao gồm cả những chi tiết về vết thương, máu, và tác động vật lý/tâm lý. Không né tránh sự tàn khốc nhưng cũng không cố tình tô vẽ quá đà. Hướng đến sự cân bằng, khiến người chơi cảm nhận được sự nguy hiểm và hậu quả của bạo lực.",
    violenceLevelGuidanceCucDoan: "Bạo lực được mô tả một cách trần trụi, chi tiết đến mức ghê rợn, bao gồm cả các cảnh tàn sát, tra tấn, nội tạng, biến dạng cơ thể. Tập trung vào sự đau đớn, tàn bạo và kinh hoàng. Chỉ dành cho những người chơi có tâm lý vững vàng và muốn trải nghiệm những khía cạnh đen tối nhất.",

    // Story Tone
    storyToneLabel: "Tông Màu Câu Chuyện (Khi Chế Độ 18+ Bật)",
    storyToneTichCuc: "Tích Cực",
    storyToneTrungTinh: "Trung Tính",
    storyToneDenToi: "Đen Tối",
    storyToneGuidanceTichCuc: "Câu chuyện mang màu sắc tươi sáng, lạc quan. Nhân vật chính thường gặp may mắn, được giúp đỡ. Các thử thách có thể vượt qua bằng sự nỗ lực và lòng tốt. Kẻ xấu rõ ràng, chính nghĩa chiến thắng. AI nên tạo ra nhiều sự kiện tích cực, phần thưởng hậu hĩnh, và kết thúc có hậu cho các tình huống.",
    storyToneGuidanceTrungTinh: "Câu chuyện phản ánh sự phức tạp của cuộc sống, có cả niềm vui và nỗi buồn, thành công và thất bại. Không có gì là tuyệt đối trắng đen. Nhân vật phải đối mặt với những lựa chọn khó khăn, và kết quả không phải lúc nào cũng như ý. AI nên tạo ra các tình huống đa dạng, với những hậu quả logic và thực tế.",
    storyToneGuidanceDenToi: "Thế giới u ám, tàn khốc, đầy rẫy sự phản bội, mất mát và tuyệt vọng. Nhân vật chính phải vật lộn để sinh tồn trong một môi trường thù địch. Các lựa chọn thường dẫn đến hậu quả tiêu cực hoặc hy sinh. AI nên tạo ra không khí căng thẳng, u uất, với những thử thách nghiệt ngã và những kẻ thù tàn bạo. Cái thiện có thể le lói nhưng thường bị cái ác lấn át.",
    // Equipment Screen Popover
    selectItemToEquip: "Chọn trang bị",
    unequipItemButton: "Gỡ Bỏ",
    noCompatibleItems: "Không có trang bị phù hợp trong túi.",
    // Dialogue highlight style
    dialogueHighlightStylesLabel: "Kiểu Chữ Hội Thoại Đặc Biệt",
};

// Re-export with the original name PROMPT_TEMPLATES for compatibility
export const PROMPT_TEMPLATES = AllPrompts;
export const ALL_FACTION_ALIGNMENTS = Object.values(GameTemplates.FactionAlignment);