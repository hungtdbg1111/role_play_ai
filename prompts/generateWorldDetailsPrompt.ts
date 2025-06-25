
import { SUB_REALM_NAMES, ALL_FACTION_ALIGNMENTS, AVAILABLE_GENRES, VIETNAMESE, CUSTOM_GENRE_VALUE } from '../constants'; 
import * as GameTemplates from '../templates';
import { GenreType } from '../types';

export const generateWorldDetailsPrompt = (
    storyIdea: string, 
    isNsfwIdea: boolean, 
    genre: GenreType, 
    isCultivationEnabled: boolean,
    customGenreName?: string
): string => {
  const effectiveGenreDisplay = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : genre;
  const genreForTag = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? CUSTOM_GENRE_VALUE : genre; // Store the original selection
  const customGenreNameForTag = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : "";
  
  const cultivationSystemInstructions = isCultivationEnabled ? `
    *   **Tạo Hệ Thống Cảnh Giới:** (Ví dụ: "Phàm Nhân - Luyện Khí - Trúc Cơ - Kim Đan - Nguyên Anh - Hóa Thần - Luyện Hư - Hợp Thể - Đại Thừa - Độ Kiếp...").
        **QUAN TRỌNG: Hệ thống cảnh giới PHẢI bắt đầu bằng "Phàm Nhân" (hoặc một tên tương đương cho cấp độ凡人, ví dụ: "Người Thường Luyện Thể"). Cảnh giới "Phàm Nhân" này cũng có 10 cấp độ phụ như ${SUB_REALM_NAMES.join(', ')}.**
        Hãy thay đổi các cảnh giới sau "Phàm Nhân" để phù hợp hơn với bối cảnh và thể loại "${effectiveGenreDisplay}". Phải có ít nhất 5 đại cảnh giới (bao gồm "Phàm Nhân") được tạo ra nếu thể loại là Tu Tiên/Tiên Hiệp. Với các thể loại khác có sức mạnh (Võ Hiệp, Huyền Huyễn), hãy tạo hệ thống cấp bậc/danh hiệu tương ứng, với cấp thấp nhất tương đương "Phàm Nhân".
        [GENERATED_HE_THONG_CANH_GIOI: text="Hệ thống cảnh giới/cấp bậc do AI tạo, bắt đầu bằng Phàm Nhân, phân cách bằng dấu ' - '"]
    *   **Tạo Cảnh Giới Khởi Đầu:** (Phải là một cấp độ cụ thể trong hệ thống trên, theo định dạng "[Tên Cảnh Giới Lớn] [Tên Cảnh Giới Nhỏ]", ví dụ: "Phàm Nhân Nhất Trọng", "Phàm Nhân Đỉnh Phong", hoặc "Học徒 Võ Sĩ". KHÔNG được rút gọn tên cảnh giới lớn. **Cảnh giới khởi đầu cho nhân vật chính PHẢI LÀ một cấp độ của "Phàm Nhân".**)
        [GENERATED_CANH_GIOI_KHOI_DAU: text="Cảnh giới/cấp độ khởi đầu do AI tạo, thuộc cảnh giới Phàm Nhân"]
` : `
    *   **Hệ Thống Cảnh Giới/Cấp Độ:** ĐÃ TẮT. Nhân vật sẽ là người thường.
        [GENERATED_HE_THONG_CANH_GIOI: text="${VIETNAMESE.noCultivationSystem}"]
        [GENERATED_CANH_GIOI_KHOI_DAU: text="${VIETNAMESE.mortalRealmName}"]
`;

  const skillTypeExamples = isCultivationEnabled 
    ? `(vd: ${Object.values(GameTemplates.SkillType).join(' | ')})` 
    : `(vd: Kỹ năng Chiến Đấu, Kỹ năng Xã Hội, Kỹ năng Sinh Tồn, Kỹ năng Nghề Nghiệp tùy theo thể loại "${effectiveGenreDisplay}")`;

  const skillExample = isCultivationEnabled
    ? `[GENERATED_SKILL: name="Hỏa Cầu Thuật", description="Tạo ra một quả cầu lửa nhỏ tấn công kẻ địch, tiêu hao 5 mana. Loại kỹ năng: ${GameTemplates.SkillType.CHUDONG_TANCONG}"]`
    : (effectiveGenreDisplay === "Võ Hiệp" ? `[GENERATED_SKILL: name="Thiết Sa Chưởng", description="Một chưởng pháp cơ bản, tăng lực tay khi tấn công. Loại kỹ năng: Kỹ năng Võ Thuật"]` : `[GENERATED_SKILL: name="Thương Lượng Giá Cả", description="Khả năng mặc cả tốt hơn khi mua bán. Loại kỹ năng: Kỹ năng Xã Hội"]`);

  const npcRealmInstruction = isCultivationEnabled 
    ? `, realm="Cảnh giới NPC (BẮT BUỘC nếu có tu luyện. PHẢI là một cảnh giới hợp lệ từ Hệ Thống Cảnh Giới đã tạo ở trên, ví dụ 'Phàm Nhân Tam Trọng', 'Luyện Khí Nhất Trọng'. Nếu NPC là một người thường hoàn toàn không tu luyện trong thế giới tu luyện, hãy dùng cảnh giới là '${VIETNAMESE.mortalRealmName}'. Nếu Hệ Thống Cảnh Giới đã được định nghĩa bắt đầu bằng 'Phàm Nhân', thì một NPC tu luyện cấp thấp có thể là 'Phàm Nhân [cấp độ]', còn một người dân thường sẽ là '${VIETNAMESE.mortalRealmName}'.)", baseStatOverridesJSON='{"baseMaxSinhLuc":120}' (TÙY CHỌN, để ghi đè chỉ số cơ bản cho cảnh giới này), statsJSON='{"sinhLuc":100, "sucTanCong":15}' (TÙY CHỌN, để ghi đè các chỉ số hiện tại)`
    : `, statsJSON='{"sinhLuc":100, "sucTanCong":15}' (TÙY CHỌN, ví dụ hp, atk cho người thường)`;


return `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai thể loại "${effectiveGenreDisplay}" bằng tiếng Việt.
Dựa trên mô tả ý tưởng cốt truyện sau đây từ người dùng, hãy tạo ra các yếu tố khởi đầu cho thế giới game.
${isCultivationEnabled ? `Mỗi cảnh giới lớn (bao gồm cả "Phàm Nhân" nếu có) sẽ có 10 cấp độ phụ: ${SUB_REALM_NAMES.join(', ')}.` : ''}

**Mô tả ý tưởng:**
"${storyIdea}"

**CHẾ ĐỘ NỘI DUNG CHO VIỆC TẠO YẾU TỐ KHỞI ĐẦU:**
- Yêu cầu nội dung 18+ (dâm dục, bạo lực): ${isNsfwIdea ? "BẬT" : "TẮT"}
${isNsfwIdea
  ? "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được BẬT cho việc tạo các yếu tố thế giới. Hãy chủ động, ưu tiên và tích cực tạo ra các tên gọi, mô tả, tính cách, chi tiết NPC, kỹ năng, vật phẩm, và tri thức thế giới mang tính chất người lớn, nhạy cảm, dâm dục và bạo lực một cách chi tiết và rõ ràng. Hãy mạnh dạn đưa ra những gợi ý 18+ cho các yếu tố này. Ưu tiên cho yếu tố tình dục hơn so với bạo lực."
  : "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được TẮT. Vui lòng tạo các yếu tố phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục khi tạo các yếu tố này."
}
- Thể loại game: ${effectiveGenreDisplay}
- Hệ Thống Tu Luyện/Sức Mạnh Đặc Thù: ${isCultivationEnabled ? "BẬT" : "TẮT"}

**YÊU CẦU:**
1.  **Thông Tin Nhân Vật:**
    *   Tạo Tên Nhân Vật: [GENERATED_PLAYER_NAME: name="Tên Nhân Vật Được Tạo"]
    *   Tạo Giới Tính Nhân Vật: [GENERATED_PLAYER_GENDER: gender="Nam/Nữ/Khác"]
    *   Tạo Tính Cách: [GENERATED_PLAYER_PERSONALITY: text="Tính cách được tạo..."]
    *   Tạo Tiểu Sử: [GENERATED_PLAYER_BACKSTORY: text="Tiểu sử được tạo..."]
    *   Tạo Mục Tiêu: [GENERATED_PLAYER_GOAL: text="Mục tiêu được tạo..."]
    *   Tạo Đặc Điểm Khởi Đầu Chung: [GENERATED_PLAYER_STARTING_TRAITS: text="Đặc điểm chung được tạo..."]

2.  **Thiết Lập Thế Giới:**
    *   Tạo Chủ Đề Thế Giới: [GENERATED_WORLD_THEME: text="Chủ đề thế giới được tạo..."]
    *   Tạo Bối Cảnh Chi Tiết: [GENERATED_WORLD_SETTING_DESCRIPTION: text="Bối cảnh chi tiết được tạo..."]
    *   Tạo Văn Phong AI: [GENERATED_WORLD_WRITING_STYLE: text="Văn phong được tạo..."]
    *   Tạo Tên Tiền Tệ: [GENERATED_CURRENCY_NAME: name="Tên Tiền Tệ Được Tạo"]
    *   Cung cấp thông tin về thể loại và hệ thống tu luyện đã chọn:
        [GENERATED_GENRE: text="${genreForTag}"]
        ${customGenreNameForTag ? `[GENERATED_CUSTOM_GENRE_NAME: text="${customGenreNameForTag}"]` : ''}
        [GENERATED_IS_CULTIVATION_ENABLED: value=${isCultivationEnabled}]
    ${cultivationSystemInstructions}

3.  **Yếu Tố Khởi Đầu Khác (Đảm bảo cung cấp đầy đủ các tham số được yêu cầu cho mỗi tag):**
    *   Tạo ra 3 đến 4 Kỹ Năng Khởi Đầu phù hợp. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_SKILL: name="Tên Kỹ Năng (BẮT BUỘC)", description="Mô tả ngắn gọn về kỹ năng và hiệu ứng cơ bản (BẮT BUỘC), phù hợp với thể loại '${effectiveGenreDisplay}' ${isCultivationEnabled ? 'và hệ thống tu luyện' : 'và không có hệ thống tu luyện'}. Loại kỹ năng: ${skillTypeExamples}"]
        Ví dụ: ${skillExample}
    *   Tạo ra 3 đến 4 Vật Phẩm Khởi Đầu thú vị.
        **Định dạng chung:** [GENERATED_ITEM: name="Tên (BẮT BUỘC)", description="Mô tả (BẮT BUỘC)", quantity=1 (BẮT BUỘC, SỐ NGUYÊN), category="CHỌN MỘT TRONG CÁC LOẠI SAU: ${Object.values(GameTemplates.ItemCategory).join(' | ')}" (BẮT BUỘC), rarity="Phổ Thông|Hiếm|...", value=0 (SỐ NGUYÊN)]
        **Thuộc tính bổ sung tùy theo \`category\`:**
        *   Nếu \`category="${GameTemplates.ItemCategory.EQUIPMENT}"\`: Thêm \`equipmentType="CHỌN MỘT TRONG CÁC LOẠI TRANG BỊ HỢP LỆ SAU: ${Object.values(GameTemplates.EquipmentType).join(' | ')}" (BẮT BUỘC)\`, \`slot="Vị trí trang bị (ví dụ: Vũ Khí Chính, Đầu, Thân, Thú Cưng)" (TÙY CHỌN)\`, \`statBonusesJSON='{"sucTanCong": 5, "maxSinhLuc": 10}' (CHUỖI JSON, BẮT BUỘC, các khóa hợp lệ: maxSinhLuc, maxLinhLuc, sucTanCong. **Nếu không có, dùng \`statBonusesJSON='{}'\`**)\`, \`uniqueEffectsList="Hiệu ứng 1;Hiệu ứng 2" (danh sách hiệu ứng, cách nhau bởi dấu ';', BẮT BUỘC. **Nếu không có, dùng \`uniqueEffectsList="Không có gì đặc biệt"\`**)\`. **LƯU Ý:** \`equipmentType\` này KHÁC với \`slot\`. \`equipmentType\` là bản chất của trang bị (ví dụ: "${GameTemplates.EquipmentType.VU_KHI}"), còn \`slot\` là nơi nó được đeo (ví dụ: "Vũ Khí Phụ/Khiên"). Đừng nhầm lẫn.
        *   Nếu \`category="${GameTemplates.ItemCategory.POTION}"\`: Thêm \`potionType="CHỌN MỘT TRONG CÁC LOẠI ĐAN DƯỢC HỢP LỆ SAU: ${Object.values(GameTemplates.PotionType).join(' | ')}" (BẮT BUỘC)\`, \`effectsList="Hồi 50 HP;Tăng 10 công trong 3 lượt" (danh sách hiệu ứng, cách nhau bởi dấu ';', BẮT BUỘC)\`, \`durationTurns=0 (SỐ NGUYÊN, thời gian hiệu lực theo lượt, TÙY CHỌN)\`, \`cooldownTurns=0 (SỐ NGUYÊN, thời gian hồi chiêu vật phẩm, TÙY CHỌN)\`. **Nếu là đan dược hỗ trợ, tăng cường chỉ số tạm thời, hoặc gây hiệu ứng đặc biệt không phải hồi phục hay giải độc, hãy dùng loại \`${GameTemplates.PotionType.DAC_BIET}\` và mô tả rõ hiệu ứng trong \`effectsList\`**.
        *   Nếu \`category="${GameTemplates.ItemCategory.MATERIAL}"\`: Thêm \`materialType="CHỌN MỘT TRONG CÁC LOẠI NGUYÊN LIỆU HỢP LỆ SAU: ${Object.values(GameTemplates.MaterialType).join(' | ')}" (BẮT BUỘC)\`.
        *   Nếu \`category="${GameTemplates.ItemCategory.QUEST_ITEM}"\`: Thêm \`questIdAssociated="ID Nhiệm Vụ Liên Quan (TÙY CHỌN)"\`.
        *   Nếu \`category="${GameTemplates.ItemCategory.MISCELLANEOUS}"\`: Thêm \`usable=false (true/false, TÙY CHỌN)\`, \`consumable=false (true/false, TÙY CHỌN)\`.
    *   Tạo ra 3 đến 4 NPC Khởi Đầu quan trọng hoặc thú vị.
        [GENERATED_NPC: name="Tên NPC (BẮT BUỘC)", gender="Nam/Nữ/Khác/Không rõ (BẮT BUỘC)", personality="Tính cách nổi bật (BẮT BUỘC)", initialAffinity=0 (SỐ NGUYÊN), details="Vai trò, tiểu sử ngắn hoặc mối liên hệ với người chơi (BẮT BUỘC), phù hợp với thể loại '${effectiveGenreDisplay}'"${npcRealmInstruction}]
    *   Tạo ra 3 đến 4 Tri Thức Thế Giới Khởi Đầu để làm phong phú bối cảnh.
        [GENERATED_LORE: title="Tiêu đề Tri Thức (BẮT BUỘC)", content="Nội dung chi tiết của tri thức (BẮT BUỘC), phù hợp với thể loại '${effectiveGenreDisplay}'"]
    *   Tạo ra 3 đến 4 Địa Điểm Khởi Đầu phù hợp.
        [GENERATED_LOCATION: name="Tên Địa Điểm (BẮT BUỘC)", description="Mô tả địa điểm (BẮT BUỘC)", isSafeZone=false (true/false), regionId="Tên Vùng (nếu có)"]
    *   Tạo ra 3 đến 4 Phe Phái Khởi Đầu (nếu có, và nếu phù hợp với ý tưởng).
        [GENERATED_FACTION: name="Tên Phe Phái (BẮT BUỘC)", description="Mô tả phe phái (BẮT BUỘC)", alignment="CHỌN MỘT TRONG: ${ALL_FACTION_ALIGNMENTS.join(' | ')}" (BẮT BUỘC), initialPlayerReputation=0 (SỐ NGUYÊN)]

**QUAN TRỌNG:**
- Chỉ sử dụng các tag ĐÚNG ĐỊNH DẠNG đã cho ở trên. Mỗi tag trên một dòng riêng.
- Giá trị của các thuộc tính trong tag phải được đặt trong dấu ngoặc kép.
- Cung cấp thông tin bằng tiếng Việt.
- Hãy sáng tạo và đảm bảo các yếu tố này phù hợp với mô tả ý tưởng và thể loại "${effectiveGenreDisplay}".
- Không thêm bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài các tag được yêu cầu.
`;
};
