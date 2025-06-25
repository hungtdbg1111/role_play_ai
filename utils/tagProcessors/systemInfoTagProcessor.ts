
import { KnowledgeBase, GameMessage } from '../../types';
import { calculateRealmBaseStats, calculateEffectiveStats } from '../statsCalculationUtils';


export const processMessage = (
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): GameMessage | null => {
    const messageText = tagParams.message || tagParams.text; // Allow "text" as fallback
    if (messageText) {
        return {
            id: 'ai-message-' + Date.now(), type: 'system',
            content: messageText,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        };
    }
    return null;
};

export const processRealmList = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const realmListStr = tagParams.text;
    if (realmListStr) {
        newKb.realmProgressionList = realmListStr.split(' - ').map(s => s.trim()).filter(Boolean);
        // Recalculate base stats if realm list changes
        const baseStats = calculateRealmBaseStats(newKb.playerStats.realm, newKb.realmProgressionList, newKb.currentRealmBaseStats);
        newKb.playerStats = { ...newKb.playerStats, ...baseStats };
        newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);
    }
    return { updatedKb: newKb };
};
