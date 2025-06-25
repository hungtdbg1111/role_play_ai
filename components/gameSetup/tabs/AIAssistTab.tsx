import React, { ChangeEvent, useRef } from 'react';
import { WorldSettings, GenreType } from '../../../types';
import Button from '../../ui/Button';
import InputField from '../../ui/InputField';
import { VIETNAMESE, MAX_TOKENS_FANFIC, CUSTOM_GENRE_VALUE } from '../../../constants';

interface AIAssistTabProps {
  settings: WorldSettings; // For genre, isCultivationEnabled, customGenreName
  storyIdea: string;
  setStoryIdea: (value: string) => void;
  isOriginalStoryIdeaNsfw: boolean;
  setIsOriginalStoryIdeaNsfw: (value: boolean) => void;
  handleGenerateFromStoryIdea: () => void;
  isGeneratingDetails: boolean;

  fanficSourceType: 'name' | 'file';
  setFanficSourceType: (value: 'name' | 'file') => void;
  fanficStoryName: string;
  setFanficStoryName: (value: string) => void;
  fanficFile: File | null;
  handleFanficFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  fanficTokenCount: number | null;
  isLoadingTokens: boolean;
  fanficPlayerDescription: string;
  setFanficPlayerDescription: (value: string) => void;
  isFanficIdeaNsfw: boolean;
  setIsFanficIdeaNsfw: (value: boolean) => void;
  handleGenerateFromFanfic: () => void;
  isGeneratingFanficDetails: boolean;

  originalStorySummary: string;
  handleOriginalStorySummaryChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  showOriginalStorySummaryInput: boolean;
  setShowOriginalStorySummaryInput: (value: boolean) => void;
  fanficFileInputRef: React.RefObject<HTMLInputElement>;
}

