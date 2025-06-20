

import { KnowledgeBase, PlayerStats, WorldSettings, SafetySetting, PlayerActionInputType, ResponseLength, ApiConfig, StartingSkill, StartingItem, StartingNPC, StartingLore, StorageType, FirebaseUserConfig, StorageSettings, GameMessage, Faction, StyleSettings } from './types'; // Added Faction, StyleSettings
import { HarmCategory, HarmBlockThreshold } from "@google/genai"; 
import * as GameTemplates from './templates'; // For type hints in prompts

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
    nsfwMode: false,    
};

// API Settings Constants
export const API_SETTINGS_STORAGE_KEY = 'daoDoAiApiSettings_v2'; 
export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash-preview-04-17', name: 'Gemini 2.5 Flash (Recommended)' },
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


export const VIETNAMESE = {
  welcomeMessage: `Chào mừng đến với thế giới ${GAME_TITLE}! Một tựa game nhập vai phiêu lưu bằng chữ, nơi mọi diễn biến được tạo ra bởi AI. Hãy kiến tạo nhân vật và bắt đầu hành trình của riêng bạn!`,
  newGame: "Cuộc Phiêu Lưu Mới",
  loadGame: "Tải Game",
  gameUpdates: "Cập Nhật Game (Chưa hỗ trợ)",
  apiSettings: "Thiết Lập API Gemini", 
  storageSettings: "Cài Đặt Lưu Trữ", 
  characterName: "Tên Nhân Vật",
  gender: "Giới Tính",
  personality: "Tính Cách",
  backstory: "Tiểu Sử",
  goal: "Mục Tiêu",
  startingTraits: "Đặc Điểm Khởi Đầu Chung (ví dụ: 'Gia truyền một thanh kiếm cùn', 'Bẩm sinh thân thể yếu đuối nhưng tinh thần mạnh mẽ')",
  worldTheme: "Chủ Đề Thế Giới",
  worldSetting: "Bối Cảnh Chi Tiết",
  writingStyle: "Văn Phong AI",
  difficulty: "Độ Khó",
  currencyName: "Tên Tiền Tệ",
  startGame: "Bắt Đầu",
  enterAction: "Nhập hành động/Câu chuyện",
  sendAction: "Hành Động", 
  okButton: "OK", // Kept for reference, will be replaced
  aiSuggest: "AI Gợi Ý",
  storyLog: "Nhật Ký Hành Trình",
  playerStats: "Trạng Thái Nhân Vật",
  inventory: "Túi Đồ",
  skills: "Kỹ Năng",
  quests: "Nhiệm Vụ",
  generatingStory: "AI đang kiến tạo thế giới, xin chờ...",
  errorOccurred: "Đã có lỗi xảy ra:",
  apiKeyMissing: "Lỗi: API Key của Gemini (nguồn người dùng) chưa được cấu hình. Vui lòng vào 'Thiết Lập API Gemini' để cài đặt.",
  apiKeySystemUnavailable: "Lỗi: Không thể khởi tạo API Key của hệ thống Gemini. Vui lòng liên hệ quản trị viên hoặc kiểm tra cấu hình biến môi trường.",
  contactingAI: "Đang liên hệ với Thiên Đạo...",
  aiSuggestedOrTypeBelow: "AI gợi ý (hoặc tự nhập hành động/câu chuyện bên dưới):",
  characterPanelTitle: "Thông Tin Nhân Vật",
  questsPanelTitle: "Danh Sách Nhiệm Vụ",
  activeQuestsTab: "Đang Làm",
  completedQuestsTab: "Hoàn Thành",
  failedQuestsTab: "Thất Bại",
  noActiveQuests: "Không có nhiệm vụ nào đang thực hiện.",
  noCompletedQuests: "Chưa hoàn thành nhiệm vụ nào.",
  noFailedQuests: "Chưa có nhiệm vụ nào thất bại.",
  itemDetails: "Chi Tiết Vật Phẩm",
  skillDetails: "Chi Tiết Kỹ Năng",
  questDetails: "Chi Tiết Nhiệm Vụ",
  closeButton: "Đóng",
  characterButton: "Nhân Vật",
  questsButton: "Nhiệm Vụ",
  worldButton: "Thế Giới", 
  worldPanelTitle: "Thông Tin Thế Giới", 
  discoveredNPCsSection: "Nhân Vật Đã Gặp", 
  discoveredLocationsSection: "Địa Điểm Đã Biết", 
  worldLoreSection: "Tri Thức Về Thế Giới", 
  companionsSection: "Bạn Đồng Hành", 
  noNPCsDiscovered: "Chưa gặp gỡ NPC nào.", 
  noLocationsDiscovered: "Chưa khám phá địa điểm nào.", 
  noWorldLore: "Chưa có tri thức nào về thế giới này.", 
  noCompanions: "Bạn đang phiêu lưu một mình.", 
  npcDetails: "Chi Tiết NPC", 
  locationDetails: "Chi Tiết Địa Điểm", 
  loreDetails: "Chi Tiết Tri Thức", 
  companionDetails: "Chi Tiết Đồng Hành", 
  nsfwModeLabel: "Chế Độ Người Lớn (18+)", 
  inputTypeActionLabel: "Hành động",
  inputTypeStoryLabel: "Câu chuyện",
  inputTypeToggleTooltipAction: "Chế độ nhập: Hành động. Nhấn để chuyển sang 'Câu chuyện'",
  inputTypeToggleTooltipStory: "Chế độ nhập: Câu chuyện. Nhấn để chuyển sang 'Hành động'",
  apiSettingsTitle: "Thiết Lập API Gemini",
  apiKeySourceLabel: "Nguồn API Key Gemini",
  apiKeySourceSystem: "Sử dụng API Key Gemini của Hệ Thống (Mặc định)",
  apiKeySourceUser: "Sử dụng API Key Gemini Cá Nhân",
  geminiUserApiKeyLabel: "Khóa API Gemini Cá Nhân",
  geminiApiKeyPlaceholder: "Nhập khóa API của bạn tại đây",
  geminiModelLabel: "Chọn Model Gemini",
  saveSettingsButton: "Lưu Thiết Lập",
  settingsSavedMessage: "Thiết lập API đã được lưu thành công!",
  apiKeyRequiredError: "Vui lòng nhập API Key Gemini cá nhân của bạn.",
  goBackButton: "Quay Lại",
  apiInfoSystem: "Ứng dụng sẽ sử dụng API Key Gemini được cấu hình sẵn bởi hệ thống. API Key này được quản lý tập trung và bạn không cần nhập.",
  apiInfoUser: "API Key Gemini cá nhân của bạn sẽ được lưu trữ cục bộ trong trình duyệt và chỉ được sử dụng để gửi yêu cầu trực tiếp đến Google AI.",
  safetySettingsLabel: "Cài Đặt An Toàn Nội Dung (Gemini)",
  thresholdLabel: "Ngưỡng Chặn",
  saveGameButton: "Lưu Game",
  loadGameButton: "Tải Game",
  deleteSaveButton: "Xóa Lưu",
  confirmDeleteSaveMessage: "Bạn có chắc chắn muốn xóa file lưu này không? Hành động này không thể hoàn tác.",
  gameSavedSuccess: "Game đã được lưu thành công!",
  gameLoadedSuccess: "Game đã được tải thành công!",
  gameDeletedSuccess: "File lưu đã được xóa thành công!",
  errorSavingGame: "Lỗi khi lưu game.",
  errorLoadingGame: "Lỗi khi tải game.",
  errorDeletingGame: "Lỗi khi xóa file lưu.",
  noSaveGamesFound: "Không tìm thấy file lưu nào.",
  loadGameScreenTitle: "Chọn File Lưu Game",
  saveSlots: "Các Ô Lưu",
  lastSaved: "Lần cuối lưu",
  signInRequiredForLoad: "Vui lòng đăng nhập để tải game (nếu sử dụng lưu trữ đám mây).",
  signInRequiredForSave: "Vui lòng đăng nhập để lưu game (nếu sử dụng lưu trữ đám mây).",
  signingInAnonymously: "Đang đăng nhập ẩn danh...",
  signOutButton: "Đăng Xuất",
  signedInAsGuest: "Đã đăng nhập với tư cách Khách",
  responseLengthLabel: "Độ dài",
  responseLength_default: "Mặc định",
  responseLength_short: "Ngắn",
  responseLength_medium: "Trung bình",
  responseLength_long: "Dài",
  responseLengthButtonText: (length: ResponseLength): string => {
    switch (length) {
      case 'short': return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_short}`;
      case 'medium': return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_medium}`;
      case 'long': return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_long}`;
      default: return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_default}`;
    }
  },
  startingSkillsSection: "Kỹ Năng Khởi Đầu",
  addStartingSkill: "+ Thêm Kỹ Năng",
  removeSkill: "Xóa Kỹ Năng",
  skillNameLabel: "Tên Kỹ Năng",
  skillDescriptionLabel: "Mô Tả Kỹ Năng",
  startingItemsSection: "Vật Phẩm Khởi Đầu",
  addStartingItem: "+ Thêm Vật Phẩm",
  removeItem: "Xóa Vật Phẩm",
  itemNameLabel: "Tên Vật Phẩm",
  itemDescriptionLabel: "Mô Tả Vật Phẩm",
  itemQuantityLabel: "Số Lượng",
  itemTypeLabel: "Loại Vật Phẩm (ví dụ: Đan dược, Pháp bảo, Linh thảo, Phù lục)",
  startingNPCsSection: "NPC Khởi Đầu",
  addStartingNPC: "+ Thêm NPC",
  removeNPC: "Xóa NPC",
  npcNameLabel: "Tên NPC",
  npcPersonalityLabel: "Tính Cách NPC",
  npcAffinityLabel: "Độ Thiện Cảm (-100 đến 100)",
  npcDetailsLabel: "Chi Tiết NPC",
  startingLoreSection: "Tri Thức Thế Giới Khởi Đầu",
  addStartingLore: "+ Thêm Tri Thức",
  removeLore: "Xóa Tri Thức",
  loreTitleLabel: "Tiêu Đề Tri Thức",
  loreContentLabel: "Nội Dung Tri Thức",
  storyIdeaGeneratorSection: "Ý Tưởng Cốt Truyện Ban Đầu (AI Hỗ Trợ)",
  storyIdeaDescriptionLabel: "Mô tả ý tưởng cốt truyện của bạn:",
  storyIdeaDescriptionPlaceholder: "Ví dụ: Một thiếu niên mồ côi vô tình nhặt được một bí kíp võ công thất truyền trong một khu rừng cổ xưa, từ đó bước vào con đường tu tiên đầy thử thách và khám phá ra bí mật về thân thế của mình...",
  generateDetailsFromStoryButton: "Phân Tích & Tạo Chi Tiết Thế Giới",
  generatingWorldDetails: "AI đang phân tích và tạo chi tiết thế giới...",
  worldDetailsGeneratedSuccess: "AI đã tạo xong chi tiết thế giới! Vui lòng xem và chỉnh sửa bên dưới nếu cần.",
  errorGeneratingWorldDetails: "Lỗi khi AI tạo chi tiết thế giới.",
  // Fanfiction Generator
  fanficStoryGeneratorSection: "Ý Tưởng Đồng Nhân / Fanfiction (AI Hỗ Trợ)",
  fanficSourceTypeLabel: "Nguồn Tạo Đồng Nhân",
  fanficSourceTypeName: "Dựa trên Tên Truyện Gốc",
  fanficSourceTypeFile: "Dựa trên File TXT Truyện Gốc",
  fanficStoryNameLabel: "Tên Truyện Gốc",
  fanficStoryNamePlaceholder: "Ví dụ: Tru Tiên, Phàm Nhân Tu Tiên...",
  fanficFileUploadLabel: "Tải Lên File TXT Truyện Gốc (.txt)(Tầm<3MB vì giới hạn 800000 token)",
  fanficPlayerDescriptionLabel: "Mô tả thêm về ý tưởng đồng nhân của bạn (tùy chọn)",
  fanficPlayerDescriptionPlaceholder: "Ví dụ: Nhân vật chính là một đệ tử ngoại môn của Thanh Vân Môn sau sự kiện Trương Tiểu Phàm xuống núi...",
  generateFanficButton: "Phân Tích & Tạo Đồng Nhân",
  generatingFanficDetails: "AI đang phân tích và tạo chi tiết đồng nhân...",
  fanficDetailsGeneratedSuccess: "AI đã tạo xong chi tiết đồng nhân! Vui lòng xem và chỉnh sửa.",
  errorGeneratingFanficDetails: "Lỗi khi AI tạo chi tiết đồng nhân.",
  tokenCountLabel: "Số token ước tính:",
  tokenCountCalculating: "Đang tính số token...",
  tokenCountError: "Lỗi khi tính số token.",
  tokenCountExceededError: (max: number) => `Lỗi: File quá lớn. Số token vượt quá giới hạn ${max.toLocaleString()}.`,
  pleaseSelectFile: "Vui lòng chọn một file .txt.",
  pleaseEnterStoryName: "Vui lòng nhập tên truyện gốc.",
  pleaseProvideFanficSource: "Vui lòng cung cấp tên truyện hoặc tải file TXT.",

  storageSettingsTitle: "Cài Đặt Lưu Trữ Dữ Liệu Game",
  storageTypeLabel: "Chọn Phương Thức Lưu Trữ",
  storageTypeLocal: "Lưu Trữ Cục Bộ (IndexedDB)",
  storageTypeCloud: "Lưu Trữ Đám Mây (Firebase - Tùy Chỉnh)",
  storageInfoLocal: "Dữ liệu game sẽ được lưu trữ trực tiếp trong trình duyệt của bạn bằng IndexedDB. Dữ liệu này có thể bị mất nếu bạn xóa bộ nhớ cache của trình duyệt, sử dụng chế độ ẩn danh, hoặc chuyển trình duyệt/thiết bị.",
  storageInfoCloud: "Dữ liệu game sẽ được lưu trữ trên dự án Firebase của riêng bạn. Vui lòng cung cấp đầy đủ thông tin cấu hình Firebase bên dưới. Thông tin này sẽ được lưu trữ cục bộ trong trình duyệt và được dùng để kết nối đến dịch vụ Firebase của bạn.",
  firebaseConfigSectionTitle: "Cấu Hình Firebase (Tùy Chỉnh)",
  firebaseApiKeyLabel: "Firebase API Key",
  firebaseAuthDomainLabel: "Firebase Auth Domain",
  firebaseProjectIdLabel: "Firebase Project ID",
  firebaseStorageBucketLabel: "Firebase Storage Bucket",
  firebaseMessagingSenderIdLabel: "Firebase Messaging Sender ID",
  firebaseAppIdLabel: "Firebase App ID",
  firebaseMeasurementIdLabel: "Firebase Measurement ID (Tùy chọn)",
  firebaseConfigRequiredError: "Vui lòng điền đầy đủ các trường cấu hình Firebase bắt buộc.",
  storageSettingsSavedMessage: "Cài đặt lưu trữ đã được lưu. Vui lòng tải lại trang để áp dụng đầy đủ các thay đổi nếu bạn đã thay đổi cấu hình Firebase.",
  errorInitializingStorage: "Lỗi khởi tạo dịch vụ lưu trữ. Vui lòng kiểm tra cài đặt.",
  localSaveWarning: "Cảnh báo: Lưu trữ cục bộ có thể không ổn định hoặc bị giới hạn dung lượng trên một số trình duyệt. Nên thường xuyên sao lưu (nếu có tính năng) hoặc sử dụng lưu trữ đám mây để đảm bảo an toàn dữ liệu.",
  importExportData: "Nhập/Xuất Dữ Liệu Lưu",
  importExportScreenTitle: "Quản Lý Nhập/Xuất Dữ Liệu Lưu Game",
  exportSectionTitle: "Xuất Dữ Liệu Game (JSON)",
  selectSaveToExport: "Chọn file lưu để xuất:",
  exportSelectedButton: "Xuất File Đã Chọn",
  exportingData: "Đang xuất dữ liệu...",
  dataExportedSuccess: "Dữ liệu đã được xuất thành công!",
  errorExportingData: "Lỗi khi xuất dữ liệu.",
  noSaveSelectedForExport: "Vui lòng chọn một file lưu để xuất.",
  importSectionTitle: "Nhập Dữ liệu Game từ File JSON",
  selectJsonFile: "Chọn file .json để nhập:",
  importFileButton: "Nhập File Đã Chọn",
  importingData: "Đang nhập dữ liệu...",
  dataImportedSuccess: "Dữ liệu đã được nhập thành công! File lưu mới đã được tạo.",
  errorImportingData: "Lỗi khi nhập dữ liệu.",
  invalidJsonFile: "File không hợp lệ hoặc không đúng định dạng JSON của game.",
  noFileSelectedForImport: "Vui lòng chọn một file JSON để nhập.",
  // Pagination
  previousPage: "Trang Trước",
  nextPage: "Trang Sau",
  goToPage: "Đi Tới Trang",
  pageIndicator: (current: number, total: number) => `Trang ${current} / ${total}`,
  summarizingPage: "Đang tóm tắt trang...",
  summarizingAndPreparingNextPage: "Đang tóm tắt và chuẩn bị lượt tiếp theo...",
  creatingMissingSummary: "Đang tạo tóm tắt còn thiếu...",
  pageSummaryTitle: (pageNumber: number) => `Tóm Tắt Trang ${pageNumber}`,
  // Rollback & Stop
  rollbackTurn: "Lùi Lượt", // Old label, Dừng will be used primarily
  cannotRollbackFurther: "Không thể lùi lượt thêm.",
  rollbackSuccess: "Đã lùi về lượt trước thành công.",
  actionStoppedAndRolledBack: "Đã dừng và lùi về trạng thái trước đó.",
  actionStopErrorNoHistory: "Không thể dừng và lùi lượt (lịch sử rỗng hoặc lỗi).",
  initialStoryStopWarning: "Đã dừng tạo truyện. Có thể cần bắt đầu lại.",
  stopButton: "Dừng/Lùi Lượt",
  sendInputButton: "Gửi",
  sendingAction: "Đang gửi...",
  // Auto Play
  autoPlayButton: "Tự động chơi",
  stopAutoPlayButton: "Dừng Tự Động",
  autoSavingNotification: "Đã tự động lưu game.",
  autoPlayEnabledNotification: "Đã bật chế độ tự động chơi.",
  autoPlayDisabledNotification: "Đã tắt chế độ tự động chơi.",
  // File Size
  fileSizeLabel: "Dung lượng",
  // Gameplay Style Settings
  gameplaySettingsButton: "Cài Đặt Hiển Thị",
  displaySettingsTitle: "Cài Đặt Hiển Thị Gameplay",
  fontFamilyLabel: "Font Chữ",
  fontSizeLabel: "Cỡ Chữ",
  textColorLabel: "Màu Chữ",
  backgroundColorLabel: "Màu Nền",
  narrationStylesLabel: "Diễn Biến AI",
  playerActionStylesLabel: "Hành Động Người Chơi",
  choiceButtonStylesLabel: "Nút Lựa Chọn AI",
  keywordHighlightStylesLabel: "Chữ Từ Khóa Nổi Bật", // New
  resetToDefaultsButton: "Khôi Phục Mặc Định",
  applySettingsButton: "Áp Dụng",
};

