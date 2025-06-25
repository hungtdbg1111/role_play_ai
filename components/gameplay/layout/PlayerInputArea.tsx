
import React, { ChangeEvent } from 'react';
import { GameMessage, PlayerActionInputType, ResponseLength } from '../../../types';
import Button from '../../ui/Button';
import { VIETNAMESE } from '../../../constants';

interface PlayerInputAreaProps {
  latestMessageWithChoices: GameMessage | undefined;
  showAiSuggestions: boolean;
  setShowAiSuggestions: (show: boolean) => void;
  playerInput: string;
  setPlayerInput: (input: string) => void;
  currentActionType: PlayerActionInputType;
  setCurrentActionType: (type: PlayerActionInputType) => void; // Prop for setting action type
  isActionTypeDropdownOpen: boolean;
  setIsActionTypeDropdownOpen: (isOpen: boolean) => void;
  actionTypeDropdownRef: React.RefObject<HTMLDivElement | null>;
  selectedResponseLength: ResponseLength;
  setSelectedResponseLength: (length: ResponseLength) => void; // Prop for setting response length
  isResponseLengthDropdownOpen: boolean;
  setIsResponseLengthDropdownOpen: (isOpen: boolean) => void;
  responseLengthDropdownRef: React.RefObject<HTMLDivElement | null>;
  isLoadingUi: boolean;
  isSummarizingUi: boolean;
  isCurrentlyActivePage: boolean;
  messageIdBeingEdited: string | null;
  onPlayerAction: (action: string, isChoice: boolean, inputType: PlayerActionInputType, responseLength: ResponseLength) => void;
  getChoiceButtonStyles: () => React.CSSProperties;
  getResponseLengthButtonLabel: () => string;
}

