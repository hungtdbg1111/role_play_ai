
import { KnowledgeBase, GameMessage, Skill } from '../../types';
import * as GameTemplates from '../../templates';

export const processSkillLearned = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    
    const rawSkillName = tagParams.name;
    const skillName = rawSkillName ? rawSkillName.trim() : undefined; // Trimmed name

    const skillTypeRaw = tagParams.type;
    const skillDescription = tagParams.description;
    const skillEffect = tagParams.effect;
    const manaCostStr = tagParams.manaCost;
    const baseDamageStr = tagParams.baseDamage;
    const healingAmountStr = tagParams.healingAmount;
    const cooldownStr = tagParams.cooldown;
    const damageMultiplierStr = tagParams.damageMultiplier;
    const levelRequirementStr = tagParams.levelRequirement;
    const xpGainOnUseStr = tagParams.xpGainOnUse;


    if (!skillName || !skillTypeRaw || !skillDescription || !skillEffect) {
         console.warn("SKILL_LEARNED: Missing name, type, description or effect.", tagParams);
         systemMessages.push({
            id: 'skill-learn-error-missingparams-' + Date.now(), type: 'system',
            content: `[DEBUG] Lỗi học kỹ năng: Thiếu tham số bắt buộc cho kỹ năng "${skillName || 'Không tên'}".`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
         return { updatedKb: newKb, systemMessages };
    }
    
    const skillType = (Object.values(GameTemplates.SkillType).includes(skillTypeRaw as GameTemplates.SkillTypeValues) 
                        ? skillTypeRaw 
                        : GameTemplates.SkillType.KHAC) as GameTemplates.SkillTypeValues;
    
    // Robust check: case-insensitive and trimmed name comparison
    const existingSkillByName = newKb.playerSkills.find(s => s.name.trim().toLowerCase() === skillName.toLowerCase());

    if (!existingSkillByName) {
        const newSkillId = `skill-${skillName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        
        const existingSkillById = newKb.playerSkills.find(s => s.id === newSkillId);
        if (existingSkillById) {
            console.warn(`SKILL_LEARNED: Generated ID ${newSkillId} for skill "${skillName}" already exists. This should not happen. Skipping.`);
            systemMessages.push({
                id: 'skill-learn-error-idcollision-' + Date.now(), type: 'system',
                content: `[DEBUG] Lỗi học kỹ năng "${skillName}": Trùng ID kỹ năng. Vui lòng thử lại.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
            return { updatedKb: newKb, systemMessages };
        }
        
        const manaCost = parseInt(manaCostStr || "0", 10);
        const baseDamage = parseInt(baseDamageStr || "0", 10);
        const healingAmount = parseInt(healingAmountStr || "0", 10);
        const cooldown = parseInt(cooldownStr || "0", 10);
        const damageMultiplier = parseFloat(damageMultiplierStr || "0");
        const levelRequirement = levelRequirementStr ? parseInt(levelRequirementStr, 10) : undefined;
        const xpGainOnUse = xpGainOnUseStr ? parseInt(xpGainOnUseStr, 10) : undefined;


        const newSkill: Skill = {
            id: newSkillId,
            name: skillName, // Store the trimmed name
            description: skillDescription,
            skillType: skillType,
            detailedEffect: skillEffect,
            icon: tagParams.icon,
            manaCost: isNaN(manaCost) ? 0 : manaCost,
            baseDamage: isNaN(baseDamage) ? 0 : baseDamage,
            healingAmount: isNaN(healingAmount) ? 0 : healingAmount,
            damageMultiplier: isNaN(damageMultiplier) ? 0 : damageMultiplier,
            buffsApplied: undefined, 
            debuffsApplied: undefined,
            otherEffects: tagParams.otherEffects ? tagParams.otherEffects.split(';').map(s=>s.trim()).filter(s=>s) : undefined,
            targetType: tagParams.targetType as GameTemplates.SkillTargetType | undefined,
            cooldown: isNaN(cooldown) ? 0 : cooldown,
            currentCooldown: 0,
            levelRequirement: levelRequirement && !isNaN(levelRequirement) ? levelRequirement : undefined,
            requiredRealm: tagParams.requiredRealm,
            prerequisiteSkillId: tagParams.prerequisiteSkillId,
            isUltimate: tagParams.isUltimate?.toLowerCase() === 'true',
            xpGainOnUse: xpGainOnUse && !isNaN(xpGainOnUse) ? xpGainOnUse : undefined,
        };
        newKb.playerSkills.push(newSkill);
        systemMessages.push({
            id: 'skill-learned-' + newSkill.id, type: 'system',
            content: `Học được kỹ năng mới: ${skillName}!`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
        console.log(`SKILL_LEARNED: Skill with name "${skillName}" (case-insensitive, trimmed) already exists. ID: ${existingSkillByName.id}. Not adding duplicate.`);
    }
    return { updatedKb: newKb, systemMessages };
};

export const processSkillUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    
    const rawCurrentSkillName = tagParams.name;
    const currentSkillName = rawCurrentSkillName ? rawCurrentSkillName.trim() : undefined;


    if (!currentSkillName) {
        console.warn("SKILL_UPDATE: Missing current skill name (name parameter).", tagParams);
        systemMessages.push({
            id: `skill-update-error-noname-${Date.now()}`, type: 'system',
            content: `[DEBUG] Lỗi cập nhật kỹ năng: Thiếu tên kỹ năng hiện tại.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
        return { updatedKb: newKb, systemMessages };
    }

    // Find skill by trimmed, case-insensitive name
    const skillIndex = newKb.playerSkills.findIndex(s => s.name.trim().toLowerCase() === currentSkillName.toLowerCase());
    
    if (skillIndex === -1) {
        console.warn(`SKILL_UPDATE: Skill "${currentSkillName}" not found.`, tagParams);
        systemMessages.push({
            id: `skill-update-error-notfound-${Date.now()}`, type: 'system',
            content: `[DEBUG] Lỗi cập nhật kỹ năng: Không tìm thấy kỹ năng "${currentSkillName}".`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
        return { updatedKb: newKb, systemMessages };
    }

    const skillToUpdate = newKb.playerSkills[skillIndex];
    const originalNameToDisplay = skillToUpdate.name; // Store original name for message before it's potentially changed
    let updatedFieldsCount = 0;

    if (tagParams.newName) {
        const newTrimmedName = tagParams.newName.trim();
        if (newTrimmedName && newTrimmedName.toLowerCase() !== skillToUpdate.name.trim().toLowerCase()) {
            // Check if the new name collides with another existing skill (excluding itself)
            const collisionExists = newKb.playerSkills.some((s, idx) => 
                idx !== skillIndex && s.name.trim().toLowerCase() === newTrimmedName.toLowerCase()
            );
            if (!collisionExists) {
                skillToUpdate.name = newTrimmedName;
                updatedFieldsCount++;
            } else {
                 systemMessages.push({
                    id: `skill-update-error-namecollision-${Date.now()}`, type: 'system',
                    content: `[DEBUG] Lỗi cập nhật kỹ năng "${originalNameToDisplay}": Tên mới "${newTrimmedName}" đã tồn tại.`,
                    timestamp: Date.now(), turnNumber: turnForSystemMessages
                });
            }
        }
    }
    if (tagParams.description) {
        skillToUpdate.description = tagParams.description;
        updatedFieldsCount++;
    }
    if (tagParams.type) {
        skillToUpdate.skillType = (Object.values(GameTemplates.SkillType).includes(tagParams.type as GameTemplates.SkillTypeValues) 
                                    ? tagParams.type 
                                    : GameTemplates.SkillType.KHAC) as GameTemplates.SkillTypeValues;
        updatedFieldsCount++;
    }
    if (tagParams.effect) {
        skillToUpdate.detailedEffect = tagParams.effect;
        updatedFieldsCount++;
    }

    const parseAndUpdateNumericField = (paramKey: keyof Skill, fieldName: keyof Skill, parser: (val: string) => number | undefined) => {
        if (tagParams[paramKey as string]) {
            const parsedValue = parser(tagParams[paramKey as string]);
            if (parsedValue !== undefined && !isNaN(parsedValue)) {
                (skillToUpdate as any)[fieldName] = parsedValue;
                updatedFieldsCount++;
            }
        }
    };

    parseAndUpdateNumericField('manaCost', 'manaCost', val => parseInt(val, 10));
    parseAndUpdateNumericField('baseDamage', 'baseDamage', val => parseInt(val, 10));
    parseAndUpdateNumericField('healingAmount', 'healingAmount', val => parseInt(val, 10));
    parseAndUpdateNumericField('cooldown', 'cooldown', val => parseInt(val, 10));
    parseAndUpdateNumericField('damageMultiplier', 'damageMultiplier', parseFloat);
    parseAndUpdateNumericField('levelRequirement', 'levelRequirement', val => parseInt(val,10));
    parseAndUpdateNumericField('xpGainOnUse', 'xpGainOnUse', val => parseInt(val,10));

    if (tagParams.icon) { skillToUpdate.icon = tagParams.icon; updatedFieldsCount++; }
    if (tagParams.targetType) { skillToUpdate.targetType = tagParams.targetType as GameTemplates.SkillTargetType; updatedFieldsCount++; }
    if (tagParams.requiredRealm) { skillToUpdate.requiredRealm = tagParams.requiredRealm; updatedFieldsCount++; }
    if (tagParams.prerequisiteSkillId) { skillToUpdate.prerequisiteSkillId = tagParams.prerequisiteSkillId; updatedFieldsCount++; }
    if (tagParams.isUltimate) { skillToUpdate.isUltimate = tagParams.isUltimate.toLowerCase() === 'true'; updatedFieldsCount++; }
     if (tagParams.otherEffects) { skillToUpdate.otherEffects = tagParams.otherEffects.split(';').map(s=>s.trim()).filter(s=>s); updatedFieldsCount++;}


    if (updatedFieldsCount > 0) {
        systemMessages.push({
            id: `skill-updated-${skillToUpdate.id}-${Date.now()}`, type: 'system',
            content: `Kỹ năng "${originalNameToDisplay}" đã được cập nhật${skillToUpdate.name !== originalNameToDisplay ? ` thành "${skillToUpdate.name}"` : ""}.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else if (!systemMessages.some(msg => msg.id.includes('error'))) { // Only add no-change if no error already pushed
         systemMessages.push({
            id: `skill-update-nochange-${skillToUpdate.id}-${Date.now()}`, type: 'system',
            content: `[DEBUG] Tag SKILL_UPDATE cho "${originalNameToDisplay}" không có thay đổi nào được áp dụng.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }

    return { updatedKb: newKb, systemMessages };
};
