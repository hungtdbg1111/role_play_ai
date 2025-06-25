import React, { useRef, useEffect } from 'react';
import { GameMessage, KnowledgeBase, StyleSettings, StyleSettingProperty } from '../../../types';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import { VIETNAMESE } from '../../../constants';

interface StoryLogProps {
  displayedMessages: GameMessage[];
  isLoadingUi: boolean; 
  isSummarizingUi: boolean; 
  isCurrentlyActivePage: boolean;
  knowledgeBase: KnowledgeBase;
  styleSettings: StyleSettings;
  messageIdBeingEdited: string | null;
  currentEditText: string;
  setCurrentEditText: (text: string) => void;
  onStartEditMessage: (messageId: string) => void; 
  onSaveEditedMessage: (messageId: string, newContent: string) => void;
  onCancelEditMessage: () => void;
  parseAndHighlightText: (text: string, kb: KnowledgeBase) => React.ReactNode[];
  getDynamicMessageStyles: (msgType: GameMessage['type']) => React.CSSProperties;
  playerStatsTurn: number; 
}

const StoryLog: React.FC<StoryLogProps> = ({
  displayedMessages,
  isLoadingUi,
  isSummarizingUi,
  isCurrentlyActivePage,
  knowledgeBase,
  styleSettings,
  messageIdBeingEdited,
  currentEditText,
  setCurrentEditText,
  onStartEditMessage,
  onSaveEditedMessage,
  onCancelEditMessage,
  parseAndHighlightText,
  getDynamicMessageStyles,
  playerStatsTurn,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); // Disabled auto-scroll
  }, [displayedMessages]);

  const handleStartEditForThisMessage = (msg: GameMessage) => {
    onStartEditMessage(msg.id); 
    // setCurrentEditText(msg.content); // This is now handled by GameplayScreen's useEffect based on messageIdBeingEdited
  };

  const handleSaveEditInternal = (messageId: string) => {
    onSaveEditedMessage(messageId, currentEditText);
  };

  const handleCancelEditInternal = () => {
    onCancelEditMessage();
  };

  return (
    <div id="story-log" className="flex-grow overflow-y-auto p-3 sm:p-4 bg-gray-800 rounded-t-lg custom-scrollbar">
      {displayedMessages.map((msg) => {
        const messageBaseClass = 'my-1 max-w-full p-2 sm:p-3 rounded-xl shadow text-sm sm:text-base relative';
        let typeSpecificClass = '';
        let dynamicStyle = getDynamicMessageStyles(msg.type);
        const isEditable = (msg.type === 'narration' || msg.type === 'player_action') && isCurrentlyActivePage;

        if (msg.type === 'narration') {
          if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-gray-700';
          if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-gray-100';
          dynamicStyle.whiteSpace = 'pre-wrap';
        } else if (msg.type === 'player_action') {
          if (!dynamicStyle.backgroundColor) typeSpecificClass = 'bg-indigo-600';
          if (!dynamicStyle.color) typeSpecificClass += (typeSpecificClass ? ' ' : '') + 'text-white';
          dynamicStyle.whiteSpace = 'pre-wrap';
        } else if (msg.type === 'system') {
          typeSpecificClass = 'bg-yellow-600 bg-opacity-30 text-yellow-200 border border-yellow-500 italic text-xs sm:text-sm';
          dynamicStyle.whiteSpace = 'pre-wrap';
        } else if (msg.type === 'error') {
          typeSpecificClass = 'bg-red-700 text-white';
          dynamicStyle.whiteSpace = 'pre-wrap';
        } else if (msg.type === 'page_summary') {
          typeSpecificClass = 'bg-purple-800 bg-opacity-50 text-purple-200 border border-purple-600 italic text-xs sm:text-sm mt-3 mb-2';
          dynamicStyle.whiteSpace = 'pre-wrap';
        } else {
          typeSpecificClass = 'bg-gray-600 text-gray-200';
          dynamicStyle.whiteSpace = 'pre-wrap';
        }

        return (
          <div key={msg.id} className={`flex ${msg.isPlayerInput ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`${messageBaseClass} ${typeSpecificClass} ${messageIdBeingEdited === msg.id ? 'w-full' : ''}`}
              style={dynamicStyle}
            >
              {isEditable && messageIdBeingEdited !== msg.id && (
                <button
                  onClick={() => handleStartEditForThisMessage(msg)} 
                  className="absolute top-1 right-1 p-0.5 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                  aria-label={VIETNAMESE.editButtonLabel}
                  title={VIETNAMESE.editButtonLabel}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                  </svg>
                </button>
              )}
              {messageIdBeingEdited === msg.id ? (
                <div className="mt-1">
                  <textarea
                    value={currentEditText}
                    onChange={(e) => setCurrentEditText(e.target.value)}
                    className="w-full p-2 text-sm bg-gray-600 border border-gray-500 rounded-md focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 text-gray-100 placeholder-gray-400 min-h-[80px]"
                    rows={Math.max(3, currentEditText.split('\n').length)}
                  />
                  <div className="flex justify-end space-x-2 mt-2">
                    <Button size="sm" variant="ghost" onClick={handleCancelEditInternal}>{VIETNAMESE.cancelEditButton}</Button>
                    <Button size="sm" variant="primary" onClick={() => handleSaveEditInternal(msg.id)}>{VIETNAMESE.saveEditButton}</Button>
                  </div>
                </div>
              ) : (
                <p className="leading-relaxed">
                  {React.Children.toArray(parseAndHighlightText(String(msg.content), knowledgeBase))}
                </p>
              )}
            </div>
          </div>
        );
      })}
      {(isLoadingUi && displayedMessages.length === 0 && playerStatsTurn === 0) && <Spinner text={VIETNAMESE.contactingAI} size="sm" className="my-4" />}
      {(isLoadingUi && !isSummarizingUi && isCurrentlyActivePage && displayedMessages.length > 0) && (
        <div className="text-center text-gray-400 italic py-2 mt-2 text-xs sm:text-sm">
          {VIETNAMESE.contactingAI}
        </div>
      )}
      {isSummarizingUi && (
        <div className="text-center text-gray-400 italic py-2 mt-2">
          <Spinner
            text={
              displayedMessages.some(m => m.content.includes(VIETNAMESE.creatingMissingSummary))
                ? VIETNAMESE.creatingMissingSummary
                : VIETNAMESE.summarizingAndPreparingNextPage
            }
            size="sm"
          />
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default StoryLog;