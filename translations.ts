
import { ResponseLength } from './types';

export const VIETNAMESE = {
  welcomeMessage: (gameTitle: string) => `Chào mừng đến với thế giới ${gameTitle}! Một tựa game nhập vai phiêu lưu bằng chữ, nơi mọi diễn biến được tạo ra bởi AI. Hãy kiến tạo nhân vật và bắt đầu hành trình của riêng bạn!`,
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
  okButton: "OK",
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
  characterButtonShort: "NV",
  questsButton: "Nhiệm Vụ",
  questsButtonShort: "NVụ",
  worldButton: "Thế Giới",
  worldButtonShort: "TG",
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
  nsfwModeLabel: "Chế Độ Người Lớn (18+) Tổng Thể Game",
  nsfwIdeaCheckboxLabel: "Ưu tiên nội dung 18+ (dâm dục, bạo lực) cho các yếu tố AI tạo ra ở mục này",
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
  saveGameButtonShort: "Lưu",
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
  itemTypeLabel: "Loại Vật Phẩm",
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
  startingLocationsSection: "Địa Điểm Khởi Đầu",
  addStartingLocation: "+ Thêm Địa Điểm",
  removeLocation: "Xóa Địa Điểm",
  locationNameLabel: "Tên Địa Điểm",
  locationDescriptionLabel: "Mô Tả Địa Điểm",
  locationIsSafeZoneLabel: "Là Khu Vực An Toàn?",
  locationRegionIdLabel: "Tên Vùng (nếu có)",
  storyIdeaGeneratorSection: "Ý Tưởng Cốt Truyện Ban Đầu (AI Hỗ Trợ)",
  storyIdeaDescriptionLabel: "Mô tả ý tưởng cốt truyện của bạn:",
  storyIdeaDescriptionPlaceholder: "Ví dụ: Một thiếu niên mồ côi vô tình nhặt được một bí kíp võ công thất truyền trong một khu rừng cổ xưa, từ đó bước vào con đường tu tiên đầy thử thách và khám phá ra bí mật về thân thế của mình...",
  generateDetailsFromStoryButton: "Phân Tích & Tạo Chi Tiết Thế Giới",
  generatingWorldDetails: "AI đang phân tích và tạo chi tiết thế giới...",
  worldDetailsGeneratedSuccess: "AI đã tạo xong chi tiết thế giới! Vui lòng xem và chỉnh sửa bên dưới nếu cần.",
  errorGeneratingWorldDetails: "Lỗi khi AI tạo chi tiết thế giới.",
  fanficStoryGeneratorSection: "Ý Tưởng Đồng Nhân / Fanfiction (AI Hỗ Trợ)",
  fanficSourceTypeLabel: "Nguồn Tạo Đồng Nhân",
  fanficSourceTypeName: "Dựa trên Tên Truyện Gốc",
  fanficSourceTypeFile: "Dựa trên File TXT Truyện Gốc",
  fanficStoryNameLabel: "Tên Truyện Gốc",
  fanficStoryNamePlaceholder: "Ví dụ: Tru Tiên, Phàm Nhân Tu Tiên...",
  fanficFileUploadLabel: "Tải Lên File TXT Truyện Gốc (.txt)(Tầm<3MB vì giới hạn 800000 token)",
  fanficPlayerDescriptionLabel: "Mô tả thêm về ý tưởng đồng nhân của bạn (tùy chọn)",
  fanficPlayerDescriptionPlaceholder: "Ví dụ: Nhân vật chính là một đệ tử ngoại môn của Thanh Vân Môn sau sự kiện Trương Tiểu Phàm xuống núi...",
  addOriginalStorySummaryButton: "+ Thêm/Sửa Tóm Tắt Cốt Truyện Nguyên Tác",
  originalStorySummaryLabel: "Tóm Tắt Cốt Truyện Nguyên Tác (AI sẽ bám theo nếu có)",
  originalStorySummaryPlaceholder: "Nhập hoặc để AI tóm tắt cốt truyện nguyên tác tại đây (1000-1500 từ, chia giai đoạn). Ví dụ:\nGiai đoạn 1 của nguyên tác: Giới thiệu nhân vật và thế giới...\nGiai đoạn 2 của nguyên tác: Sự kiện khởi đầu và xung đột chính...\n...",
  generatingOriginalStorySummary: "AI đang tóm tắt cốt truyện nguyên tác...",
  originalStorySummaryGeneratedSuccess: "AI đã tóm tắt xong cốt truyện nguyên tác! Vui lòng xem và chỉnh sửa.",
  errorGeneratingOriginalStorySummary: "Lỗi khi AI tóm tắt cốt truyện nguyên tác.",
  generateFanficButton: "Phân Tích & Tạo Đồng Nhân",
  generatingFanficDetails: "AI đang phân tích và tạo chi tiết đồng nhân (bao gồm tóm tắt nguyên tác)...",
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
  previousPage: "Trước",
  nextPage: "Sau",
  goToPage: "Đi Tới",
  pageIndicator: (current: number, total: number) => `Trang ${current} / ${total}`,
  summarizingPage: "Đang tóm tắt trang...",
  summarizingAndPreparingNextPage: "Đang tóm tắt và chuẩn bị lượt tiếp theo...",
  creatingMissingSummary: "Đang tạo tóm tắt còn thiếu...",
  pageSummaryTitle: (pageNumber: number) => `Tóm Tắt Trang ${pageNumber}`,
  rollbackTurn: "Lùi Lượt",
  cannotRollbackFurther: "Không thể lùi lượt thêm.",
  rollbackSuccess: "Đã lùi về lượt trước thành công.",
  actionStoppedAndRolledBack: "Đã dừng và lùi về trạng thái trước đó.",
  actionStopErrorNoHistory: "Không thể dừng và lùi lượt (lịch sử rỗng hoặc lỗi).",
  initialStoryStopWarning: "Đã dừng tạo truyện. Có thể cần bắt đầu lại.",
  stopButton: "Dừng/Lùi Lượt",
  stopButtonShort: "Dừng/Lùi",
  sendInputButton: "Gửi",
  sendingAction: "Đang gửi...",
  autoPlayButton: "Tự động chơi",
  stopAutoPlayButton: "Dừng Tự Động",
  autoSavingNotification: "Đã tự động lưu game.",
  autoPlayEnabledNotification: "Đã bật chế độ tự động chơi.",
  autoPlayDisabledNotification: "Đã tắt chế độ tự động chơi.",
  autoPlayContinueAction: "Tiếp tục diễn biến.",
  autoPlayStoppedOnError: "Đã dừng tự động chơi do có lỗi.",
  fileSizeLabel: "Dung lượng",
  gameplaySettingsButton: "Cài Đặt Hiển Thị",
  gameplaySettingsButtonShort: "Hiển Thị",
  displaySettingsTitle: "Cài Đặt Hiển Thị Gameplay",
  fontFamilyLabel: "Font Chữ",
  fontSizeLabel: "Cỡ Chữ",
  textColorLabel: "Màu Chữ",
  backgroundColorLabel: "Màu Nền",
  narrationStylesLabel: "Diễn Biến AI",
  playerActionStylesLabel: "Hành Động Người Chơi",
  choiceButtonStylesLabel: "Nút Lựa Chọn AI",
  keywordHighlightStylesLabel: "Chữ Từ Khóa Nổi Bật",
  resetToDefaultsButton: "Khôi Phục Mặc Định",
  applySettingsButton: "Áp Dụng",
  quitGameButton: "Thoát Game",
  quitGameButtonShort: "Thoát",
  quitGameButtonTitle: "Thoát Game (Về màn hình chính)",
  hideAiSuggestionsButton: "Ẩn Gợi Ý AI",
  showAiSuggestionsButton: "Hiện Gợi Ý AI",
  editButtonLabel: "Sửa Diễn Biến",
  saveEditButton: "Lưu Thay Đổi",
  cancelEditButton: "Hủy",
  messageEditedSuccess: "Diễn biến đã được cập nhật.",
  updateNotesButton: "Thông Tin Cập Nhật",
  updateNotesModalTitle: "Thông Tin Cập Nhật Game",
  loadingUpdateNotes: "Đang tải thông tin cập nhật...",
  errorLoadingUpdateNotes: "Không thể tải thông tin cập nhật. Vui lòng thử lại sau.",
  noUpdateNotesAvailable: "Chưa có thông tin cập nhật mới.",
  viewRawAiResponseButton: "Xem Phản Hồi Thô Từ AI",
  rawAiResponseModalTitle: "Phản Hồi Thô Từ AI (Chưa Xử Lý)",
  noContentToSummarize: "Không có nội dung để tóm tắt cho trang này.",

  // Cultivation System Specific
  realmSystemLabel: "Hệ Thống Cảnh Giới/Cấp Độ (Phân cách bằng dấu '-')",
  realmSystemPlaceholder: "Ví dụ: Phàm Nhân - Luyện Khí - Trúc Cơ...",
  startingRealmLabel: "Cảnh Giới/Cấp Độ Khởi Đầu",
  startingRealmPlaceholder: "Ví dụ: Phàm Nhân Nhất Trọng / Tân Binh Cấp 1",
  sinhLucLabel: "Sinh Lực",
  linhLucLabel: "Linh Lực/Nội Lực/Năng Lượng", // Generic term
  sucTanCongLabel: "Sức Tấn Công",
  kinhNghiemLabel: "Kinh Nghiệm",
  realmLabel: "Cảnh Giới/Cấp Độ",
  bottleneckEffectLabel: "Bình Cảnh!",
  bottleneckNotification: "Bạn đã đạt đến đỉnh phong của cảnh giới/cấp độ hiện tại và gặp phải bình cảnh. Cần cơ duyên hoặc ngoại lực để đột phá!",
  expPercentageGainTooltip: "AI sẽ trả về kinh nghiệm dưới dạng % của mức tối đa hiện tại.",
  breakthroughSuccessMessage: "Đột phá thành công!",

  // Genre and Cultivation System
  // genreLabel: "Thể Loại Thế Giới", // Already exists
  // enableCultivationSystemLabel: "Bật Hệ Thống Tu Luyện/Sức Mạnh Đặc Thù", // Already exists
  // cultivationSystemDisabledNote: "Khi tắt, nhân vật sẽ là người thường, không có cảnh giới/linh lực/kinh nghiệm tu luyện. Các chỉ số sẽ là cơ bản.", // Already exists
  // mortalRealmName: "Người Thường", // Already exists
  // noCultivationSystem: "Không có hệ thống tu luyện", // Already exists

  // saveGameNameLabel: "Tên File Lưu Game", // Already exists
  // saveGameNamePlaceholder: "Ví dụ: Cuộc phiêu lưu của [Tên Nhân Vật]", // Already exists
  // saveGameNameRequiredError: "Vui lòng nhập tên cho file lưu game.", // Already exists
  itemCategory_Equipment: "Trang Bị",
  itemCategory_Potion: "Đan Dược/Thuốc",
  itemCategory_Material: "Nguyên Liệu",
  itemCategory_QuestItem: "Vật Phẩm Nhiệm Vụ",
  itemCategory_Miscellaneous: "Linh Tinh",

  // Status Effects
  statusEffectsSection: "Hiệu Ứng Hiện Tại",
  statusEffectApplied: (effectName: string) => `Bạn nhận được hiệu ứng: ${effectName}.`,
  statusEffectRemoved: (effectName: string) => `Hiệu ứng ${effectName} đã kết thúc.`,
  statusEffectDuration: (turns: number) => `(còn ${turns} lượt)`,
  statusEffectPermanent: "(Vĩnh viễn/Đặc biệt)",
  statusEffectTypeBuff: "Có Lợi",
  statusEffectTypeDebuff: "Bất Lợi",
  statusEffectTypeNeutral: "Trung Tính",
};
