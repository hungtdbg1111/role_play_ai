
import { KnowledgeBase, PlayerActionInputType, ResponseLength, GameMessage, GenreType, ViolenceLevel, StoryTone, NsfwDescriptionStyle, DIALOGUE_MARKER } from '../types';
import { SUB_REALM_NAMES, VIETNAMESE, CUSTOM_GENRE_VALUE, DEFAULT_NSFW_DESCRIPTION_STYLE, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, NSFW_DESCRIPTION_STYLES } from '../constants';
import * as GameTemplates from '../templates';

export const generateContinuePrompt = (
  knowledgeBase: KnowledgeBase,
  playerActionText: string,
  inputType: PlayerActionInputType,
  responseLength: ResponseLength,
  currentPageMessagesLog: string,
  previousPageSummaries: string[],
  lastNarrationFromPreviousPage?: string
): string => {
  const { worldConfig } = knowledgeBase;
  const genre = worldConfig?.genre || "Tu Tiên (Mặc định)";
  const customGenreName = worldConfig?.customGenreName;
  const isCultivationEnabled = worldConfig?.isCultivationEnabled !== undefined ? worldConfig.isCultivationEnabled : true;
  const effectiveGenre = (genre === CUSTOM_GENRE_VALUE && customGenreName) ? customGenreName : genre;
  const nsfwMode = worldConfig?.nsfwMode || false;
  const currentNsfwStyle = worldConfig?.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE;
  const currentViolenceLevel = worldConfig?.violenceLevel || DEFAULT_VIOLENCE_LEVEL;
  const currentStoryTone = worldConfig?.storyTone || DEFAULT_STORY_TONE;


  let genreSpecificIntro = `Bạn là một Đại Năng kể chuyện, chuyên sáng tác tiểu thuyết thể loại "${effectiveGenre}" bằng tiếng Việt.`;
  if (effectiveGenre === "Tu Tiên (Mặc định)" || effectiveGenre === "Tiên Hiệp" || genre === "Tu Tiên (Mặc định)" || genre === "Tiên Hiệp") {
    genreSpecificIntro = `Bạn là một Đại Năng kể chuyện, chuyên sáng tác tiểu thuyết tiên hiệp / tu tiên bằng tiếng Việt.`;
  } else if (effectiveGenre === "Võ Hiệp" || genre === "Võ Hiệp") {
    genreSpecificIntro = `Bạn là một Đại Hiệp kể chuyện, chuyên sáng tác tiểu thuyết võ hiệp kiếm hiệp Kim Dung bằng tiếng Việt.`;
  } else if (effectiveGenre === "Huyền Huyễn" || genre === "Huyền Huyễn") {
    genreSpecificIntro = `Bạn là một Chưởng Khống Giả kể chuyện, chuyên sáng tác tiểu thuyết huyền huyễn kỳ ảo bằng tiếng Việt.`;
  }
  // Add more genre-specific intros here

  const realmOrLevelDisplay = isCultivationEnabled
    ? `${knowledgeBase.playerStats.realm} ${knowledgeBase.playerStats.hieuUngBinhCanh ? `(${VIETNAMESE.bottleneckEffectLabel})` : ''}`
    : knowledgeBase.playerStats.realm; // e.g., "Người Thường Cấp 1"

  const energyDisplay = isCultivationEnabled
    ? `Linh Lực: ${knowledgeBase.playerStats.linhLuc}/${knowledgeBase.playerStats.maxLinhLuc}`
    : `Năng Lượng/Thể Lực: ${knowledgeBase.playerStats.linhLuc}/${knowledgeBase.playerStats.maxLinhLuc}`; // Assuming linhLuc is repurposed

  const expDisplay = isCultivationEnabled
    ? `Kinh Nghiệm: ${knowledgeBase.playerStats.kinhNghiem}/${knowledgeBase.playerStats.maxKinhNghiem}`
    : `Kinh Nghiệm (Chung): ${knowledgeBase.playerStats.kinhNghiem}/${knowledgeBase.playerStats.maxKinhNghiem}`;
  
  const cultivationSystemStatus = isCultivationEnabled
    ? `"${knowledgeBase.worldConfig?.heThongCanhGioi || "Chưa xác định"}"`
    : VIETNAMESE.noCultivationSystem;
  
  const subRealmNamesInstruction = isCultivationEnabled ? `Mỗi cảnh giới lớn (nếu có trong thể loại này) sẽ có 10 cấp độ phụ: ${SUB_REALM_NAMES.join(', ')}.` : '';

  // Create a copy of worldConfig and remove starting elements for the prompt
  let worldConfigForPrompt = {};
  if (knowledgeBase.worldConfig) {
    const {
      startingSkills,
      startingItems,
      startingNPCs,
      startingLore,
      startingLocations,
      startingFactions,
      ...restOfWorldConfig
    } = knowledgeBase.worldConfig;
    worldConfigForPrompt = restOfWorldConfig;
  }

  let difficultyGuidanceText = ""; // Renamed
  let currentDifficultyName = knowledgeBase.worldConfig?.difficulty || 'Thường';
  switch (currentDifficultyName) {
    case 'Dễ':
      difficultyGuidanceText = VIETNAMESE.difficultyGuidanceEasy;
      break;
    case 'Thường':
      difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNormal;
      break;
    case 'Khó':
      difficultyGuidanceText = VIETNAMESE.difficultyGuidanceHard;
      break;
    case 'Ác Mộng':
      difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNightmare;
      break;
    default:
      difficultyGuidanceText = VIETNAMESE.difficultyGuidanceNormal;
  }

  let nsfwGuidanceCombined = "";
  if (nsfwMode) {
    let nsfwStyleGuidance = "";
    switch (currentNsfwStyle) {
      case 'Hoa Mỹ': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceHoaMy; break;
      case 'Trần Tục': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceTranTuc; break;
      case 'Gợi Cảm': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceGoiCam; break;
      case 'Mạnh Bạo (BDSM)': nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceManhBaoBDSM; break; // Added BDSM
      default: nsfwStyleGuidance = VIETNAMESE.nsfwGuidanceHoaMy; 
    }

    let violenceGuidance = "";
    switch (currentViolenceLevel) {
        case 'Nhẹ Nhàng': violenceGuidance = VIETNAMESE.violenceLevelGuidanceNheNhang; break;
        case 'Thực Tế': violenceGuidance = VIETNAMESE.violenceLevelGuidanceThucTe; break;
        case 'Cực Đoan': violenceGuidance = VIETNAMESE.violenceLevelGuidanceCucDoan; break;
        default: violenceGuidance = VIETNAMESE.violenceLevelGuidanceThucTe;
    }

    let toneGuidance = "";
    switch (currentStoryTone) {
        case 'Tích Cực': toneGuidance = VIETNAMESE.storyToneGuidanceTichCuc; break;
        case 'Trung Tính': toneGuidance = VIETNAMESE.storyToneGuidanceTrungTinh; break;
        case 'Đen Tối': toneGuidance = VIETNAMESE.storyToneGuidanceDenToi; break;
        default: toneGuidance = VIETNAMESE.storyToneGuidanceTrungTinh;
    }
    nsfwGuidanceCombined = `
**Hướng Dẫn Nội Dung Người Lớn (18+ ĐANG BẬT):**
- **Phong Cách Miêu Tả Tình Dục:** ${currentNsfwStyle}.
  ${nsfwStyleGuidance}
- **Mức Độ Miêu Tả Bạo Lực:** ${currentViolenceLevel}.
  ${violenceGuidance}
- **Tông Màu Câu Chuyện:** ${currentStoryTone}.
  ${toneGuidance}
**LƯU Ý CHUNG KHI 18+ BẬT:** Hãy kết hợp các yếu tố trên để tạo ra trải nghiệm phù hợp. Ví dụ, một câu chuyện "Đen Tối" với bạo lực "Cực Đoan" và miêu tả "Mạnh Bạo (BDSM)" sẽ rất khác với một câu chuyện "Tích Cực" với bạo lực "Nhẹ Nhàng" và miêu tả "Hoa Mỹ", dù cả hai đều có thể có yếu tố 18+.`;

  } else {
    nsfwGuidanceCombined = "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đang TẮT. Tiếp tục duy trì nội dung phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục.";
  }


  return `
${genreSpecificIntro}
Tiếp tục câu chuyện dựa trên hướng dẫn của người chơi và trạng thái hiện tại của game, bao gồm cả các diễn biến gần đây và tóm tắt các sự kiện đã qua.
${subRealmNamesInstruction}

**BỐI CẢNH HIỆN TẠI (TÓM TẮT CHUNG):**
- Thể loại: ${effectiveGenre} ${(genre === CUSTOM_GENRE_VALUE && customGenreName) ? `(Người chơi tự định nghĩa)` : `(Từ danh sách)`}
- Hệ Thống Tu Luyện/Sức Mạnh Đặc Thù: ${isCultivationEnabled ? "BẬT" : "TẮT"}
- Lượt chơi tổng thể: ${knowledgeBase.playerStats.turn}
- Nhân vật: ${knowledgeBase.worldConfig?.playerName} - ${realmOrLevelDisplay}
- Sinh Lực: ${knowledgeBase.playerStats.sinhLuc}/${knowledgeBase.playerStats.maxSinhLuc}, ${energyDisplay}, Sức Tấn Công: ${knowledgeBase.playerStats.sucTanCong}, ${expDisplay}
  ${isCultivationEnabled ? `(Lưu ý về Kinh Nghiệm Tu Luyện: Để lên một tiểu cảnh giới, nhân vật cần tích lũy đủ \`maxKinhNghiem\` (${knowledgeBase.playerStats.maxKinhNghiem} cho cấp hiện tại). Lượng \`maxKinhNghiem\` này sẽ tăng dần cho mỗi tiểu cảnh giới tiếp theo. Để lên nhiều cấp liên tiếp, sẽ cần một lượng kinh nghiệm TỔNG CỘNG rất lớn. Hãy trao một lượng EXP hợp lý cho các thành tựu của người chơi. Hệ thống game sẽ tự động tính toán và xử lý việc lên cấp dựa trên lượng EXP bạn cung cấp.)` : ''}
- Tiền tệ: ${knowledgeBase.playerStats.currency} ${knowledgeBase.worldConfig?.currencyName}
- Trạng thái hiệu ứng bất lợi/có lợi hiện tại:
  ${knowledgeBase.playerStats.activeStatusEffects.length > 0
    ? knowledgeBase.playerStats.activeStatusEffects.map(eff => `- ${eff.name} (Loại: ${eff.type}, ${eff.durationTurns > 0 ? `còn ${eff.durationTurns} lượt` : (eff.durationTurns === 0 || eff.durationTurns === -1 ? 'Vĩnh viễn/Đặc biệt' : 'Không rõ thời gian')}, Mô tả: ${eff.description})`).join('\n      ')
    : "  Không có hiệu ứng nào."}
- Nhiệm vụ đang làm (tóm tắt): ${knowledgeBase.allQuests
    .filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed))
    .map(q => `${q.title} (Còn ${q.objectives.filter(obj => !obj.completed).length} mục tiêu)`)
    .join(", ") || "Chưa có nhiệm vụ hoặc đã hoàn thành hết mục tiêu"
  }
