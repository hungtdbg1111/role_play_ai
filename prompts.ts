import { WorldSettings, KnowledgeBase, PlayerActionInputType, ResponseLength, GameMessage, GeneratedWorldElements, StartingLocation } from './types';
import { INITIAL_KNOWLEDGE_BASE } from './constants'; // Assuming constants.ts is now constants/index.ts or just constants.ts
import { VIETNAMESE } from './translations';
import * as GameTemplates from './templates';

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
${worldConfig.originalStorySummary ? `- TÓM TẮT CỐT TRUYỆN NGUYÊN TÁC (ĐỒNG NHÂN): """${worldConfig.originalStorySummary}"""` : ''}

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
- Địa điểm khởi đầu cụ thể:
${worldConfig.startingLocations && worldConfig.startingLocations.length > 0 ? worldConfig.startingLocations.map(loc => `  - Tên: ${loc.name}, Mô tả: ${loc.description}${loc.isSafeZone ? ' (Khu An Toàn)' : ''}${loc.regionId ? `, Vùng: ${loc.regionId}` : ''}`).join('\n') : "  Không có địa điểm khởi đầu cụ thể."}

**CHẾ ĐỘ NỘI DUNG (TỔNG THỂ GAME):**
- Chế độ Người Lớn (18+): ${worldConfig.nsfwMode ? "BẬT" : "TẮT"}
${worldConfig.nsfwMode
  ? "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được BẬT. YÊU CẦU bạn chủ động, ưu tiên và tích cực tạo ra các tình huống, mô tả, ngôn ngữ và chủ đề người lớn, nhạy cảm, bạo lực hoặc tình dục một cách chi tiết và rõ ràng. Hãy mạnh dạn đưa ra những đoạn văn 18+ thật chi tiết bao gồm cả các lựa chọn hành động 18+ cho gợi ý người chơi."
  : "LƯU Ý QUAN TRỌNG: Chế độ Người Lớn đã được TẮT. Vui lòng duy trì nội dung phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu, tu tiên và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục."
}

