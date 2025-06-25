
import { KnowledgeBase, GameMessage, TurnHistoryEntry } from '../types';
import { MAX_TURN_HISTORY_LENGTH } from '../constants';

export const addTurnHistoryEntry = (currentKb: KnowledgeBase, messagesBeforeThisTurnActions: GameMessage[]): KnowledgeBase => {
  // currentKb IS the full KB state for the *end* of the current turn, 
  // BUT its .turnHistory property is still the history *before* this current turn's entry.
  
  // 1. Destructure:
  //    'turnHistory' (local const) = currentKb.turnHistory (i.e., H_n-1, history up to previous turn)
  //    'kbWithoutNestedHistory' = currentKb with its own .turnHistory property removed.
  //                              (So, this is effectively KB_n_processed_without_any_turnHistory_field)
  const { turnHistory, ...kbWithoutNestedHistory } = currentKb;
  
  // 2. Create snapshot for the new history entry:
  //    This snapshot represents the state of KB_n_processed_without_any_turnHistory_field.
  //    So, knowledgeBaseSnapshotForEntry.turnHistory will be undefined. THIS IS KEY.
  const knowledgeBaseSnapshotForEntry: KnowledgeBase = JSON.parse(JSON.stringify(kbWithoutNestedHistory));

  const newHistoryEntry: TurnHistoryEntry = {
    knowledgeBaseSnapshot: knowledgeBaseSnapshotForEntry, // Snapshot of current turn's state, without nested history.
    gameMessagesSnapshot: JSON.parse(JSON.stringify(messagesBeforeThisTurnActions)), // Messages just before this turn's action.
  };

  // 3. Construct the new top-level history array:
  //    currentActualTurnHistory = H_n-1 (from destructuring)
  const currentActualTurnHistory = turnHistory || [];
  //    updatedTurnHistory = H_n = [H_n-1, newHistoryEntry_for_turn_n]
  const updatedTurnHistory = [...currentActualTurnHistory, newHistoryEntry];

  // 4. Truncate if too long
  if (updatedTurnHistory.length > MAX_TURN_HISTORY_LENGTH) {
    updatedTurnHistory.splice(0, updatedTurnHistory.length - MAX_TURN_HISTORY_LENGTH);
  }
  
  // 5. Return the new state:
  //    This is KB_n_processed, but its .turnHistory property is now H_n.
  return { ...currentKb, turnHistory: updatedTurnHistory };
};