const AIAssistTab: React.FC<AIAssistTabProps> = ({
  settings,
  storyIdea, setStoryIdea,
  isOriginalStoryIdeaNsfw, setIsOriginalStoryIdeaNsfw,
  handleGenerateFromStoryIdea, isGeneratingDetails,
  fanficSourceType, setFanficSourceType,
  fanficStoryName, setFanficStoryName,
  fanficFile, handleFanficFileChange,
  fanficTokenCount, isLoadingTokens,
  fanficPlayerDescription, setFanficPlayerDescription,
  isFanficIdeaNsfw, setIsFanficIdeaNsfw,
  handleGenerateFromFanfic, isGeneratingFanficDetails,
  originalStorySummary, handleOriginalStorySummaryChange,
  showOriginalStorySummaryInput, setShowOriginalStorySummaryInput,
  fanficFileInputRef
}) => {
  return (
    <div className="space-y-6">
      <fieldset className="border border-indigo-700 p-4 rounded-md bg-indigo-900/10">
        <legend className="text-lg font-semibold text-indigo-300 px-2">{VIETNAMESE.storyIdeaGeneratorSection}</legend>
        <InputField
          label={VIETNAMESE.storyIdeaDescriptionLabel}
          id="storyIdea"
          name="storyIdea"
          value={storyIdea}
          onChange={(e) => setStoryIdea(e.target.value)}
          textarea
          rows={4}
          placeholder={VIETNAMESE.storyIdeaDescriptionPlaceholder}
        />
        <InputField
          label={VIETNAMESE.nsfwIdeaCheckboxLabel}
          id="isOriginalStoryIdeaNsfw"
          name="isOriginalStoryIdeaNsfw"
          type="checkbox"
          checked={isOriginalStoryIdeaNsfw}
          onChange={(e) => setIsOriginalStoryIdeaNsfw((e.target as HTMLInputElement).checked)}
        />
        <Button
          onClick={handleGenerateFromStoryIdea}
          isLoading={isGeneratingDetails}
          disabled={isGeneratingDetails || isGeneratingFanficDetails}
          variant="primary"
          className="w-full sm:w-auto"
          loadingText={VIETNAMESE.generatingWorldDetails}
        >
          {VIETNAMESE.generateDetailsFromStoryButton}
        </Button>
      </fieldset>

      <fieldset className="border border-teal-700 p-4 rounded-md bg-teal-900/10">
        <legend className="text-lg font-semibold text-teal-300 px-2">{VIETNAMESE.fanficStoryGeneratorSection}</legend>
        <InputField
          label={VIETNAMESE.fanficSourceTypeLabel}
          id="fanficSourceType"
          type="select"
          options={[VIETNAMESE.fanficSourceTypeName, VIETNAMESE.fanficSourceTypeFile]}
          value={fanficSourceType === 'name' ? VIETNAMESE.fanficSourceTypeName : VIETNAMESE.fanficSourceTypeFile}
          onChange={(e) => setFanficSourceType(e.target.value === VIETNAMESE.fanficSourceTypeName ? 'name' : 'file')}
        />
        {fanficSourceType === 'name' ? (
          <InputField
            label={VIETNAMESE.fanficStoryNameLabel}
            id="fanficStoryName"
            value={fanficStoryName}
            onChange={(e) => setFanficStoryName(e.target.value)}
            placeholder={VIETNAMESE.fanficStoryNamePlaceholder}
          />
        ) : (
          <div>
            <label htmlFor="fanficFile" className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.fanficFileUploadLabel}</label>
            <input
              type="file"
              id="fanficFile"
              accept=".txt,text/plain"
              onChange={handleFanficFileChange}
              ref={fanficFileInputRef}
              className="w-full p-2 text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-md file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
            {(isLoadingTokens || fanficTokenCount !== null) && (
              <p className="mt-1 text-xs text-gray-400">
                {isLoadingTokens ? VIETNAMESE.tokenCountCalculating :
                 fanficTokenCount !== null ? `${VIETNAMESE.tokenCountLabel} ${fanficTokenCount.toLocaleString()}` : ''}
              </p>
            )}
          </div>
        )}
        <InputField
          label={VIETNAMESE.fanficPlayerDescriptionLabel}
          id="fanficPlayerDescription"
          value={fanficPlayerDescription}
          onChange={(e) => setFanficPlayerDescription(e.target.value)}
          textarea
          rows={2}
          placeholder={VIETNAMESE.fanficPlayerDescriptionPlaceholder}
        />
        <InputField
          label={VIETNAMESE.nsfwIdeaCheckboxLabel}
          id="isFanficIdeaNsfw"
          name="isFanficIdeaNsfw"
          type="checkbox"
          checked={isFanficIdeaNsfw}
          onChange={(e) => setIsFanficIdeaNsfw((e.target as HTMLInputElement).checked)}
        />
        <Button
          onClick={handleGenerateFromFanfic}
          isLoading={isGeneratingFanficDetails}
          disabled={isGeneratingDetails || isGeneratingFanficDetails || isLoadingTokens || (fanficSourceType === 'file' && (!fanficFile || (fanficTokenCount !== null && fanficTokenCount > MAX_TOKENS_FANFIC)))}
          variant="primary"
          className="w-full sm:w-auto mt-2 bg-teal-600 hover:bg-teal-700 focus:ring-teal-500"
          loadingText={VIETNAMESE.generatingFanficDetails}
        >
          {VIETNAMESE.generateFanficButton}
        </Button>
      </fieldset>

      <div className="mt-4">
        <Button
          onClick={() => setShowOriginalStorySummaryInput(!showOriginalStorySummaryInput)}
          variant="ghost"
          className="text-sm text-gray-400 hover:text-gray-200 mb-2"
        >
          {showOriginalStorySummaryInput ? `Ẩn ${VIETNAMESE.originalStorySummaryLabel}` : VIETNAMESE.addOriginalStorySummaryButton}
        </Button>
        {showOriginalStorySummaryInput && (
          <InputField
            label={`${VIETNAMESE.originalStorySummaryLabel}${isGeneratingFanficDetails && !originalStorySummary ? " (AI đang tạo...)" : ""}`}
            id="originalStorySummary"
            name="originalStorySummary"
            value={originalStorySummary}
            onChange={handleOriginalStorySummaryChange}
            textarea
            rows={8}
            placeholder={VIETNAMESE.originalStorySummaryPlaceholder}
            disabled={isGeneratingFanficDetails && !originalStorySummary}
          />
        )}
      </div>
    </div>
  );
};

export default AIAssistTab;
