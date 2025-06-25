
import { generateInitialPrompt } from './initialPrompt';
import { generateContinuePrompt } from './continuePrompt';
import { generateWorldDetailsPrompt } from './generateWorldDetailsPrompt';
import { generateFanfictionWorldDetailsPrompt } from './generateFanfictionWorldDetailsPrompt';
import { generateSummarizePagePrompt } from './summarizePagePrompt';
import { generateCraftItemPrompt } from './craftItemPrompt';

export const PROMPT_FUNCTIONS = {
  initial: generateInitialPrompt,
  continue: generateContinuePrompt,
  generateWorldDetails: generateWorldDetailsPrompt,
  generateFanfictionWorldDetails: generateFanfictionWorldDetailsPrompt,
  summarizePage: generateSummarizePagePrompt,
  craftItem: generateCraftItemPrompt,
};

// It's good practice to also export the type if other modules might need to know the shape of PROMPT_FUNCTIONS
export type PromptFunctionsType = typeof PROMPT_FUNCTIONS;
