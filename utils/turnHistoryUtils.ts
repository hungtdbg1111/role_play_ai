
import { KnowledgeBase, GameMessage, TurnHistoryEntry, Operation } from '../types';
import { MAX_TURN_HISTORY_LENGTH, KEYFRAME_INTERVAL } from '../constants';
import * as jsonpatch from "https://esm.sh/fast-json-patch@3.1.1";

/**
 * Adds a new entry to the turn history.
 * This function is responsible for creating a snapshot of the game state
 * as it was AT THE START of the turn that just finished processing.
 * @param existingHistory The array of existing turn history entries.
 * @param kbSnapshotForCurrentTurnStart The KnowledgeBase state AT THE START of the turn to be recorded.
 * @param messagesSnapshotForCurrentTurnStart The GameMessage[] state AT THE START of the turn to be recorded.
 * @returns A new array of TurnHistoryEntry[] with the new entry added and truncated if necessary.
 */
export const addTurnHistoryEntryRaw = (
    existingHistory: TurnHistoryEntry[],
    kbSnapshotForCurrentTurnStart: KnowledgeBase,    
    messagesSnapshotForCurrentTurnStart: GameMessage[] 
): TurnHistoryEntry[] => {
  
  const { turnHistory: nestedHistoryToBeRemoved, ...kbStateCleaned } = kbSnapshotForCurrentTurnStart;
  const turnNumberOfThisEntry = kbStateCleaned.playerStats.turn;

  let entryType: 'keyframe' | 'delta' = 'keyframe';
  if (existingHistory.length > 0 && (turnNumberOfThisEntry % KEYFRAME_INTERVAL !== 0) && turnNumberOfThisEntry !==1) {
    entryType = 'delta';
  }
  // First turn (turn 0 if that's how initial setup works, or turn 1 after first AI action) must be a keyframe.
  // Initial KB.turn is 0, first AI action's turn is 1. So turnNumberOfThisEntry will be 0 for the very first history entry.
  if (turnNumberOfThisEntry === 0) { // The very first entry before any player/AI interaction.
      entryType = 'keyframe';
  }


  const newHistoryEntry: TurnHistoryEntry = {
    turnNumber: turnNumberOfThisEntry, 
    type: entryType,
    knowledgeBaseSnapshot: JSON.parse(JSON.stringify(kbStateCleaned)), // Always store full snapshot for direct rollback
    gameMessagesSnapshot: JSON.parse(JSON.stringify(messagesSnapshotForCurrentTurnStart)), // Always store full snapshot
    knowledgeBaseDelta: undefined,
    gameMessagesDelta: undefined,
  };

  if (entryType === 'delta') {
    const previousTurnEntry = existingHistory.length > 0 ? existingHistory[existingHistory.length - 1] : undefined;
    if (previousTurnEntry && previousTurnEntry.knowledgeBaseSnapshot && previousTurnEntry.gameMessagesSnapshot) {
      try {
        // Ensure previousTurnEntry.knowledgeBaseSnapshot does not contain its own turnHistory to avoid circular refs in diff
        const { turnHistory: prevNestedHistory, ...prevKbCleaned } = previousTurnEntry.knowledgeBaseSnapshot;
        newHistoryEntry.knowledgeBaseDelta = jsonpatch.compare(prevKbCleaned, kbStateCleaned);
        newHistoryEntry.gameMessagesDelta = jsonpatch.compare(previousTurnEntry.gameMessagesSnapshot, messagesSnapshotForCurrentTurnStart);
      } catch (diffError) {
        console.error("Error generating diff, falling back to keyframe:", diffError);
        newHistoryEntry.type = 'keyframe'; // Fallback to keyframe if diff fails
        newHistoryEntry.knowledgeBaseDelta = undefined;
        newHistoryEntry.gameMessagesDelta = undefined;
      }
    } else {
      // If no valid previous snapshot to diff against, force this entry to be a keyframe
      newHistoryEntry.type = 'keyframe';
      newHistoryEntry.knowledgeBaseDelta = undefined;
      newHistoryEntry.gameMessagesDelta = undefined;
      if(existingHistory.length > 0) { // Only log if it's not the very first entry where this is expected
         console.warn(`Delta creation skipped for turn ${turnNumberOfThisEntry}: No valid previous snapshot. Forcing keyframe.`);
      }
    }
  }
  
  const updatedTurnHistory = [...existingHistory, newHistoryEntry];
  
  if (updatedTurnHistory.length > MAX_TURN_HISTORY_LENGTH) {
    updatedTurnHistory.splice(0, updatedTurnHistory.length - MAX_TURN_HISTORY_LENGTH);
  }
  
  return updatedTurnHistory;
};