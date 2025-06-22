
import { KnowledgeBase, PlayerStats, GameMessage, RealmBaseStatDefinition, TurnHistoryEntry, Quest, Item, Skill, NPC, GameLocation, Faction, WorldLoreEntry, Companion } from '../types';
import { DEFAULT_PLAYER_STATS, SUB_REALM_NAMES, DEFAULT_TIERED_STATS, TURNS_PER_PAGE, MAX_TURN_HISTORY_LENGTH, VIETNAMESE, APP_VERSION } from '../constants';
import * as GameTemplates from '../templates';

export const calculateStatsForRealm = (
    realmString: string,
    mainRealmList: string[],
    currentRealmBaseStatsMap: Record<string, RealmBaseStatDefinition>
): Partial<PlayerStats> => {
    let mainRealmName = "";
    let subRealmName = "";

    const sortedMainRealmList = [...mainRealmList].sort((a,b) => b.length - a.length);

    for (const potentialMainRealm of sortedMainRealmList) {
        if (realmString.startsWith(potentialMainRealm)) {
            const remainingPart = realmString.substring(potentialMainRealm.length).trim();
            if (SUB_REALM_NAMES.includes(remainingPart)) {
                mainRealmName = potentialMainRealm;
                subRealmName = remainingPart;
                break;
            }
        }
    }
    
    const fallbackTierDefinition = DEFAULT_TIERED_STATS[0] || { hpBase: 10, hpInc: 1, mpBase: 10, mpInc: 1, atkBase: 1, atkInc: 0, expBase: 10, expInc: 1 };

    if (!mainRealmName || !subRealmName) {
        console.warn(`Invalid realm components in "${realmString}". Main: "${mainRealmName}", Sub: "${subRealmName}". Using default stats for first tier.`);
        return {
            maxKinhNghiem: fallbackTierDefinition.expBase,
            maxSinhLuc: fallbackTierDefinition.hpBase,
            maxLinhLuc: fallbackTierDefinition.mpBase,
            sucTanCong: fallbackTierDefinition.atkBase,
        };
    }
    
    const subRealmIndex = SUB_REALM_NAMES.indexOf(subRealmName);
    
    let tierDefinition = currentRealmBaseStatsMap[mainRealmName];
    if (!tierDefinition) {
      const mainRealmIndexInList = mainRealmList.findIndex(r => r.trim() === mainRealmName.trim());
      if (mainRealmIndexInList !== -1 && mainRealmIndexInList < DEFAULT_TIERED_STATS.length) {
          tierDefinition = DEFAULT_TIERED_STATS[mainRealmIndexInList];
          console.warn(`Stats for main realm "${mainRealmName}" not found in currentRealmBaseStatsMap. Using fallback from DEFAULT_TIERED_STATS index ${mainRealmIndexInList}.`);
      } else {
          tierDefinition = fallbackTierDefinition;
          console.warn(`Stats for main realm "${mainRealmName}" not found. Using absolute default (tier 0).`);
      }
    }
    
    const calculatedMaxSinhLuc = tierDefinition.hpBase + (subRealmIndex * tierDefinition.hpInc);
    const calculatedMaxLinhLuc = tierDefinition.mpBase + (subRealmIndex * tierDefinition.mpInc);
    const calculatedSucTanCong = tierDefinition.atkBase + (subRealmIndex * tierDefinition.atkInc);
    const calculatedMaxKinhNghiem = tierDefinition.expBase + (subRealmIndex * tierDefinition.expInc);
    
    return {
        maxKinhNghiem: Math.max(10, calculatedMaxKinhNghiem),
        maxSinhLuc: Math.max(10, calculatedMaxSinhLuc),
        maxLinhLuc: Math.max(10, calculatedMaxLinhLuc),
        sucTanCong: Math.max(1, calculatedSucTanCong),
    };
};

export const parseTagValue = (tagValue: string): Record<string, string> => {
    const result: Record<string, string> = {};
    const paramRegex = /(\w+(?:\.\w+)*)\s*=\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|((?:\{.*?\}|\[.*?\]|[^,]*?)(?=\s*,\s*\w+\s*=|$)))/g;
    let match;
    while ((match = paramRegex.exec(tagValue)) !== null) {
      const key = match[1].trim();
      let value = match[2] !== undefined ? match[2] : 
                  match[3] !== undefined ? match[3] : 
                  match[4] !== undefined ? match[4].trim() : ''; 

      if (match[2] !== undefined) {
        value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
      } else if (match[3] !== undefined) {
        value = value.replace(/\\"/g, '"').replace(/\\'/g, "'");
      }
      result[key] = value;
    }
    return result;
};

