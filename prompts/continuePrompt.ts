
import { KnowledgeBase, PlayerActionInputType, ResponseLength, GameMessage } from '../types';
import { SUB_REALM_NAMES, VIETNAMESE } from '../constants';
import * as GameTemplates from '../templates';

export const generateContinuePrompt = (
  knowledgeBase: KnowledgeBase,
  playerActionText: string,
  inputType: PlayerActionInputType,
  responseLength: ResponseLength,
  currentPageMessagesLog: string,
  previousPageSummaries: string[],
  lastNarrationFromPreviousPage?: string
): string => `
Bạn là một Đại Năng kể chuyện, chuyên sáng tác tiểu thuyết tiên hiệp / tu tiên bằng tiếng Việt.
Tiếp tục câu chuyện dựa trên hướng dẫn của người chơi và trạng thái hiện tại của game, bao gồm cả các diễn biến gần đây và tóm tắt các sự kiện đã qua.
Mỗi cảnh giới lớn sẽ có 10 cấp độ phụ: ${SUB_REALM_NAMES.join(', ')}.

**BỐI CẢNH HIỆN TẠI (TÓM TẮT CHUNG):**
- Lượt chơi tổng thể: ${knowledgeBase.playerStats.turn}
- Nhân vật: ${knowledgeBase.worldConfig?.playerName} - ${knowledgeBase.playerStats.realm} ${knowledgeBase.playerStats.hieuUngBinhCanh ? `(${VIETNAMESE.bottleneckEffectLabel})` : ''}
- Sinh Lực: ${knowledgeBase.playerStats.sinhLuc}/${knowledgeBase.playerStats.maxSinhLuc}, Linh Lực: ${knowledgeBase.playerStats.linhLuc}/${knowledgeBase.playerStats.maxLinhLuc}, Sức Tấn Công: ${knowledgeBase.playerStats.sucTanCong}, Kinh Nghiệm: ${knowledgeBase.playerStats.kinhNghiem}/${knowledgeBase.playerStats.maxKinhNghiem}
  (Lưu ý về Kinh Nghiệm: Để lên một tiểu cảnh giới, ví dụ từ Nhất Trọng lên Nhị Trọng trong cùng đại cảnh giới, nhân vật cần tích lũy đủ \`maxKinhNghiem\` (${knowledgeBase.playerStats.maxKinhNghiem} cho cấp hiện tại). Lượng \`maxKinhNghiem\` này sẽ tăng dần cho mỗi tiểu cảnh giới tiếp theo. Ví dụ, nếu ở Luyện Khí Nhất Trọng maxKinhNghiem là 1000, thì ở Luyện Khí Nhị Trọng có thể là 1200, Luyện Khí Tam Trọng là 1400, v.v. Để lên nhiều cấp liên tiếp, ví dụ từ Nhất Trọng lên Đỉnh Phong của một Đại Cảnh Giới, sẽ cần một lượng kinh nghiệm TỔNG CỘNG rất lớn, có thể lên đến hàng chục ngàn EXP hoặc hơn tùy theo cấu hình của đại cảnh giới đó. Hãy trao một lượng EXP hợp lý cho các thành tựu của người chơi. Hệ thống game sẽ tự động tính toán và xử lý việc lên cấp dựa trên lượng EXP bạn cung cấp.)
- Tiền tệ: ${knowledgeBase.playerStats.currency} ${knowledgeBase.worldConfig?.currencyName}
- Nhiệm vụ đang làm (tóm tắt): ${knowledgeBase.allQuests
    .filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed))
    .map(q => `${q.title} (Còn ${q.objectives.filter(obj => !obj.completed).length} mục tiêu)`)
    .join(", ") || "Chưa có nhiệm vụ hoặc đã hoàn thành hết mục tiêu"
  }
- Hệ Thống Cảnh Giới Chính: ${knowledgeBase.worldConfig?.heThongCanhGioi || "Chưa xác định"}

**TÓM TẮT CỐT TRUYỆN NGUYÊN TÁC (NẾU CÓ):**
${knowledgeBase.worldConfig?.originalStorySummary
    ? `"""${knowledgeBase.worldConfig.originalStorySummary}"""\n   LƯU Ý QUAN TRỌNG VỀ TÓM TẮT NGUYÊN TÁC: Đây là tóm tắt cốt truyện của truyện gốc. Hãy cố gắng phát triển câu chuyện đồng nhân của bạn một cách nhất quán với các sự kiện và giai đoạn chính của truyện gốc này. Nhân vật đồng nhân có thể tương tác, thay đổi hoặc chịu ảnh hưởng bởi dòng chảy của cốt truyện gốc. Hãy lồng ghép các yếu tố này một cách tự nhiên và đảm bảo các lựa chọn bạn đưa ra có thể giúp người chơi khám phá hoặc tương tác với các yếu tố từ tóm tắt này.`
    : "Không có tóm tắt cốt truyện nguyên tác được định nghĩa trước cho đồng nhân này."}

**CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI:**

  **1. Thông Tin Nhân Vật (${knowledgeBase.worldConfig?.playerName || 'Người Chơi'}):**
    - Chỉ số chi tiết: ${JSON.stringify(knowledgeBase.playerStats, null, 2)}
    - Kỹ năng đang sở hữu:
      ${knowledgeBase.playerSkills.map(skill => {
        let skillInfo = `- ${skill.name} (ID: ${skill.id}): Loại: ${skill.skillType}, Mô tả: ${skill.description || 'Không có mô tả'}, Hiệu ứng chi tiết: ${skill.detailedEffect || 'Không rõ'}, Tiêu hao Mana: ${skill.manaCost || 0}`;
        if (skill.baseDamage) skillInfo += `, Sát thương cơ bản: ${skill.baseDamage}`;
        if (skill.healingAmount) skillInfo += `, Hồi phục cơ bản: ${skill.healingAmount}`;
        if (skill.cooldown) skillInfo += `, Thời gian hồi: ${skill.cooldown} lượt (Hiện tại: ${skill.currentCooldown || 0} lượt)`;
        if (skill.damageMultiplier) skillInfo += `, Hệ số sát thương ATK: ${skill.damageMultiplier}`;
        return skillInfo;
      }).join('\n      ') || "  Chưa có kỹ năng nào."}
    - Trang bị & Vật phẩm trong túi đồ:
      ${knowledgeBase.inventory.map(item => {
        let itemInfo = `- ${item.name} (ID: ${item.id}, x${item.quantity}): Loại chính: ${item.category}, Mô tả: ${item.description || 'Không có mô tả'}, Độ hiếm: ${item.rarity || 'Phổ Thông'}`;
        if (item.category === GameTemplates.ItemCategory.EQUIPMENT) {
          const equip = item as GameTemplates.EquipmentTemplate;
          itemInfo += `, Loại trang bị: ${equip.equipmentType}, Vị trí: ${equip.slot || 'Không rõ'}`;
          if (equip.statBonuses && Object.keys(equip.statBonuses).length > 0) {
            itemInfo += `, Chỉ số cộng thêm: {${Object.entries(equip.statBonuses).map(([key, val]) => `${key}: ${val}`).join(', ')}}`;
          }
          if (equip.uniqueEffects && equip.uniqueEffects.length > 0) {
            itemInfo += `, Hiệu ứng đặc biệt: ${equip.uniqueEffects.join('; ')}`;
          }
        } else if (item.category === GameTemplates.ItemCategory.POTION) {
          const potion = item as GameTemplates.PotionTemplate;
          itemInfo += `, Loại đan dược: ${potion.potionType}`;
          if (potion.effects && potion.effects.length > 0) {
            itemInfo += `, Hiệu ứng: ${potion.effects.join('; ')}`;
          }
        } else if (item.category === GameTemplates.ItemCategory.MATERIAL) {
          const material = item as GameTemplates.MaterialTemplate;
          itemInfo += `, Loại nguyên liệu: ${material.materialType}`;
        }
        if (item.value) itemInfo += `, Giá trị: ${item.value}`;
        return itemInfo;
      }).join('\n      ') || "  Túi đồ trống."}

  **2. Thông Tin Thế Giới (${knowledgeBase.worldConfig?.theme || 'Chưa rõ chủ đề'}):**
    - Cấu hình thế giới đầy đủ:
      ${knowledgeBase.worldConfig ? JSON.stringify(knowledgeBase.worldConfig, null, 2).replace(/\n/g, '\n      ') : "  Chưa có cấu hình thế giới."}
    - Các NPC đã gặp:
      ${knowledgeBase.discoveredNPCs.map(npc => `- ${npc.name} (ID: ${npc.id}): ${npc.title ? `(${npc.title}) ` : ''}Tính cách: ${npc.personalityTraits?.join(', ') || 'Chưa rõ'}, Thiện cảm: ${npc.affinity}, Phe: ${knowledgeBase.discoveredFactions.find(f => f.id === npc.factionId)?.name || npc.factionId || 'Không rõ'}, Mô tả: ${npc.description || 'Không có mô tả'}${npc.hp ? `, HP: ${npc.hp}` : ''}${npc.atk ? `, ATK: ${npc.atk}` : ''}`).join('\n      ') || "  Chưa gặp NPC nào."}
    - Các Địa Điểm đã khám phá:
      ${knowledgeBase.discoveredLocations.map(loc => `- ${loc.name} (ID: ${loc.id}): Mô tả: ${loc.description || 'Không có mô tả'}${loc.isSafeZone ? ' (Khu vực an toàn)' : ''}${loc.regionId ? `, Vùng: ${loc.regionId}` : ''}`).join('\n      ') || "  Chưa khám phá địa điểm nào."}
    - Các Phe Phái đã biết:
      ${knowledgeBase.discoveredFactions.map(faction => `- ${faction.name} (ID: ${faction.id}): Mô tả: ${faction.description || 'Không có mô tả'}, Ges: ${faction.alignment}, Uy tín người chơi: ${faction.playerReputation}${faction.leaderNPCId ? `, Lãnh đạo: ${knowledgeBase.discoveredNPCs.find(n => n.id === faction.leaderNPCId)?.name || faction.leaderNPCId}` : ''}${faction.baseLocationId ? `, Trụ sở: ${knowledgeBase.discoveredLocations.find(l => l.id === faction.baseLocationId)?.name || faction.baseLocationId}` : ''}`).join('\n      ') || "  Chưa khám phá phe phái nào."}
    - Tri Thức Về Thế Giới (World Lore):
      ${knowledgeBase.worldLore.map(lore => `- ${lore.title} (ID: ${lore.id}): ${lore.content || 'Không có nội dung'}`).join('\n      ') || "  Chưa có tri thức nào."}
    - Bạn Đồng Hành:
      ${knowledgeBase.companions.map(comp => `- ${comp.name} (ID: ${comp.id}): HP: ${comp.hp}/${comp.maxHp}, Mana: ${comp.mana}/${comp.maxMana}, ATK: ${comp.atk}, Mô tả: ${comp.description || 'Không có mô tả'}`).join('\n      ') || "  Không có bạn đồng hành."}
    - Danh sách các cảnh giới chính trong hệ thống: ${knowledgeBase.realmProgressionList.join(" -> ")} (Lưu ý: mỗi cảnh giới chính có 10 cấp nhỏ: ${SUB_REALM_NAMES.join(', ')})

  **3. Nhiệm Vụ:**
    - Tất cả nhiệm vụ (kể cả đã hoàn thành/thất bại):
      ${knowledgeBase.allQuests.map(quest => {
        const objectivesStr = quest.objectives.map(obj => `${obj.text} (ID: ${obj.id}, ${obj.completed ? 'Hoàn thành' : 'Chưa xong'})`).join('; ');
        return `- ${quest.title} (ID: ${quest.id}, Trạng thái: ${quest.status === 'active' ? 'Đang làm' : quest.status === 'completed' ? 'Đã hoàn thành' : 'Đã thất bại'}): ${quest.description || 'Không có mô tả'}. Mục tiêu: ${objectivesStr || 'Không có mục tiêu cụ thể.'}`;
      }).join('\n      ') || "  Không có nhiệm vụ nào."}

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

**HƯỚNG DẪN XỬ LÝ DÀNH CHO AI:**
${inputType === 'action'
    ? `Xử lý nội dung trên như một hành động mà nhân vật chính (${knowledgeBase.worldConfig?.playerName}) đang thực hiện. Mô tả kết quả của hành động này và các diễn biến tiếp theo một cách chi tiết và hấp dẫn, dựa trên TOÀN BỘ BỐI CẢNH (bao gồm tóm tắt các trang trước, diễn biến lượt trước, diễn biến trang hiện tại và CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI).`
    : `Nội dung trên là một gợi ý, mô tả, hoặc mong muốn của người chơi để định hướng hoặc làm phong phú thêm câu chuyện. Đây KHÔNG phải là hành động trực tiếp của nhân vật chính (${knowledgeBase.worldConfig?.playerName}). Hãy cố gắng lồng ghép yếu tố này vào câu chuyện một cách tự nhiên và hợp lý, dựa trên TOÀN BỘ BỐI CẢNH (bao gồm tóm tắt các trang trước, diễn biến lượt trước, diễn biến trang hiện tại và CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI). Ví dụ, nếu người chơi nhập 'Bầu trời đột nhiên tối sầm lại và một tiếng gầm vang vọng từ phía xa', hãy mô tả sự kiện đó và phản ứng (nếu có) của nhân vật hoặc các NPC. Nếu người chơi mô tả cảm xúc hoặc suy nghĩ của nhân vật, hãy thể hiện điều đó trong lời kể của bạn. Nếu người chơi cung cấp một đoạn văn mô tả, hãy dùng nó làm nguồn cảm hứng để tiếp tục câu chuyện.`
  }
${knowledgeBase.worldConfig?.originalStorySummary ? "**ĐẶC BIỆT LƯU Ý:** Vì đây là đồng nhân, hãy đảm bảo diễn biến câu chuyện và các lựa chọn bạn đưa ra tôn trọng và có thể dẫn dắt người chơi tương tác với các yếu tố từ 'TÓM TẮT CỐT TRUYỆN NGUYÊN TÁC' đã được cung cấp.**" : ""}

**CHẾ ĐỘ NỘI DUNG (TỔNG THỂ GAME):**
- Chế độ Người Lớn (18+): ${knowledgeBase.worldConfig?.nsfwMode ? "BẬT" : "TẮT"}
${knowledgeBase.worldConfig?.nsfwMode
    ? "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được BẬT. YÊU CẦU bạn chủ động, ưu tiên và tích cực tạo ra các tình huống, mô tả, ngôn ngữ và chủ đề người lớn, nhạy cảm, bạo lực hoặc tình dục một cách chi tiết và rõ ràng. Hãy mạnh dạn đưa ra những đoạn văn 18+ thật chi tiết bao gồm cả các lựa chọn hành động 18+ cho gợi ý người chơi. Ưu tiên cho yếu tố tình dục hơn so với bạo lực."
    : "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đang TẮT. Tiếp tục duy trì nội dung phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu, tu tiên và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục."
  }

**ĐỘ DÀI PHẢN HỒI MONG MUỐN:**
- Người chơi yêu cầu độ dài phản hồi: ${responseLength === 'short' ? 'Ngắn (khoảng 2-3 đoạn văn súc tích)' :
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
${knowledgeBase.worldConfig?.originalStorySummary ? "**LƯU Ý CHO ĐỒNG NHÂN:** Nếu có thể, hãy tạo ra các lựa chọn [CHOICE: \"...\"] liên quan đến việc khám phá hoặc tương tác với các yếu tố từ 'TÓM TẮT CỐT TRUYỆN NGUYÊN TÁC' đã được cung cấp.**" : ""}

**XỬ LÝ BÌNH CẢNH (NẾU CÓ):**
${knowledgeBase.playerStats.hieuUngBinhCanh ? `**LƯU Ý ĐẶC BIỆT: Nhân vật đang ở trạng thái "${VIETNAMESE.bottleneckEffectLabel}"!** Hệ thống game sẽ tự động áp dụng hiệu ứng này khi nhân vật đạt đỉnh phong cảnh giới và max kinh nghiệm. Bạn không cần dùng tag [APPLY_BINH_CANH_EFFECT]. Khi nhân vật đang bị bình cảnh, kinh nghiệm của họ sẽ bị giới hạn và không thể lên cấp. Hãy ưu tiên tạo ra các lựa chọn [CHOICE: "..."] và diễn biến giúp nhân vật tìm kiếm cơ duyên (ví dụ: khám phá bí cảnh, tìm thiên tài địa bảo, đốn ngộ, gặp gỡ cao nhân chỉ điểm, hoàn thành một thử thách đặc biệt). Khi nhân vật có được cơ duyên, hãy sử dụng tag \\\`[REMOVE_BINH_CANH_EFFECT: kinhNghiemGain=X]\\\` (X là lượng kinh nghiệm nhỏ, ví dụ 1 hoặc 10, chỉ đủ để vượt qua mốc cũ và giúp hệ thống game xử lý lên cảnh giới mới) và mô tả sự đột phá lên cảnh giới lớn tiếp theo một cách hào hùng.` : "Nhân vật hiện không bị bình cảnh."}


