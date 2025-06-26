
import { KnowledgeBase, GameMessage, StatusEffect, PlayerStats } from '../../types';
import { VIETNAMESE } from '../../constants';
import { calculateEffectiveStats } from '../statsCalculationUtils';

export const processStatusEffectApply = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const name = tagParams.name;
    const description = tagParams.description;
    const type = tagParams.type as StatusEffect['type'];
    const durationTurnsStr = tagParams.durationTurns;
    const statModifiersStr = tagParams.statModifiers;
    const specialEffectsStr = tagParams.specialEffects;

    if (!name || !description || !type || !durationTurnsStr) {
        console.warn("STATUS_EFFECT_APPLY: Missing required parameters (name, description, type, durationTurns).", tagParams);
        systemMessages.push({
            id: `status-apply-error-missingparams-${Date.now()}`, type: 'system',
            content: `[DEBUG] Lỗi áp dụng hiệu ứng: Thiếu tham số bắt buộc cho "${name || 'Không tên'}".`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
        return { updatedKb: newKb, systemMessages };
    }

    const durationTurns = parseInt(durationTurnsStr, 10);
    if (isNaN(durationTurns)) {
        console.warn("STATUS_EFFECT_APPLY: Invalid durationTurns.", tagParams);
        systemMessages.push({
            id: `status-apply-error-duration-${Date.now()}`, type: 'system',
            content: `[DEBUG] Lỗi áp dụng hiệu ứng "${name}": Thời gian hiệu lực không hợp lệ.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
        return { updatedKb: newKb, systemMessages };
    }
    
    let statModifiers: Partial<PlayerStats> = {};
    if (statModifiersStr) {
        try {
            statModifiers = JSON.parse(statModifiersStr);
        } catch (e) {
            console.warn("STATUS_EFFECT_APPLY: Could not parse statModifiers JSON.", statModifiersStr, e);
            systemMessages.push({
                id: `status-apply-error-statmodparse-${Date.now()}`, type: 'system',
                content: `[DEBUG] Lỗi áp dụng hiệu ứng "${name}": Không thể phân tích statModifiers.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    }

    const specialEffects = specialEffectsStr ? specialEffectsStr.split(';').map(s => s.trim()).filter(s => s) : [];

    const newEffect: StatusEffect = {
        id: `effect-${name.replace(/\s+/g, '-')}-${Date.now()}`,
        name,
        description,
        type,
        durationTurns,
        statModifiers: statModifiers as StatusEffect['statModifiers'], 
        specialEffects,
        source: tagParams.source || 'Không rõ',
        icon: tagParams.icon || undefined,
    };

    newKb.playerStats.activeStatusEffects = newKb.playerStats.activeStatusEffects.filter(eff => eff.name !== newEffect.name);
    newKb.playerStats.activeStatusEffects.push(newEffect);
    
    newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);

    systemMessages.push({
        id: `status-effect-applied-${newEffect.id}`, type: 'system',
        content: VIETNAMESE.statusEffectApplied(newEffect.name),
        timestamp: Date.now(), turnNumber: turnForSystemMessages
    });

    return { updatedKb: newKb, systemMessages };
};

export const processStatusEffectRemove = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;

    if (!name) {
        console.warn("STATUS_EFFECT_REMOVE: Missing name parameter.", tagParams);
         systemMessages.push({
            id: `status-remove-error-missingparams-${Date.now()}`, type: 'system',
            content: `[DEBUG] Lỗi gỡ bỏ hiệu ứng: Thiếu tên hiệu ứng.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
        return { updatedKb: newKb, systemMessages };
    }

    const initialEffectCount = newKb.playerStats.activeStatusEffects.length;
    newKb.playerStats.activeStatusEffects = newKb.playerStats.activeStatusEffects.filter(eff => eff.name !== name);

    if (newKb.playerStats.activeStatusEffects.length < initialEffectCount) {
        newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);
        systemMessages.push({
            id: `status-effect-removed-${name.replace(/\s+/g, '-')}-${Date.now()}`, type: 'system',
            content: VIETNAMESE.statusEffectRemoved(name),
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
         console.warn(`STATUS_EFFECT_REMOVE: Effect "${name}" not found.`);
         systemMessages.push({
            id: `status-remove-error-notfound-${Date.now()}`, type: 'system',
            content: `[DEBUG] Lỗi gỡ bỏ hiệu ứng: Không tìm thấy hiệu ứng "${name}".`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }

    return { updatedKb: newKb, systemMessages };
};