**QUY TẮC HỆ THỐNG:**
1.  **Khởi tạo Chỉ số Nhân vật:** Dựa vào thông tin trên, hãy quyết định các chỉ số ban đầu cho nhân vật. Trả về dưới dạng tag [PLAYER_STATS_INIT: hp=100,maxHp=100,mana=50,maxMana=50,atk=10,exp=0,maxExp=100,level=1,realm="${INITIAL_KNOWLEDGE_BASE.realmProgressionList[0]}",currency=10,turn=1]. Realm ban đầu là "${INITIAL_KNOWLEDGE_BASE.realmProgressionList[0]}". Các chỉ số tối đa (maxHp, maxMana, maxExp) và ATK sẽ do hệ thống game tự động tăng khi lên cấp, AI không cần cập nhật các chỉ số này khi lên cấp. **QUAN TRỌNG: Lượt chơi (turn) phải bắt đầu từ 1.**
2.  **Tạo Danh sách Cảnh giới:** Hệ thống đã có danh sách mặc định: ${INITIAL_KNOWLEDGE_BASE.realmProgressionList.join(", ")}. Nếu bạn muốn thay đổi hoặc đề xuất một danh sách hoàn toàn mới dựa trên chủ đề, hãy dùng tag [REALM_LIST: "Tên Cảnh Giới 1", "Tên Cảnh Giới 2", ...].
3.  **Vật phẩm, Kỹ năng, NPC, Địa Điểm, Phe Phái và Tri Thức Khởi đầu:** Dựa trên thông tin do người chơi cung cấp, hãy tạo các tag tương ứng. **Cố gắng cung cấp đủ thông tin để hệ thống game có thể tạo ra các thực thể đầy đủ theo định nghĩa cấu trúc dữ liệu của game.**
    -   **Vật phẩm:** Sử dụng tag \`[ITEM_ACQUIRED: name="Tên", type="Loại vật phẩm (rõ ràng, vd: Kiếm, Giáp Thân, Đan Hồi Phục, Linh Thảo)", description="Mô tả chi tiết, bao gồm cả các chỉ số cộng thêm như 'tăng 10 tấn công, +50 HP' nếu là trang bị, hoặc hiệu ứng nếu là đan dược", quantity=SốLượng, rarity="Phổ Thông/Hiếm/Quý Báu...", value=GiáTrịVàngNếuBiết]\`. Ví dụ: \`[ITEM_ACQUIRED: name="Trường Kiếm Sắt", type="Vũ Khí Kiếm", description="Một thanh trường kiếm bằng sắt, tăng 5 điểm tấn công.", quantity=1, rarity="Phổ Thông", value=10]\`.
        ${worldConfig.startingItems && worldConfig.startingItems.map(item => `[ITEM_ACQUIRED: name="${item.name.replace(/"/g, '\\"')}",type="${item.type.replace(/"/g, '\\"')}",description="${item.description.replace(/"/g, '\\"')}",quantity=${item.quantity}, rarity="Phổ Thông"]`).join('\n')}
    -   **Kỹ năng:** Sử dụng tag \`[SKILL_LEARNED: name="Tên Kỹ Năng", type="Loại kỹ năng (vd: ${GameTemplates.SkillType.CHUDONG_TANCONG}, ${GameTemplates.SkillType.BIDONG})", description="Mô tả chung về kỹ năng", effect="Mô tả hiệu ứng chi tiết của kỹ năng, bao gồm sát thương cơ bản, lượng hồi phục, tiêu hao mana, thời gian hồi chiêu nếu có.", manaCost=SốMana, baseDamage=SátThươngCơBản, healingAmount=LượngHồiPhục, cooldown=SốLượtHồi]\`. Ví dụ: \`[SKILL_LEARNED: name="Hỏa Cầu Thuật", type="${GameTemplates.SkillType.CHUDONG_TANCONG}", description="Tạo một quả cầu lửa tấn công kẻ địch.", effect="Gây 15 sát thương Hỏa.", manaCost=10, baseDamage=15, cooldown=0]\`.
        ${worldConfig.startingSkills && worldConfig.startingSkills.map(skill => `[SKILL_LEARNED: name="${skill.name.replace(/"/g, '\\"')}",type="Khởi đầu",description="${skill.description.replace(/"/g, '\\"')}",effect="${skill.description.replace(/"/g, '\\"')}", manaCost=0, baseDamage=0, healingAmount=0, cooldown=0]`).join('\n')}
    -   **NPC:** Sử dụng tag \`[LORE_NPC: name="Tên NPC", description="Mô tả chi tiết về NPC, bao gồm vai trò, tiểu sử ngắn.", personality="Tính cách1, Tính cách2", affinity=ĐộThiệnCảmBanĐầu, factionId="ID Phe (nếu có)", hp=SốHP, atk=SốCông]\`. Ví dụ: \`[LORE_NPC: name="Lão Tửu Quỷ", description="Một lão già bí ẩn hay say xỉn ở quán trọ, có vẻ biết nhiều chuyện.", personality="Bí ẩn, Ham rượu", affinity=0, hp=50, atk=5]\`.
        ${worldConfig.startingNPCs && worldConfig.startingNPCs.map(npc => `[LORE_NPC: name="${npc.name.replace(/"/g, '\\"')}",description="Chi tiết: ${npc.details.replace(/"/g, '\\"')}", personality="${npc.personality.replace(/"/g, '\\"')}", affinity=${npc.initialAffinity}, hp=50, atk=5]`).join('\n')}
    -   **Địa Điểm:** Sử dụng tag \`[LORE_LOCATION: name="Tên Địa Điểm", description="Mô tả chi tiết về địa điểm.", isSafeZone=true/false, regionId="ID Vùng (nếu có)"]\`.
        ${worldConfig.startingLocations && worldConfig.startingLocations.map(loc => `[LORE_LOCATION: name="${loc.name.replace(/"/g, '\\"')}", description="${loc.description.replace(/"/g, '\\"')}", isSafeZone=${loc.isSafeZone || false}${loc.regionId ? `, regionId="${loc.regionId.replace(/"/g, '\\"')}"` : ''}]`).join('\n')}
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
Hãy bắt đầu câu chuyện. Mô tả khung cảnh đầu tiên, tình huống nhân vật đang gặp phải. Sau đó, cung cấp các lựa chọn hành động sử dụng tag \`[CHOICE: "..." ]\`. Đảm bảo sử dụng các tag cần thiết khác để khởi tạo trạng thái nhân vật (bao gồm các vật phẩm, kỹ năng, NPC, địa điểm, phe phái và tri thức khởi đầu đã được định nghĩa ở trên) và có thể là một nhiệm vụ đầu tiên qua \`[QUEST_ASSIGNED]\`.
`,

  continue: (
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

**BỐI CẢNH HIỆN TẠI (TÓM TẮT CHUNG):**
- Lượt chơi tổng thể: ${knowledgeBase.playerStats.turn}
- Nhân vật: ${knowledgeBase.worldConfig?.playerName} - ${knowledgeBase.playerStats.realm} Cấp ${knowledgeBase.playerStats.level}
- HP: ${knowledgeBase.playerStats.hp}/${knowledgeBase.playerStats.maxHp}, Mana: ${knowledgeBase.playerStats.mana}/${knowledgeBase.playerStats.maxMana}, ATK: ${knowledgeBase.playerStats.atk}, EXP: ${knowledgeBase.playerStats.exp}/${knowledgeBase.playerStats.maxExp}
- Tiền tệ: ${knowledgeBase.playerStats.currency} ${knowledgeBase.worldConfig?.currencyName}
- Nhiệm vụ đang làm (tóm tắt): ${knowledgeBase.allQuests
      .filter(q => q.status === 'active' && q.objectives.some(obj => !obj.completed))
      .map(q => `${q.title} (Còn ${q.objectives.filter(obj => !obj.completed).length} mục tiêu)`)
      .join(", ") || "Chưa có nhiệm vụ hoặc đã hoàn thành hết mục tiêu"
    }

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
    - Danh sách cảnh giới (Realm Progression): ${knowledgeBase.realmProgressionList.join(" -> ")}

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
2.  **Cập Nhật Thực Thể Hiện Có:** Nếu diễn biến câu chuyện làm thay đổi một NPC, vật phẩm, kỹ năng, địa điểm hoặc phe phái đã tồn tại, hãy sử dụng các tag cập nhật chuyên dụng. **Tên thực thể (name hoặc title cho lore) trong các tag cập nhật phải khớp CHÍNH XÁC với tên/title đã có trong game (tham khảo thông tin trong "CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI" ở trên, đặc biệt là ID nếu có thể).**
    -   \`[NPC_UPDATE: name="Tên NPC Hiện Tại", affinity=+-GiáTrị, description="Mô tả mới", factionId="ID Phe Mới", title="Chức danh mới", hp=+-GiáTrị, atk=+-GiáTrị, personality="Tính cách mới", newSkill="Tên Skill NPC học được", removeItem="Tên Item NPC mất"]\`
    -   \`[ITEM_UPDATE: name="Tên Vật Phẩm Trong Túi", field="TênTrường (vd: description, rarity, durability, value, statBonuses.hp, uniqueEffects)", newValue="GiáTrịMới", change=+-GiáTrị]\`
    -   \`[SKILL_UPDATE: name="Tên Kỹ Năng Hiện Tại", field="TênTrường (vd: description, detailedEffect, manaCost, baseDamage, cooldown, skillType)", newValue="GiáTrịMới", change=+-GiáTrị]\`
    -   \`[LOCATION_UPDATE: name="Tên Địa Điểm Hiện Tại", description="Mô tả mới", environmentalEffects="Hiệu ứng môi trường mới", isSafeZone=true/false]\`
    -   \`[FACTION_UPDATE: name="Tên Phe Phái Hiện Tại", playerReputation=+-GiáTrị, description="Mô tả mới", alignment="${GameTemplates.FactionAlignment.TRUNG_LAP}"]\`
3.  **Luôn cung cấp 3 đến 4 lựa chọn hành động mới.** Mỗi lựa chọn phải được trả về dưới dạng tag riêng biệt: \`[CHOICE: "Nội dung lựa chọn"]\`.
4.  **Tăng lượt chơi:** Kết thúc phản hồi bằng tag \`[STATS_UPDATE: turn=+1]\`. **KHÔNG được quên tag này.**
5.  **Duy trì tính logic và nhất quán của câu chuyện.** Quyết định của người chơi phải có ý nghĩa.
6.  **Mô tả kết quả hành động một cách chi tiết và hấp dẫn.**
7.  **Trao EXP:** Khi nhân vật hoàn thành một hành động có ý nghĩa, sử dụng kỹ năng thành công, khám phá điều mới, giải quyết một phần nhiệm vụ, hoặc vượt qua thử thách, hãy xem xét việc trao một lượng EXP hợp lý bằng tag \`[STATS_UPDATE: exp=+X]\`.
8.  **Khi không có nhiệm vu hiện tại thì hãy ưu tiên đưa ra cho người chơi thêm nhiệm vụ mới dựa vào câu chuyện hiện tại và mục tiêu, phương hướng của nhân vật chính.
9.  **Khi có tình huống có đặc biệt nào đó hãy đưa ra nhiệm vụ mới cho người chơi. Khi có từ 5 nhiệm vụ đang làm trở lên thì hạn chế đưa thêm nhiệm vụ trừ khi gặp tình huống cực kỳ đặc biệt.

**TIẾP TỤC CÂU CHUYỆN:**
Dựa trên **HƯỚNG DẪN TỪ NGƯỜI CHƠI**, **ĐỘ DÀI PHẢN HỒI MONG MUỐN** và **TOÀN BỘ BỐI CẢNH GAME (bao gồm tóm tắt các trang trước, diễn biến lượt trước nếu có, diễn biến chi tiết trang hiện tại, VÀ QUAN TRỌNG NHẤT LÀ "CHI TIẾT TOÀN BỘ TRẠNG THÁI GAME HIỆN TẠI" đã được cung cấp ở trên)**, hãy tiếp tục câu chuyện. Mô tả kết quả, cập nhật trạng thái game bằng tags (bao gồm cả EXP nếu có), và cung cấp các lựa chọn hành động mới (sử dụng \`[CHOICE: "..."]\`). Nếu có thay đổi đối với các thực thể (NPC, vật phẩm, kỹ năng, địa điểm, phe phái), hãy sử dụng các tag UPDATE tương ứng.
`,
  generateWorldDetails: (storyIdea: string, isNsfwIdea: boolean): string => `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai tu tiên bằng tiếng Việt.
Dựa trên mô tả ý tưởng cốt truyện sau đây từ người dùng, hãy tạo ra các yếu tố khởi đầu cho thế giới game.

**Mô tả ý tưởng:**
"${storyIdea}"

**CHẾ ĐỘ NỘI DUNG CHO VIỆC TẠO YẾU TỐ KHỞI ĐẦU:**
- Yêu cầu nội dung 18+ (dâm dục, bạo lực): ${isNsfwIdea ? "BẬT" : "TẮT"}
${isNsfwIdea
  ? "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được BẬT cho việc tạo các yếu tố thế giới. Hãy chủ động, ưu tiên và tích cực tạo ra các tên gọi, mô tả, tính cách, chi tiết NPC, kỹ năng, vật phẩm, và tri thức thế giới mang tính chất người lớn, nhạy cảm, dâm dục và bạo lực một cách chi tiết và rõ ràng. Hãy mạnh dạn đưa ra những gợi ý 18+ cho các yếu tố này. Ưu tiên cho yếu tố tình dục hơn so với bạo lực."
  : "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được TẮT. Vui lòng tạo các yếu tố phù hợp với mọi lứa tuổi, tập trung vào phiêu lưu, tu tiên và phát triển nhân vật. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục khi tạo các yếu tố này."
}

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
    *   Tạo ra 1 đến 2 Địa Điểm Khởi Đầu phù hợp. Sử dụng tag và định dạng chính xác như sau:
        [GENERATED_LOCATION: name="Tên Địa Điểm", description="Mô tả địa điểm", isSafeZone=false, regionId="Tên Vùng (nếu có)"]
        Ví dụ: [GENERATED_LOCATION: name="Thôn Tân Thủ", description="Một ngôi làng nhỏ yên bình, nơi bắt đầu cuộc hành trình.", isSafeZone=true, regionId="Đồng Bằng Trung Tâm"]

**QUAN TRỌNG:**
- Chỉ sử dụng các tag ĐÚNG ĐỊNH DẠNG đã cho ở trên. Mỗi tag trên một dòng riêng.
- Giá trị của các thuộc tính trong tag (name, description, text, ...) phải được đặt trong dấu ngoặc kép. Ví dụ: name="Tên Kỹ Năng", text="Mô tả chi tiết".
- Cung cấp thông tin bằng tiếng Việt.
- Hãy sáng tạo và đảm bảo các yếu tố này phù hợp với mô tả ý tưởng.
- Không thêm bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài các tag được yêu cầu. Đảm bảo phản hồi chỉ chứa các tag.
`,
  generateFanfictionWorldDetails: (sourceMaterial: string, isSourceContent: boolean, playerInputDescription?: string, isNsfwIdea?: boolean): string => `
Bạn là một chuyên gia sáng tạo thế giới cho game nhập vai đồng nhân / fanfiction bằng tiếng Việt.
Nhiệm vụ của bạn là tạo ra các yếu tố khởi đầu cho một thế giới game đồng nhân dựa trên thông tin được cung cấp.

**NGUỒN CẢM HỨNG ĐỒNG NHÂN:**
${isSourceContent
      ? `Nội dung truyện gốc (một phần hoặc toàn bộ) được cung cấp bởi người dùng:\n"""\n${sourceMaterial}\n"""`
      : `Tên truyện gốc được cung cấp bởi người dùng: "${sourceMaterial}"`}

${playerInputDescription
      ? `**Mô tả/Ý tưởng thêm từ người chơi về đồng nhân:**\n"${playerInputDescription}"`
      : ""}

**CHẾ ĐỘ NỘI DUNG CHO VIỆC TẠO YẾU TỐ ĐỒNG NHÂN:**
- Yêu cầu nội dung 18+ (dâm dục, bạo lực): ${isNsfwIdea ? "BẬT" : "TẮT"}
${isNsfwIdea
  ? "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được BẬT cho việc tạo các yếu tố đồng nhân. Hãy chủ động, ưu tiên và tích cực tạo ra các tên gọi, mô tả, tính cách, chi tiết NPC, kỹ năng, vật phẩm, tri thức thế giới và tóm tắt cốt truyện nguyên tác mang tính chất người lớn, nhạy cảm, dâm dục và bạo lực một cách chi tiết và rõ ràng. Hãy mạnh dạn đưa ra những gợi ý 18+ cho các yếu tố này. Ưu tiên cho yếu tố tình dục hơn so với bạo lực."
  : "LƯU Ý QUAN TRỌNG: Yêu cầu nội dung 18+ đã được TẮT. Vui lòng tạo các yếu tố phù hợp với mọi lứa tuổi. Tránh các chủ đề nhạy cảm, bạo lực quá mức hoặc tình dục khi tạo các yếu tố này."
}

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
    *   **Tóm Tắt Cốt Truyện Nguyên Tác (QUAN TRỌNG):** Dựa trên Nguồn Cảm Hứng Đồng Nhân, hãy **tóm tắt cốt truyện của truyện gốc (nguyên tác)**, dài khoảng 1000-1500 từ. Phần tóm tắt này nên được chia thành các giai đoạn hoặc các chương chính, mô tả các sự kiện quan trọng, xung đột và hướng phát triển của các nhân vật chính trong nguyên tác. Sử dụng tag: \`[GENERATED_ORIGINAL_STORY_SUMMARY: text="Giai đoạn 1 của nguyên tác: Mô tả chi tiết giai đoạn 1 của nguyên tác...\n\nGiai đoạn 2 của nguyên tác: Mô tả chi tiết giai đoạn 2 của nguyên tác...\n\n... (Tiếp tục cho đến khi đủ 1000-1500 từ và bao quát cốt truyện nguyên tác)"]\`
    *   **Yếu Tố Khởi Đầu Khác (Đồng Nhân):**
        *   **Kỹ Năng Khởi Đầu (2-3 kỹ năng):** Phù hợp với nhân vật và thế giới đồng nhân.
            [GENERATED_SKILL: name="Tên Kỹ Năng", description="Mô tả ngắn gọn và hiệu ứng cơ bản"]
        *   **Vật Phẩm Khởi Đầu (2-3 vật phẩm):** Phù hợp với nhân vật và thế giới đồng nhân.
            [GENERATED_ITEM: name="Tên Vật Phẩm", description="Mô tả", quantity=1, type="Loại vật phẩm"]
            LƯU Ý: quantity phải là số nguyên. type có thể là: ${Object.values(GameTemplates.ItemCategory).join(', ')}, hoặc cụ thể hơn như ${Object.values(GameTemplates.EquipmentType).join(', ')}, ${Object.values(GameTemplates.PotionType).join(', ')}.
        *   **NPC Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ NPC quan trọng nào (từ truyện gốc hoặc NPC mới) mà bạn thấy phù hợp để làm phong phú câu chuyện đồng nhân. Hãy ưu tiên cung cấp thật nhiều NPC là nhân vật gốc truyện (Tầm 10 NPC trở lên). Cung cấp thông tin chi tiết cho mỗi NPC.
            [GENERATED_NPC: name="Tên NPC", personality="Tính cách", initialAffinity="-100"->"100", details="Vai trò, tiểu sử, mối liên hệ với nhân vật chính đồng nhân"]
        *   **Tri Thức Thế Giới Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra BẤT KỲ khái niệm, lịch sử, địa danh, hoặc quy tắc nào (từ truyện gốc hoặc mới) để làm rõ bối cảnh đồng nhân (Tầm 10 Tri Thức Thế Giới Khởi Đầu trở lên).
            [GENERATED_LORE: title="Tiêu đề Tri Thức", content="Nội dung chi tiết"]
        *   **Địa Điểm Khởi Đầu (KHÔNG GIỚI HẠN SỐ LƯỢNG):** Tạo ra các Địa Điểm Khởi Đầu (từ truyện gốc hoặc mới) phù hợp với bối cảnh đồng nhân.
            [GENERATED_LOCATION: name="Tên Địa Điểm", description="Mô tả địa điểm", isSafeZone=false, regionId="Tên Vùng (nếu có)"]
2.  **Nếu truyện gốc là truyện 18+ thì các yếu tố được tạo ra sẽ ưu tiên mang hướng 18+ nhiều hơn, bao gồm cả tóm tắt cốt truyện nguyên tác. Nếu tùy chọn "Yêu cầu nội dung 18+" ở trên được BẬT, hãy áp dụng mức độ 18+ cao hơn nữa.**

**QUAN TRỌNG:**
- **Tóm Tắt Cốt Truyện Nguyên Tác phải chi tiết và có cấu trúc giai đoạn rõ ràng.**
- **Không giới hạn số lượng NPC, Tri Thức Thế Giới (Lore) và Địa Điểm Khởi Đầu được tạo ra.** Hãy sáng tạo thật nhiều để làm giàu thế giới đồng nhân!
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
      .filter(msg => msg.type === 'narration' || msg.type === 'player_action' || (msg.type === 'system' && !msg.content.toLowerCase().includes("lên cấp") && !msg.content.toLowerCase().includes("cảnh giới") && !msg.content.toLowerCase().includes("tóm tắt trang") && !msg.content.toLowerCase().includes(VIETNAMESE.summarizingAndPreparingNextPage.toLowerCase()) && !msg.content.toLowerCase().includes(VIETNAMESE.creatingMissingSummary.toLowerCase())))
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