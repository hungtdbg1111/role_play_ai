
import { KnowledgeBase, GameMessage } from '../types';
import { parseTagValue } from './parseTagValue'; 
import { processPlayerStatsInit, processStatsUpdate, processRemoveBinhCanhEffect } from './tagProcessors/statsTagProcessor';
import { processItemAcquired, processItemConsumed, processItemUpdate } from './tagProcessors/itemTagProcessor';
import { processSkillLearned, processSkillUpdate } from './tagProcessors/skillTagProcessor';
import { 
    processQuestAssigned, 
    processQuestUpdated, 
    processQuestCompleted,
    processQuestFailed,    
    processObjectiveUpdate 
} from './tagProcessors/questTagProcessor';
import { 
    processNpc, 
    processNpcUpdate, 
    processLoreLocation,    
    processLocationUpdate,  
    processWorldLoreAdd,
    processWorldLoreUpdate,
    processFactionDiscovered, 
    processFactionUpdate,
    processFactionRemove
} from './tagProcessors/loreTagProcessor';
import { processSetCombatStatus } from './tagProcessors/combatTagProcessor';
import { 
    processCompanionAdd, 
    processCompanionLeave, 
    processCompanionStatsUpdate 
} from './tagProcessors/companionTagProcessor';
import { processMessage, processRealmList } from './tagProcessors/systemInfoTagProcessor';
import { processStatusEffectApply, processStatusEffectRemove } from './tagProcessors/statusEffectTagProcessor';


export { parseTagValue }; 

