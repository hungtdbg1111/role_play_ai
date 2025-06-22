
import { useState, useCallback } from 'react';
import { KnowledgeBase, GameMessage } from '../types';
import { INITIAL_KNOWLEDGE_BASE } from '../constants';
import { calculateTotalPages as calculateTotalPagesUtil, getMessagesForPage as getMessagesForPageUtil } from '../utils/gameLogicUtils';


export const useGameData = () => {
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBase>(
    JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE))
  );
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [rawAiResponsesLog, setRawAiResponsesLog] = useState<string[]>([]);
  const [sentPromptsLog, setSentPromptsLog] = useState<string[]>([]);
  const [latestPromptTokenCount, setLatestPromptTokenCount] = useState<number | null | string>(null);
  const [summarizationResponsesLog, setSummarizationResponsesLog] = useState<string[]>([]);
  
  const [currentPageDisplay, setCurrentPageDisplay] = useState<number>(1);
  const [messageIdBeingEdited, setMessageIdBeingEdited] = useState<string | null>(null);

  const totalPages = calculateTotalPagesUtil(knowledgeBase);
  
  const getMessagesForPage = useCallback((pageNumber: number) => {
    return getMessagesForPageUtil(pageNumber, knowledgeBase, gameMessages);
  }, [knowledgeBase, gameMessages]);

  const addMessageAndUpdateState = useCallback((
    newMessages: GameMessage[],
    newKnowledgeBase: KnowledgeBase,
    callback?: () => void
  ) => {
    setGameMessages(prev => [...prev, ...newMessages]);
    setKnowledgeBase(newKnowledgeBase);
    if (callback) callback();
  }, []);
  
  const resetGameData = useCallback(() => {
    setKnowledgeBase(JSON.parse(JSON.stringify(INITIAL_KNOWLEDGE_BASE)));
    setGameMessages([]);
    setRawAiResponsesLog([]);
    setSentPromptsLog([]);
    setLatestPromptTokenCount(null);
    setSummarizationResponsesLog([]);
    setCurrentPageDisplay(1);
    setMessageIdBeingEdited(null);
  }, []);


  return {
    knowledgeBase,
    setKnowledgeBase,
    gameMessages,
    setGameMessages,
    rawAiResponsesLog,
    setRawAiResponsesLog,
    sentPromptsLog,
    setSentPromptsLog,
    latestPromptTokenCount,
    setLatestPromptTokenCount,
    summarizationResponsesLog,
    setSummarizationResponsesLog,
    currentPageDisplay,
    setCurrentPageDisplay,
    totalPages,
    messageIdBeingEdited,
    setMessageIdBeingEdited,
    getMessagesForPage,
    addMessageAndUpdateState,
    resetGameData
  };
};