${isCultivationEnabled ? `- Hệ Thống Cảnh Giới Chính: ${cultivationSystemStatus}` : ''}

**TÓM TẮT CỐT TRUYỆN NGUYÊN TÁC (NẾU CÓ ĐỒNG NHÂN):**
${knowledgeBase.worldConfig?.originalStorySummary
    ? `"""${knowledgeBase.worldConfig.originalStorySummary}"""\n   LƯU Ý QUAN TRỌNG VỀ TÓM TẮT NGUYÊN TÁC: Đây là tóm tắt cốt truyện của truyện gốc. Hãy cố gắng phát triển câu chuyện đồng nhân của bạn một cách nhất quán với các sự kiện và giai đoạn chính của truyện gốc này. Nhân vật đồng nhân có thể tương tác, thay đổi hoặc chịu ảnh hưởng bởi dòng chảy của cốt truyện gốc. Hãy lồng ghép các yếu tố này một cách tự nhiên và đảm bảo các lựa chọn bạn đưa ra có thể giúp người chơi khám phá hoặc tương tác với các yếu tố từ tóm tắt này.`
    : "Không có tóm tắt cốt truyện nguyên tác được định nghĩa trước cho đồng nhân này."}

**CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI:**

  **1. Thông Tin Nhân Vật (${knowledgeBase.worldConfig?.playerName || 'Người Chơi'}):**
    - Chỉ số chi tiết (JSON): ${JSON.stringify(knowledgeBase.playerStats)}
    - Kỹ năng đang sở hữu (JSON): ${JSON.stringify(knowledgeBase.playerSkills)}
    - Trang bị & Vật phẩm trong túi đồ (JSON): ${JSON.stringify(knowledgeBase.inventory)}

  **2. Thông Tin Thế Giới (${knowledgeBase.worldConfig?.theme || 'Chưa rõ chủ đề'}):**
    - Cấu hình thế giới đầy đủ (JSON): ${JSON.stringify(worldConfigForPrompt)}
    - Các NPC đã gặp (JSON): ${JSON.stringify(knowledgeBase.discoveredNPCs)}
    - Các Địa Điểm đã khám phá (JSON): ${JSON.stringify(knowledgeBase.discoveredLocations)}
    - Các Phe Phái đã biết (JSON): ${JSON.stringify(knowledgeBase.discoveredFactions)}
    - Tri Thức Về Thế Giới (World Lore) (JSON): ${JSON.stringify(knowledgeBase.worldLore)}
    - Bạn Đồng Hành (JSON): ${JSON.stringify(knowledgeBase.companions)}
    ${isCultivationEnabled ? `- Danh sách các cảnh giới chính trong hệ thống (JSON): ${JSON.stringify(knowledgeBase.realmProgressionList)} (Lưu ý: mỗi cảnh giới chính có 10 cấp nhỏ: ${SUB_REALM_NAMES.join(', ')})` : ''}

  **3. Nhiệm Vụ (JSON):**
    - Tất cả nhiệm vụ (kể cả đã hoàn thành/thất bại): ${JSON.stringify(knowledgeBase.allQuests)}

