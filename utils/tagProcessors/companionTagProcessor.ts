
import { KnowledgeBase, GameMessage, Companion } from '../../types';

export const processCompanionAdd = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;
    const description = tagParams.description;
    const hp = parseInt(tagParams.hp || "100", 10);
    const maxHp = parseInt(tagParams.maxHp || tagParams.hp || "100", 10);
    const mana = parseInt(tagParams.mana || "0", 10);
    const maxMana = parseInt(tagParams.maxMana || tagParams.mana || "0", 10);
    const atk = parseInt(tagParams.atk || "10", 10);

    if (!name || !description) {
        console.warn("COMPANION_ADD: Missing name or description.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.companions.find(c => c.name === name)) {
        const newCompanion: Companion = {
            id: `comp-${name.replace(/\s+/g, '-')}-${Date.now()}`,
            name: name,
            description: description,
            hp: isNaN(hp) ? 100 : hp,
            maxHp: isNaN(maxHp) ? 100 : maxHp,
            mana: isNaN(mana) ? 0 : mana,
            maxMana: isNaN(maxMana) ? 0 : maxMana,
            atk: isNaN(atk) ? 10 : atk,
        };
        newKb.companions.push(newCompanion);
        systemMessages.push({
            id: 'companion-joined-' + Date.now(), type: 'system',
            content: `${name} đã gia nhập đội của bạn!`,
            timestamp: Date.now(), turnNumber: newKb.playerStats.turn 
        });
    }
    return { updatedKb: newKb, systemMessages };
};

export const processCompanionLeave = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;

    if (!name) {
        console.warn("COMPANION_LEAVE: Missing name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const companionIndex = newKb.companions.findIndex(c => c.name === name);
    if (companionIndex > -1) {
        newKb.companions.splice(companionIndex, 1);
        systemMessages.push({
            id: 'companion-left-' + Date.now(), type: 'system',
            content: `${name} đã rời khỏi đội.`,
            timestamp: Date.now(), turnNumber: newKb.playerStats.turn
        });
    } else {
        console.warn(`COMPANION_LEAVE: Companion "${name}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};

export const processCompanionStatsUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;

    if (!name) {
        console.warn("COMPANION_STATS_UPDATE: Missing name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    const companion = newKb.companions.find(c => c.name === name);
    if (companion) {
        // Logic to update companion stats based on tagParams (hp, mana, atk changes)
        let updateOccurred = false;
        if (tagParams.hp) {
            const change = parseInt(tagParams.hp, 10);
            if (!isNaN(change)) {
                companion.hp = Math.max(0, Math.min(companion.hp + change, companion.maxHp));
                updateOccurred = true;
            }
        }
         if (tagParams.mana) {
            const change = parseInt(tagParams.mana, 10);
            if (!isNaN(change)) {
                companion.mana = Math.max(0, Math.min(companion.mana + change, companion.maxMana));
                updateOccurred = true;
            }
        }
        if (tagParams.atk) {
            const change = parseInt(tagParams.atk, 10);
            if (!isNaN(change)) {
                companion.atk = Math.max(0, companion.atk + change);
                updateOccurred = true;
            }
        }
        if(updateOccurred){
             systemMessages.push({
                id: 'companion-stats-updated-' + Date.now(), type: 'system',
                content: `Chỉ số của đồng hành ${name} đã thay đổi.`,
                timestamp: Date.now(), turnNumber: newKb.playerStats.turn
            });
        }

    } else {
         console.warn(`COMPANION_STATS_UPDATE: Companion "${name}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};
