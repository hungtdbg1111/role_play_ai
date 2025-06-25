
import { KnowledgeBase, GameMessage } from '../../types';

export const processSetCombatStatus = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const status = tagParams.status?.toLowerCase();
    if (status === 'start' || tagParams.value?.toLowerCase() === 'true') { // Added check for legacy "value"
        newKb.playerStats.isInCombat = true;
    } else if (status === 'end' || tagParams.value?.toLowerCase() === 'false') {
        newKb.playerStats.isInCombat = false;
    }
    return { updatedKb: newKb, systemMessages: [] };
};