**HƯỚNG DẪN VỀ ĐỘ KHÓ (Rất quan trọng để AI tuân theo):**
- **Dễ:** ${VIETNAMESE.difficultyGuidanceEasy} Tỉ lệ thành công cho lựa chọn thường CAO (ví dụ: 70-95%). Rủi ro thấp, phần thưởng dễ đạt.
- **Thường:** ${VIETNAMESE.difficultyGuidanceNormal} Tỉ lệ thành công cho lựa chọn TRUNG BÌNH (ví dụ: 50-80%). Rủi ro và phần thưởng cân bằng.
- **Khó:** ${VIETNAMESE.difficultyGuidanceHard} Tỉ lệ thành công cho lựa chọn THẤP (ví dụ: 30-65%). Rủi ro cao, phần thưởng lớn nhưng khó kiếm.
- **Ác Mộng:** ${VIETNAMESE.difficultyGuidanceNightmare} Tỉ lệ thành công cho lựa chọn CỰC KỲ THẤP (ví dụ: 15-50%). Rủi ro rất lớn, phần thưởng cực kỳ hiếm hoi.
Hiện tại người chơi đang ở độ khó: **${currentDifficultyName}**. Hãy điều chỉnh tỉ lệ thành công, lợi ích và rủi ro trong các lựa chọn [CHOICE: "..."] của bạn cho phù hợp với hướng dẫn độ khó này.

**TÓM TẮT CÁC DIỄN BIẾN TRANG TRƯỚC (NẾU CÓ):**
${previousPageSummaries.length > 0
    ? previousPageSummaries.map((summary, index) => {
        const pageNumberForSummary = index + 1;
        const startTurnOfSummaryPage = knowledgeBase.currentPageHistory?.[pageNumberForSummary - 1];
        const endTurnOfSummaryPage = (knowledgeBase.currentPageHistory?.[pageNumberForSummary] || knowledgeBase.playerStats.turn + 1) - 1;
        return `Tóm tắt Trang ${pageNumberForSummary} (Lượt ${startTurnOfSummaryPage}-${endTurnOfSummaryPage}):\n${summary}`;
      }).join("\n\n")
    : "Không có tóm tắt từ các trang trước."}
${lastNarrationFromPreviousPage ? `
**DIỄN BIẾN GẦN NHẤT (LƯỢT TRƯỚC - Lượt ${knowledgeBase.playerStats.turn}):**
${lastNarrationFromPreviousPage}` : ""}

**DIỄN BIẾN CHI TIẾT TRANG HIỆN TẠI (TỪ LƯỢT ${knowledgeBase.currentPageHistory?.[(knowledgeBase.currentPageHistory?.length || 1) - 1] || 1} ĐẾN LƯỢT ${knowledgeBase.playerStats.turn}):**
${currentPageMessagesLog || "Chưa có diễn biến nào trong trang này."}

**HƯỚNG DẪN TỪ NGƯỜI CHƠI (CHO LƯỢT TIẾP THEO - LƯỢT ${knowledgeBase.playerStats.turn + 1}):**
- Loại hướng dẫn: ${inputType === 'action' ? 'Hành động trực tiếp của nhân vật' : 'Gợi ý/Mô tả câu chuyện (do người chơi cung cấp)'}
- Nội dung hướng dẫn: "${playerActionText}"

**HƯN DẪN XỬ LÝ DÀNH CHO AI:**
${inputType === 'action'
    ? `Xử lý nội dung trên như một hành động mà nhân vật chính (${knowledgeBase.worldConfig?.playerName}) đang thực hiện. Mô tả kết quả của hành động này và các diễn biến tiếp theo một cách chi tiết và hấp dẫn, dựa trên TOÀN BỘ BỐI CẢNH. Kết quả thành công hay thất bại PHẢI dựa trên Tỉ Lệ Thành Công bạn đã thiết lập cho lựa chọn đó (nếu là lựa chọn của AI) hoặc một tỉ lệ hợp lý do bạn quyết định (nếu là hành động tự do), có tính đến Độ Khó của game. Mô tả rõ ràng phần thưởng/lợi ích khi thành công hoặc tác hại/rủi ro khi thất bại.`
    : `Nội dung trên là một gợi ý, mô tả, hoặc mong muốn của người chơi để định hướng hoặc làm phong phú thêm câu chuyện. Đây KHÔNG phải là hành động trực tiếp của nhân vật chính (${knowledgeBase.worldConfig?.playerName}). Hãy cố gắng lồng ghép yếu tố này vào câu chuyện một cách tự nhiên và hợp lý, dựa trên TOÀN BỘ BỐI CẢNH. Nếu gợi ý này dẫn đến một tình huống có thể có kết quả khác nhau, hãy xem xét việc đưa ra các lựa chọn [CHOICE: "..."] kèm theo tỉ lệ thành công/lợi ích/rủi ro.`
  }
${knowledgeBase.worldConfig?.originalStorySummary ? "**ĐẶC BIỆT LƯU Ý:** Vì đây là đồng nhân, hãy đảm bảo diễn biến câu chuyện và các lựa chọn bạn đưa ra tôn trọng và có thể dẫn dắt người chơi tương tác với các yếu tố từ 'TÓM TẮT CỐT TRUYỆN NGUYÊN TÁC' đã được cung cấp.**" : ""}

**CHẾ ĐỘ NỘI DUNG VÀ PHONG CÁCH (NHẮC LẠI):**
${nsfwGuidanceCombined}

**ĐỘ DÀI PHẢN HỒI MONG MUỐN:**
- Người chơi yêu cầu độ dài phản hồi: ${responseLength === 'short' ? 'Ngắn (khoảng 2-3 đoạn văn súc tích)' :
    responseLength === 'medium' ? 'Trung bình (khoảng 3-6 đoạn văn vừa phải)' :
      responseLength === 'long' ? 'Dài (khoảng 8+ đoạn văn chi tiết)' :
        'Mặc định (linh hoạt theo diễn biến)'
  }.
Hãy cố gắng điều chỉnh độ dài của lời kể và mô tả cho phù hợp với yêu cầu này của người chơi, nhưng vẫn đảm bảo tính tự nhiên và logic của câu chuyện.

**ƯU TIÊN NHIỆM VỤ HIỆN TẠI (NẾU CÓ):**
${knowledgeBase.allQuests.filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed)).length > 0
    ? `Hiện tại có nhiệm vụ đang hoạt động với các mục tiêu chưa hoàn thành.
  Nhiệm vụ: ${knowledgeBase.allQuests
      .filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed))
      .map(q => `${q.title} (Mục tiêu cần làm: ${q.objectives.filter(obj => !obj.completed).map(obj => obj.text).join('; ')})`)
      .join(". ")}
  **QUAN TRỌNG:** Hãy ưu tiên tạo ra ít nhất 1-2 lựa chọn ([CHOICE: "..."]) trực tiếp giúp người chơi tiến triển hoặc hoàn thành một trong các mục tiêu chưa hoàn thành của các nhiệm vụ này. Các lựa chọn này nên rõ ràng cho người chơi biết chúng liên quan đến nhiệm vụ.`
    : "Hiện không có mục tiêu nhiệm vụ nào cần ưu tiên đặc biệt. Bạn có thể tự do phát triển câu chuyện."
  }
