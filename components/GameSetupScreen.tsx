
import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { GameScreen, WorldSettings, StartingSkill, StartingItem, StartingNPC, StartingLore, StartingLocation } from '../types'; // Added StartingLocation
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal'; // Import Modal
import { VIETNAMESE, DEFAULT_WORLD_SETTINGS, MAX_TOKENS_FANFIC } from '../constants';
import { generateWorldDetailsFromStory, generateFanfictionWorldDetails, countTokens, getApiSettings } from '../services/geminiService';
import InputField from './ui/InputField';

interface GameSetupScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSetupComplete: (settings: WorldSettings) => void;
}

const GameSetupScreen: React.FC<GameSetupScreenProps> = ({ setCurrentScreen, onSetupComplete }) => {
  const [settings, setSettings] = useState<WorldSettings>({
    ...DEFAULT_WORLD_SETTINGS,
    startingSkills: [...(DEFAULT_WORLD_SETTINGS.startingSkills || [])],
    startingItems: [...(DEFAULT_WORLD_SETTINGS.startingItems || [])],
    startingNPCs: [...(DEFAULT_WORLD_SETTINGS.startingNPCs || [])],
    startingLore: [...(DEFAULT_WORLD_SETTINGS.startingLore || [])],
    startingLocations: [...(DEFAULT_WORLD_SETTINGS.startingLocations || [])], 
    originalStorySummary: DEFAULT_WORLD_SETTINGS.originalStorySummary || "",
  });
  
  const [storyIdea, setStoryIdea] = useState('');
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [generatorMessage, setGeneratorMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const [fanficSourceType, setFanficSourceType] = useState<'name' | 'file'>('name');
  const [fanficStoryName, setFanficStoryName] = useState('');
  const [fanficFile, setFanficFile] = useState<File | null>(null);
  const [fanficFileContent, setFanficFileContent] = useState<string | null>(null);
  const [fanficTokenCount, setFanficTokenCount] = useState<number | null>(null);
  const [fanficPlayerDescription, setFanficPlayerDescription] = useState('');
  const [originalStorySummary, setOriginalStorySummary] = useState<string>(settings.originalStorySummary || '');
  const [showOriginalStorySummaryInput, setShowOriginalStorySummaryInput] = useState<boolean>(!!settings.originalStorySummary);
  const [isGeneratingFanficDetails, setIsGeneratingFanficDetails] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const fanficFileInputRef = useRef<HTMLInputElement>(null);

  const [isOriginalStoryIdeaNsfw, setIsOriginalStoryIdeaNsfw] = useState(false);
  const [isFanficIdeaNsfw, setIsFanficIdeaNsfw] = useState(false);

  const [rawApiResponseText, setRawApiResponseText] = useState<string | null>(null);
  const [showRawResponseModal, setShowRawResponseModal] = useState(false);


  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setSettings(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
    if (generatorMessage) setGeneratorMessage(null);
    if (rawApiResponseText) setRawApiResponseText(null); // Clear raw response on any change
  }, [generatorMessage, rawApiResponseText]);

  const handleOriginalStorySummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOriginalStorySummary(e.target.value);
    setSettings(prev => ({ ...prev, originalStorySummary: e.target.value }));
    if (rawApiResponseText) setRawApiResponseText(null); 
  };

  // --- Starting Skills Handlers ---
  const handleStartingSkillChange = (index: number, field: keyof StartingSkill, value: string) => {
    setSettings(prev => {
      const newSkills = [...prev.startingSkills];
      newSkills[index] = { ...newSkills[index], [field]: value };
      return { ...prev, startingSkills: newSkills };
    });
  };

  const addStartingSkill = () => {
    setSettings(prev => ({
      ...prev,
      startingSkills: [...prev.startingSkills, { name: '', description: '' }]
    }));
  };

  const removeStartingSkill = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingSkills: prev.startingSkills.filter((_, i) => i !== index)
    }));
  };

  // --- Starting Items Handlers ---
  const handleStartingItemChange = (index: number, field: keyof StartingItem, value: string | number) => {
    setSettings(prev => {
      const newItems = [...prev.startingItems];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, startingItems: newItems };
    });
  };

  const addStartingItem = () => {
    setSettings(prev => ({
      ...prev,
      startingItems: [...prev.startingItems, { name: '', description: '', quantity: 1, type: '' }]
    }));
  };

  const removeStartingItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingItems: prev.startingItems.filter((_, i) => i !== index)
    }));
  };

  // --- Starting NPCs Handlers ---
  const handleStartingNPCChange = (index: number, field: keyof StartingNPC, value: string | number) => {
    setSettings(prev => {
      const newNPCs = [...prev.startingNPCs];
      newNPCs[index] = { ...newNPCs[index], [field]: value };
      return { ...prev, startingNPCs: newNPCs };
    });
  };

  const addStartingNPC = () => {
    setSettings(prev => ({
      ...prev,
      startingNPCs: [...prev.startingNPCs, { name: '', personality: '', initialAffinity: 0, details: '' }]
    }));
  };

  const removeStartingNPC = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingNPCs: prev.startingNPCs.filter((_, i) => i !== index)
    }));
  };

  // --- Starting Lore Handlers ---
  const handleStartingLoreChange = (index: number, field: keyof StartingLore, value: string) => {
    setSettings(prev => {
      const newLore = [...prev.startingLore];
      newLore[index] = { ...newLore[index], [field]: value };
      return { ...prev, startingLore: newLore };
    });
  };

  const addStartingLore = () => {
    setSettings(prev => ({
      ...prev,
      startingLore: [...prev.startingLore, { title: '', content: '' }]
    }));
  };

  const removeStartingLore = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingLore: prev.startingLore.filter((_, i) => i !== index)
    }));
  };

  // --- Starting Locations Handlers ---
  const handleStartingLocationChange = (index: number, field: keyof StartingLocation, value: string | boolean) => {
    setSettings(prev => {
      const newLocations = [...prev.startingLocations];
      newLocations[index] = { ...newLocations[index], [field]: value };
      return { ...prev, startingLocations: newLocations };
    });
  };

  const addStartingLocation = () => {
    setSettings(prev => ({
      ...prev,
      startingLocations: [...prev.startingLocations, { name: '', description: '', isSafeZone: false, regionId: '' }]
    }));
  };

  const removeStartingLocation = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingLocations: prev.startingLocations.filter((_, i) => i !== index)
    }));
  };


  const handleGenerateDetails = async () => {
    if (!storyIdea.trim()) {
      setGeneratorMessage({ text: "Vui lòng nhập ý tưởng cốt truyện.", type: 'error' });
      return;
    }
    setIsGeneratingDetails(true);
    setGeneratorMessage({text: VIETNAMESE.generatingWorldDetails, type: 'info'});
    setRawApiResponseText(null); // Clear previous raw response
    try {
      const generatedElements = await generateWorldDetailsFromStory(storyIdea, isOriginalStoryIdeaNsfw);
      setRawApiResponseText(generatedElements.rawText); // Store raw response
      setSettings(prev => ({
        ...prev,
        playerName: generatedElements.response.playerName || prev.playerName,
        playerPersonality: generatedElements.response.playerPersonality || prev.playerPersonality,
        playerBackstory: generatedElements.response.playerBackstory || prev.playerBackstory,
        playerGoal: generatedElements.response.playerGoal || prev.playerGoal,
        playerStartingTraits: generatedElements.response.playerStartingTraits || prev.playerStartingTraits,
        theme: generatedElements.response.worldTheme || prev.theme,
        settingDescription: generatedElements.response.worldSettingDescription || prev.settingDescription,
        writingStyle: generatedElements.response.worldWritingStyle || prev.writingStyle,
        currencyName: generatedElements.response.currencyName || prev.currencyName,
        startingSkills: generatedElements.response.startingSkills.length > 0 ? generatedElements.response.startingSkills : prev.startingSkills,
        startingItems: generatedElements.response.startingItems.length > 0 ? generatedElements.response.startingItems : prev.startingItems,
        startingNPCs: generatedElements.response.startingNPCs.length > 0 ? generatedElements.response.startingNPCs : prev.startingNPCs,
        startingLore: generatedElements.response.startingLore.length > 0 ? generatedElements.response.startingLore : prev.startingLore,
        startingLocations: generatedElements.response.startingLocations && generatedElements.response.startingLocations.length > 0 ? generatedElements.response.startingLocations : prev.startingLocations,
        originalStorySummary: prev.originalStorySummary, 
      }));
      setGeneratorMessage({ text: VIETNAMESE.worldDetailsGeneratedSuccess, type: 'success' });
    } catch (error) {
      console.error("Error generating world details:", error);
      setGeneratorMessage({ text: `${VIETNAMESE.errorGeneratingWorldDetails} ${error instanceof Error ? error.message : ''}`, type: 'error' });
      setRawApiResponseText(null);
    } finally {
      setIsGeneratingDetails(false);
    }
  };
  
  const handleFanficFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setGeneratorMessage(null);
    setRawApiResponseText(null);
    setFanficTokenCount(null);
    setFanficFileContent(null);
    const file = e.target.files?.[0];

    if (file) {
      if (file.type !== "text/plain") {
        setGeneratorMessage({text: "Vui lòng chọn file .txt hợp lệ.", type: 'error'});
        setFanficFile(null);
        if(fanficFileInputRef.current) fanficFileInputRef.current.value = "";
        return;
      }
      setFanficFile(file);

      const { model: currentModel } = getApiSettings();

      if (currentModel === 'gemini-1.5-flash') {
        setIsLoadingTokens(false);
        setFanficTokenCount(0); // Placeholder to bypass token limit checks
        setGeneratorMessage({ text: "Đếm token bị vô hiệu hóa cho model gemini-1.5-flash.", type: 'info' });
        try {
          const text = await file.text();
          setFanficFileContent(text);
        } catch (err) {
          console.error("Error reading fanfic file:", err);
          setGeneratorMessage({text: "Lỗi khi đọc file." + (err instanceof Error ? ` ${err.message}` : ''), type: 'error'});
          setFanficFileContent(null);
        }
      } else {
        setIsLoadingTokens(true);
        setGeneratorMessage({text: VIETNAMESE.tokenCountCalculating, type: 'info'});
        try {
          const text = await file.text();
          setFanficFileContent(text);
          const tokens = await countTokens(text);
          setFanficTokenCount(tokens);
          if (tokens > MAX_TOKENS_FANFIC) {
            setGeneratorMessage({text: VIETNAMESE.tokenCountExceededError(MAX_TOKENS_FANFIC), type: 'error'});
          } else {
            setGeneratorMessage({text: `${VIETNAMESE.tokenCountLabel} ${tokens.toLocaleString()}`, type: 'success'});
          }
        } catch (err) {
          console.error("Error processing fanfic file:", err);
          setGeneratorMessage({text: VIETNAMESE.tokenCountError + (err instanceof Error ? ` ${err.message}` : ''), type: 'error'});
          setFanficFileContent(null);
          setFanficTokenCount(null);
        } finally {
          setIsLoadingTokens(false);
        }
      }
    } else {
      setFanficFile(null);
      setFanficFileContent(null);
      setFanficTokenCount(null);
    }
  };

  const handleGenerateFanficDetails = async () => {
    let sourceMaterial: string = '';
    let isSourceContent = false;
    setRawApiResponseText(null); // Clear previous raw response

    const { model: currentModel } = getApiSettings();

    if (fanficSourceType === 'name') {
      if (!fanficStoryName.trim()) {
        setGeneratorMessage({ text: VIETNAMESE.pleaseEnterStoryName, type: 'error' });
        return;
      }
      sourceMaterial = fanficStoryName.trim();
    } else { 
      if (!fanficFileContent || !fanficFile) {
        setGeneratorMessage({ text: VIETNAMESE.pleaseSelectFile, type: 'error' });
        return;
      }
      // Skip token limit check for gemini-1.5-flash
      if (currentModel !== 'gemini-1.5-flash' && fanficTokenCount && fanficTokenCount > MAX_TOKENS_FANFIC) {
        setGeneratorMessage({ text: VIETNAMESE.tokenCountExceededError(MAX_TOKENS_FANFIC), type: 'error'});
        return;
      }
      sourceMaterial = fanficFileContent;
      isSourceContent = true;
    }
    
    setIsGeneratingFanficDetails(true);
    setGeneratorMessage({text: VIETNAMESE.generatingFanficDetails, type: 'info'});
    try {
      const generatedElements = await generateFanfictionWorldDetails(sourceMaterial, isSourceContent, fanficPlayerDescription.trim(), isFanficIdeaNsfw);
      setRawApiResponseText(generatedElements.rawText); // Store raw response
      setSettings(prev => ({
        ...prev,
        playerName: generatedElements.response.playerName || prev.playerName,
        playerPersonality: generatedElements.response.playerPersonality || prev.playerPersonality,
        playerBackstory: generatedElements.response.playerBackstory || prev.playerBackstory,
        playerGoal: generatedElements.response.playerGoal || prev.playerGoal,
        playerStartingTraits: generatedElements.response.playerStartingTraits || prev.playerStartingTraits,
        theme: generatedElements.response.worldTheme || prev.theme,
        settingDescription: generatedElements.response.worldSettingDescription || prev.settingDescription,
        writingStyle: generatedElements.response.worldWritingStyle || prev.writingStyle,
        currencyName: generatedElements.response.currencyName || prev.currencyName,
        startingSkills: generatedElements.response.startingSkills.length > 0 ? generatedElements.response.startingSkills : prev.startingSkills,
        startingItems: generatedElements.response.startingItems.length > 0 ? generatedElements.response.startingItems : prev.startingItems,
        startingNPCs: generatedElements.response.startingNPCs.length > 0 ? generatedElements.response.startingNPCs : prev.startingNPCs,
        startingLore: generatedElements.response.startingLore.length > 0 ? generatedElements.response.startingLore : prev.startingLore,
        startingLocations: generatedElements.response.startingLocations && generatedElements.response.startingLocations.length > 0 ? generatedElements.response.startingLocations : prev.startingLocations,
        originalStorySummary: generatedElements.response.originalStorySummary || prev.originalStorySummary,
      }));
      if (generatedElements.response.originalStorySummary) {
        setOriginalStorySummary(generatedElements.response.originalStorySummary);
        setShowOriginalStorySummaryInput(true);
        setGeneratorMessage({ text: `${VIETNAMESE.fanficDetailsGeneratedSuccess} ${VIETNAMESE.originalStorySummaryGeneratedSuccess}`, type: 'success' });
      } else {
        setGeneratorMessage({ text: VIETNAMESE.fanficDetailsGeneratedSuccess, type: 'success' });
      }
    } catch (error) {
      console.error("Error generating fanfiction world details:", error);
      setGeneratorMessage({ text: `${VIETNAMESE.errorGeneratingFanficDetails} ${error instanceof Error ? error.message : ''}`, type: 'error' });
      setRawApiResponseText(null);
    } finally {
      setIsGeneratingFanficDetails(false);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSettings = {
        ...settings,
        originalStorySummary: originalStorySummary,
        startingNPCs: settings.startingNPCs.map(npc => ({
            ...npc,
            initialAffinity: typeof npc.initialAffinity === 'number' && !isNaN(npc.initialAffinity) ? Math.max(-100, Math.min(100, npc.initialAffinity)) : 0,
        })),
        startingItems: settings.startingItems.map(item => ({
            ...item,
            quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        }))
    };
    onSetupComplete(finalSettings);
    setCurrentScreen(GameScreen.Gameplay);
  };
  
  const { model: currentFanficModel } = getApiSettings();
  const isFanficTokenLimitExceeded = fanficSourceType === 'file' && 
                                   currentFanficModel !== 'gemini-1.5-flash' && 
                                   fanficTokenCount !== null && 
                                   fanficTokenCount > MAX_TOKENS_FANFIC;


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-gray-900 shadow-2xl rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-sky-600 mb-6 sm:mb-8">Kiến Tạo Thế Giới & Nhân Vật</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

          <fieldset className="border border-purple-700 p-3 sm:p-4 rounded-md bg-purple-900/10">
            <legend className="text-lg sm:text-xl font-semibold text-purple-400 px-2">{VIETNAMESE.storyIdeaGeneratorSection}</legend>
            <InputField
              label={VIETNAMESE.storyIdeaDescriptionLabel}
              id="storyIdea"
              name="storyIdea"
              value={storyIdea}
              onChange={(e) => { setStoryIdea(e.target.value); if (generatorMessage) setGeneratorMessage(null); if (rawApiResponseText) setRawApiResponseText(null); }}
              textarea
              rows={3}
              placeholder={VIETNAMESE.storyIdeaDescriptionPlaceholder}
              className="mt-2 text-sm sm:text-base"
            />
            <InputField
              label={VIETNAMESE.nsfwIdeaCheckboxLabel}
              id="isOriginalStoryIdeaNsfw"
              name="isOriginalStoryIdeaNsfw"
              type="checkbox"
              checked={isOriginalStoryIdeaNsfw}
              onChange={(e) => setIsOriginalStoryIdeaNsfw((e.target as HTMLInputElement).checked)}
              className="mt-1"
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleGenerateDetails}
              isLoading={isGeneratingDetails}
              loadingText={VIETNAMESE.generatingWorldDetails}
              className="mt-3 bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 w-full text-sm sm:text-base"
              size="md"
            >
              {VIETNAMESE.generateDetailsFromStoryButton}
            </Button>
          </fieldset>
          
          <fieldset className="border border-green-700 p-3 sm:p-4 rounded-md bg-green-900/10">
            <legend className="text-lg sm:text-xl font-semibold text-green-400 px-2">{VIETNAMESE.fanficStoryGeneratorSection}</legend>
            <div className="mt-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-300 mb-2">{VIETNAMESE.fanficSourceTypeLabel}</label>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-3">
                <label className="flex items-center text-gray-200 text-sm">
                  <input type="radio" name="fanficSourceType" value="name" checked={fanficSourceType === 'name'} onChange={() => { setFanficSourceType('name'); setGeneratorMessage(null); setRawApiResponseText(null); }} className="h-4 w-4 text-green-500 focus:ring-green-400 border-gray-600 bg-gray-700"/>
                  <span className="ml-2">{VIETNAMESE.fanficSourceTypeName}</span>
                </label>
                <label className="flex items-center text-gray-200 text-sm">
                  <input type="radio" name="fanficSourceType" value="file" checked={fanficSourceType === 'file'} onChange={() => { setFanficSourceType('file'); setGeneratorMessage(null); setRawApiResponseText(null);}} className="h-4 w-4 text-green-500 focus:ring-green-400 border-gray-600 bg-gray-700"/>
                  <span className="ml-2">{VIETNAMESE.fanficSourceTypeFile}</span>
                </label>
              </div>

              {fanficSourceType === 'name' && (
                <InputField
                  label={VIETNAMESE.fanficStoryNameLabel}
                  id="fanficStoryName"
                  value={fanficStoryName}
                  onChange={(e) => { setFanficStoryName(e.target.value); if (generatorMessage) setGeneratorMessage(null); if (rawApiResponseText) setRawApiResponseText(null);}}
                  placeholder={VIETNAMESE.fanficStoryNamePlaceholder}
                  className="text-sm sm:text-base"
                />
              )}
              {fanficSourceType === 'file' && (
                <div>
                  <label htmlFor="fanficFile" className="block text-xs sm:text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.fanficFileUploadLabel}</label>
                  <input
                    type="file"
                    id="fanficFile"
                    ref={fanficFileInputRef}
                    accept=".txt,text/plain"
                    onChange={handleFanficFileChange}
                    className="w-full text-xs sm:text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-md file:mr-2 file:py-1.5 file:px-2 sm:file:mr-3 sm:file:py-2 sm:file:px-3 file:rounded-l-md file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  {isLoadingTokens && currentFanficModel !== 'gemini-1.5-flash' && <Spinner size="sm" text={VIETNAMESE.tokenCountCalculating} className="mt-2" />}
                </div>
              )}
               <InputField
                  label={VIETNAMESE.fanficPlayerDescriptionLabel}
                  id="fanficPlayerDescription"
                  value={fanficPlayerDescription}
                  onChange={(e) => { setFanficPlayerDescription(e.target.value); if (generatorMessage) setGeneratorMessage(null); if (rawApiResponseText) setRawApiResponseText(null);}}
                  textarea
                  rows={2}
                  placeholder={VIETNAMESE.fanficPlayerDescriptionPlaceholder}
                  className="mt-3 text-sm sm:text-base"
                />
                <InputField
                  label={VIETNAMESE.nsfwIdeaCheckboxLabel}
                  id="isFanficIdeaNsfw"
                  name="isFanficIdeaNsfw"
                  type="checkbox"
                  checked={isFanficIdeaNsfw}
                  onChange={(e) => setIsFanficIdeaNsfw((e.target as HTMLInputElement).checked)}
                  className="mt-1"
                />
              <div className="mt-3">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOriginalStorySummaryInput(prev => !prev)}
                    className="text-green-400 hover:text-green-300 border-green-500 mb-2 text-xs sm:text-sm"
                >
                    {showOriginalStorySummaryInput ? 'Ẩn Tóm Tắt Nguyên Tác' : VIETNAMESE.addOriginalStorySummaryButton}
                </Button>
                {showOriginalStorySummaryInput && (
                    <InputField
                        label={VIETNAMESE.originalStorySummaryLabel}
                        id="originalStorySummary" 
                        name="originalStorySummary" 
                        value={originalStorySummary}
                        onChange={handleOriginalStorySummaryChange}
                        textarea
                        rows={6}
                        placeholder={VIETNAMESE.originalStorySummaryPlaceholder}
                        className="min-h-[120px] sm:min-h-[150px] text-sm sm:text-base"
                    />
                )}
              </div>

              <Button
                type="button"
                variant="primary"
                onClick={handleGenerateFanficDetails}
                isLoading={isGeneratingFanficDetails}
                loadingText={VIETNAMESE.generatingFanficDetails}
                className="mt-3 bg-green-600 hover:bg-green-700 focus:ring-green-500 w-full text-sm sm:text-base"
                size="md"
                disabled={isLoadingTokens || isFanficTokenLimitExceeded}
              >
                {VIETNAMESE.generateFanficButton}
              </Button>
            </div>
          </fieldset>
          
           {generatorMessage && (
            <div className={`my-3 p-2 sm:p-3 text-xs sm:text-sm rounded-md border ${
                generatorMessage.type === 'success' ? 'bg-green-600/20 text-green-300 border-green-500' :
                generatorMessage.type === 'error' ? 'bg-red-600/20 text-red-300 border-red-500' :
                'bg-blue-600/20 text-blue-300 border-blue-500'
            }`}>
              {generatorMessage.text}
            </div>
          )}
          {rawApiResponseText && generatorMessage?.type === 'success' && (
             <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowRawResponseModal(true)}
                className="mt-2 text-sky-400 hover:text-sky-300 border-sky-500 text-xs w-full"
            >
                {VIETNAMESE.viewRawAiResponseButton || "Xem Phản Hồi Thô Từ AI"}
            </Button>
          )}


          <fieldset className="border border-gray-700 p-3 sm:p-4 rounded-md">
            <legend className="text-lg sm:text-xl font-semibold text-indigo-400 px-2">Thông Tin Nhân Vật</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4 mt-3 sm:mt-4">
              <InputField label={VIETNAMESE.characterName} id="playerName" name="playerName" value={settings.playerName} onChange={handleChange} className="text-sm sm:text-base"/>
              <InputField label={VIETNAMESE.gender} id="playerGender" name="playerGender" value={settings.playerGender} onChange={handleChange} type="select" options={['Nam', 'Nữ', 'Khác']} className="text-sm sm:text-base"/>
            </div>
            <InputField label={VIETNAMESE.personality} id="playerPersonality" name="playerPersonality" value={settings.playerPersonality} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.backstory} id="playerBackstory" name="playerBackstory" value={settings.playerBackstory} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.goal} id="playerGoal" name="playerGoal" value={settings.playerGoal} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.startingTraits} id="playerStartingTraits" name="playerStartingTraits" value={settings.playerStartingTraits} onChange={handleChange} className="text-sm sm:text-base"/>
          </fieldset>

          <fieldset className="border border-gray-700 p-3 sm:p-4 rounded-md">
            <legend className="text-lg sm:text-xl font-semibold text-indigo-400 px-2">Thiết Lập Thế Giới</legend>
            <InputField label={VIETNAMESE.worldTheme} id="theme" name="theme" value={settings.theme} onChange={handleChange} className="mt-3 sm:mt-4 text-sm sm:text-base" />
            <InputField label={VIETNAMESE.worldSetting} id="settingDescription" name="settingDescription" value={settings.settingDescription} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.writingStyle} id="writingStyle" name="writingStyle" value={settings.writingStyle} onChange={handleChange} className="text-sm sm:text-base"/>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
              <InputField label={VIETNAMESE.difficulty} id="difficulty" name="difficulty" value={settings.difficulty} onChange={handleChange} type="select" options={['Dễ', 'Thường', 'Khó']} className="text-sm sm:text-base"/>
              <InputField label={VIETNAMESE.currencyName} id="currencyName" name="currencyName" value={settings.currencyName} onChange={handleChange} className="text-sm sm:text-base"/>
            </div>
            <InputField
              label={VIETNAMESE.nsfwModeLabel} id="nsfwMode" name="nsfwMode"
              type="checkbox" checked={settings.nsfwMode} onChange={handleChange} className="mt-1" 
            />
          </fieldset>

          {/* Collapsible Sections for Starting Elements */}
          {(['startingSkills', 'startingItems', 'startingNPCs', 'startingLore', 'startingLocations'] as const).map(section => {
            const sectionConfig = {
              startingSkills: { title: VIETNAMESE.startingSkillsSection, addFunc: addStartingSkill, removeFunc: removeStartingSkill, items: settings.startingSkills, renderFunc: (item: StartingSkill, index: number) => (
                <>
                  <InputField label={`${VIETNAMESE.skillNameLabel} #${index + 1}`} id={`skillName-${index}`} value={item.name} onChange={(e) => handleStartingSkillChange(index, 'name', e.target.value)} placeholder="Ví dụ: Hỏa Cầu Thuật" className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.skillDescriptionLabel} id={`skillDesc-${index}`} value={item.description} onChange={(e) => handleStartingSkillChange(index, 'description', e.target.value)} textarea placeholder="Mô tả kỹ năng..." className="text-sm sm:text-base"/>
                </>
              ), addButtonText: VIETNAMESE.addStartingSkill, removeButtonText: "Xóa"},
              startingItems: { title: VIETNAMESE.startingItemsSection, addFunc: addStartingItem, removeFunc: removeStartingItem, items: settings.startingItems, renderFunc: (item: StartingItem, index: number) => (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-4">
                    <InputField label={`${VIETNAMESE.itemNameLabel} #${index + 1}`} id={`itemName-${index}`} value={item.name} onChange={(e) => handleStartingItemChange(index, 'name', e.target.value)} placeholder="Ví dụ: Tẩy Tủy Đan" className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.itemTypeLabel} id={`itemType-${index}`} value={item.type} onChange={(e) => handleStartingItemChange(index, 'type', e.target.value)} placeholder="Đan dược" className="text-sm sm:text-base"/>
                  </div>
                  <InputField label={VIETNAMESE.itemDescriptionLabel} id={`itemDesc-${index}`} value={item.description} onChange={(e) => handleStartingItemChange(index, 'description', e.target.value)} textarea placeholder="Mô tả vật phẩm..." className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.itemQuantityLabel} id={`itemQuantity-${index}`} type="number" value={item.quantity} onChange={(e) => { const val = parseInt(e.target.value, 10); handleStartingItemChange(index, 'quantity', isNaN(val) || val < 1 ? 1 : val );}} min={1} className="text-sm sm:text-base"/>
                </>
              ), addButtonText: VIETNAMESE.addStartingItem, removeButtonText: "Xóa"},
              startingNPCs: { title: VIETNAMESE.startingNPCsSection, addFunc: addStartingNPC, removeFunc: removeStartingNPC, items: settings.startingNPCs, renderFunc: (item: StartingNPC, index: number) => (
                <>
                  <InputField label={`${VIETNAMESE.npcNameLabel} #${index + 1}`} id={`npcName-${index}`} value={item.name} onChange={(e) => handleStartingNPCChange(index, 'name', e.target.value)} placeholder="Ví dụ: Lão Ăn Mày Bí Ẩn" className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.npcPersonalityLabel} id={`npcPersonality-${index}`} value={item.personality} onChange={(e) => handleStartingNPCChange(index, 'personality', e.target.value)} textarea placeholder="Kỳ quái, hay giúp người,..." className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.npcAffinityLabel} id={`npcAffinity-${index}`} type="number" value={item.initialAffinity} onChange={(e) => { const rawValue = e.target.value; let numericValue = parseInt(rawValue, 10); if (rawValue.trim() === '') { numericValue = 0; } else if (isNaN(numericValue)) { const currentVal = settings.startingNPCs[index].initialAffinity; numericValue = typeof currentVal === 'number' && !isNaN(currentVal) ? currentVal : 0; } else { numericValue = Math.max(-100, Math.min(100, numericValue)); } handleStartingNPCChange(index, 'initialAffinity', numericValue); }} min="-100" max="100" step="1" className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.npcDetailsLabel} id={`npcDetails-${index}`} value={item.details} onChange={(e) => handleStartingNPCChange(index, 'details', e.target.value)} textarea placeholder="Mô tả thêm về NPC, vai trò, hoặc tiểu sử ngắn..." className="text-sm sm:text-base"/>
                </>
              ), addButtonText: VIETNAMESE.addStartingNPC, removeButtonText: "Xóa"},
              startingLore: { title: VIETNAMESE.startingLoreSection, addFunc: addStartingLore, removeFunc: removeStartingLore, items: settings.startingLore, renderFunc: (item: StartingLore, index: number) => (
                <>
                  <InputField label={`${VIETNAMESE.loreTitleLabel} #${index + 1}`} id={`loreTitle-${index}`} value={item.title} onChange={(e) => handleStartingLoreChange(index, 'title', e.target.value)} placeholder="Ví dụ: Sự Tích Thanh Vân Kiếm" className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.loreContentLabel} id={`loreContent-${index}`} value={item.content} onChange={(e) => handleStartingLoreChange(index, 'content', e.target.value)} textarea placeholder="Nội dung chi tiết về tri thức này..." className="text-sm sm:text-base"/>
                </>
              ), addButtonText: VIETNAMESE.addStartingLore, removeButtonText: "Xóa"},
              startingLocations: { title: VIETNAMESE.startingLocationsSection, addFunc: addStartingLocation, removeFunc: removeStartingLocation, items: settings.startingLocations, renderFunc: (item: StartingLocation, index: number) => (
                <>
                  <InputField label={`${VIETNAMESE.locationNameLabel} #${index + 1}`} id={`locationName-${index}`} value={item.name} onChange={(e) => handleStartingLocationChange(index, 'name', e.target.value)} placeholder="Ví dụ: Thôn Tân Thủ" className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.locationDescriptionLabel} id={`locationDesc-${index}`} value={item.description} onChange={(e) => handleStartingLocationChange(index, 'description', e.target.value)} textarea placeholder="Mô tả chi tiết về địa điểm..." className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.locationIsSafeZoneLabel} id={`locationSafeZone-${index}`} type="checkbox" checked={item.isSafeZone || false} onChange={(e) => handleStartingLocationChange(index, 'isSafeZone', (e.target as HTMLInputElement).checked)} className="text-sm sm:text-base"/>
                  <InputField label={VIETNAMESE.locationRegionIdLabel} id={`locationRegion-${index}`} value={item.regionId || ''} onChange={(e) => handleStartingLocationChange(index, 'regionId', e.target.value)} placeholder="Ví dụ: Đồng Bằng Trung Tâm" className="text-sm sm:text-base"/>
                </>
              ), addButtonText: VIETNAMESE.addStartingLocation, removeButtonText: "Xóa"},
            }[section];

            return (
              <details key={section} className="border border-gray-700 rounded-md group" open={sectionConfig.items.length > 0}>
                <summary className="p-3 sm:p-4 cursor-pointer text-lg sm:text-xl font-semibold text-indigo-400 group-hover:bg-gray-800/60 rounded-t-md transition-colors">
                  {sectionConfig.title} ({sectionConfig.items.length})
                </summary>
                <div className="p-3 sm:p-4 border-t border-gray-700 bg-gray-800/30 rounded-b-md">
                  {sectionConfig.items.map((item, index) => (
                    <div key={`${section}-${index}-${(item as any).name || (item as any).title || index}`} className="p-2 sm:p-3 border border-gray-600 rounded-md my-2 sm:my-3 bg-gray-800/50 relative">
                      {sectionConfig.renderFunc(item as any, index)}
                      <Button type="button" variant="danger" size="sm" onClick={() => sectionConfig.removeFunc(index)} className="absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 py-0.5 sm:px-2 sm:py-1 text-xs" aria-label={`${sectionConfig.removeButtonText} #${index + 1}`}>{sectionConfig.removeButtonText}</Button>
                    </div>
                  ))}
                  <Button type="button" variant="ghost" onClick={sectionConfig.addFunc} className="text-indigo-400 hover:text-indigo-300 border-indigo-500 mt-2 text-sm sm:text-base">
                    {sectionConfig.addButtonText}
                  </Button>
                </div>
              </details>
            );
          })}
          
          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 sm:pt-6 gap-3 sm:gap-0">
             <Button type="button" variant="ghost" onClick={() => setCurrentScreen(GameScreen.Initial)} size="md" className="w-full sm:w-auto text-sm sm:text-base">
              {VIETNAMESE.goBackButton}
            </Button>
            <Button type="submit" variant="primary" size="lg" className="w-full sm:w-auto text-sm sm:text-base">
              {VIETNAMESE.startGame}
            </Button>
          </div>
        </form>
      </div>

      {showRawResponseModal && rawApiResponseText && (
        <Modal
          isOpen={showRawResponseModal}
          onClose={() => setShowRawResponseModal(false)}
          title={VIETNAMESE.rawAiResponseModalTitle || "Phản Hồi Thô Từ AI"}
        >
          <div className="bg-gray-700 p-3 rounded-md max-h-[60vh] overflow-y-auto custom-scrollbar">
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all">
              {rawApiResponseText}
            </pre>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default GameSetupScreen;
