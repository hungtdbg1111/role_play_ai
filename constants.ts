

import { KnowledgeBase, PlayerStats, WorldSettings, SafetySetting, PlayerActionInputType, ResponseLength, ApiConfig, StartingSkill, StartingItem, StartingNPC, StartingLore } from './types';
import { HarmCategory, HarmBlockThreshold } from "@google/genai"; 

export const GAME_TITLE = "Đạo Đồ A.I";
export const APP_VERSION = "1.0.0"; 

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
  realmProgressionList: ["Phàm Nhân Cảnh", "Luyện Khí Kỳ", "Trúc Cơ Kỳ", "Kim Đan Kỳ", "Nguyên Anh Kỳ", "Hóa Thần Kỳ"],
  worldConfig: null,
  companions: [],
  worldLore: [],
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


export const VIETNAMESE = {
  welcomeMessage: `Chào mừng đến với thế giới ${GAME_TITLE}! Một tựa game nhập vai phiêu lưu bằng chữ, nơi mọi diễn biến được tạo ra bởi AI. Hãy kiến tạo nhân vật và bắt đầu hành trình tu tiên của riêng bạn!`,
  newGame: "Cuộc Phiêu Lưu Mới",
  loadGame: "Tải Game",
  gameUpdates: "Cập Nhật Game (Chưa hỗ trợ)",
  apiSettings: "Thiết Lập API", 
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
  startGame: "Bắt Đầu Tu Luyện",
  enterAction: "Nhập hành động/Câu chuyện",
  sendAction: "Hành Động", 
  okButton: "OK",
  aiSuggest: "AI Gợi Ý",
  storyLog: "Nhật Ký Hành Trình",
  playerStats: "Trạng Thái Nhân Vật",
  inventory: "Túi Đồ",
  skills: "Kỹ Năng",
  quests: "Nhiệm Vụ",
  generatingStory: "AI đang kiến tạo thế giới, xin chờ...",
  errorOccurred: "Đã có lỗi xảy ra:",
  apiKeyMissing: "Lỗi: API Key của Gemini (nguồn người dùng) chưa được cấu hình. Vui lòng vào 'Thiết Lập API' để cài đặt.",
  apiKeySystemUnavailable: "Lỗi: Không thể khởi tạo API Key của hệ thống. Vui lòng liên hệ quản trị viên.",
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
  // API Settings translations
  apiSettingsTitle: "Thiết Lập API Gemini",
  apiKeySourceLabel: "Nguồn API Key",
  apiKeySourceSystem: "Sử dụng API Key của Hệ Thống (Mặc định)",
  apiKeySourceUser: "Sử dụng API Key Cá Nhân",
  geminiUserApiKeyLabel: "Khóa API Gemini Cá Nhân",
  geminiApiKeyPlaceholder: "Nhập khóa API của bạn tại đây",
  geminiModelLabel: "Chọn Model Gemini",
  saveSettingsButton: "Lưu Thiết Lập",
  settingsSavedMessage: "Thiết lập API đã được lưu thành công!",
  apiKeyRequiredError: "Vui lòng nhập API Key cá nhân của bạn.",
  goBackButton: "Quay Lại",
  apiInfoSystem: "Ứng dụng sẽ sử dụng API Key được cấu hình sẵn bởi hệ thống. API Key này được quản lý tập trung và bạn không cần nhập.",
  apiInfoUser: "API Key cá nhân của bạn sẽ được lưu trữ cục bộ trong trình duyệt và chỉ được sử dụng để gửi yêu cầu trực tiếp đến Google AI.",
  // Safety Settings translations
  safetySettingsLabel: "Cài Đặt An Toàn Nội Dung",
  thresholdLabel: "Ngưỡng Chặn",
  // Firebase Save/Load translations
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
  signInRequiredForLoad: "Vui lòng đăng nhập để tải game.",
  signInRequiredForSave: "Vui lòng đăng nhập để lưu game.",
  signingInAnonymously: "Đang đăng nhập ẩn danh...",
  signOutButton: "Đăng Xuất",
  signedInAsGuest: "Đã đăng nhập với tư cách Khách",
  // Response Length translations
  responseLengthLabel: "Độ dài",
  responseLength_default: "Mặc định",
  responseLength_short: "Ngắn",
  responseLength_medium: "Trung bình",
  responseLength_long: "Dài",
  // Function to get button text dynamically
  responseLengthButtonText: (length: ResponseLength): string => {
    switch (length) {
      case 'short': return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_short}`;
      case 'medium': return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_medium}`;
      case 'long': return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_long}`;
      default: return `${VIETNAMESE.responseLengthLabel}: ${VIETNAMESE.responseLength_default}`;
    }
  },
  // Game Setup - Starting Skills & Items
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
  // Game Setup - Starting NPCs & Lore
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
  // Game Setup - Story Idea Generator
  storyIdeaGeneratorSection: "Ý Tưởng Cốt Truyện Ban Đầu (AI Hỗ Trợ)",
  storyIdeaDescriptionLabel: "Mô tả ý tưởng cốt truyện của bạn:",
  storyIdeaDescriptionPlaceholder: "Ví dụ: Một thiếu niên mồ côi vô tình nhặt được một bí kíp võ công thất truyền trong một khu rừng cổ xưa, từ đó bước vào con đường tu tiên đầy thử thách và khám phá ra bí mật về thân thế của mình...",
  generateDetailsFromStoryButton: "Phân Tích & Tạo Chi Tiết Thế Giới",
  generatingWorldDetails: "AI đang phân tích và tạo chi tiết thế giới...",
  worldDetailsGeneratedSuccess: "AI đã tạo xong chi tiết thế giới! Vui lòng xem và chỉnh sửa bên dưới nếu cần.",
  errorGeneratingWorldDetails: "Lỗi khi AI tạo chi tiết thế giới.",
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
1.  **Khởi tạo Chỉ số Nhân vật:** Dựa vào thông tin trên, hãy quyết định các chỉ số ban đầu cho nhân vật. Trả về dưới dạng tag [PLAYER_STATS_INIT: hp=100,maxHp=100,mana=50,maxMana=50,atk=10,exp=0,maxExp=100,level=1,realm="${INITIAL_KNOWLEDGE_BASE.realmProgressionList[0]}",currency=10,turn=1]. Realm ban đầu là "${INITIAL_KNOWLEDGE_BASE.realmProgressionList[0]}". Các chỉ số tối đa (maxHp, maxMana, maxExp) và ATK sẽ do hệ thống game tự động tăng khi lên cấp, AI không cần cập nhật các chỉ số này khi lên cấp.
2.  **Tạo Danh sách Cảnh giới:** Hệ thống đã có danh sách mặc định: ${INITIAL_KNOWLEDGE_BASE.realmProgressionList.join(", ")}. Nếu bạn muốn thay đổi hoặc đề xuất một danh sách hoàn toàn mới dựa trên chủ đề, hãy dùng tag [REALM_LIST: "Tên Cảnh Giới 1", "Tên Cảnh Giới 2", ...].
3.  **Vật phẩm, Kỹ năng, NPC và Tri Thức Khởi đầu:** Dựa trên thông tin do người chơi cung cấp, hãy tạo các tag tương ứng:
    ${worldConfig.startingItems && worldConfig.startingItems.map(item => `[ITEM_ACQUIRED: name="${item.name.replace(/"/g, '\\"')}",type="${item.type.replace(/"/g, '\\"')}",description="${item.description.replace(/"/g, '\\"')}",quantity=${item.quantity}]`).join('\n')}
    ${worldConfig.startingSkills && worldConfig.startingSkills.map(skill => `[SKILL_LEARNED: name="${skill.name.replace(/"/g, '\\"')}",type="Khởi đầu",description="${skill.description.replace(/"/g, '\\"')}",effect="${skill.description.replace(/"/g, '\\"')}"]`).join('\n')}
    ${worldConfig.startingNPCs && worldConfig.startingNPCs.map(npc => `[LORE_NPC: name="${npc.name.replace(/"/g, '\\"')}",description="Tính cách: ${npc.personality.replace(/"/g, '\\"')}. Độ thiện cảm ban đầu: ${npc.initialAffinity}. Chi tiết: ${npc.details.replace(/"/g, '\\"')}"]`).join('\n')}
    ${worldConfig.startingLore && worldConfig.startingLore.map(lore => `[WORLD_LORE_ADD: title="${lore.title.replace(/"/g, '\\"')}",content="${lore.content.replace(/"/g, '\\"')}"]`).join('\n')}
    LƯU Ý: Đối với kỹ năng khởi đầu, hãy sử dụng mô tả của kỹ năng làm "effect" của nó trong tag [SKILL_LEARNED]. Đối với NPC khởi đầu, hãy tổng hợp thông tin về tính cách, độ thiện cảm và chi tiết vào trường "description" của tag [LORE_NPC].
    **QUAN TRỌNG:** Bất cứ khi nào nhân vật học được một kỹ năng mới (kể cả từ đặc điểm khởi đầu hoặc trong quá trình chơi), BẮT BUỘC phải sử dụng tag \`[SKILL_LEARNED: name="Tên Kỹ Năng",type="Loại",description="Mô tả",effect="Hiệu ứng chi tiết"]\` để hệ thống ghi nhận.
4.  **Sử dụng Tags:** Khi cập nhật trạng thái game, hãy sử dụng các tags sau:
    - \`[STATS_UPDATE: TênChỉSố=GiáTrịHoặcThayĐổi, ...]\`. Ví dụ: \`[STATS_UPDATE: hp=-10,exp=+20,currency=+5]\`. AI CHỈ cung cấp EXP (\`exp=+X\`) và thay đổi HP/Mana HIỆN TẠI (\`hp=-X, mana=+Y\`) dựa trên diễn biến. Hệ thống game sẽ tự động xử lý việc lên cấp, tăng chỉ số tối đa (maxHp, maxMana, maxExp) và ATK cơ bản. AI KHÔNG cần gửi tag cập nhật các chỉ số tối đa này khi nhân vật lên cấp. Tên chỉ số (ví dụ: hp, mana, atk, exp) NÊN được viết thường.
    - \`[ITEM_ACQUIRED: name="Tên",type="Loại",description="Mô tả",quantity=SốLượng]\`
    - \`[ITEM_CONSUMED: name="Tên",quantity=SốLượng]\` (nếu dùng hết, hệ thống sẽ tự xóa)
    - \`[SKILL_LEARNED: name="Tên Kỹ Năng",type="Loại",description="Mô tả",effect="Hiệu ứng chi tiết"]\` (Lưu ý: Luôn dùng tag này khi nhân vật học kỹ năng mới).
    - \`[QUEST_ASSIGNED: title="Tên NV",description="Mô tả chi tiết NV",objectives="Mục tiêu 1|Mục tiêu 2|..."]\` (Các mục tiêu cách nhau bằng dấu | )
    - \`[QUEST_UPDATED: title="Tên NV đang làm",objectiveText="Nội dung mục tiêu vừa hoàn thành/thay đổi",completed=true/false]\`
    - \`[QUEST_COMPLETED: title="Tên NV đã hoàn thành toàn bộ"]\`
    - \`[QUEST_FAILED: title="Tên NV đã thất bại"]\`
    - \`[LORE_NPC: name="Tên NPC",description="Mô tả chi tiết về NPC nếu có."]\`
    - \`[LORE_LOCATION: name="Tên Địa Điểm",description="Mô tả chi tiết về địa điểm nếu có."]\`
    - \`[MESSAGE: "Thông báo hệ thống cho người chơi"]\`
    - \`[SET_COMBAT_STATUS: true/false]\`
    - \`[COMPANION_JOIN: name="Tên ĐH",description="Mô tả ĐH",hp=X,maxHp=X,mana=Y,maxMana=Y,atk=Z]\`
    - \`[COMPANION_LEAVE: name="Tên ĐH"]\`
    - \`[COMPANION_STATS_UPDATE: name="Tên ĐH",hp=ThayĐổi,mana=ThayĐổi,atk=ThayĐổi]\` (ví dụ: hp=-10 hoặc hp=50)
    - \`[WORLD_LORE_ADD: title="Tiêu đề Lore",content="Nội dung chi tiết của Lore"]\`
5.  **Luôn cung cấp 3 đến 4 lựa chọn hành động cho người chơi.** Mỗi lựa chọn phải được trả về dưới dạng tag riêng biệt: \`[CHOICE: "Nội dung lựa chọn"]\`. Ví dụ: \`[CHOICE: "Tiến vào khu rừng."]\`, \`[CHOICE: "Hỏi thăm người qua đường."]\`.
6.  **Kết thúc mỗi lượt bằng cách tăng lượt chơi:** \`[STATS_UPDATE: turn=+1]\`

**BẮT ĐẦU PHIÊU LƯU:**
Hãy bắt đầu câu chuyện. Mô tả khung cảnh đầu tiên, tình huống nhân vật đang gặp phải. Sau đó, cung cấp các lựa chọn hành động sử dụng tag \`[CHOICE: "..." ]\`. Đảm bảo sử dụng các tag cần thiết khác để khởi tạo trạng thái nhân vật (bao gồm các vật phẩm, kỹ năng, NPC và tri thức khởi đầu đã được định nghĩa ở trên) và có thể là một nhiệm vụ đầu tiên qua \`[QUEST_ASSIGNED]\`.
`,

  continue: (knowledgeBase: KnowledgeBase, playerActionText: string, inputType: PlayerActionInputType, responseLength: ResponseLength): string => `
Bạn là một Đại Năng kể chuyện, chuyên sáng tác tiểu thuyết tiên hiệp / tu tiên bằng tiếng Việt.
Tiếp tục câu chuyện dựa trên hướng dẫn của người chơi và trạng thái hiện tại của game.

**BỐI CẢNH HIỆN TẠI:**
- Lượt chơi: ${knowledgeBase.playerStats.turn}

**HƯỚNG DẪN TỪ NGƯỜI CHƠI:**
- Loại hướng dẫn: ${inputType === 'action' ? 'Hành động trực tiếp của nhân vật' : 'Gợi ý/Mô tả câu chuyện (do người chơi cung cấp)'}
- Nội dung hướng dẫn: "${playerActionText}"

**HƯỚNG DẪN XỬ LÝ DÀNH CHO AI:**
${inputType === 'action' 
  ? `Xử lý nội dung trên như một hành động mà nhân vật chính (${knowledgeBase.worldConfig?.playerName}) đang thực hiện. Mô tả kết quả của hành động này và các diễn biến tiếp theo một cách chi tiết và hấp dẫn.`
  : `Nội dung trên là một gợi ý, mô tả, hoặc mong muốn của người chơi để định hướng hoặc làm phong phú thêm câu chuyện. Đây KHÔNG phải là hành động trực tiếp của nhân vật chính (${knowledgeBase.worldConfig?.playerName}). Hãy cố gắng lồng ghép yếu tố này vào câu chuyện một cách tự nhiên và hợp lý. Ví dụ, nếu người chơi nhập 'Bầu trời đột nhiên tối sầm lại và một tiếng gầm vang vọng từ phía xa', hãy mô tả sự kiện đó và phản ứng (nếu có) của nhân vật hoặc các NPC. Nếu người chơi mô tả cảm xúc hoặc suy nghĩ của nhân vật, hãy thể hiện điều đó trong lời kể của bạn. Nếu người chơi cung cấp một đoạn văn mô tả, hãy dùng nó làm nguồn cảm hứng để tiếp tục câu chuyện.`
}

**TRẠNG THÁI GAME (KnowledgeBase Tóm Tắt):**
Nhân vật: ${knowledgeBase.worldConfig?.playerName} - ${knowledgeBase.playerStats.realm} Cấp ${knowledgeBase.playerStats.level}
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

**QUY TẮC HỆ THỐNG (NHẮC LẠI):**
1.  **Sử dụng Tags:** Tên chỉ số trong \`STATS_UPDATE\` (ví dụ: hp, mana, atk, exp) NÊN được viết thường.
    - \`[STATS_UPDATE: TênChỉSố=GiáTrịHoặcThayĐổi, ...]\`. AI CHỈ cung cấp EXP (\`exp=+X\`) và thay đổi HP/Mana HIỆN TẠI (\`hp=-X, mana=+Y\`) dựa trên diễn biến. Hệ thống game sẽ tự động xử lý việc lên cấp, tăng chỉ số tối đa (maxHp, maxMana, maxExp) và ATK cơ bản. AI KHÔNG cần gửi tag cập nhật các chỉ số tối đa này khi nhân vật lên cấp.
    - \`[ITEM_ACQUIRED: name="Tên",type="Loại",description="Mô tả",quantity=SốLượng]\`
    - \`[ITEM_CONSUMED: name="Tên",quantity=SốLượng]\`
    - \`[SKILL_LEARNED: name="Tên Kỹ Năng",type="Loại",description="Mô tả",effect="Hiệu ứng chi tiết"]\` **(QUAN TRỌNG: Nếu câu chuyện dẫn đến việc nhân vật học được kỹ năng mới, BẮT BUỘC phải dùng tag này đầy đủ thông tin.)**
    - \`[QUEST_ASSIGNED: title="Tên NV",description="Mô tả chi tiết NV",objectives="Mục tiêu 1|Mục tiêu 2|..."]\`
    - \`[QUEST_UPDATED: title="Tên NV đang làm",objectiveText="Nội dung mục tiêu vừa hoàn thành/thay đổi",completed=true/false]\` (AI xác định mục tiêu cần cập nhật bằng objectiveText của nó)
    - \`[QUEST_COMPLETED: title="Tên NV đã hoàn thành toàn bộ"]\`
    - \`[QUEST_FAILED: title="Tên NV đã thất bại"]\`
    - \`[LORE_NPC: name="Tên NPC",description="Mô tả chi tiết về NPC nếu có."]\` (Thêm NPC vào danh sách đã gặp)
    - \`[LORE_LOCATION: name="Tên Địa Điểm",description="Mô tả chi tiết về địa điểm nếu có."]\` (Thêm địa điểm vào danh sách đã khám phá)
    - \`[MESSAGE: "Thông báo hệ thống cho người chơi"]\`
    - \`[SET_COMBAT_STATUS: true/false]\`
    - \`[COMPANION_JOIN: name="Tên ĐH",description="Mô tả ĐH",hp=X,maxHp=X,mana=Y,maxMana=Y,atk=Z]\` (Thêm đồng hành mới)
    - \`[COMPANION_LEAVE: name="Tên ĐH"]\` (Đồng hành rời đi)
    - \`[COMPANION_STATS_UPDATE: name="Tên ĐH",hp=ThayĐổi,mana=ThayĐổi,atk=ThayĐổi]\` (Cập nhật chỉ số đồng hành, ví dụ: hp=-10 hoặc hp=50. Hệ thống sẽ tự giới hạn trong min/max)
    - \`[WORLD_LORE_ADD: title="Tiêu đề Lore",content="Nội dung chi tiết của Lore"]\` (Thêm tri thức về thế giới)
2.  **Luôn cung cấp 3 đến 4 lựa chọn hành động mới.** Mỗi lựa chọn phải được trả về dưới dạng tag riêng biệt: \`[CHOICE: "Nội dung lựa chọn"]\`.
3.  **Tăng lượt chơi:** Kết thúc phản hồi bằng tag \`[STATS_UPDATE: turn=+1]\`
4.  **Duy trì tính logic và nhất quán của câu chuyện.** Quyết định của người chơi phải có ý nghĩa.
5.  **Mô tả kết quả hành động một cách chi tiết và hấp dẫn.**
6.  **Trao EXP:** Khi nhân vật hoàn thành một hành động có ý nghĩa, sử dụng kỹ năng thành công, khám phá điều mới, giải quyết một phần nhiệm vụ, hoặc vượt qua thử thách (kể cả ngoài chiến đấu), hãy xem xét việc trao một lượng EXP hợp lý bằng tag \`[STATS_UPDATE: exp=+X]\`. Chỉ cần cung cấp lượng EXP, hệ thống game sẽ tự động xử lý việc lên cấp và tăng các chỉ số liên quan. Lượng EXP nên tương xứng với độ khó và tầm quan trọng của hành động.

**TIẾP TỤC CÂU CHUYỆN:**
Dựa trên **HƯỚNG DẪN TỪ NGƯỜI CHƠI**, **ĐỘ DÀI PHẢN HỒI MONG MUỐN** và trạng thái game, hãy tiếp tục câu chuyện. Mô tả kết quả, cập nhật trạng thái game bằng tags (bao gồm cả EXP nếu có), và cung cấp các lựa chọn hành động mới (sử dụng \`[CHOICE: "..."]\`). Nếu nhân vật học kỹ năng mới, nhớ sử dụng tag \`[SKILL_LEARNED]\`! Nếu nhiệm vụ được cập nhật, hoàn thành hoặc thất bại, hãy sử dụng các tag QUEST tương ứng. Nếu có thông tin về NPC, địa điểm mới, hoặc đồng hành gia nhập/rời đi/thay đổi, hãy dùng các tag tương ứng.
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
        Ví dụ: [GENERATED_SKILL: name="Hỏa Cầu Thuật", description="Tạo ra một quả cầu lửa nhỏ tấn công kẻ địch."]
    *   Tạo ra 2 đến 3 Vật Phẩm Khởi Đầu thú vị. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_ITEM: name="Tên Vật Phẩm", description="Mô tả vật phẩm", quantity=1, type="Loại vật phẩm"]
        Ví dụ: [GENERATED_ITEM: name="Hồi Nguyên Đan", description="Phục hồi một lượng nhỏ linh lực.", quantity=3, type="Đan dược"]
        LƯU Ý: quantity phải là một số nguyên. type có thể là: Đan dược, Pháp khí, Tàn quyển, Linh thảo, Phù lục, Vũ khí, Nguyên liệu, Khác.
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
`
};
