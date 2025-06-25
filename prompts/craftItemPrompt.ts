
import { Item, PlayerStats, GenreType } from '../types'; // Added GenreType
import * as GameTemplates from '../templates';
import { VIETNAMESE, CUSTOM_GENRE_VALUE } from '../constants'; // Added CUSTOM_GENRE_VALUE

export const generateCraftItemPrompt = (
  desiredItemCategory: GameTemplates.ItemCategoryValues,
  playerRequirements: string,
  materials: Array<{ name: string; description: string; category: GameTemplates.ItemCategoryValues; materialType?: GameTemplates.MaterialTypeValues }>,
  playerStats: PlayerStats,
  playerName?: string,
  genre?: GenreType, 
  isCultivationEnabled?: boolean,
  customGenreName?: string // Added for custom genre
): string => {
  const materialsList = materials.map(m => `- ${m.name} (${m.materialType || m.category}): ${m.description || 'Nguyên liệu không có mô tả cụ thể.'}`).join('\n');
  const selectedGenre = genre || "Tu Tiên (Mặc định)";
  const effectiveGenre = (selectedGenre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : selectedGenre;
  const cultivationStatusText = isCultivationEnabled ? "BẬT" : "TẮT";
  const playerRealmOrLevel = isCultivationEnabled ? playerStats.realm : VIETNAMESE.mortalRealmName;
  const playerEnergyStat = isCultivationEnabled ? `Linh Lực: ${playerStats.linhLuc} / ${playerStats.maxLinhLuc}` : `Năng Lượng/Thể Lực: ${playerStats.linhLuc} / ${playerStats.maxLinhLuc}`;


  return `
Bạn là một Bậc Thầy Chế Tạo trong thế giới ${effectiveGenre}, có khả năng tạo ra vô số vật phẩm từ những nguyên liệu tưởng chừng như bình thường.
Người chơi muốn chế tạo một vật phẩm mới. Dưới đây là yêu cầu, các nguyên liệu họ cung cấp, và thông tin nhân vật hiện tại để bạn tham khảo về bối cảnh và sức mạnh.

**THÔNG TIN NHÂN VẬT HIỆN TẠI (ĐỂ THAM KHẢO):**
- Tên Nhân Vật: ${playerName || 'Người Chơi'}
- Thể Loại Game: ${effectiveGenre}
- Hệ Thống Tu Luyện/Sức Mạnh Đặc Thù: ${cultivationStatusText}
- Cảnh Giới/Cấp Độ: ${playerRealmOrLevel}
- Sinh Lực: ${playerStats.sinhLuc} / ${playerStats.maxSinhLuc}
- ${playerEnergyStat}
- Sức Tấn Công Cơ Bản (Chưa Tính Trang Bị): ${playerStats.baseSucTanCong}
- Sức Tấn Công Hiệu Quả (Đã Tính Trang Bị): ${playerStats.sucTanCong}

**YÊU CẦU CỦA NGƯỜI CHƠI:**
- Loại Vật Phẩm Mong Muốn: ${desiredItemCategory}
- Mô Tả/Yêu Cầu Cụ Thể: "${playerRequirements || 'Không có yêu cầu cụ thể, tùy bạn sáng tạo dựa trên nguyên liệu.'}"

**NGUYÊN LIỆU SỬ DỤNG (${materials.length} loại):**
${materialsList.length > 0 ? materialsList : "Không có nguyên liệu nào được cung cấp."}

**HƯỚN DẪN CHẾ TẠO CHO BẠN (AI):**
1.  **Phân Tích Nguyên Liệu và Bối Cảnh:** Dựa vào tên, loại, mô tả của các nguyên liệu, yêu cầu của người chơi, THÔNG TIN NHÂN VẬT, và đặc biệt là THỂ LOẠI GAME (${effectiveGenre}) cũng như trạng thái HỆ THỐNG TU LUYỆN (${cultivationStatusText}), hãy xác định đặc tính, thuộc tính (ngũ hành, công nghệ, phép thuật, v.v.), và tiềm năng của chúng.
2.  **Cân Bằng Sức Mạnh Vật Phẩm:** Cố gắng tạo ra vật phẩm có sức mạnh (chỉ số cộng thêm, hiệu ứng) tương xứng với cấp độ/cảnh giới và sức mạnh hiện tại của nhân vật, cũng như phù hợp với thể loại game. Tránh tạo ra vật phẩm quá yếu hoặc quá mạnh một cách vô lý.
3.  **Sáng Tạo Vật Phẩm:**
    *   Tạo ra một vật phẩm MỚI, hợp lý. Vật phẩm phải phù hợp với thể loại "${effectiveGenre}". Ví dụ, nếu thể loại là "Khoa Huyễn" và hệ thống tu luyện TẮT, đừng tạo ra "Linh Kiếm" mà hãy tạo "Súng Laser Thử Nghiệm" hoặc "Chip Cường Hóa Giáp".
    *   Nếu nguyên liệu không phù hợp hoặc yêu cầu quá vô lý, hãy tạo ra một vật phẩm "Phế Phẩm" hoặc cấp thấp, với mô tả hài hước về sự thất bại.
    *   Vật phẩm tạo ra PHẢI tuân theo định dạng tag \`[ITEM_ACQUIRED: ...]\` như mô tả bên dưới.
4.  **Định Dạng Tag Trả Về (BẮT BUỘC CHÍNH XÁC):**
    \`[ITEM_ACQUIRED: name="Tên Vật Phẩm Tạo Ra", type="LOẠI CHÍNH + LOẠI PHỤ (NẾU CÓ)", description="Mô tả chi tiết vật phẩm tạo ra, bao gồm cả quá trình chế tạo (nếu có thể) và kết quả.", quantity=1, rarity="Độ Hiếm", value=GiáTrịƯớcLượng, ... (các thuộc tính khác tùy loại)]\`

    **CHI TIẾT VỀ THAM SỐ TRONG TAG \`[ITEM_ACQUIRED]\`:**
    *   \`name\`: Tên của vật phẩm.
    *   \`type\`: Loại vật phẩm. PHẢI bao gồm **Loại Chính** và **Loại Phụ** (nếu có).
        *   **Các Loại Chính Hợp Lệ:** ${Object.values(GameTemplates.ItemCategory).join(' | ')}.
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.EQUIPMENT}\`, thì Loại Phụ (\`equipmentType\`) PHẢI LÀ MỘT TRONG CÁC LOẠI TRANG BỊ SAU: ${Object.values(GameTemplates.EquipmentType).join(' | ')}. Ví dụ: \`type="${GameTemplates.ItemCategory.EQUIPMENT} ${GameTemplates.EquipmentType.VU_KHI}"\`. Tham số \`equipmentType\` (riêng biệt) CŨNG LÀ BẮT BUỘC cho trang bị. Thuộc tính \`statBonusesJSON\` LÀ BẮT BUỘC (nếu không có, dùng \`statBonusesJSON='{}'\`). Thuộc tính \`uniqueEffectsList\` LÀ BẮT BUỘC (nếu không có, dùng \`uniqueEffectsList="Không có gì đặc biệt"\`).
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.POTION}\`, thì Loại Phụ (\`potionType\`) PHẢI LÀ MỘT TRONG CÁC LOẠI ĐAN DƯỢC SAU: ${Object.values(GameTemplates.PotionType).join(' | ')}. Ví dụ: \`type="${GameTemplates.ItemCategory.POTION} ${GameTemplates.PotionType.HOI_PHUC}"\`. **Nếu là đan dược hỗ trợ, tăng cường chỉ số tạm thời, hoặc gây hiệu ứng đặc biệt không phải hồi phục hay giải độc, hãy dùng loại \`${GameTemplates.PotionType.DAC_BIET}\` và mô tả rõ hiệu ứng trong \`effectsList\`**. Tham số \`potionType\` (riêng biệt) CŨNG LÀ BẮT BUỘC cho đan dược.
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.MATERIAL}\`, thì Loại Phụ PHẢI LÀ MỘT TRONG CÁC LOẠI NGUYÊN LIỆU SAU: ${Object.values(GameTemplates.MaterialType).join(' | ')}. Ví dụ: \`type="${GameTemplates.ItemCategory.MATERIAL} ${GameTemplates.MaterialType.LINH_THAO}"\`. Tham số \`materialType\` (riêng biệt) CŨNG LÀ BẮT BUỘC cho nguyên liệu.
        *   Đối với \`${GameTemplates.ItemCategory.QUEST_ITEM}\` và \`${GameTemplates.ItemCategory.MISCELLANEOUS}\`, không cần Loại Phụ. Ví dụ: \`type="${GameTemplates.ItemCategory.QUEST_ITEM}"\`.
    *   \`description\`: Mô tả chi tiết, bao gồm quá trình chế tạo và công dụng.
    *   \`quantity\`: Luôn là \`1\`.
    *   \`rarity\`: Độ hiếm (\`${Object.values(GameTemplates.ItemRarity).join(' | ')}\`).
    *   \`value\`: Giá trị ước lượng (số nguyên).
    *   \`statBonusesJSON\`: CHỈ DÙNG CHO TRANG BỊ (\`${GameTemplates.ItemCategory.EQUIPMENT}\`). LÀ BẮT BUỘC. Phải là một CHUỖI JSON hợp lệ. Khóa hợp lệ: \`maxSinhLuc\`, ${isCultivationEnabled ? '\`maxLinhLuc\`,' : ''} \`sucTanCong\`, ${isCultivationEnabled ? '\`maxKinhNghiem\`.' : '\`maxKinhNghiem\` (nếu kinh nghiệm chung có thể được bonus).'}. Ví dụ: \`statBonusesJSON='{"sucTanCong":5,"maxSinhLuc":20}'\`. **Nếu không có chỉ số cộng thêm, PHẢI ĐỂ LÀ \`statBonusesJSON='{}'\`.**
    *   \`uniqueEffectsList\`: CHỈ DÙNG CHO TRANG BỊ. LÀ BẮT BUỘC. Danh sách hiệu ứng, cách nhau bởi \`;\`. Ví dụ: \`uniqueEffectsList="Hút máu 5%;Gây bỏng"\`. **Nếu không có hiệu ứng đặc biệt, PHẢI ĐỂ LÀ \`uniqueEffectsList="Không có gì đặc biệt"\`.**
    *   \`equipmentType\`: ĐIỀN NẾU \`type\` LÀ \`"${GameTemplates.ItemCategory.EQUIPMENT} [LOẠI TRANG BỊ]"\`. PHẢI là một trong: ${Object.values(GameTemplates.EquipmentType).join(' | ')}. Đây là bản chất của trang bị, không phải là tên vị trí nó được đeo.
    *   \`slot\`: Vị trí trang bị (ví dụ: "Vũ Khí Chính", "Giáp Đầu"). Tùy chọn cho trang bị.
    *   \`potionType\`: ĐIỀN NẾU \`type\` LÀ \`"${GameTemplates.ItemCategory.POTION} [LOẠI ĐAN DƯỢC]"\`. PHẢI là một trong: ${Object.values(GameTemplates.PotionType).join(' | ')}.
    *   \`effectsList\`: CHỈ DÙNG CHO ĐAN DƯỢC. Danh sách hiệu ứng, cách nhau bởi \`;\`. Ví dụ: \`effectsList="Hồi 100 HP;Tăng 20 ATK trong 3 lượt"\`
    *   \`durationTurns\`: Thời gian hiệu lực (số lượt). Dùng cho đan dược.
    *   \`cooldownTurns\`: Thời gian hồi chiêu (số lượt). Dùng cho đan dược.
    *   \`materialType\`: ĐIỀN NẾU \`type\` LÀ \`"${GameTemplates.ItemCategory.MATERIAL} [LOẠI NGUYÊN LIỆU]"\`. PHẢI là một trong: ${Object.values(GameTemplates.MaterialType).join(' | ')}.
    *   \`questIdAssociated\`: ID nhiệm vụ liên quan (nếu là vật phẩm nhiệm vụ).
    *   \`usable\`: \`true\` hoặc \`false\` (cho vật phẩm linh tinh, có thể sử dụng được không).
    *   \`consumable\`: \`true\` hoặc \`false\` (cho vật phẩm linh tinh, có bị tiêu hao khi sử dụng không).

5.  **Mô Tả Vật Phẩm (Dành cho Hiển Thị Người Chơi):** SAU KHI bạn đã tạo tag \`[ITEM_ACQUIRED: ...]\`, hãy viết một đoạn văn ngắn (2-4 câu) mô tả vật phẩm vừa được chế tạo một cách đầy thi vị và hấp dẫn, phù hợp với thể loại "${effectiveGenre}". Đoạn văn này KHÔNG được nằm trong bất kỳ tag nào, và phải nằm SAU tag \`[ITEM_ACQUIRED: ...]\`.

6.  **ĐẢM BẢO:** Phản hồi của bạn phải bao gồm MỘT tag \`[ITEM_ACQUIRED: ...]\` duy nhất, theo sau là đoạn văn mô tả (nếu có) ở mục 5. Tag phải ở trước đoạn văn mô tả.
`;
};