export interface GeneratedWorldElements {
  startingSkills: StartingSkill[];
  startingItems: StartingItem[];
  startingNPCs: StartingNPC[];
  startingLore: StartingLore[];
  playerName?: string;
  playerPersonality?: string;
  playerBackstory?: string;
  playerGoal?: string;
  playerStartingTraits?: string;
  worldTheme?: string;
  worldSettingDescription?: string;
  worldWritingStyle?: string;
  currencyName?: string;
}

export const PROMPT_TEMPLATES = {
  initial: (worldConfig: WorldSettings): string => `
Bạn là một Đại Năng kể chuyện, chuyên sáng tác tiểu thuyết tiên hiệp / tu tiên bằng tiếng Việt.
Nhiệm vụ của bạn là tạo ra một thế giới tu tiên sống động và một cốt truyện hấp dẫn dựa trên thông tin người chơi cung cấp.

**THÔNG TIN THẾ GIỚI VÀ NHÂN VẬT:**
Thế giới:
- Chủ đề: ${worldConfig.theme}
- Bối cảnh: ${worldConfig.settingDescription}
- Văn phong: ${worldConfig.writingStyle}
- Độ khó: ${worldConfig.difficulty}
- Tiền tệ: ${worldConfig.currencyName}

Nhân vật:
- Tên: ${worldConfig.playerName}
- Giới tính: ${worldConfig.playerGender}
- Tính cách: ${worldConfig.playerPersonality}
- Tiểu sử: ${worldConfig.playerBackstory}
- Mục tiêu: ${worldConfig.playerGoal}
- Đặc điểm khởi đầu chung (nếu có): ${worldConfig.playerStartingTraits}
- Kỹ năng khởi đầu cụ thể:
${worldConfig.startingSkills && worldConfig.startingSkills.length > 0 ? worldConfig.startingSkills.map(skill => `  - ${skill.name}: ${skill.description}`).join('\n') : "  Không có kỹ năng khởi đầu cụ thể."}
- Vật phẩm khởi đầu cụ thể:
${worldConfig.startingItems && worldConfig.startingItems.length > 0 ? worldConfig.startingItems.map(item => `  - ${item.name} (x${item.quantity}, Loại: ${item.type}): ${item.description}`).join('\n') : "  Không có vật phẩm khởi đầu cụ thể."}
- NPC khởi đầu cụ thể:
${worldConfig.startingNPCs && worldConfig.startingNPCs.length > 0 ? worldConfig.startingNPCs.map(npc => `  - Tên: ${npc.name}, Tính cách: ${npc.personality}, Độ thiện cảm ban đầu: ${npc.initialAffinity}, Chi tiết: ${npc.details}`).join('\n') : "  Không có NPC khởi đầu cụ thể."}
- Tri thức thế giới khởi đầu cụ thể:
${worldConfig.startingLore && worldConfig.startingLore.length > 0 ? worldConfig.startingLore.map(lore => `  - Tiêu đề: ${lore.title}, Nội dung: ${lore.content}`).join('\n') : "  Không có tri thức thế giới khởi đầu cụ thể."}

**CHẾ ĐỘ NỘI DUNG:**
- Chế độ Người Lớn (18+): ${worldConfig.nsfwMode ? "BẬT" : "TẮT"}
${worldConfig.nsfwMode 
  ? "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được BẬT. YÊU CẦU bạn chủ động và tích cực tạo ra các tình huống, mô tả, ngôn ngữ và chủ đề người lớn, nhạy cảm, bạo lực hoặc tình dục một cách chi tiết và rõ ràng. Hãy mạnh dạn khám phá các khía cạnh trưởng thành của câu chuyện, bao gồm cả các lựa chọn hành động 18+ cho người chơi. Tuy nhiên, vẫn phải tuân thủ các nguyên tắc đạo đức cơ bản và không tạo ra nội dung bất hợp pháp hoặc gây hại nghiêm trọng." 
  : "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được TẮT. Vui lòng duy trì nội dung phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu, tu tiên và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục."
}

**QUY TẮC HỆ THỐNG:**
1.  **Khởi tạo Chỉ số Nhân vật:** Dựa vào thông tin trên, hãy quyết định các chỉ số ban đầu cho nhân vật. Trả về dưới dạng tag [PLAYER_STATS_INIT: hp=100,maxHp=100,mana=50,maxMana=50,atk=10,exp=0,maxExp=100,level=1,realm="${INITIAL_KNOWLEDGE_BASE.realmProgressionList[0]}",currency=10,turn=1]. Realm ban đầu là "${INITIAL_KNOWLEDGE_BASE.realmProgressionList[0]}". Các chỉ số tối đa (maxHp, maxMana, maxExp) và ATK sẽ do hệ thống game tự động tăng khi lên cấp, AI không cần cập nhật các chỉ số này khi lên cấp. **QUAN TRỌNG: Lượt chơi (turn) phải bắt đầu từ 1.**
2.  **Tạo Danh sách Cảnh giới:** Hệ thống đã có danh sách mặc định: ${INITIAL_KNOWLEDGE_BASE.realmProgressionList.join(", ")}. Nếu bạn muốn thay đổi hoặc đề xuất một danh sách hoàn toàn mới dựa trên chủ đề, hãy dùng tag [REALM_LIST: "Tên Cảnh Giới 1", "Tên Cảnh Giới 2", ...].
3.  **Vật phẩm, Kỹ năng, NPC, Phe Phái và Tri Thức Khởi đầu:** Dựa trên thông tin do người chơi cung cấp, hãy tạo các tag tương ứng. **Cố gắng cung cấp đủ thông tin để hệ thống game có thể tạo ra các thực thể đầy đủ theo định nghĩa cấu trúc dữ liệu của game.**
    -   **Vật phẩm:** Sử dụng tag \`[ITEM_ACQUIRED: name="Tên", type="Loại vật phẩm (rõ ràng, vd: Kiếm, Giáp Thân, Đan Hồi Phục, Linh Thảo)", description="Mô tả chi tiết, bao gồm cả các chỉ số cộng thêm như 'tăng 10 tấn công, +50 HP' nếu là trang bị, hoặc hiệu ứng nếu là đan dược", quantity=SốLượng, rarity="Phổ Thông/Hiếm/Quý Báu...", value=GiáTrịVàngNếuBiết]\`. Ví dụ: \`[ITEM_ACQUIRED: name="Trường Kiếm Sắt", type="Vũ Khí Kiếm", description="Một thanh trường kiếm bằng sắt, tăng 5 điểm tấn công.", quantity=1, rarity="Phổ Thông", value=10]\`.
        ${worldConfig.startingItems && worldConfig.startingItems.map(item => `[ITEM_ACQUIRED: name="${item.name.replace(/"/g, '\\"')}",type="${item.type.replace(/"/g, '\\"')}",description="${item.description.replace(/"/g, '\\"')}",quantity=${item.quantity}, rarity="Phổ Thông"]`).join('\n')}
    -   **Kỹ năng:** Sử dụng tag \`[SKILL_LEARNED: name="Tên Kỹ Năng", type="Loại kỹ năng (vd: ${GameTemplates.SkillType.CHUDONG_TANCONG}, ${GameTemplates.SkillType.BIDONG})", description="Mô tả chung về kỹ năng", effect="Mô tả hiệu ứng chi tiết của kỹ năng, bao gồm sát thương cơ bản, lượng hồi phục, tiêu hao mana, thời gian hồi chiêu nếu có.", manaCost=SốMana, baseDamage=SátThươngCơBản, healingAmount=LượngHồiPhục, cooldown=SốLượtHồi]\`. Ví dụ: \`[SKILL_LEARNED: name="Hỏa Cầu Thuật", type="${GameTemplates.SkillType.CHUDONG_TANCONG}", description="Tạo một quả cầu lửa tấn công kẻ địch.", effect="Gây 15 sát thương Hỏa.", manaCost=10, baseDamage=15, cooldown=0]\`.
        ${worldConfig.startingSkills && worldConfig.startingSkills.map(skill => `[SKILL_LEARNED: name="${skill.name.replace(/"/g, '\\"')}",type="Khởi đầu",description="${skill.description.replace(/"/g, '\\"')}",effect="${skill.description.replace(/"/g, '\\"')}", manaCost=0, baseDamage=0, healingAmount=0, cooldown=0]`).join('\n')}
    -   **NPC:** Sử dụng tag \`[LORE_NPC: name="Tên NPC", description="Mô tả chi tiết về NPC, bao gồm vai trò, tiểu sử ngắn.", personality="Tính cách1, Tính cách2", affinity=ĐộThiệnCảmBanĐầu, factionId="ID Phe (nếu có)", hp=SốHP, atk=SốCông]\`. Ví dụ: \`[LORE_NPC: name="Lão Tửu Quỷ", description="Một lão già bí ẩn hay say xỉn ở quán trọ, có vẻ biết nhiều chuyện.", personality="Bí ẩn, Ham rượu", affinity=0, hp=50, atk=5]\`.
        ${worldConfig.startingNPCs && worldConfig.startingNPCs.map(npc => `[LORE_NPC: name="${npc.name.replace(/"/g, '\\"')}",description="Chi tiết: ${npc.details.replace(/"/g, '\\"')}", personality="${npc.personality.replace(/"/g, '\\"')}", affinity=${npc.initialAffinity}, hp=50, atk=5]`).join('\n')}
    -   **Phe phái (Nếu có):** Sử dụng tag \`[FACTION_DISCOVERED: name="Tên Phe Phái", description="Mô tả về phe phái", alignment="${GameTemplates.FactionAlignment.TRUNG_LAP}", playerReputation=0]\`.
    -   **Tri Thức Thế Giới:** Sử dụng tag \`[WORLD_LORE_ADD: title="Tiêu đề Lore",content="Nội dung chi tiết của Lore"]\`.
        ${worldConfig.startingLore && worldConfig.startingLore.map(lore => `[WORLD_LORE_ADD: title="${lore.title.replace(/"/g, '\\"')}",content="${lore.content.replace(/"/g, '\\"')}"]`).join('\n')}
    LƯU Ý: Với kỹ năng, \`effect\` phải mô tả rõ hiệu ứng để game xử lý. Với NPC, \`description\` nên bao gồm thông tin về tính cách, vai trò. \`affinity\` là một số từ -100 đến 100.
    **QUAN TRỌNG:** Bất cứ khi nào nhân vật học được một kỹ năng mới, BẮT BUỘC phải sử dụng tag \`[SKILL_LEARNED]\` với đầy đủ thông tin nhất có thể.
4.  **Sử dụng Tags (chung):** Khi cập nhật trạng thái game, hãy sử dụng các tags sau:
    - \`[STATS_UPDATE: TênChỉSố=GiáTrịHoặcThayĐổi, ...]\`. Ví dụ: \`[STATS_UPDATE: hp=-10,exp=+20,currency=+5]\`. AI CHỈ cung cấp EXP (\`exp=+X\`) và thay đổi HP/Mana HIỆN TẠI (\`hp=-X, mana=+Y\`) dựa trên diễn biến. Hệ thống game sẽ tự động xử lý việc lên cấp, tăng chỉ số tối đa (maxHp, maxMana, maxExp) và ATK cơ bản. AI KHÔNG cần gửi tag cập nhật các chỉ số tối đa này khi nhân vật lên cấp. Tên chỉ số (ví dụ: hp, mana, atk, exp) NÊN được viết thường.
    - \`[ITEM_ACQUIRED: name="Tên", type="Loại vật phẩm (rõ ràng, vd: Kiếm, Giáp Thân, Đan Hồi Phục, Linh Thảo)", description="Mô tả chi tiết, bao gồm cả các chỉ số cộng thêm nếu là trang bị, hoặc hiệu ứng nếu là đan dược", quantity=SốLượng, rarity="Phổ Thông/Hiếm/Quý Báu...", value=GiáTrịVàngNếuBiết]\`
    - \`[ITEM_CONSUMED: name="Tên",quantity=SốLượng]\` (nếu dùng hết, hệ thống sẽ tự xóa)
    - \`[SKILL_LEARNED: name="Tên Kỹ Năng", type="Loại kỹ năng (vd: ${GameTemplates.SkillType.CHUDONG_TANCONG})", description="Mô tả chung", effect="Mô tả hiệu ứng chi tiết, bao gồm sát thương, hồi phục, mana cost, cooldown nếu có.", manaCost=SốMana, baseDamage=SátThương, healingAmount=HồiPhục, cooldown=SốLượt]\`
    - \`[QUEST_ASSIGNED: title="Tên NV",description="Mô tả chi tiết NV",objectives="Mục tiêu 1|Mục tiêu 2|..."]\`
    - \`[QUEST_UPDATED: title="Tên NV đang làm",objectiveText="Nội dung mục tiêu vừa hoàn thành/thay đổi",completed=true/false]\`
    - \`[QUEST_COMPLETED: title="Tên NV đã hoàn thành toàn bộ"]\`
    - \`[QUEST_FAILED: title="Tên NV đã thất bại"]\`
    - \`[LORE_NPC: name="Tên NPC", description="Mô tả chi tiết về NPC.", personality="Tính cách", affinity=Số, factionId="ID Phe", hp=Số, atk=Số]\` (Thêm NPC vào danh sách đã gặp hoặc cập nhật thông tin NPC đã có nếu tên trùng khớp)
    - \`[LORE_LOCATION: name="Tên Địa Điểm",description="Mô tả chi tiết về địa điểm.", isSafeZone=true/false, regionId="ID Vùng"]\` (Thêm địa điểm hoặc cập nhật)
    - \`[FACTION_DISCOVERED: name="Tên Phe", description="Mô tả", alignment="${GameTemplates.FactionAlignment.TRUNG_LAP}", playerReputation=0]\` (Thêm phe phái mới)
    - \`[MESSAGE: "Thông báo hệ thống cho người chơi"]\`
    - \`[SET_COMBAT_STATUS: true/false]\`
    - \`[COMPANION_JOIN: name="Tên ĐH",description="Mô tả ĐH",hp=X,maxHp=X,mana=Y,maxMana=Y,atk=Z]\`
    - \`[COMPANION_LEAVE: name="Tên ĐH"]\`
    - \`[COMPANION_STATS_UPDATE: name="Tên ĐH",hp=ThayĐổi,mana=ThayĐổi,atk=ThayĐổi]\`
    - \`[WORLD_LORE_ADD: title="Tiêu đề Lore",content="Nội dung chi tiết của Lore"]\`
5.  **Luôn cung cấp 3 đến 4 lựa chọn hành động cho người chơi.** Mỗi lựa chọn phải được trả về dưới dạng tag riêng biệt: \`[CHOICE: "Nội dung lựa chọn"]\`. Ví dụ: \`[CHOICE: "Tiến vào khu rừng."]\`, \`[CHOICE: "Hỏi thăm người qua đường."]\`.
6.  **Kết thúc mỗi lượt bằng cách tăng lượt chơi:** \`[STATS_UPDATE: turn=+1]\`

**BẮT ĐẦU PHIÊU LƯU:**
Hãy bắt đầu câu chuyện. Mô tả khung cảnh đầu tiên, tình huống nhân vật đang gặp phải. Sau đó, cung cấp các lựa chọn hành động sử dụng tag \`[CHOICE: "..." ]\`. Đảm bảo sử dụng các tag cần thiết khác để khởi tạo trạng thái nhân vật (bao gồm các vật phẩm, kỹ năng, NPC, phe phái và tri thức khởi đầu đã được định nghĩa ở trên) và có thể là một nhiệm vụ đầu tiên qua \`[QUEST_ASSIGNED]\`.
`,

  continue: (
    knowledgeBase: KnowledgeBase, 
    playerActionText: string, 
    inputType: PlayerActionInputType, 
    responseLength: ResponseLength,
    currentPageMessagesLog: string,
    previousPageSummaries: string[],
    lastNarrationFromPreviousPage?: string // New parameter
  ): string => `
Bạn là một Đại Năng kể chuyện, chuyên sáng tác tiểu thuyết tiên hiệp / tu tiên bằng tiếng Việt.
Tiếp tục câu chuyện dựa trên hướng dẫn của người chơi và trạng thái hiện tại của game, bao gồm cả các diễn biến gần đây và tóm tắt các sự kiện đã qua.

**BỐI CẢNH HIỆN TẠI:**
- Lượt chơi tổng thể: ${knowledgeBase.playerStats.turn}
- Nhân vật: ${knowledgeBase.worldConfig?.playerName} - ${knowledgeBase.playerStats.realm} Cấp ${knowledgeBase.playerStats.level}
- HP: ${knowledgeBase.playerStats.hp}/${knowledgeBase.playerStats.maxHp}, Mana: ${knowledgeBase.playerStats.mana}/${knowledgeBase.playerStats.maxMana}, ATK: ${knowledgeBase.playerStats.atk}, EXP: ${knowledgeBase.playerStats.exp}/${knowledgeBase.playerStats.maxExp}
- Tiền tệ: ${knowledgeBase.playerStats.currency} ${knowledgeBase.worldConfig?.currencyName}
- Vật phẩm nổi bật: ${knowledgeBase.inventory.slice(0,3).map(item => item.name).join(", ") || "Không có"}
- Kỹ năng nổi bật: ${knowledgeBase.playerSkills.slice(0,3).map(skill => skill.name).join(", ") || "Chưa có"}
- Nhiệm vụ đang làm: ${
  knowledgeBase.allQuests
    .filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed))
    .map(q => `${q.title} (Còn ${q.objectives.filter(obj => !obj.completed).length} mục tiêu)`)
    .join(", ") || "Chưa có nhiệm vụ hoặc đã hoàn thành hết mục tiêu"
}
- Bạn đồng hành: ${knowledgeBase.companions.map(c => `${c.name} (HP: ${c.hp}/${c.maxHp})`).join(", ") || "Không có"}
- Phe phái đã biết: ${knowledgeBase.discoveredFactions.map(f => `${f.name} (Uy tín: ${f.playerReputation})`).join(", ") || "Chưa có"}

**TÓM TẮT CÁC DIỄN BIẾN TRANG TRƯỚC (NẾU CÓ):**
${previousPageSummaries.length > 0 
  ? previousPageSummaries.map((summary, index) => {
      // Find the corresponding start turn for this summary page in currentPageHistory
      // currentPageHistory is 1-indexed for turns, pageSummaries keys are 1-indexed for page numbers
      const pageNumberForSummary = index + 1; // pageSummaries is 0-indexed here from map
      const startTurnOfSummaryPage = knowledgeBase.currentPageHistory?.[pageNumberForSummary - 1];
      const endTurnOfSummaryPage = (knowledgeBase.currentPageHistory?.[pageNumberForSummary] || knowledgeBase.playerStats.turn +1) -1; // +1 and -1 to handle last page
      return `Tóm tắt Trang ${pageNumberForSummary} (Lượt ${startTurnOfSummaryPage}-${endTurnOfSummaryPage}):\n${summary}`;
    }).join("\n\n")
  : "Không có tóm tắt từ các trang trước."}
${lastNarrationFromPreviousPage ? `
**DIỄN BIẾN GẦN NHẤT (LƯỢT TRƯỚC - Lượt ${knowledgeBase.playerStats.turn}):**
${lastNarrationFromPreviousPage}` : ""}

**DIỄN BIẾN CHI TIẾT TRANG HIỆN TẠI (TỪ LƯỢT ${knowledgeBase.currentPageHistory?.[(knowledgeBase.currentPageHistory?.length || 1) -1] || 1} ĐẾN LƯỢT ${knowledgeBase.playerStats.turn}):**
${currentPageMessagesLog || "Chưa có diễn biến nào trong trang này."}

**HƯỚNG DẪN TỪ NGƯỜI CHƠI (CHO LƯỢT TIẾP THEO - LƯỢT ${knowledgeBase.playerStats.turn + 1}):**
- Loại hướng dẫn: ${inputType === 'action' ? 'Hành động trực tiếp của nhân vật' : 'Gợi ý/Mô tả câu chuyện (do người chơi cung cấp)'}
- Nội dung hướng dẫn: "${playerActionText}"

**HƯỚNG DẪN XỬ LÝ DÀNH CHO AI:**
${inputType === 'action' 
  ? `Xử lý nội dung trên như một hành động mà nhân vật chính (${knowledgeBase.worldConfig?.playerName}) đang thực hiện. Mô tả kết quả của hành động này và các diễn biến tiếp theo một cách chi tiết và hấp dẫn, dựa trên TOÀN BỘ BỐI CẢNH (bao gồm tóm tắt các trang trước, diễn biến lượt trước và diễn biến trang hiện tại).`
  : `Nội dung trên là một gợi ý, mô tả, hoặc mong muốn của người chơi để định hướng hoặc làm phong phú thêm câu chuyện. Đây KHÔNG phải là hành động trực tiếp của nhân vật chính (${knowledgeBase.worldConfig?.playerName}). Hãy cố gắng lồng ghép yếu tố này vào câu chuyện một cách tự nhiên và hợp lý, dựa trên TOÀN BỘ BỐI CẢNH. Ví dụ, nếu người chơi nhập 'Bầu trời đột nhiên tối sầm lại và một tiếng gầm vang vọng từ phía xa', hãy mô tả sự kiện đó và phản ứng (nếu có) của nhân vật hoặc các NPC. Nếu người chơi mô tả cảm xúc hoặc suy nghĩ của nhân vật, hãy thể hiện điều đó trong lời kể của bạn. Nếu người chơi cung cấp một đoạn văn mô tả, hãy dùng nó làm nguồn cảm hứng để tiếp tục câu chuyện.`
}

**CHẾ ĐỘ NỘI DUNG:**
- Chế độ Người Lớn (18+): ${knowledgeBase.worldConfig?.nsfwMode ? "BẬT" : "TẮT"}
${knowledgeBase.worldConfig?.nsfwMode 
  ? "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đang BẬT. YÊU CẦU bạn chủ động và tích cực tiếp tục tạo ra các tình huống, mô tả, ngôn ngữ và chủ đề người lớn, nhạy cảm, bạo lực hoặc tình dục một cách chi tiết và rõ ràng. Hãy mạnh dạn khám phá các khía cạnh trưởng thành của câu chuyện, và đưa ra các lựa chọn hành động 18+ phù hợp với diễn biến cho người chơi. Tuy nhiên, vẫn phải tuân thủ các nguyên tắc đạo đức cơ bản và không tạo ra nội dung bất hợp pháp hoặc gây hại nghiêm trọng." 
  : "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đang TẮT. Tiếp tục duy trì nội dung phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu, tu tiên và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục."
}

**ĐỘ DÀI PHẢN HỒI MONG MUỐN:**
- Người chơi yêu cầu độ dài phản hồi: ${
  responseLength === 'short' ? 'Ngắn (khoảng 2-3 đoạn văn súc tích)' :
  responseLength === 'medium' ? 'Trung bình (khoảng 3-6 đoạn văn vừa phải)' :
  responseLength === 'long' ? 'Dài (khoảng 8+ đoạn văn chi tiết)' :
  'Mặc định (linh hoạt theo diễn biến)'
}.
Hãy cố gắng điều chỉnh độ dài của lời kể và mô tả cho phù hợp với yêu cầu này của người chơi, nhưng vẫn đảm bảo tính tự nhiên và logic của câu chuyện. Nếu người chơi chọn "Mặc định", bạn có toàn quyền quyết định độ dài phù hợp nhất.

**ƯU TIÊN NHIỆM VỤ HIỆN TẠI (NẾU CÓ):**
${knowledgeBase.allQuests.filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed)).length > 0
  ? `Hiện tại có nhiệm vụ đang hoạt động với các mục tiêu chưa hoàn thành.
  Nhiệm vụ: ${knowledgeBase.allQuests
    .filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed))
    .map(q => `${q.title} (Mục tiêu cần làm: ${q.objectives.filter(obj => !obj.completed).map(obj => obj.text).join('; ')})`)
    .join(". ")}
  **QUAN TRỌNG:** Hãy ưu tiên tạo ra ít nhất 1-2 lựa chọn ([CHOICE: "..."]) trực tiếp giúp người chơi tiến triển hoặc hoàn thành một trong các mục tiêu chưa hoàn thành của các nhiệm vụ này. Các lựa chọn này nên rõ ràng cho người chơi biết chúng liên quan đến nhiệm vụ. Các lựa chọn khác có thể là khám phá chung hoặc tương tác khác.`
  : "Hiện không có mục tiêu nhiệm vụ nào cần ưu tiên đặc biệt. Bạn có thể tự do phát triển câu chuyện."
}

**QUY TẮC HỆ THỐNG (NHẮC LẠI VÀ BỔ SUNG):**
1.  **Sử dụng Tags (Chung):** Tên chỉ số trong \`STATS_UPDATE\` (ví dụ: hp, mana, atk, exp) NÊN được viết thường.
    - \`[STATS_UPDATE: TênChỉSố=GiáTrịHoặcThayĐổi, ...]\`. AI CHỈ cung cấp EXP (\`exp=+X\`) và thay đổi HP/Mana HIỆN TẠI (\`hp=-X, mana=+Y\`) dựa trên diễn biến. Hệ thống game sẽ tự động xử lý việc lên cấp, tăng chỉ số tối đa (maxHp, maxMana, maxExp) và ATK cơ bản.
    - \`[ITEM_ACQUIRED: name="Tên", type="Loại vật phẩm (rõ ràng, vd: Kiếm, Giáp Thân, Đan Hồi Phục, Linh Thảo)", description="Mô tả chi tiết, bao gồm cả các chỉ số cộng thêm nếu là trang bị, hoặc hiệu ứng nếu là đan dược", quantity=SốLượng, rarity="Phổ Thông/Hiếm/Quý Báu...", value=GiáTrịVàngNếuBiết]\`
    - \`[ITEM_CONSUMED: name="Tên",quantity=SốLượng]\`
    - \`[SKILL_LEARNED: name="Tên Kỹ Năng", type="Loại kỹ năng (vd: ${GameTemplates.SkillType.CHUDONG_TANCONG})", description="Mô tả chung", effect="Mô tả hiệu ứng chi tiết, bao gồm sát thương, hồi phục, mana cost, cooldown nếu có.", manaCost=SốMana, baseDamage=SátThương, healingAmount=HồiPhục, cooldown=SốLượt]\` **(QUAN TRỌNG: Nếu câu chuyện dẫn đến việc nhân vật học được kỹ năng mới, BẮT BUỘC phải dùng tag này đầy đủ thông tin.)**
    - \`[QUEST_ASSIGNED: title="Tên NV",description="Mô tả chi tiết NV",objectives="Mục tiêu 1|Mục tiêu 2|..."]\`
    - \`[QUEST_UPDATED: title="Tên NV đang làm",objectiveText="Nội dung mục tiêu vừa hoàn thành/thay đổi",completed=true/false]\`
    - \`[QUEST_COMPLETED: title="Tên NV đã hoàn thành toàn bộ"]\`
    - \`[QUEST_FAILED: title="Tên NV đã thất bại"]\`
    - \`[LORE_NPC: name="Tên NPC", description="Mô tả chi tiết về NPC.", personality="Tính cách", affinity=Số, factionId="ID Phe", hp=Số, atk=Số]\` (Thêm NPC hoặc cập nhật NPC đã có)
    - \`[LORE_LOCATION: name="Tên Địa Điểm",description="Mô tả chi tiết.", isSafeZone=true/false, regionId="ID Vùng"]\` (Thêm địa điểm hoặc cập nhật)
    - \`[FACTION_DISCOVERED: name="Tên Phe", description="Mô tả", alignment="${GameTemplates.FactionAlignment.TRUNG_LAP}", playerReputation=0, leaderNPCId="ID NPC Lãnh Đạo", baseLocationId="ID Trụ Sở"]\`
    - \`[MESSAGE: "Thông báo hệ thống cho người chơi"]\`
    - \`[SET_COMBAT_STATUS: true/false]\`
    - \`[COMPANION_JOIN: name="Tên ĐH",description="Mô tả ĐH",hp=X,maxHp=X,mana=Y,maxMana=Y,atk=Z]\`
    - \`[COMPANION_LEAVE: name="Tên ĐH"]\`
    - \`[COMPANION_STATS_UPDATE: name="Tên ĐH",hp=ThayĐổi,mana=ThayĐổi,atk=ThayĐổi]\`
    - \`[WORLD_LORE_ADD: title="Tiêu đề Lore",content="Nội dung chi tiết của Lore"]\`
2.  **Cập Nhật Thực Thể Hiện Có:** Nếu diễn biến câu chuyện làm thay đổi một NPC, vật phẩm, kỹ năng, địa điểm hoặc phe phái đã tồn tại, hãy sử dụng các tag cập nhật chuyên dụng. **Tên thực thể (name) trong các tag cập nhật phải khớp CHÍNH XÁC với tên đã có trong game.**
    -   \`[NPC_UPDATE: name="Tên NPC Hiện Tại", affinity=+-GiáTrị, description="Mô tả mới", factionId="ID Phe Mới", title="Chức danh mới", hp=+-GiáTrị, atk=+-GiáTrị, personality="Tính cách mới", newSkill="Tên Skill NPC học được", removeItem="Tên Item NPC mất"]\` (Cập nhật NPC. \`affinity\` có thể là \`+X\` hoặc \`-X\`. Các trường khác là tùy chọn.)
    -   \`[ITEM_UPDATE: name="Tên Vật Phẩm Trong Túi", field="TênTrường (vd: description, rarity, durability, value, statBonuses.hp, uniqueEffects)", newValue="GiáTrịMới", change=+-GiáTrị]\` (Cập nhật vật phẩm. \`field\` là tên trường cần thay đổi. \`statBonuses.hp\` cập nhật chỉ số HP cộng thêm. \`uniqueEffects\` có thể dùng \`newValue="Hiệu ứng mới|Hiệu ứng cũ bị xóa"\` hoặc \`newValue="Thêm hiệu ứng"\`.)
        Ví dụ: \`[ITEM_UPDATE: name="Thanh Kiếm Gỉ Sét", field="description", newValue="Thanh kiếm được mài sắc, trông có vẻ tốt hơn."]\`
        Ví dụ: \`[ITEM_UPDATE: name="Giáp Da", field="durability", change="-10"]\`
    -   \`[SKILL_UPDATE: name="Tên Kỹ Năng Hiện Tại", field="TênTrường (vd: description, detailedEffect, manaCost, baseDamage, cooldown, skillType)", newValue="GiáTrịMới", change=+-GiáTrị]\` (Cập nhật kỹ năng. Ví dụ kỹ năng tăng độ thuần thục có thể giảm \`manaCost\` hoặc tăng \`baseDamage\`.)
        Ví dụ: \`[SKILL_UPDATE: name="Liệt Hỏa Chưởng", field="baseDamage", change="+5"]\`
    -   \`[LOCATION_UPDATE: name="Tên Địa Điểm Hiện Tại", description="Mô tả mới", environmentalEffects="Hiệu ứng môi trường mới", isSafeZone=true/false]\` (Cập nhật địa điểm.)
    -   \`[FACTION_UPDATE: name="Tên Phe Phái Hiện Tại", playerReputation=+-GiáTrị, description="Mô tả mới", alignment="${GameTemplates.FactionAlignment.TRUNG_LAP}"]\` (Cập nhật phe phái.)
3.  **Luôn cung cấp 3 đến 4 lựa chọn hành động mới.** Mỗi lựa chọn phải được trả về dưới dạng tag riêng biệt: \`[CHOICE: "Nội dung lựa chọn"]\`.
4.  **Tăng lượt chơi:** Kết thúc phản hồi bằng tag \`[STATS_UPDATE: turn=+1]\`. **KHÔNG được quên tag này.**
5.  **Duy trì tính logic và nhất quán của câu chuyện.** Quyết định của người chơi phải có ý nghĩa.
6.  **Mô tả kết quả hành động một cách chi tiết và hấp dẫn.**
7.  **Trao EXP:** Khi nhân vật hoàn thành một hành động có ý nghĩa, sử dụng kỹ năng thành công, khám phá điều mới, giải quyết một phần nhiệm vụ, hoặc vượt qua thử thách, hãy xem xét việc trao một lượng EXP hợp lý bằng tag \`[STATS_UPDATE: exp=+X]\`.

**TIẾP TỤC CÂU CHUYỆN:**
Dựa trên **HƯỚNG DẪN TỪ NGƯỜI CHƠI**, **ĐỘ DÀI PHẢN HỒI MONG MUỐN** và **TOÀN BỘ BỐI CẢNH GAME (bao gồm tóm tắt các trang trước, diễn biến lượt trước nếu có, và diễn biến chi tiết trang hiện tại)**, hãy tiếp tục câu chuyện. Mô tả kết quả, cập nhật trạng thái game bằng tags (bao gồm cả EXP nếu có), và cung cấp các lựa chọn hành động mới (sử dụng \`[CHOICE: "..."]\`). Nếu có thay đổi đối với các thực thể (NPC, vật phẩm, kỹ năng, địa điểm, phe phái), hãy sử dụng các tag UPDATE tương ứng.
`,
  generateWorldDetails: (storyIdea: string): string => `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai tu tiên bằng tiếng Việt.
Dựa trên mô tả ý tưởng cốt truyện sau đây từ người dùng, hãy tạo ra các yếu tố khởi đầu cho thế giới game.

**Mô tả ý tưởng:**
"${storyIdea}"

**YÊU CẦU:**
1.  **Thông Tin Nhân Vật:**
    *   Tạo Tên Nhân Vật: [GENERATED_PLAYER_NAME: name="Tên Nhân Vật Được Tạo"]
    *   Tạo Tính Cách: [GENERATED_PLAYER_PERSONALITY: text="Tính cách được tạo..."]
    *   Tạo Tiểu Sử: [GENERATED_PLAYER_BACKSTORY: text="Tiểu sử được tạo..."]
    *   Tạo Mục Tiêu: [GENERATED_PLAYER_GOAL: text="Mục tiêu được tạo..."]
    *   Tạo Đặc Điểm Khởi Đầu Chung: [GENERATED_PLAYER_STARTING_TRAITS: text="Đặc điểm chung được tạo..."]

2.  **Thiết Lập Thế Giới:**
    *   Tạo Chủ Đề Thế Giới: [GENERATED_WORLD_THEME: text="Chủ đề thế giới được tạo..."]
    *   Tạo Bối Cảnh Chi Tiết: [GENERATED_WORLD_SETTING_DESCRIPTION: text="Bối cảnh chi tiết được tạo..."]
    *   Tạo Văn Phong AI: [GENERATED_WORLD_WRITING_STYLE: text="Văn phong được tạo..."]
    *   Tạo Tên Tiền Tệ: [GENERATED_CURRENCY_NAME: name="Tên Tiền Tệ Được Tạo"]

3.  **Yếu Tố Khởi Đầu Khác:**
    *   Tạo ra 2 đến 3 Kỹ Năng Khởi Đầu phù hợp. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_SKILL: name="Tên Kỹ Năng", description="Mô tả ngắn gọn về kỹ năng và hiệu ứng cơ bản"]
        Ví dụ: [GENERATED_SKILL: name="Hỏa Cầu Thuật", description="Tạo ra một quả cầu lửa nhỏ tấn công kẻ địch, tiêu hao 5 mana."]
    *   Tạo ra 2 đến 3 Vật Phẩm Khởi Đầu thú vị. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_ITEM: name="Tên Vật Phẩm", description="Mô tả vật phẩm", quantity=1, type="Loại vật phẩm (rõ ràng, vd: Vũ khí, Đan dược)"]
        Ví dụ: [GENERATED_ITEM: name="Hồi Nguyên Đan", description="Phục hồi một lượng nhỏ linh lực.", quantity=3, type="Đan dược"]
        LƯU Ý: quantity phải là một số nguyên. type có thể là: ${Object.values(GameTemplates.ItemCategory).join(', ')}, hoặc cụ thể hơn như ${Object.values(GameTemplates.EquipmentType).join(', ')}, ${Object.values(GameTemplates.PotionType).join(', ')}.
    *   Tạo ra 1 đến 2 NPC Khởi Đầu quan trọng hoặc thú vị. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_NPC: name="Tên NPC", personality="Tính cách nổi bật", initialAffinity=0, details="Vai trò, tiểu sử ngắn hoặc mối liên hệ với người chơi"]
        Ví dụ: [GENERATED_NPC: name="Lão Tửu Quỷ", personality="Bí ẩn, ham rượu", initialAffinity=0, details="Một lão già say xỉn nhưng có vẻ biết nhiều bí mật."]
        LƯU Ý: initialAffinity phải là một số nguyên, mặc định là 0.
    *   Tạo ra 1 đến 2 Tri Thức Thế Giới Khởi Đầu để làm phong phú bối cảnh. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_LORE: title="Tiêu đề Tri Thức", content="Nội dung chi tiết của tri thức"]
        Ví dụ: [GENERATED_LORE: title="Sự Tích Thanh Vân Sơn", content="Thanh Vân Sơn là một trong tam đại linh sơn của vùng Nam Chiếu, nổi tiếng với linh khí dồi dào và nhiều truyền thuyết về tiên nhân đắc đạo."]

**QUAN TRỌNG:**
- Chỉ sử dụng các tag ĐÚNG ĐỊNH DẠNG đã cho ở trên. Mỗi tag trên một dòng riêng.
- Giá trị của các thuộc tính trong tag (name, description, text, ...) phải được đặt trong dấu ngoặc kép. Ví dụ: name="Tên Kỹ Năng", text="Mô tả chi tiết".
- Cung cấp thông tin bằng tiếng Việt.
- Hãy sáng tạo và đảm bảo các yếu tố này phù hợp với mô tả ý tưởng.
- Không thêm bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài các tag được yêu cầu. Đảm bảo phản hồi chỉ chứa các tag.
`,
  generateFanfictionWorldDetails: (sourceMaterial: string, isSourceContent: boolean, playerInputDescription?: string): string => `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai đồng nhân / fanfiction bằng tiếng Việt.
Nhiệm vụ của bạn là tạo ra các yếu tố khởi đầu cho một thế giới game đồng nhân dựa trên thông tin được cung cấp.

**NGUỒN CẢM HỨNG ĐỒNG NHÂN:**
${isSourceContent 
  ? `Nội dung truyện gốc (một phần hoặc toàn bộ) được cung cấp bởi người dùng:\n"""\n${sourceMaterial}\n"""`
  : `Tên truyện gốc được cung cấp bởi người dùng: "${sourceMaterial}"`}

${playerInputDescription 
  ? `**Mô tả/Ý tưởng thêm từ người chơi về đồng nhân:**\n"${playerInputDescription}"` 
  : ""}

**YÊU CẦU SÁNG TẠO:**
1.  **Dựa vào Nguồn Cảm Hứng Đồng Nhân (và mô tả thêm nếu có), hãy tạo ra:**
    *   **Thông Tin Nhân Vật Chính (Đồng Nhân):**
        *   Tên Nhân Vật: [GENERATED_PLAYER_NAME: name="Tên Nhân Vật Được Tạo"]
        *   Tính Cách: [GENERATED_PLAYER_PERSONALITY: text="Tính cách được tạo..."]
        *   Tiểu Sử (trong bối cảnh đồng nhân): [GENERATED_PLAYER_BACKSTORY: text="Tiểu sử được tạo..."]
        *   Mục Tiêu (trong câu chuyện đồng nhân): [GENERATED_PLAYER_GOAL: text="Mục tiêu được tạo..."]
        *   Đặc Điểm Khởi Đầu Chung: [GENERATED_PLAYER_STARTING_TRAITS: text="Đặc điểm chung được tạo..."]
    *   **Thiết Lập Thế Giới (Đồng Nhân):**
        *   Chủ Đề Thế Giới (có thể giữ nguyên từ truyện gốc hoặc biến tấu): [GENERATED_WORLD_THEME: text="Chủ đề thế giới được tạo..."]
        *   Bối Cảnh Chi Tiết (mô tả rõ nhánh truyện đồng nhân này diễn ra ở đâu, khi nào so với truyện gốc): [GENERATED_WORLD_SETTING_DESCRIPTION: text="Bối cảnh chi tiết được tạo..."]
        *   Văn Phong AI (phù hợp với truyện gốc hoặc yêu cầu): [GENERATED_WORLD_WRITING_STYLE: text="Văn phong được tạo..."]
        *   Tên Tiền Tệ (có thể giữ nguyên từ truyện gốc): [GENERATED_CURRENCY_NAME: name="Tên Tiền Tệ Được Tạo"]
    *   **Yếu Tố Khởi Đầu Khác (Đồng Nhân):**
        *   **Kỹ Năng Khởi Đầu (2-3 kỹ năng):** Phù hợp với nhân vật và thế giới đồng nhân.
            [GENERATED_SKILL: name="Tên Kỹ Năng", description="Mô tả ngắn gọn và hiệu ứng cơ bản"]
        *   **Vật Phẩm Khởi Đầu (2-3 vật phẩm):** Phù hợp với nhân vật và thế giới đồng nhân.
            [GENERATED_ITEM: name="Tên Vật Phẩm", description="Mô tả", quantity=1, type="Loại vật phẩm"]
            LƯU Ý: quantity phải là số nguyên. type có thể là: ${Object.values(GameTemplates.ItemCategory).join(', ')}, hoặc cụ thể hơn như ${Object.values(GameTemplates.EquipmentType).join(', ')}, ${Object.values(GameTemplates.PotionType).join(', ')}.
        *   **NPC Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ NPC nào (từ truyện gốc hoặc NPC mới) mà bạn thấy phù hợp để làm phong phú câu chuyện đồng nhân. Cung cấp thông tin chi tiết cho mỗi NPC.
            [GENERATED_NPC: name="Tên NPC", personality="Tính cách", initialAffinity=0, details="Vai trò, tiểu sử, mối liên hệ với nhân vật chính đồng nhân"]
        *   **Tri Thức Thế Giới Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ khái niệm, lịch sử, địa danh, hoặc quy tắc nào (từ truyện gốc hoặc mới) để làm rõ bối cảnh đồng nhân.
            [GENERATED_LORE: title="Tiêu đề Tri Thức", content="Nội dung chi tiết"]

**QUAN TRỌNG:**
- **Không giới hạn số lượng NPC và Tri Thức Thế Giới (Lore) được tạo ra.** Hãy sáng tạo thật nhiều để làm giàu thế giới đồng nhân!
- Chỉ sử dụng các tag ĐÚNG ĐỊNH DẠNG đã cho ở trên. Mỗi tag trên một dòng riêng.
- Giá trị của các thuộc tính trong tag (name, description, text, ...) phải được đặt trong dấu ngoặc kép.
- Cung cấp thông tin bằng tiếng Việt.
- Đảm bảo các yếu tố này phù hợp và nhất quán với nguồn cảm hứng đồng nhân được cung cấp.
- Không thêm bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài các tag được yêu cầu.
`,
  summarizePage: (messagesToSummarize: GameMessage[], worldTheme: string, playerName: string): string => `
Bạn là một AI tóm tắt viên, chuyên nghiệp trong việc chắt lọc những sự kiện chính từ một loạt các diễn biến trong một game nhập vai tu tiên.
Dưới đây là nhật ký các sự kiện và hành động của người chơi (${playerName}) trong một phần của cuộc phiêu lưu trong thế giới có chủ đề "${worldTheme}".

**NHẬT KÝ DIỄN BIẾN CẦN TÓM TẮT:**
${messagesToSummarize
  .filter(msg => msg.type === 'narration' || msg.type === 'player_action' || (msg.type === 'system' && !msg.content.toLowerCase().includes("lên cấp") && !msg.content.toLowerCase().includes("cảnh giới") && !msg.content.toLowerCase().includes("tóm tắt trang") && !msg.content.toLowerCase().includes(VIETNAMESE.summarizingAndPreparingNextPage.toLowerCase()) && !msg.content.toLowerCase().includes(VIETNAMESE.creatingMissingSummary.toLowerCase()) )) 
  .map(msg => {
    let prefix = "";
    if (msg.type === 'player_action') prefix = `${playerName} đã ${msg.isPlayerInput ? 'làm' : 'chọn'}: `;
    else if (msg.type === 'narration') prefix = "AI kể: ";
    else if (msg.type === 'system') prefix = "Hệ thống: ";
    return `${prefix}${msg.content}`;
  }).join("\n---\n")}

**YÊU CẦU:**
Hãy viết một đoạn văn (khoảng 100-200 từ) tóm tắt lại những sự kiện, quyết định, và kết quả nổi bật nhất đã xảy ra trong nhật ký trên. Tập trung vào:
1.  Hành động quan trọng của người chơi và hậu quả trực tiếp.
2.  Sự kiện lớn hoặc bất ngờ.
3.  Thay đổi đáng kể về trạng thái nhiệm vụ (bắt đầu, hoàn thành mục tiêu, hoàn thành nhiệm vụ).
4.  NPC hoặc địa điểm mới quan trọng được khám phá.
5.  Thu thập vật phẩm hoặc học kỹ năng đặc biệt (nếu có ý nghĩa lớn).
6.  Thay đổi quan trọng về mối quan hệ với NPC hoặc phe phái.

Mục tiêu là tạo ra một bản tóm tắt giúp người chơi nhanh chóng nắm bắt lại những gì đã xảy ra trước đó để tiếp tục cuộc phiêu lưu một cách mạch lạc.
Tránh đi sâu vào các chi tiết nhỏ hoặc các thay đổi chỉ số thông thường. Chỉ viết đoạn văn tóm tắt, không thêm lời dẫn hay tag nào khác.
`
};