export const performTagProcessing = (
    currentKb: KnowledgeBase, 
    tagBatch: string[], 
    turnForSystemMessages: number
): {
    newKb: KnowledgeBase;
    turnIncrementedByTag: boolean;
    systemMessagesFromTags: GameMessage[];
    realmChangedByTag: boolean;
    appliedBinhCanhViaTag: boolean; // This will now be false, client handles application
    removedBinhCanhViaTag: boolean;
} => {
    const newKb: KnowledgeBase = JSON.parse(JSON.stringify(currentKb));
    if (!newKb.discoveredFactions) newKb.discoveredFactions = [];
    if (!newKb.worldLore) newKb.worldLore = []; 
    if (!newKb.allQuests) newKb.allQuests = []; 
    if (!newKb.discoveredLocations) newKb.discoveredLocations = []; 

    let turnIncrementedByTag = false;
    const systemMessagesFromTags: GameMessage[] = [];
    let realmChangedByTag = false;
    const oldRealm = newKb.playerStats.realm;
    let appliedBinhCanhViaTag = false; // Will remain false as client handles this
    let removedBinhCanhViaTag = false;

    tagBatch.forEach(tag => {
        const match = tag.match(/\[(.*?)(?::\s*(.*))?\]$/s);
        if (!match || !match[1]) {
             console.warn("Could not parse tag (no tag name):", tag);
             return;
        }
        const tagName = match[1].trim().toUpperCase();
        const tagParameterString = match[2] ? match[2].trim() : '';

        let tagParams: Record<string, string> = {};
        if (tagParameterString) {
            if (tagName === 'MESSAGE' && !tagParameterString.includes('=')) {
                tagParams = { message: tagParameterString.replace(/^"|"$/g, '') };
            } else {
                tagParams = parseTagValue(tagParameterString);
            }
        }
        
        try {
            switch (tagName) {
            case 'PLAYER_STATS_INIT': {
                const statsUpdates: Partial<PlayerStats> = {};
                Object.keys(tagParams).forEach(rawKey => {
                    const key = rawKey.trim() as keyof PlayerStats;
                    const valueStr = tagParams[rawKey].trim();
                    if (key === 'isInCombat' || key === 'hieuUngBinhCanh') {
                        (statsUpdates as any)[key] = valueStr.toLowerCase() === 'true';
                    } else if (key === 'realm') {
                        statsUpdates.realm = valueStr;
                        if (valueStr !== oldRealm) realmChangedByTag = true;
                    } else if (typeof (DEFAULT_PLAYER_STATS as any)[key] === 'number' || !isNaN(parseInt(valueStr,10))) {
                         (statsUpdates as any)[key] = parseInt(valueStr, 10);
                    } else {
                         (statsUpdates as any)[key] = valueStr;
                    }
                });
                newKb.playerStats = { ...DEFAULT_PLAYER_STATS, ...statsUpdates };
                if(statsUpdates.realm) {
                    const calculatedInitialStats = calculateStatsForRealm(statsUpdates.realm, newKb.realmProgressionList, newKb.currentRealmBaseStats);
                    newKb.playerStats = { ...newKb.playerStats, ...calculatedInitialStats };
                    newKb.playerStats.sinhLuc = Math.min(statsUpdates.sinhLuc ?? newKb.playerStats.maxSinhLuc, newKb.playerStats.maxSinhLuc);
                    newKb.playerStats.linhLuc = Math.min(statsUpdates.linhLuc ?? newKb.playerStats.maxLinhLuc, newKb.playerStats.maxLinhLuc);
                    newKb.playerStats.kinhNghiem = statsUpdates.kinhNghiem ?? 0;
                }
                if (statsUpdates.turn && statsUpdates.turn > newKb.playerStats.turn) {
                   turnIncrementedByTag = true;
                }
                 if (tagName === 'PLAYER_STATS_INIT' && newKb.playerStats.turn) {
                   if (newKb.currentPageHistory?.length === 1 && newKb.currentPageHistory[0] > newKb.playerStats.turn) {
                       newKb.currentPageHistory = [newKb.playerStats.turn];
                   } else if (!newKb.currentPageHistory || newKb.currentPageHistory.length === 0) {
                       newKb.currentPageHistory = [newKb.playerStats.turn];
                   }
                }
                break;
            }
            case 'STATS_UPDATE': {
                const statsBeforeThisTag = { ...newKb.playerStats }; 
                const statsUpdates: Partial<PlayerStats> = {};
                const oldTurnForThisTagProcessing = newKb.playerStats.turn;

                Object.keys(tagParams).forEach(rawKey => {
                    const key = rawKey.trim() as keyof PlayerStats;
                    const valueStr = tagParams[rawKey].trim();
                    const existingStatValue = (newKb.playerStats as any)[key];

                    if (key === 'sinhLuc' && valueStr.toUpperCase() === 'MAX') {
                        statsUpdates.sinhLuc = newKb.playerStats.maxSinhLuc;
                    } else if (key === 'linhLuc' && valueStr.toUpperCase() === 'MAX') {
                        statsUpdates.linhLuc = newKb.playerStats.maxLinhLuc;
                    } else if (key === 'isInCombat' || key === 'hieuUngBinhCanh') {
                       (statsUpdates as any)[key] = valueStr.toLowerCase() === 'true';
                       // appliedBinhCanhViaTag is intentionally not set here, client handles application
                       if (key === 'hieuUngBinhCanh' && !statsUpdates.hieuUngBinhCanh) removedBinhCanhViaTag = true;
                    } else if (key === 'turn') {
                        if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                            (statsUpdates as any)[key] = oldTurnForThisTagProcessing + parseInt(valueStr, 10);
                        } else {
                            (statsUpdates as any)[key] = parseInt(valueStr, 10);
                        }
                        if (statsUpdates.turn! > oldTurnForThisTagProcessing) {
                           turnIncrementedByTag = true;
                        }
                    } else if (key === 'realm') {
                         statsUpdates.realm = valueStr;
                         if (valueStr !== oldRealm) realmChangedByTag = true;
                    } else if (key === 'kinhNghiem' && valueStr.endsWith('%')) {
                        const percentage = parseFloat(valueStr.slice(0, -1));
                        if (!isNaN(percentage)) {
                            const expGain = Math.floor(newKb.playerStats.maxKinhNghiem * (percentage / 100));
                            statsUpdates.kinhNghiem = newKb.playerStats.kinhNghiem + expGain;
                        }
                    } else if (typeof existingStatValue === 'number' ||
                               (key in DEFAULT_PLAYER_STATS && typeof (DEFAULT_PLAYER_STATS as any)[key] === 'number' && !isNaN(parseInt(valueStr,10))) ) {
                        const baseValue = (typeof existingStatValue === 'number') ? existingStatValue : (newKb.playerStats as any)[key] || 0;
                        if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                            (statsUpdates as any)[key] = baseValue + parseInt(valueStr, 10);
                        } else {
                            (statsUpdates as any)[key] = parseInt(valueStr, 10);
                        }
                    } else if (typeof existingStatValue === 'string' || (key in DEFAULT_PLAYER_STATS && typeof (DEFAULT_PLAYER_STATS as any)[key] === 'string') ) {
                        (statsUpdates as any)[key] = valueStr;
                    } else { 
                       if (!isNaN(parseInt(valueStr, 10)) && (valueStr.match(/^-?\d+$/) || valueStr.match(/^[+-]\d+$/)) ) {
                            const baseValue = (typeof (newKb.playerStats as any)[key] === 'number') ? (newKb.playerStats as any)[key] : 0;
                            if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                               (statsUpdates as any)[key] = baseValue + parseInt(valueStr, 10);
                            } else {
                               (statsUpdates as any)[key] = parseInt(valueStr, 10);
                            }
                       } else if (valueStr.toLowerCase() === 'true' || valueStr.toLowerCase() === 'false') {
                           (statsUpdates as any)[key] = valueStr.toLowerCase() === 'true';
                       } else {
                           (statsUpdates as any)[key] = valueStr;
                       }
                    }
                });
                newKb.playerStats = { ...newKb.playerStats, ...statsUpdates };
                const statsAfterThisTag = newKb.playerStats;

                if ( (tagParams.sinhLuc || (tagParams.sinhLuc?.toUpperCase() === 'MAX')) && statsAfterThisTag.sinhLuc !== statsBeforeThisTag.sinhLuc) {
                    const change = statsAfterThisTag.sinhLuc - statsBeforeThisTag.sinhLuc;
                    systemMessagesFromTags.push({
                        id: 'stat-change-sinhLuc-' + Date.now(), type: 'system',
                        content: `Sinh lực thay đổi: ${statsBeforeThisTag.sinhLuc} -> ${statsAfterThisTag.sinhLuc} (${change > 0 ? '+' : ''}${change}).`,
                        timestamp: Date.now(), turnNumber: turnForSystemMessages
                    });
                }
                if ( (tagParams.linhLuc || (tagParams.linhLuc?.toUpperCase() === 'MAX')) && statsAfterThisTag.linhLuc !== statsBeforeThisTag.linhLuc) {
                    const change = statsAfterThisTag.linhLuc - statsBeforeThisTag.linhLuc;
                    systemMessagesFromTags.push({
                        id: 'stat-change-linhLuc-' + Date.now(), type: 'system',
                        content: `Linh lực thay đổi: ${statsBeforeThisTag.linhLuc} -> ${statsAfterThisTag.linhLuc} (${change > 0 ? '+' : ''}${change}).`,
                        timestamp: Date.now(), turnNumber: turnForSystemMessages
                    });
                }
                if (tagParams.kinhNghiem && statsAfterThisTag.kinhNghiem !== statsBeforeThisTag.kinhNghiem) {
                    const change = statsAfterThisTag.kinhNghiem - statsBeforeThisTag.kinhNghiem;
                    let changeDescription = `${change > 0 ? '+' : ''}${change}`;
                    if (tagParams.kinhNghiem.endsWith('%')) {
                        changeDescription += ` (từ ${tagParams.kinhNghiem})`;
                    }
                    systemMessagesFromTags.push({
                        id: 'stat-change-kinhNghiem-' + Date.now(), type: 'system',
                        content: `Kinh nghiệm thay đổi: ${statsBeforeThisTag.kinhNghiem} -> ${statsAfterThisTag.kinhNghiem} (${changeDescription}).`,
                        timestamp: Date.now(), turnNumber: turnForSystemMessages
                    });
                }
                break;
            }
            case 'ITEM_ACQUIRED':
                if (tagParams.name && tagParams.description) {
                    let quantity = parseInt(tagParams.quantity || "1", 10);
                    if (isNaN(quantity) || quantity < 1) quantity = 1;

                    const existingItemIndex = newKb.inventory.findIndex(i => i.name === tagParams.name);
                    if (existingItemIndex > -1) {
                        newKb.inventory[existingItemIndex].quantity += quantity;
                    } else {
                        const newItemId = Date.now().toString() + tagParams.name.replace(/\s/g, '');
                        const aiType = tagParams.type?.toLowerCase() || "";
                        let itemCategory: GameTemplates.ItemCategoryValues = GameTemplates.ItemCategory.MISCELLANEOUS;
                        let equipmentType: GameTemplates.EquipmentTypeValues | undefined;
                        let potionType: GameTemplates.PotionTypeValues | undefined;
                        let materialType: GameTemplates.MaterialTypeValues | undefined;
                        let slot: string | undefined;

                        if (aiType.includes("vũ khí") || aiType.includes("kiếm") || aiType.includes("trượng") || aiType.includes("cung") || aiType.includes("đao") || aiType.includes("thương")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.VU_KHI; slot = "Vũ Khí Chính";
                        } else if (aiType.includes("giáp đầu") || aiType.includes("nón")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_DAU; slot = "Đầu";
                        } else if (aiType.includes("giáp thân") || aiType.includes("áo") || aiType.includes("y phục")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_THAN; slot = "Thân";
                        } else if (aiType.includes("giáp tay") || aiType.includes("găng")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_TAY; slot = "Tay";
                        } else if (aiType.includes("giáp chân") || aiType.includes("giày") || aiType.includes("ủng")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.GIAP_CHAN; slot = "Chân";
                        } else if (aiType.includes("trang sức") || aiType.includes("nhẫn") || aiType.includes("dây chuyền") || aiType.includes("ngọc bội")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.TRANG_SUC; slot = "Trang Sức";
                        } else if (aiType.includes("pháp bảo")) {
                            itemCategory = GameTemplates.ItemCategory.EQUIPMENT; equipmentType = GameTemplates.EquipmentType.PHAP_BAO; slot = "Pháp Bảo";
                        } else if (aiType.includes("đan") || aiType.includes("thuốc") || aiType.includes("linh dược")) {
                            itemCategory = GameTemplates.ItemCategory.POTION;
                            if (aiType.includes("hồi phục") || aiType.includes("trị thương")) potionType = GameTemplates.PotionType.HOI_PHUC;
                            else if (aiType.includes("tăng cường") || aiType.includes("buff")) potionType = GameTemplates.PotionType.TANG_CUONG;
                            else if (aiType.includes("giải độc")) potionType = GameTemplates.PotionType.GIAI_DOC;
                            else potionType = GameTemplates.PotionType.DAC_BIET;
                        } else if (aiType.includes("linh thảo")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.LINH_THAO;
                        } else if (aiType.includes("khoáng thạch")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.KHOANG_THACH;
                        } else if (aiType.includes("yêu đan")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.YEU_DAN;
                        } else if (aiType.includes("da") || aiType.includes("xương")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.DA_XUONG_YEU_THU;
                        } else if (aiType.includes("linh hồn")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.LINH_HON;
                        } else if (aiType.includes("nguyên liệu")) {
                            itemCategory = GameTemplates.ItemCategory.MATERIAL; materialType = GameTemplates.MaterialType.VAT_LIEU_CHE_TAO_CHUNG;
                        } else if (aiType.includes("nhiệm vụ")) {
                            itemCategory = GameTemplates.ItemCategory.QUEST_ITEM;
                        }
                        
                        const rarity = (tagParams.rarity as GameTemplates.EquipmentRarity) || "Phổ Thông";
                        const value = parseInt(tagParams.value || "0", 10);

                        let newItem: GameTemplates.InventoryItem;
                        const baseItemData = { id: newItemId, name: tagParams.name, description: tagParams.description, rarity, value, quantity, stackable: true };

                        if (itemCategory === GameTemplates.ItemCategory.EQUIPMENT && equipmentType) {
                            let parsedStatBonuses: Partial<PlayerStats> = {};
                            if (tagParams.statBonuses) {
                                try {
                                    const bonuses = JSON.parse(tagParams.statBonuses);
                                    if (typeof bonuses === 'object' && bonuses !== null) {
                                        Object.keys(bonuses).forEach(key => {
                                            if (typeof bonuses[key] === 'number') {
                                                (parsedStatBonuses as any)[key as keyof PlayerStats] = bonuses[key];
                                            }
                                        });
                                    }
                                } catch (e) {
                                    console.warn("Could not parse statBonuses JSON from tag:", tagParams.statBonuses, e);
                                }
                            }
                            
                            const equipData: Omit<GameTemplates.EquipmentTemplate, 'id' | 'name' | 'description' | 'rarity' | 'value' | 'quantity' | 'stackable' | 'category'> = {
                                equipmentType,
                                slot: slot,
                                statBonuses: parsedStatBonuses,
                                uniqueEffects: [],
                                usable: tagParams.usable?.toLowerCase() === 'true',
                                consumable: tagParams.consumable?.toLowerCase() === 'true',
                            };
                            newItem = {
                                ...baseItemData,
                                category: GameTemplates.ItemCategory.EQUIPMENT,
                                ...equipData
                            };
                            if (Object.keys((newItem as GameTemplates.EquipmentTemplate).statBonuses).length === 0) {
                                const statsMatch = tagParams.description.match(/tăng ([\w\s]+?) ([+-]?\d+)/gi);
                                if (statsMatch) {
                                    statsMatch.forEach(m => {
                                        const parts = m.match(/tăng ([\w\s]+?) ([+-]?\d+)/i);
                                        if (parts && parts[1] && parts[2]) {
                                            const statName = parts[1].trim().toLowerCase();
                                            const statValue = parseInt(parts[2], 10);
                                            if (statName === "công" || statName === "tấn công") (newItem as GameTemplates.EquipmentTemplate).statBonuses.sucTanCong = (((newItem as GameTemplates.EquipmentTemplate).statBonuses.sucTanCong || 0) as number) + statValue;
                                            else if (statName === "hp" || statName === "sinh lực") (newItem as GameTemplates.EquipmentTemplate).statBonuses.sinhLuc = (((newItem as GameTemplates.EquipmentTemplate).statBonuses.sinhLuc || 0) as number) + statValue;
                                            else if (statName === "mana" || statName === "linh lực") (newItem as GameTemplates.EquipmentTemplate).statBonuses.linhLuc = (((newItem as GameTemplates.EquipmentTemplate).statBonuses.linhLuc || 0) as number) + statValue;
                                        }
                                    });
                                }
                            }
                        } else if (itemCategory === GameTemplates.ItemCategory.POTION && potionType) {
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.POTION, potionType, effects: [tagParams.description], isConsumedOnUse: true, usable: true, consumable: true };
                        } else if (itemCategory === GameTemplates.ItemCategory.MATERIAL && materialType) {
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.MATERIAL, materialType, usable: false, consumable: false };
                        } else if (itemCategory === GameTemplates.ItemCategory.QUEST_ITEM) {
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.QUEST_ITEM, questIdAssociated: "unknown", usable: false, consumable: false };
                        } else {
                            newItem = { ...baseItemData, category: GameTemplates.ItemCategory.MISCELLANEOUS, usable: tagParams.usable?.toLowerCase() === 'true', consumable: tagParams.consumable?.toLowerCase() === 'true' };
                        }
                        newKb.inventory.push(newItem);
                    }
                } else { console.warn("ITEM_ACQUIRED tag missing params", tagParams); }
                break;
            case 'ITEM_CONSUMED':
                if (tagParams.name) {
                    const itemIndex = newKb.inventory.findIndex(i => i.name === tagParams.name);
                    if (itemIndex > -1) {
                        const quantityToConsume = parseInt(tagParams.quantity || "1", 10);
                         if (isNaN(quantityToConsume) || quantityToConsume < 1) break;
                        newKb.inventory[itemIndex].quantity -= quantityToConsume;
                        if (newKb.inventory[itemIndex].quantity <= 0) newKb.inventory.splice(itemIndex, 1);
                    }
                }
                break;
            case 'SKILL_LEARNED':
                if (tagParams.name && tagParams.description && tagParams.effect) {
                    if (!newKb.playerSkills.find(s => s.name === tagParams.name)) {
                        const skillTypeStr = tagParams.type?.trim() || "";
                        let skillType: GameTemplates.SkillTypeValues = GameTemplates.SkillType.KHAC;
                        
                        if (skillTypeStr.includes("Tấn Công")) skillType = GameTemplates.SkillType.CHUDONG_TANCONG;
                        else if (skillTypeStr.includes("Phòng Ngự")) skillType = GameTemplates.SkillType.CHUDONG_PHONGNGU;
                        else if (skillTypeStr.includes("Hỗ Trợ")) skillType = GameTemplates.SkillType.CHUDONG_HOTRO;
                        else if (skillTypeStr.includes("Bị Động")) skillType = GameTemplates.SkillType.BIDONG;
                        else if (skillTypeStr.includes("Công Pháp")) skillType = GameTemplates.SkillType.TULUYEN_CONGPHAP;
                        else if (skillTypeStr.includes("Thân Pháp")) skillType = GameTemplates.SkillType.THANPHAP;
                        
                        const newSkill: GameTemplates.SkillTemplate = {
                            id: Date.now().toString() + tagParams.name.replace(/\s/g, ''),
                            name: tagParams.name,
                            description: tagParams.description,
                            skillType: skillType,
                            detailedEffect: tagParams.effect,
                            manaCost: parseInt(tagParams.manaCost || "0", 10),
                            baseDamage: parseInt(tagParams.baseDamage || "0", 10),
                            healingAmount: parseInt(tagParams.healingAmount || "0", 10),
                            cooldown: parseInt(tagParams.cooldown || "0", 10),
                            currentCooldown: 0,
                            damageMultiplier: 0,
                        };
                        newKb.playerSkills.push(newSkill);
                    }
                } else { console.warn("SKILL_LEARNED missing params", tagParams); }
                break;
            case 'REALM_LIST': 
                 if (tagParams.text) {
                    newKb.realmProgressionList = tagParams.text.split(' - ').map(s => s.trim().replace(/^"|"$/g, ''));
                    const newBaseStats: Record<string, RealmBaseStatDefinition> = {};
                    newKb.realmProgressionList.forEach((realmName, index) => {
                        newBaseStats[realmName] = DEFAULT_TIERED_STATS[Math.min(index, DEFAULT_TIERED_STATS.length - 1)];
                    });
                    newKb.currentRealmBaseStats = newBaseStats;
                    realmChangedByTag = true; 
                 } else {
                    console.warn("REALM_LIST tag missing text parameter", tagParams);
                 }
                break;
            case 'APPLY_BINH_CANH_EFFECT':
                // This tag is now ignored. Client handles applying bottleneck.
                // appliedBinhCanhViaTag = true; // No longer set
                // systemMessagesFromTags.push({
                //     id: 'binh-canh-applied-' + Date.now(), type: 'system',
                //     content: VIETNAMESE.bottleneckNotification,
                //     timestamp: Date.now(), turnNumber: turnForSystemMessages
                // });
                break;
            case 'REMOVE_BINH_CANH_EFFECT':
                newKb.playerStats.hieuUngBinhCanh = false;
                removedBinhCanhViaTag = true;
                const kinhNghiemGain = parseInt(tagParams.kinhNghiemGain || "1", 10);
                if (!isNaN(kinhNghiemGain) && kinhNghiemGain > 0) {
                    newKb.playerStats.kinhNghiem += kinhNghiemGain; // Add EXP first
                    systemMessagesFromTags.push({
                        id: 'binh-canh-exp-gain-' + Date.now(), type: 'system',
                        content: `Đột phá bình cảnh, nhận được ${kinhNghiemGain} điểm kinh nghiệm!`,
                        timestamp: Date.now(), turnNumber: turnForSystemMessages
                    });
                }
                systemMessagesFromTags.push({ // This message might be redundant if level up message is also shown.
                    id: 'binh-canh-removed-' + Date.now(), type: 'system',
                    content: VIETNAMESE.breakthroughSuccessMessage, // "Đột phá thành công!"
                    timestamp: Date.now(), turnNumber: turnForSystemMessages
                });
                break;
            case 'MESSAGE':
                 const messageContent = tagParams.message || (tagParameterString ? tagParameterString.replace(/^"|"$/g, '') : 'Empty message tag');
                 systemMessagesFromTags.push({
                    id: 'tag-message-' + Date.now() + Math.random(),
                    type: 'system',
                    content: messageContent,
                    timestamp: Date.now(),
                    turnNumber: turnForSystemMessages
                 });
                 break;
            case 'LORE_NPC':
                if (tagParams.name) {
                    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === tagParams.name);
                    const npcDesc = tagParams.description;
                    const personalityTraits = tagParams.personality ? tagParams.personality.split(',').map(p => p.trim()) : undefined;
                    const affinity = parseInt(tagParams.affinity || "0", 10);
                    const factionId = tagParams.factionId;
                    const hp = tagParams.hp ? parseInt(tagParams.hp, 10) : undefined;
                    const atk = tagParams.atk ? parseInt(tagParams.atk, 10) : undefined;
                    const title = tagParams.title;
                    
                    if (existingNpcIndex > -1) {
                        const npc = newKb.discoveredNPCs[existingNpcIndex];
                        if (npcDesc !== undefined) npc.description = npcDesc;
                        if (personalityTraits !== undefined) npc.personalityTraits = personalityTraits;
                        if (!isNaN(affinity)) npc.affinity = affinity;
                        if (factionId !== undefined) npc.factionId = factionId;
                        if (hp !== undefined && !isNaN(hp)) npc.hp = hp; 
                        if (atk !== undefined && !isNaN(atk)) npc.atk = atk; 
                        if (title !== undefined) npc.title = title;
                        if (npc.stats) {
                            if (hp !== undefined && !isNaN(hp)) npc.stats.sinhLuc = hp;
                            if (atk !== undefined && !isNaN(atk)) npc.stats.sucTanCong = atk;
                        } else if (hp !== undefined || atk !== undefined) {
                           npc.stats = {}; 
                           if (hp !== undefined && !isNaN(hp)) npc.stats.sinhLuc = hp;
                           if (atk !== undefined && !isNaN(atk)) npc.stats.sucTanCong = atk;
                        }

                    } else { 
                        const newNpc: GameTemplates.NPCTemplate = {
                            id: Date.now().toString() + (tagParams.name || 'npc').replace(/\s/g, ''),
                            name: tagParams.name,
                            description: npcDesc || "Chưa có mô tả cụ thể.",
                            personalityTraits: personalityTraits || [],
                            affinity: !isNaN(affinity) ? Math.max(-100, Math.min(100, affinity)) : 0,
                            factionId: factionId, 
                            title: title, 
                            hp: hp,
                            atk: atk,
                            stats: (hp !== undefined || atk !== undefined) ? { sinhLuc: hp, sucTanCong: atk } : undefined,
                        };
                        newKb.discoveredNPCs.push(newNpc);
                    }
                } else { console.warn("LORE_NPC tag missing name", tagParams); }
                break;
            case 'LORE_LOCATION':
                if (tagParams.name) {
                    const existingLocIndex = newKb.discoveredLocations.findIndex(l => l.name === tagParams.name);
                    const locDesc = tagParams.description;
                    const isSafeZone = tagParams.isSafeZone ? tagParams.isSafeZone.toLowerCase() === 'true' : undefined;
                    const regionId = tagParams.regionId;

                    if (existingLocIndex > -1) {
                        const loc = newKb.discoveredLocations[existingLocIndex];
                        if (locDesc !== undefined) loc.description = locDesc;
                        if (isSafeZone !== undefined) loc.isSafeZone = isSafeZone;
                        if (regionId !== undefined) loc.regionId = regionId;
                    } else {
                        const newLocation: GameTemplates.LocationTemplate = {
                            id: Date.now().toString() + (tagParams.name || 'loc').replace(/\s/g, ''),
                            name: tagParams.name,
                            description: locDesc || "Chưa có mô tả.",
                            isSafeZone: isSafeZone !== undefined ? isSafeZone : false, 
                            regionId: regionId
                        };
                        newKb.discoveredLocations.push(newLocation);
                    }
                } else { console.warn("LORE_LOCATION tag missing name", tagParams); }
                break;
            case 'WORLD_LORE_ADD':
                if (tagParams.title && tagParams.content) {
                    if (!newKb.worldLore.find(l => l.title === tagParams.title)) {
                        newKb.worldLore.push({
                            id: Date.now().toString() + (tagParams.title || 'lore').replace(/\s/g, ''),
                            title: tagParams.title,
                            content: tagParams.content
                        });
                    }
                } else { console.warn("WORLD_LORE_ADD missing params", tagParams); }
                break;
            case 'QUEST_ASSIGNED':
                if (tagParams.title && tagParams.description && tagParams.objectives) {
                    const objectivesArray = tagParams.objectives.split('|').map((objText, index) => ({
                        id: `${tagParams.title?.replace(/\s/g, '') || 'obj'}-${index}-${Date.now()}`,
                        text: objText.trim(),
                        completed: false
                    }));
                    const newQuest: Quest = { // Corrected type
                        id: Date.now().toString() + (tagParams.title?.replace(/\s/g, '') || 'quest'),
                        title: tagParams.title,
                        description: tagParams.description,
                        status: 'active',
                        objectives: objectivesArray
                    };
                    if (!newKb.allQuests.find(q => q.title === newQuest.title)) {
                        newKb.allQuests.push(newQuest);
                        systemMessagesFromTags.push({
                            id: `quest-assigned-${newQuest.id}`, type: 'system',
                            content: `Nhiệm vụ mới: "${newQuest.title}"`,
                            timestamp: Date.now(), turnNumber: turnForSystemMessages
                        });
                    }
                } else { console.warn("QUEST_ASSIGNED missing params", tagParams); }
                break;
            case 'QUEST_UPDATED':
                if (tagParams.title && tagParams.objectiveText) {
                    const quest = newKb.allQuests.find(q => q.title === tagParams.title && q.status === 'active');
                    if (quest) {
                        const objective = quest.objectives.find(obj => obj.text === tagParams.objectiveText);
                        if (objective) {
                            const isCompleted = tagParams.completed?.toLowerCase() === 'true';
                            const oldObjectiveTextForMsg = objective.text; // Store before potential change
                            objective.completed = isCompleted;

                            if (tagParams.newObjectiveText !== undefined && tagParams.newObjectiveText.trim() !== oldObjectiveTextForMsg) {
                                objective.text = tagParams.newObjectiveText.trim();
                                systemMessagesFromTags.push({
                                    id: `quest-obj-text-updated-${objective.id}`, type: 'system',
                                    content: `Nhiệm vụ "${quest.title}": Mục tiêu "${oldObjectiveTextForMsg}" cập nhật thành "${objective.text}".`,
                                    timestamp: Date.now(), turnNumber: turnForSystemMessages
                                });
                            } else if (isCompleted) {
                                systemMessagesFromTags.push({
                                    id: `quest-obj-completed-${objective.id}`, type: 'system',
                                    content: `Nhiệm vụ "${quest.title}": Mục tiêu "${objective.text}" đã hoàn thành.`,
                                    timestamp: Date.now(), turnNumber: turnForSystemMessages
                                });
                            } else { // Objective was marked incomplete or only text changed (already handled)
                                systemMessagesFromTags.push({
                                    id: `quest-obj-status-updated-${objective.id}`, type: 'system',
                                    content: `Nhiệm vụ "${quest.title}": Trạng thái mục tiêu "${objective.text}" đã được cập nhật.`,
                                    timestamp: Date.now(), turnNumber: turnForSystemMessages
                                });
                            }

                            if (isCompleted) {
                                const allObjectivesCompleted = quest.objectives.every(obj => obj.completed);
                                if (allObjectivesCompleted) {
                                    quest.status = 'completed'; // Quest status changes to completed.
                                    // The "Nhiệm vụ hoàn thành:" message will be generated by the QUEST_COMPLETED tag if AI sends it,
                                    // or by this system message if AI *only* updates the last objective.
                                    systemMessagesFromTags.push({
                                        id: 'quest-auto-completed-' + Date.now(), type: 'system',
                                        content: `Tất cả mục tiêu của nhiệm vụ "${quest.title}" đã hoàn thành. Nhiệm vụ hoàn tất!`,
                                        timestamp: Date.now(), turnNumber: turnForSystemMessages
                                    });
                                }
                            } else if (quest.status === 'completed') { 
                                quest.status = 'active'; // If an objective becomes incomplete, quest is active again
                            }
                        } else {
                             console.warn(`QUEST_UPDATED: Objective text "${tagParams.objectiveText}" not found in quest "${tagParams.title}".`);
                             systemMessagesFromTags.push({
                                id: 'quest-update-error-objnf-' + Date.now(), type: 'error',
                                content: `Lỗi cập nhật nhiệm vụ: Mục tiêu "${tagParams.objectiveText}" không tìm thấy trong nhiệm vụ "${tagParams.title}".`,
                                timestamp: Date.now(), turnNumber: turnForSystemMessages
                             });
                        }
                    } else {
                        console.warn(`QUEST_UPDATED: Active quest with title "${tagParams.title}" not found.`);
                        systemMessagesFromTags.push({
                            id: 'quest-update-error-qnf-' + Date.now(), type: 'error',
                            content: `Lỗi cập nhật nhiệm vụ: Nhiệm vụ đang hoạt động "${tagParams.title}" không tìm thấy.`,
                            timestamp: Date.now(), turnNumber: turnForSystemMessages
                         });
                    }
                } else { 
                    console.warn("QUEST_UPDATED missing params", tagParams); 
                    systemMessagesFromTags.push({
                        id: 'quest-update-error-params-' + Date.now(), type: 'error',
                        content: `Lỗi cập nhật nhiệm vụ: Thiếu tham số title hoặc objectiveText. Tag: ${tag}`,
                        timestamp: Date.now(), turnNumber: turnForSystemMessages
                     });
                }
                break;
            case 'QUEST_COMPLETED':
                if (tagParams.title) {
                    const quest = newKb.allQuests.find(q => q.title === tagParams.title);
                    if (quest) {
                        quest.status = 'completed';
                        quest.objectives.forEach(obj => obj.completed = true);
                        systemMessagesFromTags.push({
                            id: `quest-completed-${quest.id}`, type: 'system',
                            content: `Nhiệm vụ hoàn thành: "${quest.title}"`,
                            timestamp: Date.now(), turnNumber: turnForSystemMessages
                        });
                    } else {
                         console.warn(`QUEST_COMPLETED: Quest with title "${tagParams.title}" not found.`);
                    }
                } else { console.warn("QUEST_COMPLETED missing title", tagParams); }
                break;
            case 'QUEST_FAILED':
                if (tagParams.title) {
                    const quest = newKb.allQuests.find(q => q.title === tagParams.title);
                    if (quest) {
                        quest.status = 'failed';
                         systemMessagesFromTags.push({
                            id: `quest-failed-${quest.id}`, type: 'system',
                            content: `Nhiệm vụ thất bại: "${quest.title}"`,
                            timestamp: Date.now(), turnNumber: turnForSystemMessages
                        });
                    }  else {
                         console.warn(`QUEST_FAILED: Quest with title "${tagParams.title}" not found.`);
                    }
                } else { console.warn("QUEST_FAILED missing title", tagParams); }
                break;
            default:
              break;
            }
        } catch (e) {
            console.error(`Error processing tag: ${tag} (Name: ${tagName}, Params: ${JSON.stringify(tagParams)})`, e);
        }
    });

    return { newKb, turnIncrementedByTag, systemMessagesFromTags, realmChangedByTag, appliedBinhCanhViaTag, removedBinhCanhViaTag };
};