**QUY TẮC HỆ THỐNG (NHẮC LẠI VÀ BỔ SUNG):**
1.  **Sử dụng Tags (Chung):** Tên chỉ số trong \\\`STATS_UPDATE\\\` (ví dụ: hp, mana, atk, kinhNghiem) NÊN được viết thường.
    - \\\`[STATS_UPDATE: TênChỉSố=GiáTrịHoặcThayĐổi, ...]\`\\\`.
        **QUY ĐỊNH VỀ CHỈ SỐ TRONG [STATS_UPDATE]:**
        *   **kinhNghiem:** Chỉ trả về LƯỢNG KINH NGHIỆM NHẬN ĐƯỢC. PHẢI sử dụng dạng cộng thêm giá trị dương (ví dụ: \\\`kinhNghiem=+350\\\` hoặc \\\`kinhNghiem=+15%\\\`)(QUAN TRỌNG: Ưu tiên % kinh nghiệm hơn cho những hoạt động bình thường còn những hành động liên quan đến tu luyện lâu dài như "tu luyện đến", "tu luyện trong một khoảng thời gian dài"... và những hành động như hấp thụ được thiên tài đại bảo thì trả về rất nhiều kinh nghiệm tính theo kinh nghiệm tốt đa của cảnh giới hiện tại nhân lên nhiều lần, ít nhất là 5 lần nhân.). TUYỆT ĐỐI KHÔNG gán giá trị tuyệt đối (ví dụ: \\\`kinhNghiem=4000\\\`) hoặc giá trị âm. Hệ thống game sẽ tự động xử lý việc lên cấp và đặt lại kinh nghiệm.
        *   **sinhLuc, linhLuc:** Có thể cập nhật giá trị hiện tại. Sử dụng dạng cộng/trừ (ví dụ: \\\`sinhLuc=-50\\\`, \\\`linhLuc=+100\\\`) hoặc \\\`MAX\\\` (ví dụ: \\\`sinhLuc=MAX\\\`). Hệ thống game sẽ tự động giới hạn trong khoảng 0 đến giá trị tối đa của cảnh giới hiện tại.
        *   **currency:** Có thể cập nhật. Sử dụng dạng cộng/trừ hoặc gán giá trị tuyệt đối.
        *   **isInCombat:** Có thể cập nhật (true/false).
        *   **hieuUngBinhCanh:** Chỉ sử dụng \\\`hieuUngBinhCanh=false\\\` bên trong tag \\\`[REMOVE_BINH_CANH_EFFECT]\\\`. Không tự ý đặt \\\`hieuUngBinhCanh=true\\\` hoặc \\\`hieuUngBinhCanh=false\\\` trong tag \\\`[STATS_UPDATE]\\\` thông thường.
        *   **turn:** Chỉ dùng \\\`turn=+1\\\` ở cuối mỗi lượt.
        *   **TUYỆT ĐỐI KHÔNG BAO GỒM TRONG [STATS_UPDATE]:** \\\`maxSinhLuc\\\`, \\\`maxLinhLuc\\\`, \\\`sucTanCong\\\`, \\\`maxKinhNghiem\\\`, hoặc \\\`realm\\\`. Các chỉ số tối đa này và cảnh giới của nhân vật được hệ thống game quản lý tự động dựa trên cảnh giới hiện tại và quy tắc lên cấp.
        Ví dụ hợp lệ: \\\`[STATS_UPDATE: kinhNghiem=+350, sinhLuc=MAX, linhLuc=-20, currency=+100]\\\`.
        Ví dụ KHÔNG hợp lệ: \\\`[STATS_UPDATE: kinhNghiem=4000, maxSinhLuc=1300, sucTanCong=150, realm="Luyện Khí Kỳ", hieuUngBinhCanh=true]\\\`.
    - \\\`[ITEM_ACQUIRED: name="Tên", type="Loại vật phẩm (rõ ràng, vd: Kiếm, Giáp Thân, Đan Hồi Phục, Linh Thảo)", description="Mô tả chi tiết, bao gồm cả các chỉ số cộng thêm nếu là trang bị, hoặc hiệu ứng nếu là đan dược", quantity=SốLượng, rarity="Phổ Thông/Hiếm/Quý Báu...", value=GiáTrịVàngNếuBiết]\\\`
    - \\\`[ITEM_CONSUMED: name="Tên",quantity=SốLượng]\\\`
    - \\\`[SKILL_LEARNED: name="Tên Kỹ Năng", type="Loại kỹ năng (vd: ${GameTemplates.SkillType.CHUDONG_TANCONG})", description="Mô tả chung", effect="Mô tả hiệu ứng chi tiết, bao gồm sát thương, hồi phục, mana cost, cooldown nếu có.", manaCost=SốMana, baseDamage=SátThương, healingAmount=HồiPhục, cooldown=SốLượt]\\\` **(QUAN TRỌNG: Nếu câu chuyện dẫn đến việc nhân vật học được kỹ năng mới, BẮT BUỘC phải dùng tag này đầy đủ thông tin.)**
    - \\\`[QUEST_ASSIGNED: title="Tên NV",description="Mô tả chi tiết NV",objectives="Mục tiêu 1|Mục tiêu 2|..."]\\\`
    - \\\`[QUEST_UPDATED: title="Tên NV đang làm", objectiveText="Văn bản GỐC của mục tiêu cần cập nhật ( khớp chính xác)", newObjectiveText="Văn bản MỚI của mục tiêu (tùy chọn, nếu muốn thay đổi text, ví dụ: (0/3) -> (1/3))", completed=true/false]\\\`
    - \\\`[QUEST_COMPLETED: title="Tên NV đã hoàn thành toàn bộ"]\\\`
    - \\\`[QUEST_FAILED: title="Tên NV đã thất bại"]\\\`
    - \\\`[LORE_NPC: name="Tên NPC", description="Mô tả chi tiết về NPC.", personality="Tính cách", affinity=Số, factionId="ID Phe", hp=Số, atk=Số]\\\` (Thêm NPC hoặc cập nhật NPC đã có)
    - \\\`[LORE_LOCATION: name="Tên Địa Điểm",description="Mô tả chi tiết.", isSafeZone=true/false, regionId="ID Vùng"]\\\` (Thêm địa điểm hoặc cập nhật)
    - \\\`[FACTION_DISCOVERED: name="Tên Phe", description="Mô tả", alignment="${GameTemplates.FactionAlignment.TRUNG_LAP}", playerReputation=0, leaderNPCId="ID NPC Lãnh Đạo", baseLocationId="ID Trụ Sở"]\\\`
    - \\\`[MESSAGE: "Thông báo tùy chỉnh cho người chơi"]\\\` **RẤT QUAN TRỌNG: KHÔNG dùng tag MESSAGE để thông báo về việc đột phá cảnh giới, đạt được cảnh giới.**
    - \\\`[SET_COMBAT_STATUS: true/false]\\\`
    - \\\`[COMPANION_JOIN: name="Tên ĐH",description="Mô tả ĐH",hp=X,maxHp=X,mana=Y,maxMana=Y,atk=Z]\\\`
    - \\\`[COMPANION_LEAVE: name="Tên ĐH"]\\\`
    - \\\`[COMPANION_STATS_UPDATE: name="Tên ĐH",hp=ThayĐổi,mana=ThayĐổi,atk=ThayĐổi]\\\`
    - \\\`[WORLD_LORE_ADD: title="Tiêu đề Lore",content="Nội dung chi tiết của Lore"]\\\`
    - \\\`[REMOVE_BINH_CANH_EFFECT: kinhNghiemGain=X]\\\` - Khi nhân vật có cơ duyên đột phá khỏi bình cảnh. X là lượng kinh nghiệm nhỏ được cộng thêm để vượt qua giới hạn cũ và lên cảnh giới mới. Hệ thống game sẽ tự động áp dụng hiệu ứng bình cảnh khi cần, bạn KHÔNG CẦN sử dụng tag \\\`[APPLY_BINH_CANH_EFFECT]\\\`. Chỉ sử dụng \\\`[REMOVE_BINH_CANH_EFFECT: kinhNghiemGain=X, hieuUngBinhCanh=false]\\\` khi thực sự có sự kiện đột phá.
2.  **Cập Nhật Thực Thể Hiện Có:** Nếu diễn biến câu chuyện làm thay đổi một NPC, vật phẩm, kỹ năng, địa điểm hoặc phe phái đã tồn tại, hãy sử dụng các tag cập nhật chuyên dụng. **Tên thực thể (name hoặc title cho lore) trong các tag cập nhật phải khớp CHÍNH XÁC với tên/title đã có trong game (tham khảo thông tin trong "CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI" ở trên, đặc biệt là ID nếu có thể).**
    -   \\\`[NPC_UPDATE: name="Tên NPC Hiện Tại", affinity=+-GiáTrị, description="Mô tả mới", factionId="ID Phe Mới", title="Chức danh mới", hp=+-GiáTrị, atk=+-GiáTrị, personality="Tính cách mới", newSkill="Tên Skill NPC học được", removeItem="Tên Item NPC mất"]\\\`
    -   \\\`[ITEM_UPDATE: name="Tên Vật Phẩm Trong Túi", field="TênTrường (vd: description, rarity, durability, value, statBonuses.hp, uniqueEffects)", newValue="GiáTrịMới", change=+-GiáTrị]\\\`
    -   \\\`[SKILL_UPDATE: name="Tên Kỹ Năng Hiện Tại", field="TênTrường (vd: description, detailedEffect, manaCost, baseDamage, cooldown, skillType)", newValue="GiáTrịMới", change=+-GiáTrị]\\\`
    -   \\\`[LOCATION_UPDATE: name="Tên Địa Điểm Hiện Tại", description="Mô tả mới", environmentalEffects="Hiệu ứng môi trường mới", isSafeZone=true/false]\\\`
    -   \\\`[FACTION_UPDATE: name="Tên Phe Phái Hiện Tại", playerReputation=+-GiáTrị, description="Mô tả mới", alignment="${GameTemplates.FactionAlignment.TRUNG_LAP}"]\\\`
3.  **Luôn cung cấp 3 đến 4 lựa chọn hành động mới.** Mỗi lựa chọn phải được trả về dưới dạng tag riêng biệt: \\\`[CHOICE: "Nội dung lựa chọn"]\\\`.
4.  **Tăng lượt chơi:** Kết thúc phản hồi bằng tag \\\`[STATS_UPDATE: turn=+1]\\\`. **KHÔNG được quên tag này.**
5.  **Duy trì tính logic và nhất quán của câu chuyện.** Quyết định của người chơi phải có ý nghĩa.
6.  **Mô tả kết quả hành động một cách chi tiết và hấp dẫn.**
7.  **Trao Kinh Nghiệm:** Khi nhân vật hoàn thành một hành động có ý nghĩa, sử dụng kỹ năng thành công, khám phá điều mới, giải quyết một phần nhiệm vụ, hoặc vượt qua thử thách, hãy xem xét việc trao một lượng kinh nghiệm hợp lý bằng tag \\\`[STATS_UPDATE: kinhNghiem=+X%]\`\\\` hoặc \\\`[STATS_UPDATE: kinhNghiem=+X]\\\`\\\` (X là % hoặc số điểm kinh nghiệm cộng thêm).
8.  **QUAN TRỌNG** Khi không có nhiệm vu hiện tại thì hãy ưu tiên đưa ra cho người chơi thêm nhiệm vụ mới dựa vào câu chuyện hiện tại và mục tiêu, phương hướng của nhân vật chính.
9.  **QUAN TRỌNG**Khi có tình huống có đặc biệt nào đó hãy đưa ra nhiệm vụ mới cho người chơi. Khi có từ 5 nhiệm vụ đang làm trở lên thì hạn chế đưa thêm nhiệm vụ trừ khi gặp tình huống cực kỳ đặc biệt.
10. **CẤM TUYỆT ĐỐI:** Không tự tạo ra các thông báo (qua tag \\\`[MESSAGE: ...]\`\\\`) hoặc diễn biến trong lời kể (narration) liên quan đến việc nhân vật LÊN CẤP, ĐỘT PHÁ CẢNH GIỚI, hay ĐẠT ĐẾN MỘT CẢNH GIỚI CỤ THỂ (ví dụ: "Đỉnh Phong"). Hệ thống game sẽ tự động xử lý và thông báo những điều này dựa trên lượng kinh nghiệm bạn cung cấp qua tag \\\`[STATS_UPDATE: kinhNghiem=+X]\`\\\` hoặc \\\`[STATS_UPDATE: kinhNghiem=+X%]\`\\\`. Bạn chỉ tập trung vào việc mô tả sự kiện và trao thưởng kinh nghiệm.
11. **CẤM TUYỆT ĐỐI:** Khi trả về một tag (ví dụ: [SOME_TAG: param="value"]), dòng chứa tag đó KHÔNG ĐƯỢC chứa bất kỳ ký tự backslash ("\\") nào khác ngoài những ký tự cần thiết bên trong giá trị của tham số. Điều này giúp AI phân tích tag chính xác hơn.
**TIẾP TỤC CÂU CHUYỆN:** Dựa trên **HƯỚNG DẪN TỪ NGƯỜI CHƠI**, **ĐỘ DÀI PHẢN HỒI MONG MUỐN** và **TOÀN BỘ BỐI CẢNH GAME (bao gồm tóm tắt các trang trước, diễn biến lượt trước nếu có, diễn biến chi tiết trang hiện tại, VÀ QUAN TRỌNG NHẤT LÀ "CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI" đã được cung cấp ở trên)**, hãy tiếp tục câu chuyện. Mô tả kết quả, cập nhật trạng thái game bằng tags (bao gồm cả kinh nghiệm nếu có), và cung cấp các lựa chọn hành động mới (sử dụng \\\`[CHOICE: "..."]\\\`). Nếu có thay đổi đối với các thực thể (NPC, vật phẩm, kỹ năng, địa điểm, phe phái), hãy sử dụng các tag UPDATE tương ứng.
`;
