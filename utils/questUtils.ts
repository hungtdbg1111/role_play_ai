
import { VIETNAMESE } from '../constants'; // VIETNAMESE might be needed for quest related strings in the future

// Helper function to sanitize quest objective text for display
export const sanitizeQuestObjectiveTextForDisplay = (text: string | undefined): string | undefined => {
    if (text === undefined || text === null) return undefined;
    // Remove single quotes, backslashes, and asterisks for display purposes only
    return text.replace(/['\\*]/g, '');
};

// New helper function to format objective text specifically for system messages
export const formatObjectiveForSystemMessage = (objectiveText: string, questTitle: string): string => {
  let text = objectiveText.replace(/['\\*]/g, '').trim(); // Basic sanitization
  const lowerQuestTitle = questTitle.toLowerCase();
  const lowerText = text.toLowerCase();

  if (lowerText.startsWith(lowerQuestTitle)) {
    let remainingText = text.substring(questTitle.length).trim();
    // Remove common leading separators like ':', '-', '(', ' - ' more robustly
    remainingText = remainingText.replace(/^[\s:\-\(\)]+/, '').trim();
    
    if (remainingText.startsWith("(") && remainingText.endsWith(")")) {
        const coreObjective = remainingText.substring(1, remainingText.length - 1).trim();
        if (coreObjective.indexOf("(") === -1 && coreObjective.indexOf(")") === -1) {
            remainingText = coreObjective;
        }
    }
    return remainingText || objectiveText; 
  }
  return text; 
};