export const getMessagesForPage = (
    pageNumber: number, 
    kb: KnowledgeBase | null, 
    allMessages: GameMessage[]
): GameMessage[] => {
    if (!kb || !kb.currentPageHistory || pageNumber < 1 || pageNumber > kb.currentPageHistory.length) return [];

    const startTurnOfPage = kb.currentPageHistory[pageNumber - 1];
    
    const endTurnOfPage = (pageNumber === kb.currentPageHistory.length)
                          ? Infinity 
                          : kb.currentPageHistory[pageNumber] - 1; 
    
    return allMessages.filter(msg => msg.turnNumber >= startTurnOfPage && msg.turnNumber <= endTurnOfPage);
};

export const calculateTotalPages = (kb: KnowledgeBase | null): number => {
    if (!kb) return 1;
    return Math.max(1, kb.currentPageHistory?.length || 1);
};

export const addTurnHistoryEntry = (currentKb: KnowledgeBase, gameMessagesBeforePlayerAction: GameMessage[]): KnowledgeBase => {
    const { turnHistory: _excludedTurnHistoryFromSnapshot, ...kbForSnapshot } = currentKb;
    const newTurnHistoryEntry: TurnHistoryEntry = {
        knowledgeBaseSnapshot: kbForSnapshot, 
        gameMessagesSnapshot: gameMessagesBeforePlayerAction 
    };

    let updatedTurnHistory = [...(currentKb.turnHistory || [])];
    if (updatedTurnHistory.length >= MAX_TURN_HISTORY_LENGTH) {
        updatedTurnHistory.shift(); 
    }
    updatedTurnHistory.push(newTurnHistoryEntry);
    
    return { ...currentKb, turnHistory: updatedTurnHistory };
};
