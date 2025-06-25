
import { KnowledgeBase, GameMessage } from '../types';
import { VIETNAMESE } from '../constants';

export const getMessagesForPage = (
  pageNumber: number,
  knowledgeBase: KnowledgeBase,
  allGameMessages: GameMessage[]
): GameMessage[] => {
  if (!knowledgeBase.currentPageHistory || knowledgeBase.currentPageHistory.length === 0) {
    return allGameMessages; 
  }
  const turnStartOfPage = knowledgeBase.currentPageHistory[pageNumber -1];
  const turnEndOfPage = (pageNumber < knowledgeBase.currentPageHistory.length) 
                          ? knowledgeBase.currentPageHistory[pageNumber] - 1 
                          : knowledgeBase.playerStats.turn;

  const messages = allGameMessages.filter(msg => 
    msg.turnNumber >= turnStartOfPage && msg.turnNumber <= turnEndOfPage
  );
  
  const summaryForThisPage = knowledgeBase.pageSummaries?.[pageNumber];
  if (summaryForThisPage && turnStartOfPage > 0 && turnEndOfPage >= turnStartOfPage) { 
     const summaryTurn = turnEndOfPage; 
     if (!messages.find(m => m.type === 'page_summary' && m.turnNumber === summaryTurn && m.content.includes(summaryForThisPage))) {
        messages.push({
            id: `page-summary-display-${pageNumber}-${Date.now()}`,
            type: 'page_summary',
            content: `${VIETNAMESE.pageSummaryTitle(pageNumber)}: ${summaryForThisPage}`,
            timestamp: Date.now(), 
            turnNumber: summaryTurn
        });
     }
  }
  return messages;
};


export const calculateTotalPages = (knowledgeBase: KnowledgeBase): number => {
  return Math.max(1, knowledgeBase.currentPageHistory?.length || 1);
};