${knowledgeBase.worldConfig?.originalStorySummary ? "**LƯU Ý CHO ĐỒNG NHÂN:** Nếu có thể, hãy tạo ra các lựa chọn [CHOICE: \"...\"] liên quan đến việc khám phá hoặc tương tác với các yếu tố từ 'TÓM TẮT CỐT TRUYỆN NGUYÊN TÁC' đã được cung cấp.**" : ""}

${isCultivationEnabled ? `
**XỬ LÝ BÌNH CẢNH (NẾU CÓ):**
${knowledgeBase.playerStats.hieuUngBinhCanh ? `**LƯU Ý ĐẶC BIỆT: Nhân vật đang ở trạng thái "${VIETNAMESE.bottleneckEffectLabel}"!** Hệ thống game sẽ tự động áp dụng hiệu ứng này khi nhân vật đạt đỉnh phong cảnh giới và max kinh nghiệm. Bạn không cần dùng tag [APPLY_BINH_CANH_EFFECT]. Khi nhân vật đang bị bình cảnh, kinh nghiệm của họ sẽ bị giới hạn và không thể lên cấp. Hãy ưu tiên tạo ra các lựa chọn [CHOICE: "..."] và diễn biến giúp nhân vật tìm kiếm cơ duyên (ví dụ: khám phá bí cảnh, tìm thiên tài địa bảo, đốn ngộ, gặp gỡ cao nhân chỉ điểm, hoàn thành một thử thách đặc biệt). Khi nhân vật có được cơ duyên, hãy sử dụng tag \\\`[REMOVE_BINH_CANH_EFFECT: kinhNghiemGain=X]\\\` (X là lượng kinh nghiệm nhỏ, ví dụ 1 hoặc 10, chỉ đủ để vượt qua mốc cũ và giúp hệ thống game xử lý lên cảnh giới mới) và mô tả sự đột phá lên cảnh giới lớn tiếp theo một cách hào hùng.` : "Nhân vật hiện không bị bình cảnh."}` : ''}


**QUY TẮC SỬ DỤNG TAGS (NHẮC LẠI VÀ BỔ SUNG):** 
0.  **Đánh Dấu Hội Thoại/Âm Thanh (QUAN TRỌNG):** Khi nhân vật nói chuyện, rên rỉ khi làm tình, hoặc kêu la khi chiến đấu, hãy đặt toàn bộ câu nói/âm thanh đó vào giữa hai dấu ngoặc kép và dấu '${DIALOGUE_MARKER}', hãy cho nhân vật và npc nói chuyện ở múc độ vừa phải ở những cuộc hội thoại bình thường và chiến đấu nhưng khi quan hệ tình dục thì hãy chèn thêm nhiều câu rên rỉ và những lời tục tĩu tăng tình thú giữa các hành động.
    *   Ví dụ lời nói: AI kể: Hắn nhìn cô và nói ${DIALOGUE_MARKER}Em có khỏe không?${DIALOGUE_MARKER}.
    *   Ví dụ tiếng rên: AI kể: Cô ấy khẽ rên ${DIALOGUE_MARKER}Ah...~${DIALOGUE_MARKER} khi bị chạm vào.
    *   Ví dụ tiếng hét chiến đấu: AI kể: Tiếng hét ${DIALOGUE_MARKER}Xung phong!${DIALOGUE_MARKER} vang vọng chiến trường.
    *   Phần văn bản bên ngoài các cặp marker này vẫn là lời kể bình thường của bạn. Chỉ nội dung *bên trong* cặp marker mới được coi là lời nói/âm thanh trực tiếp.
1.  **Tag \\\`[STATS_UPDATE: TênChỉSố=GiáTrịHoặcThayĐổi, ...]\`\\\`:** Dùng để cập nhật chỉ số của người chơi.
    *   **Tham số TênChỉSố:** \`sinhLuc\`, \`linhLuc\` (nếu có tu luyện), \`kinhNghiem\` (nếu có tu luyện/cấp độ), \`currency\`, \`isInCombat\`, \`turn\`. Tên chỉ số NÊN viết thường.
    *   **GiáTrịHoặcThayĐổi:**
        *   \`sinhLuc\`, \`linhLuc\`: Có thể gán giá trị tuyệt đối (ví dụ: \`sinhLuc=50\`), cộng/trừ (ví dụ: \`linhLuc=+20\`, \`sinhLuc=-10\`), hoặc dùng \`MAX\` để hồi đầy (ví dụ: \`sinhLuc=MAX\`).
        *   \`kinhNghiem\`: CHỈ dùng dạng CỘNG THÊM giá trị dương (ví dụ: \`kinhNghiem=+100\`, \`kinhNghiem=+10%\`). KHÔNG dùng giá trị tuyệt đối hay âm.
        *   \`currency\`: Có thể gán giá trị tuyệt đối hoặc cộng/trừ.
        *   \`isInCombat\`: \`true\` hoặc \`false\`.
        *   \`turn\`: CHỈ dùng \`turn=+1\` ở CUỐI MỖI LƯỢT PHẢN HỒI CỦA BẠN.
    *   **QUAN TRỌNG:** Tag này KHÔNG ĐƯỢC PHÉP chứa: \`maxSinhLuc\`, \`maxLinhLuc\`, \`sucTanCong\`, \`maxKinhNghiem\`, hoặc \`realm\`. Hệ thống game sẽ tự quản lý các chỉ số này.
    *   **VÍ DỤ (Allowed):**
        *   \\\`[STATS_UPDATE: kinhNghiem=+50, sinhLuc=-10, currency=+20, isInCombat=true]\\\`
        *   \\\`[STATS_UPDATE: linhLuc=MAX, kinhNghiem=+5%]\\\`
    *   **VÍ DỤ (Not Allowed):**
        *   \\\`[STATS_UPDATE: maxSinhLuc=+100]\`\\\` (Lý do: \`maxSinhLuc\` do hệ thống quản lý)
        *   \\\`[STATS_UPDATE: realm="Trúc Cơ Kỳ"]\`\\\` (Lý do: \`realm\` thay đổi qua sự kiện đột phá, không phải qua tag này)
        *   \\\`[STATS_UPDATE: kinhNghiem=500]\`\\\` (Lý do: \`kinhNghiem\` phải là dạng cộng thêm \`+X\` hoặc \`+X%\`)

2.  **Tag \\\`[ITEM_ACQUIRED: ...]\`\\\`:** Dùng khi người chơi nhận được vật phẩm mới.
    *   **Tham số bắt buộc:** \`name\`, \`type\`, \`description\`, \`quantity\`, \`rarity\`.
    *   \`type\`: Phải bao gồm **Loại Chính** và **Loại Phụ** (nếu có).
        *   **Loại Chính Hợp Lệ:** ${Object.values(GameTemplates.ItemCategory).join(' | ')}.
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.EQUIPMENT}\`, Loại Phụ (\`equipmentType\`) PHẢI là một trong: ${Object.values(GameTemplates.EquipmentType).join(' | ')}.
            *   Ví dụ: \`type="${GameTemplates.ItemCategory.EQUIPMENT} ${GameTemplates.EquipmentType.VU_KHI}"\`.
            *   **Tham số RIÊNG \`equipmentType\` cũng BẮT BUỘC** (ví dụ: \`equipmentType="${GameTemplates.EquipmentType.VU_KHI}"\`).
            *   **Tham số RIÊNG \`statBonusesJSON\` BẮT BUỘC** (ví dụ: \`statBonusesJSON='{"sucTanCong": 10}'\`. Nếu không có, dùng \`statBonusesJSON='{}'\`). JSON phải hợp lệ. Các khóa trong JSON có thể là: \`maxSinhLuc\`, \`maxLinhLuc\`, \`sucTanCong\`.
            *   **Tham số RIÊNG \`uniqueEffectsList\` BẮT BUỘC** (ví dụ: \`uniqueEffectsList="Hút máu 5%;Tăng tốc"\`. Nếu không có, dùng \`uniqueEffectsList="Không có gì đặc biệt"\`). Các hiệu ứng cách nhau bởi dấu ';'.
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.POTION}\`, Loại Phụ (\`potionType\`) PHẢI là một trong: ${Object.values(GameTemplates.PotionType).join(' | ')}.
            *   Ví dụ: \`type="${GameTemplates.ItemCategory.POTION} ${GameTemplates.PotionType.HOI_PHUC}"\`.
            *   **Tham số RIÊNG \`potionType\` cũng BẮT BUỘC** (ví dụ: \`potionType="${GameTemplates.PotionType.HOI_PHUC}"\`).
            *   **Tham số RIÊNG \`effectsList\` BẮT BUỘC** (ví dụ: \`effectsList="Hồi 100 HP;Tăng 20 ATK trong 3 lượt"\`. Nếu không có, dùng \`effectsList="Không có gì đặc biệt"\`). Các hiệu ứng cách nhau bởi dấu ';'.
        *   Nếu Loại Chính là \`${GameTemplates.ItemCategory.MATERIAL}\`, Loại Phụ (\`materialType\`) PHẢI là một trong: ${Object.values(GameTemplates.MaterialType).join(' | ')}.
            *   Ví dụ: \`type="${GameTemplates.ItemCategory.MATERIAL} ${GameTemplates.MaterialType.LINH_THAO}"\`.
            *   **Tham số RIÊNG \`materialType\` cũng BẮT BUỘC** (ví dụ: \`materialType="${GameTemplates.MaterialType.LINH_THAO}"\`).
        *   Đối với \`${GameTemplates.ItemCategory.QUEST_ITEM}\` và \`${GameTemplates.ItemCategory.MISCELLANEOUS}\`, không cần Loại Phụ trong \`type\`.
    *   **Tham số tùy chọn:** \`value\` (số nguyên), \`slot\` (cho trang bị, ví dụ: "Vũ Khí Chính"), \`durationTurns\`, \`cooldownTurns\` (cho đan dược), \`questIdAssociated\` (cho vật phẩm nhiệm vụ), \`usable\`, \`consumable\` (cho vật phẩm linh tinh).
    *   **VÍ DỤ (Allowed - Trang Bị):** \\\`[ITEM_ACQUIRED: name="Huyết Long Giáp", type="${GameTemplates.ItemCategory.EQUIPMENT} ${GameTemplates.EquipmentType.GIAP_THAN}", equipmentType="${GameTemplates.EquipmentType.GIAP_THAN}", description="Giáp làm từ vảy Huyết Long, tăng cường sinh lực.", quantity=1, rarity="${GameTemplates.ItemRarity.CUC_PHAM}", value=1000, statBonusesJSON='{"maxSinhLuc": 200}', uniqueEffectsList="Phản sát thương 10%;Kháng Hỏa +30", slot="Giáp Thân"]\\\`
    *   **VÍ DỤ (Allowed - Đan Dược):** \\\`[ITEM_ACQUIRED: name="Cửu Chuyển Hồi Hồn Đan", type="${GameTemplates.ItemCategory.POTION} ${GameTemplates.PotionType.HOI_PHUC}", potionType="${GameTemplates.PotionType.HOI_PHUC}", description="Đan dược thượng phẩm, hồi phục sinh lực lớn.", quantity=3, rarity="${GameTemplates.ItemRarity.QUY_BAU}", value=500, effectsList="Hồi 500 HP;Giải trừ mọi hiệu ứng bất lợi nhẹ"]\\\`
    *   **VÍ DỤ (Not Allowed - Trang Bị):** \\\`[ITEM_ACQUIRED: name="Kiếm Gỗ", type="Vũ Khí", description="Một thanh kiếm gỗ thường.", statBonusesJSON="tăng 5 công"]\`\\\` (Lý do: \`type\` thiếu Loại Chính; \`statBonusesJSON\` không phải JSON hợp lệ; thiếu \`equipmentType\`, \`uniqueEffectsList\`)

3.  **Tag \\\`[ITEM_CONSUMED: name="Tên",quantity=SốLượng]\`\\\`:** Dùng khi vật phẩm bị tiêu hao.
    *   **Tham số bắt buộc:** \`name\` (khớp với tên vật phẩm trong túi đồ), \`quantity\` (số lượng tiêu hao).

4.  **Tag \\\`[ITEM_UPDATE: name="Tên Vật Phẩm Trong Túi", field="TênTrường", newValue="GiáTrịMới" hoặc change=+-GiáTrị]\`\\\`:** Dùng để cập nhật một thuộc tính của vật phẩm hiện có.
    *   **VÍ DỤ:** \\\`[ITEM_UPDATE: name="Rỉ Sét Trường Kiếm", field="description", newValue="Trường kiếm đã được mài sắc và phục hồi phần nào sức mạnh."]\`\\\`

5.  **Tag \\\`[SKILL_LEARNED: ...]\`\\\`:** Dùng khi nhân vật học được kỹ năng mới.
    *   **Tham số bắt buộc:** \`name\`, \`type\` (Loại kỹ năng, ví dụ: "${GameTemplates.SkillType.CHUDONG_TANCONG}", "Bị Động", "Kỹ năng sinh tồn", etc.), \`description\` (Mô tả chung), \`effect\` (Mô tả hiệu ứng chi tiết).
    *   **Tham số tùy chọn:** \`manaCost\` (số), \`baseDamage\` (số), \`healingAmount\` (số), \`cooldown\` (số lượt), \`damageMultiplier\` (số, ví dụ 0.5 cho 50% ATK).
    *   **VÍ DỤ (Allowed - Có tu luyện):** \\\`[SKILL_LEARNED: name="Phi Kiếm Thuật", type="${GameTemplates.SkillType.CHUDONG_TANCONG}", description="Điều khiển phi kiếm tấn công từ xa.", effect="Gây 30 sát thương và có 20% tỷ lệ làm chậm kẻ địch.", manaCost=15, baseDamage=30, cooldown=2]\\\`

6.  **Tag \\\`[SKILL_UPDATE: name="Tên Skill Cần Sửa", newName="Tên Mới (Tùy chọn)", description="Mô tả mới", effect="Hiệu ứng mới", manaCost=Số, ...]\`\\\`:** Cập nhật kỹ năng hiện có.
    *   **Tham số bắt buộc:** \`name\` (tên kỹ năng hiện tại để tìm).
    *   **Tham số tùy chọn:** \`newName\` (nếu muốn đổi tên), \`description\`, \`type\`, \`effect\`, \`manaCost\`, \`baseDamage\`, \`healingAmount\`, \`cooldown\`, \`damageMultiplier\`. Chỉ các tham số được cung cấp sẽ được cập nhật.
    *   **VÍ DỤ:** \\\`[SKILL_UPDATE: name="Hỏa Cầu Thuật", newName="Đại Hỏa Cầu Thuật", effect="Gây 50 sát thương Hỏa trên diện rộng.", manaCost=25]\`\\\`
    *   **VÍ DỤ (Not Allowed):** \\\`[SKILL_UPDATE: description="Mô tả mới cho skill không rõ tên."]\`\\\` (Lý do: Thiếu \`name\` để xác định skill cần cập nhật)

7.  **Tags Nhiệm Vụ (\`QUEST_*\`):**
    *   \`[QUEST_ASSIGNED: title="Tên NV",description="Mô tả chi tiết NV",objectives="Mục tiêu 1|Mục tiêu 2|..."]\`\\\` (Dấu '|' phân cách các mục tiêu) (Bắt buộc phải có đầy đủ thuộc tính)
    *   \`[QUEST_UPDATED: title="Tên NV đang làm", objectiveText="Văn bản GỐC của mục tiêu cần cập nhật (PHẢI KHỚP CHÍNH XÁC TOÀN BỘ, BAO GỒM CẢ SỐ LƯỢNG HIỆN TẠI nếu có, ví dụ: 'Săn lợn rừng (0/3)')", newObjectiveText="Văn bản MỚI của mục tiêu (TÙY CHỌN - nếu có thay đổi về mô tả hoặc số lượng, ví dụ: 'Săn lợn rừng (1/3)')", completed=true/false]\`\\\`
        *   **QUAN TRỌNG VỀ ĐỊNH DẠNG TRẢ VỀ TAG NÀY:** CHỈ trả về duy nhất tag \`[QUEST_UPDATED: ...]\`. KHÔNG thêm bất kỳ văn bản mô tả nào về nhiệm vụ (ví dụ: "Nhiệm vụ: [Tên nhiệm vụ]") ngay trước hoặc sau tag. KHÔNG trả về khối JSON mô tả đối tượng nhiệm vụ. Mọi thông tin cho người chơi biết về cập nhật nhiệm vụ PHẢI được đưa vào phần lời kể (narration) một cách tự nhiên.
        *   **QUAN TRỌNG VỚI MỤC TIÊU CÓ SỐ LƯỢNG (VD: 0/3):**
            *   \`objectiveText\`: PHẢI là văn bản hiện tại, ví dụ: "Thu thập Linh Tâm Thảo (0/3)".
            *   \`newObjectiveText\`: Nên cập nhật số lượng, ví dụ: "Thu thập Linh Tâm Thảo (1/3)". Nếu không cung cấp, hệ thống game có thể không hiển thị đúng tiến độ dạng chữ.
            *   \`completed\`: Đặt là \`true\` CHỈ KHI mục tiêu đã hoàn thành ĐẦY ĐỦ (ví dụ: "Thu thập Linh Tâm Thảo (3/3)"). Nếu chỉ tăng số lượng nhưng chưa đủ (ví dụ: (1/3), (2/3)), thì đặt \`completed=false\`.
        *   **VÍ DỤ (Cập nhật tiến độ):** Giả sử mục tiêu hiện tại là "Săn 3 Lợn Rừng (0/3)". Người chơi săn được 1 con. AI nên trả về:
            \\\`[QUEST_UPDATED: title="Săn Lợn Rừng", objectiveText="Săn 3 Lợn Rừng (0/3)", newObjectiveText="Săn 3 Lợn Rừng (1/3)", completed=false]\`\\\`
        *   **VÍ DỤ (Hoàn thành mục tiêu có số lượng):** Giả sử mục tiêu hiện tại là "Săn 3 Lợn Rừng (2/3)". Người chơi săn được con cuối cùng. AI nên trả về:
            \\\`[QUEST_UPDATED: title="Săn Lợn Rừng", objectiveText="Săn 3 Lợn Rừng (2/3)", newObjectiveText="Săn 3 Lợn Rừng (3/3)", completed=true]\`\\\`
        *   **VÍ DỤ (Cập nhật mục tiêu không có số lượng):**
            \\\`[QUEST_UPDATED: title="Tìm Kiếm Manh Mối", objectiveText="Hỏi thăm dân làng về tên trộm.", newObjectiveText="Đã hỏi thăm một vài người, có vẻ tên trộm chạy về hướng Tây.", completed=false]\`\\\`
    *   \`[QUEST_COMPLETED: title="Tên NV đã hoàn thành toàn bộ"]\`\\\`
    *   \`[QUEST_FAILED: title="Tên NV đã thất bại"]\`\\\`

8.  **Tags Thêm Mới Thông Tin Thế Giới (\`NPC\`, \`LORE_LOCATION\`, \`FACTION_DISCOVERED\`, \`WORLD_LORE_ADD\`):**
    *   \`[NPC: name="Tên", gender="Nam/Nữ/Khác/Không rõ", description="Mô tả", personality="Tính cách", affinity=Số, factionId="ID Phe", realm="Cảnh giới NPC", statsJSON='{...}', baseStatOverridesJSON='{...}']\`\\\`
    *   \`[LORE_LOCATION: name="Tên",description="Mô tả", isSafeZone=true/false, regionId="ID Vùng"]\`\\\`
    *   \`[FACTION_DISCOVERED: name="Tên Phe", description="Mô tả", alignment="${Object.values(GameTemplates.FactionAlignment).join('|')}", playerReputation=Số]\`\\\`
    *   \`[WORLD_LORE_ADD: title="Tiêu đề",content="Nội dung"]\`\\\`

9.  **Tags Cập Nhật Thông Tin Thế Giới Hiện Có (\`NPC_UPDATE\`, \`LOCATION_UPDATE\`, \`FACTION_UPDATE\`, \`WORLD_LORE_UPDATE\`):** Tên/Tiêu đề phải khớp chính xác với thực thể cần cập nhật.
    *   \\\`[NPC_UPDATE: name="Tên NPC Hiện Tại", newName="Tên Mới (Tùy chọn)", affinity=+-GiáTrị, description="Mô tả mới", realm="Cảnh giới mới", statsJSON='{...}', ...]\`\\\`
    *   \\\`[LOCATION_UPDATE: name="Tên Địa Điểm Hiện Tại", newName="Tên Mới (Tùy chọn)", description="Mô tả mới", isSafeZone=true/false, ...]\`\\\`
        *   **VÍ DỤ:** \\\`[LOCATION_UPDATE: name="Rừng Cổ Thụ", description="Khu rừng giờ đây âm u hơn và có thêm nhiều quái vật nguy hiểm."]\`\\\`
    *   \\\`[FACTION_UPDATE: name="Tên Phe Phái Hiện Tại", newName="Tên Mới (Tùy chọn)", description="Mô tả mới", alignment="Chính/Tà...", playerReputation="=X hoặc +=X hoặc -=X"]\`\\\`
        *   **Tham số \`playerReputation\`:** Có thể là \`playerReputation="=50"\` (đặt thành 50), \`playerReputation="+=10"\` (tăng 10), \`playerReputation="-=5"\` (giảm 5).
        *   **VÍ DỤ:** \\\`[FACTION_UPDATE: name="Thanh Vân Môn", playerReputation="+=10", description="Môn phái ngày càng nổi tiếng nhờ sự đóng góp của bạn."]\`\\\`
    *   \\\`[WORLD_LORE_UPDATE: title="Tiêu Đề Lore Hiện Tại", newTitle="Tiêu Đề Mới (Tùy chọn)", content="Nội dung lore mới."]\`\\\`
        *   **VÍ DỤ:** \\\`[WORLD_LORE_UPDATE: title="Nguồn Gốc Ma Tộc", content="Ma Tộc thực ra là một nhánh của Yêu Tộc cổ đại bị tha hóa."]\`\\\`

10. **Tag Xóa Thông Tin Thế Giới (\`FACTION_REMOVE\`):**
    *   \\\`[FACTION_REMOVE: name="Tên Phe Phái Cần Xóa"]\`\\\`
        *   **VÍ DỤ:** \\\`[FACTION_REMOVE: name="Hắc Phong Trại"]\`\\\`
        *   **Lưu ý:** Hành động này không thể hoàn tác trong game.

11. **Tag \\\`[MESSAGE: "Thông báo tùy chỉnh cho người chơi"]\`\\\`:** Dùng cho các thông báo hệ thống đặc biệt. **KHÔNG dùng để thông báo về việc lên cấp/đột phá cảnh giới.**
12. **Tag \\\`[SET_COMBAT_STATUS: true/false]\`\\\`:** Bắt đầu hoặc kết thúc trạng thái chiến đấu.
13. **Tags Đồng Hành (\`COMPANION_*\`):**
    *   \`[COMPANION_JOIN: name="Tên",description="Mô tả",hp=X,maxHp=X,mana=Y,maxMana=Y,atk=Z, realm="Cảnh giới (nếu có)"]\`\\\`
    *   \`[COMPANION_LEAVE: name="Tên"]\`\\\`
    *   \`[COMPANION_STATS_UPDATE: name="Tên",hp=ThayĐổi,mana=ThayĐổi,atk=ThayĐổi]\`\\\`
14. **Tags Hiệu Ứng Trạng Thái (\`STATUS_EFFECT_*\`):**
    *   \`[STATUS_EFFECT_APPLY: name="Tên Hiệu Ứng", description="Mô tả hiệu ứng", type="buff|debuff|neutral", durationTurns=X (0 là vĩnh viễn/cho đến khi gỡ bỏ), statModifiers='{"statName1": value1, "statName2": "±Y%"}', specialEffects="Hiệu ứng đặc biệt 1;Hiệu ứng đặc biệt 2"]\`\\\`
        *   \`statModifiers\`: JSON string. Keys là tên chỉ số (ví dụ: \`sucTanCong\`, \`maxSinhLuc\`). Values có thể là số cho thay đổi tuyệt đối hoặc chuỗi như \`"+10%"\` hoặc \`"-5"\`.
        *   \`specialEffects\`: Chuỗi các hiệu ứng đặc biệt, cách nhau bởi dấu chấm phẩy (';'). Ví dụ: "Không thể hành động;Tăng 10% tỉ lệ chí mạng".
        *   Ví dụ: \\\`[STATUS_EFFECT_APPLY: name="Trúng Độc", description="Mất máu từ từ.", type="debuff", durationTurns=5, statModifiers='{"sinhLuc": "-5"}', specialEffects="Mỗi lượt mất 5 Sinh Lực"]\\\`
    *   \`[STATUS_EFFECT_REMOVE: name="Tên Hiệu Ứng Cần Gỡ Bỏ"]\`\\\`
    *   **LƯU Ý QUAN TRỌNG KHI SỬ DỤNG VẬT PHẨM (VÍ DỤ: ĐAN DƯỢC):**
        Khi một vật phẩm (ví dụ: đan dược như "Bình Khí Huyết") được sử dụng và mang lại các hiệu ứng TẠM THỜI (tăng chỉ số, hiệu ứng đặc biệt), bạn PHẢI sử dụng tag \\\`[STATUS_EFFECT_APPLY: ...]\`\\\` để biểu thị các hiệu ứng này, thay vì dùng \\\`[STATS_UPDATE: ...]\`\\\` cho các chỉ số bị ảnh hưởng tạm thời.
        *   **Thứ tự:** Luôn đặt tag \\\`[ITEM_CONSUMED: ...]\`\\\` TRƯỚC tag \\\`[STATUS_EFFECT_APPLY: ...]\`\\\`.
        *   **Ví dụ:** Nếu vật phẩm "Bình Khí Huyết" (mô tả: "Một loại dược dịch có tác dụng bồi bổ khí huyết, tăng cường sinh lực. Uống vào sẽ cảm thấy cơ thể nóng rực, dục hỏa bừng bừng." và có tác dụng: "Tăng cường 20 sức tấn công, 30 sinh lực tối đa trong 30 phút. Tăng 10 điểm mị lực, 10 điểm dục vọng.") được sử dụng, bạn NÊN trả về:
            \\\`[ITEM_CONSUMED: name="Bình Khí Huyết", quantity=1]\`\\\`
            \\\`[STATUS_EFFECT_APPLY: name="Khí Huyết Sôi Trào", description="Cơ thể nóng rực, khí huyết cuộn trào, tăng cường sức mạnh và dục vọng.", type="buff", durationTurns=30, statModifiers='{"sucTanCong": 20, "maxSinhLuc": 30}', specialEffects="Tăng 10 điểm mị lực;Tăng 10 điểm dục vọng;Dục hỏa bùng cháy dữ dội"]\`\\\`
        *   Các thay đổi vĩnh viễn hoặc hồi phục trực tiếp (ví dụ: hồi máu từ đan dược hồi phục không tăng maxSinhLuc) vẫn có thể dùng \\\`[STATS_UPDATE: sinhLuc=+X]\`\\\`.
        *   Nếu vật phẩm có cả hiệu ứng hồi phục tức thời VÀ hiệu ứng buff tạm thời, hãy dùng CẢ HAI tag: \\\`[STATS_UPDATE: sinhLuc=+Y]\`\\\` cho phần hồi phục và \\\`[STATUS_EFFECT_APPLY: ...]\`\\\` cho phần buff.
        *   Đối với các chỉ số không có trong hệ thống người chơi (ví dụ: "mị lực", "dục vọng" từ ví dụ trên), hãy mô tả chúng trong thuộc tính \`specialEffects\` của tag \\\`STATUS_EFFECT_APPLY\\\`.

15. **Tag \\\`[REMOVE_BINH_CANH_EFFECT: kinhNghiemGain=X]\`\\\` (Chỉ khi \`isCultivationEnabled=true\`):** Dùng khi nhân vật có cơ duyên đột phá khỏi bình cảnh. \`X\` là lượng kinh nghiệm nhỏ (ví dụ 1 hoặc 10) được cộng thêm để vượt qua giới hạn cũ. Tag này sẽ tự động đặt \`hieuUngBinhCanh=false\`.
    *   **VÍ DỤ (Allowed):** \\\`[REMOVE_BINH_CANH_EFFECT: kinhNghiemGain=10]\`\\\`

16. **LỰA CHỌN HÀNH ĐỘNG MỚI (QUAN TRỌNG):**
    *   Luôn cung cấp 3 đến 4 lựa chọn hành động mới.
    *   **ĐỊNH DẠNG BẮT BUỘC CHO MỖI LỰA CHỌN:** \\\`[CHOICE: "Nội dung lựa chọn (Thành công: X% - Độ khó '${currentDifficultyName}', Lợi ích: Mô tả lợi ích khi thành công. Rủi ro: Mô tả rủi ro khi thất bại)"]\`\\\`.
    *   \`X%\`: Tỉ lệ thành công ước tính. PHẢI phản ánh Độ Khó của game (xem hướng dẫn ở trên).
    *   \`Lợi ích\`: Mô tả rõ ràng những gì người chơi có thể nhận được nếu hành động thành công (ví dụ: vật phẩm, kinh nghiệm, thông tin, thay đổi thiện cảm NPC, tiến triển nhiệm vụ).
    *   \`Rủi ro\`: Mô tả rõ ràng những hậu quả tiêu cực nếu hành động thất bại (ví dụ: mất máu, bị phát hiện, nhiệm vụ thất bại, giảm thiện cảm).
    *   **Ví dụ (Độ khó 'Thường'):** \\\`[CHOICE: "Thử thuyết phục lão nông (Thành công: 65% - Độ khó 'Thường', Lợi ích: Biết được lối vào bí mật, +10 thiện cảm. Rủi ro: Bị nghi ngờ, -5 thiện cảm, lão nông báo quan)"]\`\\\`
    *   **Ví dụ (Độ khó 'Ác Mộng'):** \\\`[CHOICE: "Một mình đối đầu Hắc Long (Thành công: 20% - Độ khó 'Ác Mộng', Lợi ích: Nếu thắng, nhận danh hiệu 'Diệt Long Giả', vô số bảo vật. Rủi ro: Gần như chắc chắn tử vong, mất toàn bộ vật phẩm không khóa)"]\`\\\`

17. **Tăng lượt chơi:** Kết thúc phản hồi bằng tag \\\`[STATS_UPDATE: turn=+1]\\\`. **KHÔNG được quên tag này.**
18. **Duy trì tính logic và nhất quán của câu chuyện.** **QUAN TRỌNG:** Diễn biến tiếp theo của bạn PHẢI phản ánh kết quả (thành công hay thất bại) của hành động người chơi đã chọn, dựa trên Tỉ Lệ Thành Công, Lợi Ích và Rủi Ro bạn vừa xác định cho lựa chọn đó. Đừng chỉ kể rằng người chơi đã chọn, hãy kể điều gì đã xảy ra.
19. **Mô tả kết quả hành động một cách chi tiết và hấp dẫn.**
20. **Trao Kinh Nghiệm (nếu có hệ thống):** Khi nhân vật hoàn thành hành động có ý nghĩa, sử dụng tag \\\`[STATS_UPDATE: kinhNghiem=+X%]\`\\\` hoặc \\\`[STATS_UPDATE: kinhNghiem=+X]\\\`\\\`.
21. **RẤT QUAN TRỌNG** Khi không có nhiệm vu hiện tại thì hãy ưu tiên đưa ra cho người chơi thêm nhiệm vụ mới dựa vào câu chuyện hiện tại và mục tiêu, phương hướng của nhân vật chính.
22. **QUAN TRỌNG**Khi có tình huống có đặc biệt nào đó hãy đưa ra nhiệm vụ mới cho người chơi. Khi có từ 5 nhiệm vụ đang làm trở lên thì hạn chế đưa thêm nhiệm vụ trừ khi gặp tình huống cực kỳ đặc biệt.
${isCultivationEnabled ? `23. **CẤM TUYỆT ĐỐI (NẾU CÓ TU LUYỆN):** KHÔNG tự tạo ra các thông báo (qua tag \\\`[MESSAGE: ...]\`\\\`) hoặc diễn biến trong lời kể (narration) liên quan đến việc nhân vật LÊN CẤP, ĐỘT PHÁ CẢNH GIỚI, hay ĐẠT ĐẾN MỘT CẢNH GIỚI CỤ THỂ. Hệ thống game sẽ tự động xử lý. Bạn chỉ tập trung vào việc mô tả sự kiện và trao thưởng kinh nghiệm.` : `23. **LƯU Ý (NẾU KHÔNG CÓ TU LUYỆN):** Nhân vật là người thường, không có đột phá cảnh giới. Tập trung vào diễn biến thực tế, kỹ năng đời thường, mối quan hệ, v.v.`}
24. **CẤM TUYỆT ĐỐI:** Khi trả về một tag, dòng chứa tag đó KHÔNG ĐƯỢC chứa bất kỳ ký tự backslash ("\\") nào khác ngoài những ký tự cần thiết bên trong giá trị của tham số (ví dụ như trong chuỗi JSON của \`statBonusesJSON\`).
25. **CẤM TUYỆT ĐỐI:** Không trả về "Hệ thống: câu lệnh hệ thống " mà bắt buộc sử dụng tag đã được quy định khi muốn thêm, thay đổi, xóa bất cứ thực thể hay hiệu ứng nào.

**TIẾP TỤC CÂU CHUYỆN:** Dựa trên **HƯỚNG DẪN TỪ NGƯỜI CHƠI**, **ĐỘ DÀI PHẢN HỒI MONG MUỐN** và **TOÀN BỘ BỐI CẢNH GAME**, hãy tiếp tục câu chuyện cho thể loại "${effectiveGenre}". Mô tả kết quả, cập nhật trạng thái game bằng tags, và cung cấp các lựa chọn hành động mới (theo định dạng đã hướng dẫn ở mục 16).
`;
};
