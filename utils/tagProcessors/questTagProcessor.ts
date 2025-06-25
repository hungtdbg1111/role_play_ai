
import { KnowledgeBase, GameMessage, QuestObjective } from '../../types';
import { formatObjectiveForSystemMessage } from '../questUtils';

export const processQuestAssigned = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const questTitle = tagParams.title;
    const questDescription = tagParams.description;
    const objectivesStr = tagParams.objectives;

    if (questTitle && questDescription && objectivesStr) {
        if (!newKb.allQuests.find(q => q.title === questTitle)) {
            const newQuestObjectives: QuestObjective[] = objectivesStr.split('|').map((objText, index) => ({
                id: `obj-${questTitle.replace(/\s+/g, '-')}-${index}-${Date.now()}`,
                text: objText.trim(),
                completed: false,
            }));

            newKb.allQuests.push({
                id: `quest-${questTitle.replace(/\s+/g, '-')}-${Date.now()}`,
                title: questTitle,
                description: questDescription,
                status: 'active',
                objectives: newQuestObjectives,
            });
            systemMessages.push({
                id: 'quest-assigned-' + Date.now(), type: 'system',
                content: `Nhiệm vụ mới: ${questTitle}!`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    } else {
        console.warn("QUEST_ASSIGNED: Missing title, description, or objectives.", tagParams);
    }
    return { updatedKb: newKb, systemMessages };
};

export const processQuestUpdated = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const questTitle = tagParams.title;
    const objectiveTextToUpdate = tagParams.objectiveText; // The original text of the objective to find
    const newObjectiveText = tagParams.newObjectiveText; // Optional: new text for the objective
    const completed = tagParams.completed?.toLowerCase() === 'true';

    if (!questTitle || !objectiveTextToUpdate) {
        console.warn("QUEST_UPDATED: Missing title or objectiveText.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const questIndex = newKb.allQuests.findIndex(q => q.title === questTitle && q.status === 'active');
    if (questIndex > -1) {
        const quest = newKb.allQuests[questIndex];
        const objectiveIndex = quest.objectives.findIndex(obj => obj.text === objectiveTextToUpdate);

        if (objectiveIndex > -1) {
            quest.objectives[objectiveIndex].completed = completed;
            if (newObjectiveText) {
                quest.objectives[objectiveIndex].text = newObjectiveText;
            }
            const formattedObjective = formatObjectiveForSystemMessage(objectiveTextToUpdate, questTitle);
            systemMessages.push({
                id: 'quest-objective-updated-' + Date.now(), type: 'system',
                content: `Nhiệm vụ "${questTitle}": Mục tiêu "${formattedObjective}" đã được ${completed ? 'hoàn thành' : 'cập nhật'}.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });

            // Check if all objectives are completed
            const allObjectivesCompleted = quest.objectives.every(obj => obj.completed);
            if (allObjectivesCompleted) {
                quest.status = 'completed';
                systemMessages.push({
                    id: 'quest-all-objectives-completed-' + Date.now(), type: 'system',
                    content: `Nhiệm vụ "${questTitle}" đã hoàn thành tất cả mục tiêu!`,
                    timestamp: Date.now(), turnNumber: turnForSystemMessages
                });
            }
        } else {
            console.warn(`QUEST_UPDATED: Objective "${objectiveTextToUpdate}" not found in quest "${questTitle}".`);
        }
    } else {
        console.warn(`QUEST_UPDATED: Active quest "${questTitle}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};

export const processQuestCompleted = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const questTitle = tagParams.title;

    if (!questTitle) {
        console.warn("QUEST_COMPLETED: Missing title.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    const quest = newKb.allQuests.find(q => q.title === questTitle && q.status === 'active');
    if (quest) {
        quest.status = 'completed';
        quest.objectives.forEach(obj => obj.completed = true); // Mark all objectives as completed
        systemMessages.push({
            id: 'quest-completed-' + Date.now(), type: 'system',
            content: `Nhiệm vụ "${questTitle}" đã hoàn thành!`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
        console.warn(`QUEST_COMPLETED: Active quest "${questTitle}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};

export const processQuestFailed = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const questTitle = tagParams.title;

    if (!questTitle) {
        console.warn("QUEST_FAILED: Missing title.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    const quest = newKb.allQuests.find(q => q.title === questTitle && q.status === 'active');
    if (quest) {
        quest.status = 'failed';
        systemMessages.push({
            id: 'quest-failed-' + Date.now(), type: 'system',
            content: `Nhiệm vụ "${questTitle}" đã thất bại!`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
         console.warn(`QUEST_FAILED: Active quest "${questTitle}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};


export const processObjectiveUpdate = ( // Corrected export
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    // This function seems to be covered by processQuestUpdated.
    // If it's meant to be distinct, its logic would go here.
    // For now, let's alias it to processQuestUpdated to satisfy the import.
    console.warn("OBJECTIVE_UPDATE tag is being handled by processQuestUpdated. Consider consolidating tag usage if behavior is identical.");
    return processQuestUpdated(currentKb, tagParams, turnForSystemMessages);
};
