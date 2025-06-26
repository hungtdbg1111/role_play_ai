
import { SUB_REALM_NAMES, ALL_FACTION_ALIGNMENTS, AVAILABLE_GENRES, VIETNAMESE, CUSTOM_GENRE_VALUE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, VIOLENCE_LEVELS, STORY_TONES, DEFAULT_NSFW_DESCRIPTION_STYLE, NSFW_DESCRIPTION_STYLES } from '../constants';
import * as GameTemplates from '../templates';
import { GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle } from '../types';

export const generateFanfictionWorldDetailsPrompt = (
    sourceMaterial: string,
    isSourceContent: boolean,
    playerInputDescription?: string,
    isNsfwIdea?: boolean,
    genre?: GenreType,
    isCultivationEnabled?: boolean,
    violenceLevel?: ViolenceLevel, 
    storyTone?: StoryTone,       
    customGenreName?: string,
    nsfwStyle?: NsfwDescriptionStyle 
): string => {
  const selectedGenre = genre || AVAILABLE_GENRES[0];
  const effectiveGenreDisplay = (selectedGenre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : selectedGenre;
  const genreForTag = (selectedGenre === CUSTOM_GENRE_VALUE && customGenreName) ? CUSTOM_GENRE_VALUE : selectedGenre;
  const customGenreNameForTag = (selectedGenre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : "";
  const cultivationActuallyEnabled = isCultivationEnabled === undefined ? true : isCultivationEnabled;
  const currentViolenceLevel = violenceLevel || DEFAULT_VIOLENCE_LEVEL;
  const currentStoryTone = storyTone || DEFAULT_STORY_TONE;
  const currentNsfwStyle = nsfwStyle || DEFAULT_NSFW_DESCRIPTION_STYLE;


  const cultivationSystemInstructions = cultivationActuallyEnabled ? `
        *   **Hệ Thống Cảnh Giới (nếu truyện gốc có, hãy cố gắng bám sát; nếu không, hãy tạo mới phù hợp với thể loại "${effectiveGenreDisplay}") với ít nhất 10 cảnh giới.**
            **QUAN TRỌNG: Hệ thống cảnh giới PHẢI bắt đầu bằng "Phàm Nhân". Cảnh giới "Phàm Nhân" này cũng có 10 cấp độ phụ như ${SUB_REALM_NAMES.join(', ')}.**
            [GENERATED_HE_THONG_CANH_GIOI: text="Hệ thống cảnh giới/cấp bậc, ví dụ: Phàm Nhân - Luyện Khí - Trúc Cơ"]
        *   **Cảnh Giới Khởi Đầu cho Nhân Vật Đồng Nhân (phải theo định dạng "[Tên Cảnh Giới Lớn] [Tên Cảnh Giới Nhỏ]", phù hợp với hệ thống trên và bối cảnh. KHÔNG được rút gọn tên cảnh giới lớn. **Cảnh giới khởi đầu cho nhân vật chính PHẢI LÀ một cấp độ của "Phàm Nhân".**):**
            [GENERATED_CANH_GIOI_KHOI_DAU: text="Cảnh giới/cấp độ khởi đầu, ví dụ: Phàm Nhân Nhất Trọng"]
` : `
        *   **Hệ Thống Cảnh Giới/Cấp Độ:** ĐÃ TẮT. Nhân vật sẽ là người thường.
            [GENERATED_HE_THONG_CANH_GIOI: text="${VIETNAMESE.noCultivationSystem}"]
            [GENERATED_CANH_GIOI_KHOI_DAU: text="${VIETNAMESE.mortalRealmName}"]
`;
  const skillTypeExamples = cultivationActuallyEnabled
    ? `(vd: ${Object.values(GameTemplates.SkillType).join(' | ')})`
    : `(vd: Kỹ năng Chiến Đấu, Kỹ năng Xã Hội, Kỹ năng Sinh Tồn, Kỹ năng Nghề Nghiệp tùy theo thể loại "${effectiveGenreDisplay}")`;

  const npcRealmInstructionFanfic = cultivationActuallyEnabled
    ? `, realm="Cảnh giới NPC (BẮT BUỘC nếu có tu luyện. PHẢI là một cảnh giới hợp lệ từ Hệ Thống Cảnh Giới đã tạo ở trên, ví dụ 'Phàm Nhân Tam Trọng', 'Luyện Khí Nhất Trọng'. Nếu NPC là một người thường hoàn toàn không tu luyện trong thế giới tu luyện, hãy dùng cảnh giới là '${VIETNAMESE.mortalRealmName}'. Nếu Hệ Thống Cảnh Giới đã được định nghĩa bắt đầu bằng 'Phàm Nhân', thì một NPC cấp thấp có thể là 'Phàm Nhân [cấp độ]'.)`
    : `, statsJSON='{"sinhLuc":100, "sucTanCong":15}' (TÙY CHỌN, ví dụ hp, atk cho người thường)`;

  let nsfwGuidanceForWorldGen = "";
  if (isNsfwIdea) {
    const violenceGuidanceText = VIETNAMESE[`violenceLevelGuidance${currentViolenceLevel.replace(/\s+/g, '')}` as keyof typeof VIETNAMESE] || VIETNAMESE.violenceLevelGuidanceThucTe;
    const storyToneGuidanceText = VIETNAMESE[`storyToneGuidance${currentStoryTone.replace(/\s+/g, '')}` as keyof typeof VIETNAMESE] || VIETNAMESE.storyToneGuidanceTrungTinh;
    let nsfwStyleSpecificGuidance = "";
    switch(currentNsfwStyle) {
        case 'Hoa Mỹ': nsfwStyleSpecificGuidance = VIETNAMESE.nsfwGuidanceHoaMy; break;
        case 'Trần Tục': nsfwStyleSpecificGuidance = VIETNAMESE.nsfwGuidanceTranTuc; break;
        case 'Gợi Cảm': nsfwStyleSpecificGuidance = VIETNAMESE.nsfwGuidanceGoiCam; break;
        case 'Mạnh Bạo (BDSM)': nsfwStyleSpecificGuidance = VIETNAMESE.nsfwGuidanceManhBaoBDSM; break;
        default: nsfwStyleSpecificGuidance = VIETNAMESE.nsfwGuidanceHoaMy;
    }

    nsfwGuidanceForWorldGen = `
- **Yêu cầu nội dung 18+:** BẬT. Hãy chủ động, ưu tiên và tích cực tạo ra các tên gọi, mô tả, tính cách, chi tiết NPC, kỹ năng, vật phẩm, tri thức thế giới và tóm tắt cốt truyện nguyên tác mang tính chất người lớn, nhạy cảm, và tình dục.
- **Phong Cách Miêu Tả Tình Dục (Người dùng chọn):** ${currentNsfwStyle}.
  ${nsfwStyleSpecificGuidance}
- **Mức Độ Bạo Lực (Người dùng chọn):** ${currentViolenceLevel}.
  ${violenceGuidanceText}
- **Tông Màu Câu Chuyện (Người dùng chọn):** ${currentStoryTone}.
  ${storyToneGuidanceText}
Khi tạo các yếu tố thế giới (NPC, kỹ năng, vật phẩm, địa điểm, tri thức), hãy đảm bảo chúng phản ánh sự kết hợp của các lựa chọn 18+, phong cách miêu tả, mức độ bạo lực, và tông màu câu chuyện này.
Ví dụ, nếu chọn phong cách "Mạnh Bạo (BDSM)", bạo lực "Cực Đoan" và tông "Đen Tối", các NPC có thể tàn bạo hơn, kỹ năng có thể ghê rợn hơn, vật phẩm có thể mang tính hủy diệt, và tri thức thế giới có thể u ám hơn. Ngược lại, nếu chọn phong cách "Hoa Mỹ", bạo lực "Nhẹ Nhàng" và "Tích Cực", các yếu tố nên tươi sáng hơn, dù vẫn có thể mang yếu tố 18+ tinh tế nếu được yêu cầu.
[GENERATED_NSFW_DESCRIPTION_STYLE: text="${currentNsfwStyle}"]
[GENERATED_VIOLENCE_LEVEL: text="${currentViolenceLevel}"]
[GENERATED_STORY_TONE: text="${currentStoryTone}"]`;
  } else {
    nsfwGuidanceForWorldGen = "- **Yêu cầu nội dung 18+:** TẮT. Vui lòng tạo các yếu tố phù hợp với mọi lứa tuổi. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục khi tạo các yếu tố này.";
  }


return `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai đồng nhân / fanfiction thể loại "${effectiveGenreDisplay}" bằng tiếng Việt.
Nhiệm vụ của bạn là tạo ra các yếu tố khởi đầu cho một thế giới game đồng nhân dựa trên thông tin được cung cấp.
${cultivationActuallyEnabled ? `Mỗi cảnh giới lớn (bao gồm cả "Phàm Nhân" nếu có) sẽ có 10 cấp độ phụ: ${SUB_REALM_NAMES.join(', ')}.` : ''}

**NGUỒN CẢM HỨNG ĐỒNG NHÂN:**
${isSourceContent
    ? `Nội dung truyện gốc (một phần hoặc toàn bộ) được cung cấp bởi người dùng:\n"""\n${sourceMaterial}\n"""`
    : `Tên truyện gốc được cung cấp bởi người dùng: "${sourceMaterial}"`}

${playerInputDescription
    ? `**Mô tả/Ý tưởng thêm từ người chơi về đồng nhân:**\n"${playerInputDescription}"`
    : ""}

**CHẾ ĐỘ NỘI DUNG CHO VIỆC TẠO YẾU TỐ ĐỒNG NHÂN:**
${nsfwGuidanceForWorldGen}
- Thể loại game: ${effectiveGenreDisplay}
- Hệ Thống Tu Luyện/Sức Mạnh Đặc Thù: ${cultivationActuallyEnabled ? "BẬT" : "TẮT"}

**YÊU CẦU SÁNG TẠO:**
1.  **Dựa vào Nguồn Cảm Hứng Đồng Nhân (và mô tả thêm nếu có), hãy tạo ra:**
    *   **Thông Tin Nhân Vật Chính (Đồng Nhân):**
        *   Tên Nhân Vật: [GENERATED_PLAYER_NAME: name="Tên Nhân Vật Được Tạo"]
        *   Giới Tính Nhân Vật: [GENERATED_PLAYER_GENDER: gender="Nam/Nữ/Khác"]
        *   Tính Cách: [GENERATED_PLAYER_PERSONALITY: text="Tính cách được tạo..."]
        *   Tiểu Sử (trong bối cảnh đồng nhân): [GENERATED_PLAYER_BACKSTORY: text="Tiểu sử được tạo..."]
        *   Mục Tiêu (trong câu chuyện đồng nhân): [GENERATED_PLAYER_GOAL: text="Mục tiêu được tạo..."]
        *   Đặc Điểm Khởi Đầu Chung: [GENERATED_PLAYER_STARTING_TRAITS: text="Đặc điểm chung được tạo..."]
    *   **Thiết Lập Thế Giới (Đồng Nhân):**
        *   Chủ Đề Thế Giới (có thể giữ nguyên từ truyện gốc hoặc biến tấu cho phù hợp "${effectiveGenreDisplay}"): [GENERATED_WORLD_THEME: text="Chủ đề thế giới được tạo..."]
        *   Bối Cảnh Chi Tiết (mô tả rõ nhánh truyện đồng nhân này diễn ra ở đâu, khi nào so với truyện gốc, và phù hợp với "${effectiveGenreDisplay}"): [GENERATED_WORLD_SETTING_DESCRIPTION: text="Bối cảnh chi tiết được tạo..."]
        *   Văn Phong AI (phù hợp với truyện gốc hoặc yêu cầu): [GENERATED_WORLD_WRITING_STYLE: text="Văn phong được tạo..."]
        *   Tên Tiền Tệ (có thể giữ nguyên từ truyện gốc): [GENERATED_CURRENCY_NAME: name="Tên Tiền Tệ Được Tạo"]
        *   Cung cấp thông tin về thể loại và hệ thống tu luyện đã chọn:
            [GENERATED_GENRE: text="${genreForTag}"]
            ${customGenreNameForTag ? `[GENERATED_CUSTOM_GENRE_NAME: text="${customGenreNameForTag}"]` : ''}
            [GENERATED_IS_CULTIVATION_ENABLED: value=${cultivationActuallyEnabled}]
        ${cultivationSystemInstructions}
    *   **Tóm Tắt Cốt Truyện Nguyên Tác (QUAN TRỌNG):** Dựa trên Nguồn Cảm Hứng Đồng Nhân, hãy **tóm tắt cốt truyện của truyện gốc (nguyên tác)**, dài khoảng 1000-1500 từ. Phần tóm tắt này nên được chia thành các giai đoạn hoặc các chương chính, mô tả các sự kiện quan trọng, xung đột và hướng phát triển của các nhân vật chính trong nguyên tác. Sử dụng tag: \\\`[GENERATED_ORIGINAL_STORY_SUMMARY: text="Giai đoạn 1 của nguyên tác: Mô tả chi tiết giai đoạn 1 của nguyên tác...\n\nGiai đoạn 2 của nguyên tác: Mô tả chi tiết giai đoạn 2 của nguyên tác...\n\n... (Tiếp tục cho đến khi đủ 1000-1500 từ và bao quát cốt truyện nguyên tác)"]\\\`
    *   **Yếu Tố Khởi Đầu Khác (Đồng Nhân - Đảm bảo cung cấp đầy đủ các tham số được yêu cầu cho mỗi tag):**
        *   **Kỹ Năng Khởi Đầu (5-6 kỹ năng):** Phù hợp với nhân vật, thế giới đồng nhân và thể loại "${effectiveGenreDisplay}".
            [GENERATED_SKILL: name="Tên Kỹ Năng (BẮT BUỘC)", description="Mô tả ngắn gọn và hiệu ứng cơ bản (BẮT BUỘC), phù hợp với thể loại '${effectiveGenreDisplay}' ${cultivationActuallyEnabled ? 'và hệ thống tu luyện/sức mạnh' : 'và không có hệ thống tu luyện/sức mạnh'}. Loại kỹ năng: ${skillTypeExamples}"]
        *   **Vật Phẩm Khởi Đầu (5-6 vật phẩm):** Phù hợp với nhân vật, thế giới đồng nhân và thể loại "${effectiveGenreDisplay}".
            **Định dạng chung:** [GENERATED_ITEM: name="Tên (BẮT BUỘC)", description="Mô tả (BẮT BUỘC)", quantity=1 (BẮT BUỘC, SỐ NGUYÊN), category="CHỌN MỘT TRONG CÁC LOẠI SAU: ${Object.values(GameTemplates.ItemCategory).join(' | ')}" (BẮT BUỘC), rarity="Phổ Thông|Hiếm|...", value=0 (SỐ NGUYÊN)]
            **Thuộc tính bổ sung tùy theo \`category\`:**
            *   Nếu \`category="${GameTemplates.ItemCategory.EQUIPMENT}"\`: Thêm \`equipmentType="CHỌN MỘT TRONG CÁC LOẠI TRANG BỊ HỢP LỆ SAU: ${Object.values(GameTemplates.EquipmentType).join(' | ')}" (BẮT BUỘC)\`, \`slot="Vị trí trang bị (ví dụ: Vũ Khí Chính, Đầu, Thân, Thú Cưng)" (TÙY CHỌN)\`, \`statBonusesJSON='{"sucTanCong": 5, "maxSinhLuc": 10}' (CHUỖI JSON, BẮT BUỘC, các khóa hợp lệ: maxSinhLuc, maxLinhLuc, sucTanCong. **Nếu không có, dùng \`statBonusesJSON='{}'\`**)\`, \`uniqueEffectsList="Hiệu ứng 1;Hiệu ứng 2" (danh sách hiệu ứng, cách nhau bởi dấu ';', BẮT BUỘC. **Nếu không có, dùng \`uniqueEffectsList="Không có gì đặc biệt"\`**)\`. **LƯU Ý:** \`equipmentType\` này KHÁC với \`slot\`. \`equipmentType\` là bản chất của trang bị (ví dụ: "${GameTemplates.EquipmentType.VU_KHI}"), còn \`slot\` là nơi nó được đeo (ví dụ: "Vũ Khí Phụ/Khiên"). Đừng nhầm lẫn.
            *   Nếu \`category="${GameTemplates.ItemCategory.POTION}"\`: Thêm \`potionType="CHỌN MỘT TRONG CÁC LOẠI ĐAN DƯỢC HỢP LỆ SAU: ${Object.values(GameTemplates.PotionType).join(' | ')}" (BẮT BUỘC)\`, \`effectsList="Hồi 50 HP;Tăng 10 công trong 3 lượt" (danh sách hiệu ứng, cách nhau bởi dấu ';', BẮT BUỘC)\`, \`durationTurns=0 (SỐ NGUYÊN, thời gian hiệu lực theo lượt, TÙY CHỌN)\`, \`cooldownTurns=0 (SỐ NGUYÊN, thời gian hồi chiêu vật phẩm, TÙY CHỌN)\`. **Nếu là đan dược hỗ trợ, tăng cường chỉ số tạm thời, hoặc gây hiệu ứng đặc biệt không phải hồi phục hay giải độc, hãy dùng loại \`${GameTemplates.PotionType.DAC_BIET}\` và mô tả rõ hiệu ứng trong \`effectsList\`**.
            *   Nếu \`category="${GameTemplates.ItemCategory.MATERIAL}"\`: Thêm \`materialType="CHỌN MỘT TRONG CÁC LOẠI NGUYÊN LIỆU HỢP LỆ SAU: ${Object.values(GameTemplates.MaterialType).join(' | ')}" (BẮT BUỘC)\`.
            *   Nếu \`category="${GameTemplates.ItemCategory.QUEST_ITEM}"\`: Thêm \`questIdAssociated="ID Nhiệm Vụ Liên Quan (TÙY CHỌN)"\`.
            *   Nếu \`category="${GameTemplates.ItemCategory.MISCELLANEOUS}"\`: Thêm \`usable=false (true/false, TÙY CHỌN)\`, \`consumable=false (true/false, TÙY CHỌN)\`.
        *   **NPC Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ NPC quan trọng nào (từ truyện gốc hoặc NPC mới) mà bạn thấy phù hợp để làm phong phú câu chuyện đồng nhân. Hãy ưu tiên cung cấp thật nhiều NPC là nhân vật gốc truyện (Tầm 10 NPC trở lên). Cung cấp thông tin chi tiết cho mỗi NPC, phù hợp với thể loại "${effectiveGenreDisplay}".
            [GENERATED_NPC: name="Tên NPC (BẮT BUỘC)", gender="Nam/Nữ/Khác/Không rõ (BẮT BUỘC)", personality="Tính cách (BẮT BUỘC)", initialAffinity=0 (SỐ NGUYÊN), details="Chi tiết (BẮT BUỘC)"${npcRealmInstructionFanfic}, statsJSON='{"sinhLuc":500, "sucTanCong":80}' (TÙY CHỌN), baseStatOverridesJSON='{"baseMaxLinhLuc":1000}' (TÙY CHỌN)]
        *   **Tri Thức Thế Giới Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ khái niệm, lịch sử, địa danh, hoặc quy tắc nào (từ truyện gốc hoặc mới) để làm rõ bối cảnh đồng nhân (Tầm 10 Tri Thức Thế Giới Khởi Đầu trở lên), phù hợp với thể loại "${effectiveGenreDisplay}".
            [GENERATED_LORE: title="Tiêu đề Tri Thức (BẮT BUỘC)", content="Nội dung chi tiết (BẮT BUỘC)"]
        *   **Địa Điểm Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra các Địa Điểm Khởi Đầu (từ truyện gốc hoặc mới) phù hợp với bối cảnh đồng nhân và thể loại "${effectiveGenreDisplay}".
            [GENERATED_LOCATION: name="Tên Địa Điểm (BẮT BUỘC)", description="Mô tả địa điểm (BẮT BUỘC)", isSafeZone=false (true/false), regionId="Tên Vùng (nếu có)"]
        *   **Phe Phái Khởi Đầu (3-4 phe phái, nếu phù hợp):**
            [GENERATED_FACTION: name="Tên Phe Phái (BẮT BUỘC)", description="Mô tả phe phái (BẮT BUỘC)", alignment="CHỌN MỘT TRONG: ${ALL_FACTION_ALIGNMENTS.join(' | ')}" (BẮT BUỘC), initialPlayerReputation=0 (SỐ NGUYÊN)]

2.  **Nếu truyện gốc là truyện 18+ thì các yếu tố được tạo ra sẽ ưu tiên mang hướng 18+ nhiều hơn, bao gồm cả tóm tắt cốt truyện nguyên tác. Nếu tùy chọn "Yêu cầu nội dung 18+" ở trên được BẬT, hãy áp dụng mức độ 18+ cao hơn nữa.**

**QUAN TRỌNG:**
- **Tóm Tắt Cốt Truyện Nguyên Tác phải chi tiết và có cấu trúc giai đoạn rõ ràng.**
- **Không giới hạn số lượng NPC, Tri Thức Thế Giới (Lore) và Địa Điểm Khởi Đầu được tạo ra.** Hãy sáng tạo thật nhiều để làm giàu thế giới đồng nhân!
- Chỉ sử dụng các tag ĐÚNG ĐỊNH DẠNG đã cho ở trên. Mỗi tag trên một dòng riêng.
- Giá trị của các thuộc tính trong tag (name, description, text, ...) phải được đặt trong dấu ngoặc kép.
- Cung cấp thông tin bằng tiếng Việt.
- Đảm bảo các yếu tố này phù hợp và nhất quán với nguồn cảm hứng đồng nhân được cung cấp và thể loại "${effectiveGenreDisplay}".
- Không thêm bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài các tag được yêu cầu.
`;
};
