
import { generateInitialPrompt } from './initialPrompt';
import { generateContinuePrompt } from './continuePrompt';
import { generateWorldDetailsPrompt } from './generateWorldDetailsPrompt';
import { generateFanfictionWorldDetailsPrompt } from './generateFanfictionWorldDetailsPrompt';
import { generateSummarizePagePrompt } from './summarizePagePrompt';

export const PROMPT_FUNCTIONS = {
  initial: generateInitialPrompt,
  continue: generateContinuePrompt,
  generateWorldDetails: generateWorldDetailsPrompt,
  generateFanfictionWorldDetails: generateFanfictionWorldDetailsPrompt,
  summarizePage: generateSummarizePagePrompt,
};

export type PromptFunctionsType = typeof PROMPT_FUNCTIONS;