const PlayerInputArea: React.FC<PlayerInputAreaProps> = ({
  latestMessageWithChoices,
  showAiSuggestions,
  setShowAiSuggestions,
  playerInput,
  setPlayerInput,
  currentActionType,
  setCurrentActionType, // Use this prop
  isActionTypeDropdownOpen,
  setIsActionTypeDropdownOpen,
  actionTypeDropdownRef,
  selectedResponseLength,
  setSelectedResponseLength, // Use this prop
  isResponseLengthDropdownOpen,
  setIsResponseLengthDropdownOpen,
  responseLengthDropdownRef,
  isLoadingUi,
  isSummarizingUi,
  isCurrentlyActivePage,
  messageIdBeingEdited,
  onPlayerAction,
  getChoiceButtonStyles,
  getResponseLengthButtonLabel,
}) => {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPlayerInput(e.target.value);
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerInput.trim() && !isLoadingUi && !isSummarizingUi && isCurrentlyActivePage) {
      onPlayerAction(playerInput.trim(), false, currentActionType, selectedResponseLength);
      setPlayerInput('');
    }
  };

  const handleChoiceClick = (choiceText: string) => {
    if (!isLoadingUi && !isSummarizingUi && isCurrentlyActivePage) {
      onPlayerAction(choiceText, true, 'action', selectedResponseLength);
      setPlayerInput('');
    }
  };

  const selectActionType = (type: PlayerActionInputType) => {
    setCurrentActionType(type); // Use prop setter
    setIsActionTypeDropdownOpen(false);
  };

  const selectResponseLength = (length: ResponseLength) => {
    setSelectedResponseLength(length); // Use prop setter
    setIsResponseLengthDropdownOpen(false);
  };

  return (
    <div className="bg-gray-800 p-2 sm:p-3 border-t border-gray-700 flex-shrink-0">
      {latestMessageWithChoices?.choices && latestMessageWithChoices.choices.length > 0 && isCurrentlyActivePage && !isSummarizingUi && (
        <div className="mb-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full text-left justify-start py-1.5 px-2 text-xs text-indigo-300 hover:text-indigo-200 mb-1"
            onClick={() => setShowAiSuggestions(!showAiSuggestions)}
          >
            {showAiSuggestions ? VIETNAMESE.hideAiSuggestionsButton : VIETNAMESE.showAiSuggestionsButton}
          </Button>
          {showAiSuggestions && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
              {latestMessageWithChoices.choices.map((choice, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full text-left justify-start py-1.5 px-2 sm:py-2 sm:px-3 text-xs sm:text-sm whitespace-normal"
                  customStyles={getChoiceButtonStyles()}
                  onClick={() => handleChoiceClick(choice.text)}
                  disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
                  title={choice.text}
                >
                  {index + 1}. {choice.text}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmitAction} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center mt-2">
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="relative flex-shrink-0 flex-grow sm:flex-grow-0" ref={responseLengthDropdownRef}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsResponseLengthDropdownOpen(!isResponseLengthDropdownOpen)}
              className="px-2 w-full sm:min-w-[120px] md:min-w-[140px] flex items-center justify-between"
              aria-haspopup="true"
              aria-expanded={isResponseLengthDropdownOpen}
              disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
            >
              <span className="truncate text-xs sm:text-sm">{getResponseLengthButtonLabel()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 sm:w-5 sm:h-5 ml-1 transition-transform duration-200 ${isResponseLengthDropdownOpen ? 'transform rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </Button>
            {isResponseLengthDropdownOpen && (
              <div className="absolute bottom-full mb-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                {(['default', 'short', 'medium', 'long'] as ResponseLength[]).map(length => (
                  <button
                    key={length}
                    type="button"
                    onClick={() => selectResponseLength(length)}
                    className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-indigo-500 ${selectedResponseLength === length ? 'bg-indigo-600 font-semibold' : 'text-gray-100'} first:rounded-t-md last:rounded-b-md`}
                    role="menuitem"
                  >
                    {
                      length === 'default' ? VIETNAMESE.responseLength_default :
                      length === 'short' ? VIETNAMESE.responseLength_short :
                      length === 'medium' ? VIETNAMESE.responseLength_medium :
                      VIETNAMESE.responseLength_long
                    }
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex-shrink-0 flex-grow sm:flex-grow-0" ref={actionTypeDropdownRef}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsActionTypeDropdownOpen(!isActionTypeDropdownOpen)}
              className="px-2 w-full sm:min-w-[100px] md:min-w-[120px] flex items-center justify-between"
              aria-haspopup="true"
              aria-expanded={isActionTypeDropdownOpen}
              disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
            >
              <span className="truncate text-xs sm:text-sm">
                {currentActionType === 'action' ? VIETNAMESE.inputTypeActionLabel : VIETNAMESE.inputTypeStoryLabel}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 sm:w-5 sm:h-5 ml-1 transition-transform duration-200 ${isActionTypeDropdownOpen ? 'transform rotate-180' : ''}`}>
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </Button>
            {isActionTypeDropdownOpen && (
              <div className="absolute bottom-full mb-1 w-full bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                <button
                  type="button"
                  onClick={() => selectActionType('action')}
                  className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-indigo-500 rounded-t-md ${currentActionType === 'action' ? 'bg-indigo-600 font-semibold' : 'text-gray-100'}`}
                  role="menuitem"
                >
                  {VIETNAMESE.inputTypeActionLabel}
                </button>
                <button
                  type="button"
                  onClick={() => selectActionType('story')}
                  className={`block w-full text-left px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm hover:bg-indigo-500 rounded-b-md ${currentActionType === 'story' ? 'bg-indigo-600 font-semibold' : 'text-gray-100'}`}
                  role="menuitem"
                >
                  {VIETNAMESE.inputTypeStoryLabel}
                </button>
              </div>
            )}
          </div>
        </div>
        <input
          type="text"
          value={playerInput}
          onChange={handleInputChange}
          placeholder={!isCurrentlyActivePage ? "Chỉ có thể hành động ở trang hiện tại nhất." : VIETNAMESE.enterAction}
          className="flex-grow p-2 sm:p-2.5 text-sm sm:text-base bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 placeholder-gray-400 transition-colors duration-150"
          disabled={isLoadingUi || isSummarizingUi || !isCurrentlyActivePage || !!messageIdBeingEdited}
          title={!isCurrentlyActivePage ? "Bạn chỉ có thể hành động ở trang hiện tại nhất của cuộc phiêu lưu." : (isSummarizingUi ? VIETNAMESE.summarizingAndPreparingNextPage : (!!messageIdBeingEdited ? "Đang sửa diễn biến..." : undefined))}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="px-3 sm:px-4 w-full sm:w-auto"
          disabled={isLoadingUi || isSummarizingUi || playerInput.trim() === "" || !isCurrentlyActivePage || !!messageIdBeingEdited}
          isLoading={isLoadingUi && playerInput.trim() !== "" && !isSummarizingUi && isCurrentlyActivePage && !messageIdBeingEdited}
          loadingText={VIETNAMESE.sendingAction}
        >
          {VIETNAMESE.sendInputButton}
        </Button>
      </form>
    </div>
  );
};

export default PlayerInputArea;