export const performTagProcessing = async (
    currentKb: KnowledgeBase, 
    tagBatch: string[], 
    turnForSystemMessages: number,
    setKnowledgeBaseDirectly: React.Dispatch<React.SetStateAction<KnowledgeBase>>, 
    logNpcAvatarPromptCallback?: (prompt: string) => void 
): Promise<{ 
    newKb: KnowledgeBase;
    turnIncrementedByTag: boolean;
    systemMessagesFromTags: GameMessage[];
    realmChangedByTag: boolean;
    appliedBinhCanhViaTag: boolean;
    removedBinhCanhViaTag: boolean;
}> => {
    let workingKb: KnowledgeBase = JSON.parse(JSON.stringify(currentKb));
    let turnIncrementedByAnyTag = false;
    const allSystemMessages: GameMessage[] = [];
    let realmChangedByAnyTag = false;
    let removedBinhCanhByAnyTag = false;

    for (const originalTag of tagBatch) { 
        const mainMatch = originalTag.match(/\[(.*?)(?::\s*(.*))?\]$/s);
        if (!mainMatch || !mainMatch[1]) {
             console.warn(`Malformed tag structure: ${originalTag}`);
             allSystemMessages.push({
                 id: 'malformed-tag-structure-' + Date.now(), type: 'system',
                 content: `[DEBUG] Tag có cấu trúc không hợp lệ: ${originalTag}`,
                 timestamp: Date.now(), turnNumber: turnForSystemMessages
             });
             continue; 
        }
        const tagName = mainMatch[1].trim().toUpperCase();
        const rawTagParameterString = mainMatch[2] ? mainMatch[2].trim() : '';
        
        let tempCleanedParams = rawTagParameterString.replace(/\\\\"/g, '\\"').replace(/\\\\'/g, "\\'"); 
        tempCleanedParams = tempCleanedParams.replace(/\\"/g, '"').replace(/\\'/g, "'"); 
        const cleanedTagParameterString = tempCleanedParams;
        
        let tagParams: Record<string, string> = {};
         if (cleanedTagParameterString) {
            if (tagName === 'MESSAGE' && !cleanedTagParameterString.includes('=')) {
                tagParams = { message: cleanedTagParameterString.replace(/^"|"$/g, '') };
            } else {
                tagParams = parseTagValue(cleanedTagParameterString);
            }
        }

        try {
            switch (tagName) {
                case 'PLAYER_STATS_INIT': {
                    const { updatedKb, systemMessages, realmChanged, turnIncremented } = processPlayerStatsInit(workingKb, tagParams);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    if (realmChanged) realmChangedByAnyTag = true;
                    if (turnIncremented) turnIncrementedByAnyTag = true;
                    break;
                }
                case 'STATS_UPDATE': {
                    const { updatedKb, systemMessages, realmChanged, turnIncremented, removedBinhCanh } = processStatsUpdate(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    if (realmChanged) realmChangedByAnyTag = true;
                    if (turnIncremented) turnIncrementedByAnyTag = true;
                    if (removedBinhCanh) removedBinhCanhByAnyTag = true;
                    break;
                }
                case 'ITEM_ACQUIRED': {
                    const { updatedKb, systemMessages } = processItemAcquired(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'ITEM_CONSUMED': {
                    const { updatedKb, systemMessages } = processItemConsumed(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'ITEM_UPDATE': {
                    const { updatedKb, systemMessages } = processItemUpdate(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'SKILL_LEARNED': {
                    const { updatedKb, systemMessages } = processSkillLearned(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'SKILL_UPDATE': { 
                    const { updatedKb, systemMessages } = processSkillUpdate(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'QUEST_ASSIGNED': {
                    const { updatedKb, systemMessages } = processQuestAssigned(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'QUEST_UPDATED': {
                    const { updatedKb, systemMessages } = processQuestUpdated(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'QUEST_COMPLETED': {
                    const { updatedKb, systemMessages } = processQuestCompleted(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'QUEST_FAILED': {
                    const { updatedKb, systemMessages } = processQuestFailed(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'OBJECTIVE_UPDATE': {
                    const { updatedKb, systemMessages } = processObjectiveUpdate(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'NPC': { 
                    const result = await processNpc(workingKb, tagParams, turnForSystemMessages, setKnowledgeBaseDirectly, logNpcAvatarPromptCallback); 
                    workingKb = result.updatedKb;
                    allSystemMessages.push(...result.systemMessages);
                    break;
                }
                case 'NPC_UPDATE': {
                    const result = await processNpcUpdate(workingKb, tagParams, turnForSystemMessages, setKnowledgeBaseDirectly, logNpcAvatarPromptCallback);
                    workingKb = result.updatedKb;
                    allSystemMessages.push(...result.systemMessages);
                    break;
                }
                case 'LORE_LOCATION': {
                    const { updatedKb, systemMessages } = processLoreLocation(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'LOCATION_UPDATE': { 
                    const { updatedKb, systemMessages } = processLocationUpdate(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'WORLD_LORE_ADD': {
                    const { updatedKb, systemMessages } = processWorldLoreAdd(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'WORLD_LORE_UPDATE': { 
                    const { updatedKb, systemMessages } = processWorldLoreUpdate(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'FACTION_DISCOVERED': {
                    const { updatedKb, systemMessages } = processFactionDiscovered(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'FACTION_UPDATE': { 
                    const { updatedKb, systemMessages } = processFactionUpdate(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                 case 'FACTION_REMOVE': { 
                    const { updatedKb, systemMessages } = processFactionRemove(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'SET_COMBAT_STATUS': {
                    const { updatedKb } = processSetCombatStatus(workingKb, tagParams);
                    workingKb = updatedKb;
                    break;
                }
                case 'COMPANION_JOIN':
                case 'COMPANION_ADD': {
                    const { updatedKb, systemMessages } = processCompanionAdd(workingKb, tagParams);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'COMPANION_LEAVE': {
                    const { updatedKb, systemMessages } = processCompanionLeave(workingKb, tagParams);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'COMPANION_STATS_UPDATE': {
                    const { updatedKb, systemMessages } = processCompanionStatsUpdate(workingKb, tagParams);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'MESSAGE': {
                    const msg = processMessage(tagParams, turnForSystemMessages);
                    if (msg) allSystemMessages.push(msg);
                    break;
                }
                 case 'REALM_LIST': {
                    const { updatedKb } = processRealmList(workingKb, tagParams);
                    workingKb = updatedKb;
                    break;
                }
                case 'REMOVE_BINH_CANH_EFFECT': {
                    const { updatedKb, systemMessages, removedBinhCanh } = processRemoveBinhCanhEffect(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    if (removedBinhCanh) removedBinhCanhByAnyTag = true;
                    break;
                }
                case 'STATUS_EFFECT_APPLY': {
                    const { updatedKb, systemMessages } = processStatusEffectApply(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                case 'STATUS_EFFECT_REMOVE': {
                    const { updatedKb, systemMessages } = processStatusEffectRemove(workingKb, tagParams, turnForSystemMessages);
                    workingKb = updatedKb;
                    allSystemMessages.push(...systemMessages);
                    break;
                }
                // Tags like 'CHOICE' are not processed here, they are part of the parsed AI response structure.
                // Tags like 'APPLY_BINH_CANH_EFFECT' are handled by game logic, not direct tag processing modifying KB.
                default:
                    if (!tagName.startsWith("GENERATED_") && tagName !== "CHOICE") { // Avoid warning for GENERATED tags or CHOICE tags
                        console.warn(`Unknown tag: "${tagName}". Full tag: "${originalTag}"`);
                        allSystemMessages.push({
                             id: 'unknown-tag-' + Date.now(), type: 'system',
                             content: `[DEBUG] Tag không xác định: "${tagName}". Full tag: "${originalTag}" (Cleaned params: "${cleanedTagParameterString}")`,
                             timestamp: Date.now(), turnNumber: turnForSystemMessages
                         });
                    }
            }
        } catch (error) {
             console.error(`Error processing tag "${tagName}":`, error, "Original tag:", originalTag, "Params:", tagParams);
             allSystemMessages.push({
                id: 'tag-processing-error-' + Date.now(), type: 'system',
                content: `Lỗi xử lý tag ${tagName}: ${error instanceof Error ? error.message : "Không rõ"}`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    } 

    return { 
        newKb: workingKb, 
        turnIncrementedByTag: turnIncrementedByAnyTag, 
        systemMessagesFromTags: allSystemMessages, 
        realmChangedByTag: realmChangedByAnyTag, 
        appliedBinhCanhViaTag: false, // This was deprecated, keeping structure
        removedBinhCanhViaTag: removedBinhCanhByAnyTag 
    };
};
