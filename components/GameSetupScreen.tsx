
import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { GameScreen, WorldSettings, StartingSkill, StartingItem, StartingNPC, StartingLore, StartingLocation } from '../types'; // Added StartingLocation
import Button from './ui/Button';
import Spinner from './ui/Spinner';
import Modal from './ui/Modal'; // Import Modal
import InputField from './ui/InputField';
import { VIETNAMESE, DEFAULT_WORLD_SETTINGS, MAX_TOKENS_FANFIC } from '../constants';
import { generateWorldDetailsFromStory, generateFanfictionWorldDetails, countTokens, getApiSettings } from '../services/geminiService';

interface GameSetupScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSetupComplete: (settings: WorldSettings) => void;
}

type SetupTab = 'aiAssist' | 'characterStory' | 'worldSettings' | 'startingElements';

const activeTabStyle = "whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm border-indigo-500 text-indigo-400 focus:outline-none";
const inactiveTabStyle = "whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 focus:outline-none";


const GameSetupScreen: React.FC<GameSetupScreenProps> = ({ setCurrentScreen, onSetupComplete }) => {
  const [settings, setSettings] = useState<WorldSettings>({
    ...DEFAULT_WORLD_SETTINGS,
    saveGameName: DEFAULT_WORLD_SETTINGS.saveGameName || '',
    startingSkills: [...(DEFAULT_WORLD_SETTINGS.startingSkills || [])],
    startingItems: [...(DEFAULT_WORLD_SETTINGS.startingItems || [])],
    startingNPCs: [...(DEFAULT_WORLD_SETTINGS.startingNPCs || [])],
    startingLore: [...(DEFAULT_WORLD_SETTINGS.startingLore || [])],
    startingLocations: [...(DEFAULT_WORLD_SETTINGS.startingLocations || [])],
    originalStorySummary: DEFAULT_WORLD_SETTINGS.originalStorySummary || "",
    heThongCanhGioi: DEFAULT_WORLD_SETTINGS.heThongCanhGioi,
    canhGioiKhoiDau: DEFAULT_WORLD_SETTINGS.canhGioiKhoiDau,
  });

  const [activeTab, setActiveTab] = useState<SetupTab>('aiAssist');

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
  const importSettingsFileRef = useRef<HTMLInputElement>(null);
  
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
    if (name === 'playerName' && !settings.saveGameName) {
        setSettings(prev => ({ ...prev, saveGameName: VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", value) }))
    }
    if (generatorMessage) setGeneratorMessage(null);
    if (rawApiResponseText) setRawApiResponseText(null);
  }, [generatorMessage, rawApiResponseText, settings.saveGameName]);

  const handleOriginalStorySummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSummary = e.target.value;
    setOriginalStorySummary(newSummary);
    setSettings(prev => ({ ...prev, originalStorySummary: newSummary }));
    if (rawApiResponseText) setRawApiResponseText(null);
  };

  // --- Starting Skills Handlers ---
  const handleStartingSkillChange = (index: number, field: keyof StartingSkill, value: string) => {
    setSettings(prev => {
      const newSkills = [...(prev.startingSkills || [])];
      newSkills[index] = { ...newSkills[index], [field]: value };
      return { ...prev, startingSkills: newSkills };
    });
  };

  const addStartingSkill = () => {
    setSettings(prev => ({
      ...prev,
      startingSkills: [...(prev.startingSkills || []), { name: '', description: '' }]
    }));
  };

  const removeStartingSkill = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingSkills: (prev.startingSkills || []).filter((_, i) => i !== index)
    }));
  };

  // --- Starting Items Handlers ---
  const handleStartingItemChange = (index: number, field: keyof StartingItem, value: string | number) => {
    setSettings(prev => {
      const newItems = [...(prev.startingItems || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, startingItems: newItems };
    });
  };

  const addStartingItem = () => {
    setSettings(prev => ({
      ...prev,
      startingItems: [...(prev.startingItems || []), { name: '', description: '', quantity: 1, type: '' }]
    }));
  };

  const removeStartingItem = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingItems: (prev.startingItems || []).filter((_, i) => i !== index)
    }));
  };

  // --- Starting NPCs Handlers ---
  const handleStartingNPCChange = (index: number, field: keyof StartingNPC, value: string | number) => {
    setSettings(prev => {
      const newNPCs = [...(prev.startingNPCs || [])];
      newNPCs[index] = { ...newNPCs[index], [field]: value };
      return { ...prev, startingNPCs: newNPCs };
    });
  };

  const addStartingNPC = () => {
    setSettings(prev => ({
      ...prev,
      startingNPCs: [...(prev.startingNPCs || []), { name: '', personality: '', initialAffinity: 0, details: '' }]
    }));
  };

  const removeStartingNPC = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingNPCs: (prev.startingNPCs || []).filter((_, i) => i !== index)
    }));
  };

  // --- Starting Lore Handlers ---
  const handleStartingLoreChange = (index: number, field: keyof StartingLore, value: string) => {
    setSettings(prev => {
      const newLore = [...(prev.startingLore || [])];
      newLore[index] = { ...newLore[index], [field]: value };
      return { ...prev, startingLore: newLore };
    });
  };

  const addStartingLore = () => {
    setSettings(prev => ({
      ...prev,
      startingLore: [...(prev.startingLore || []), { title: '', content: '' }]
    }));
  };

  const removeStartingLore = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingLore: (prev.startingLore || []).filter((_, i) => i !== index)
    }));
  };

  // --- Starting Locations Handlers ---
  const handleStartingLocationChange = (index: number, field: keyof StartingLocation, value: string | boolean) => {
    setSettings(prev => {
      const newLocations = [...(prev.startingLocations || [])];
      newLocations[index] = { ...newLocations[index], [field]: value };
      return { ...prev, startingLocations: newLocations };
    });
  };

  const addStartingLocation = () => {
    setSettings(prev => ({
      ...prev,
      startingLocations: [...(prev.startingLocations || []), { name: '', description: '', isSafeZone: false, regionId: '' }]
    }));
  };

  const removeStartingLocation = (index: number) => {
    setSettings(prev => ({
      ...prev,
      startingLocations: (prev.startingLocations || []).filter((_, i) => i !== index)
    }));
  };


  const handleGenerateDetails = async () => {
    if (!storyIdea.trim()) {
      setGeneratorMessage({ text: "Vui lòng nhập ý tưởng cốt truyện.", type: 'error' });
      return;
    }
    setIsGeneratingDetails(true);
    setGeneratorMessage({text: VIETNAMESE.generatingWorldDetails, type: 'info'});
    setRawApiResponseText(null);
    try {
      const generatedElements = await generateWorldDetailsFromStory(storyIdea, isOriginalStoryIdeaNsfw);
      setRawApiResponseText(generatedElements.rawText);
      const newSummary = generatedElements.response.originalStorySummary || "";
      setOriginalStorySummary(newSummary); 
      setShowOriginalStorySummaryInput(!!newSummary); 

      setSettings(prev => ({
        ...prev,
        saveGameName: generatedElements.response.saveGameName || prev.saveGameName || VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", generatedElements.response.playerName || prev.playerName || "Tân Đạo Hữu"),
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
        startingLocations: generatedElements.response.startingLocations && generatedElements.response.startingLocations.length > 0 ? generatedElements.response.startingLocations : (prev.startingLocations || []),
        heThongCanhGioi: generatedElements.response.heThongCanhGioi || prev.heThongCanhGioi,
        canhGioiKhoiDau: generatedElements.response.canhGioiKhoiDau || prev.canhGioiKhoiDau,
        originalStorySummary: newSummary, 
      }));
      setGeneratorMessage({ text: VIETNAMESE.worldDetailsGeneratedSuccess, type: 'success' });
    } catch (error) {
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
        setFanficTokenCount(0);
        setGeneratorMessage({ text: "Đếm token bị vô hiệu hóa cho model gemini-1.5-flash.", type: 'info' });
        try {
          const text = await file.text();
          setFanficFileContent(text);
        } catch (err) {
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
    setRawApiResponseText(null);

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
      setRawApiResponseText(generatedElements.rawText);
      const newSummary = generatedElements.response.originalStorySummary || "";
      setOriginalStorySummary(newSummary);
      setShowOriginalStorySummaryInput(!!newSummary || newSummary === ""); 

      setSettings(prev => ({
        ...prev,
        saveGameName: generatedElements.response.saveGameName || prev.saveGameName || VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", generatedElements.response.playerName || prev.playerName || "Tân Đạo Hữu"),
        playerName: generatedElements.response.playerName || prev.playerName,
        playerPersonality: generatedElements.response.playerPersonality || prev.playerPersonality,
        playerBackstory: generatedElements.response.playerBackstory || prev.playerBackstory,
        playerGoal: generatedElements.response.playerGoal || prev.playerGoal,
        playerStartingTraits: generatedElements.response.playerStartingTraits || prev.playerStartingTraits,
        theme: generatedElements.response.worldTheme || prev.theme,
        settingDescription: generatedElements.response.worldSettingDescription || prev.settingDescription,
        writingStyle: generatedElements.response.worldWritingStyle || prev.writingStyle,
        currencyName: generatedElements.response.currencyName || prev.currencyName,
        startingSkills: generatedElements.response.startingSkills.length > 0 ? generatedElements.response.startingSkills : (prev.startingSkills || []),
        startingItems: generatedElements.response.startingItems.length > 0 ? generatedElements.response.startingItems : (prev.startingItems || []),
        startingNPCs: generatedElements.response.startingNPCs.length > 0 ? generatedElements.response.startingNPCs : (prev.startingNPCs || []),
        startingLore: generatedElements.response.startingLore.length > 0 ? generatedElements.response.startingLore : (prev.startingLore || []),
        startingLocations: generatedElements.response.startingLocations && generatedElements.response.startingLocations.length > 0 ? generatedElements.response.startingLocations : (prev.startingLocations || []),
        originalStorySummary: newSummary,
        heThongCanhGioi: generatedElements.response.heThongCanhGioi || prev.heThongCanhGioi,
        canhGioiKhoiDau: generatedElements.response.canhGioiKhoiDau || prev.canhGioiKhoiDau,
      }));
      if (newSummary) {
        setGeneratorMessage({ text: `${VIETNAMESE.fanficDetailsGeneratedSuccess} ${VIETNAMESE.originalStorySummaryGeneratedSuccess}`, type: 'success' });
      } else {
        setGeneratorMessage({ text: VIETNAMESE.fanficDetailsGeneratedSuccess, type: 'success' });
      }
    } catch (error) {
      setGeneratorMessage({ text: `${VIETNAMESE.errorGeneratingFanficDetails} ${error instanceof Error ? error.message : ''}`, type: 'error' });
      setRawApiResponseText(null);
    } finally {
      setIsGeneratingFanficDetails(false);
    }
  };

  const handleExportSettings = () => {
    try {
      const currentFullSettings = { ...settings, originalStorySummary: originalStorySummary };
      const jsonString = JSON.stringify(currentFullSettings, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (settings.saveGameName || settings.playerName || settings.theme || 'world-setup').replace(/[^a-z0-9_-\s]/gi, '').replace(/\s+/g, '-').toLowerCase();
      link.download = `daodoai-world-setup-${safeName}.json`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setGeneratorMessage({ text: VIETNAMESE.worldSettingsExportedSuccess, type: 'success' });
    } catch (error) {
      setGeneratorMessage({ text: VIETNAMESE.errorExportingWorldSettings + (error instanceof Error ? ` ${error.message}` : ''), type: 'error' });
    }
  };

  const handleImportSettingsFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setGeneratorMessage(null);

    if (file) {
      if (file.type !== "application/json") {
        setGeneratorMessage({ text: VIETNAMESE.selectJsonFileForWorldSettings, type: 'error' });
        if(importSettingsFileRef.current) importSettingsFileRef.current.value = "";
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileContent = event.target?.result;
        if (typeof fileContent === 'string' && fileContent.trim() !== '') {
            try {
                const importedData = JSON.parse(fileContent) as Partial<WorldSettings>;
                if (!importedData || typeof importedData !== 'object') {
                    throw new Error(VIETNAMESE.invalidWorldSettingsFile + " (Dữ liệu không phải object hoặc null sau khi parse.)");
                }
                
                setSettings(prev => ({
                    ...DEFAULT_WORLD_SETTINGS, 
                    ...importedData,
                    saveGameName: importedData.saveGameName || DEFAULT_WORLD_SETTINGS.saveGameName,      
                    startingSkills: Array.isArray(importedData.startingSkills) ? importedData.startingSkills : [],
                    startingItems: Array.isArray(importedData.startingItems) ? importedData.startingItems : [],
                    startingNPCs: Array.isArray(importedData.startingNPCs) ? importedData.startingNPCs : [],
                    startingLore: Array.isArray(importedData.startingLore) ? importedData.startingLore : [],
                    startingLocations: Array.isArray(importedData.startingLocations) ? importedData.startingLocations : [],
                    nsfwMode: typeof importedData.nsfwMode === 'boolean' ? importedData.nsfwMode : DEFAULT_WORLD_SETTINGS.nsfwMode,
                    originalStorySummary: typeof importedData.originalStorySummary === 'string'
                        ? importedData.originalStorySummary
                        : DEFAULT_WORLD_SETTINGS.originalStorySummary || "",
                }));
                
                const newOriginalStorySummary = typeof importedData.originalStorySummary === 'string'
                    ? importedData.originalStorySummary
                    : DEFAULT_WORLD_SETTINGS.originalStorySummary || "";
                setOriginalStorySummary(newOriginalStorySummary);
                setShowOriginalStorySummaryInput(importedData.originalStorySummary !== undefined);
                
                setStoryIdea(''); 
                setFanficStoryName(''); 
                setFanficFile(null);
                setFanficFileContent(null);
                setFanficTokenCount(null);
                setFanficPlayerDescription('');
                setRawApiResponseText(null);

                setGeneratorMessage({ text: VIETNAMESE.worldSettingsImportedSuccess, type: 'success' });
            } catch (err) {
                let errorMsg = VIETNAMESE.errorImportingWorldSettings;
                if (err instanceof Error) {
                    if (err.message.includes("JSON.parse")) {
                        errorMsg += ": Lỗi phân tích cú pháp JSON. File có thể bị lỗi hoặc không đúng định dạng.";
                    } else {
                        errorMsg += `: ${err.message}`;
                    }
                }
                setGeneratorMessage({ text: errorMsg, type: 'error' });
            }
        } else {
            setGeneratorMessage({ text: "Nội dung file rỗng hoặc không đọc được.", type: 'error' });
        }
        if(importSettingsFileRef.current) importSettingsFileRef.current.value = ""; 
      };
      reader.readAsText(file);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings.saveGameName.trim()) {
      setGeneratorMessage({ text: VIETNAMESE.saveGameNameRequiredError, type: 'error' });
      return;
    }
    const finalSettings = {
        ...settings,
        originalStorySummary: originalStorySummary, 
        startingNPCs: (settings.startingNPCs || []).map(npc => ({
            ...npc,
            initialAffinity: typeof npc.initialAffinity === 'number' && !isNaN(npc.initialAffinity) ? Math.max(-100, Math.min(100, npc.initialAffinity)) : 0,
        })),
        startingItems: (settings.startingItems || []).map(item => ({
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'aiAssist':
        return (
          <>
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

            <fieldset className="border border-green-700 p-3 sm:p-4 rounded-md bg-green-900/10 mt-4 sm:mt-6">
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
          </>
        );
      case 'characterStory':
        return (
          <fieldset className="border border-gray-700 p-3 sm:p-4 rounded-md">
            <legend className="text-lg sm:text-xl font-semibold text-indigo-400 px-2">Thông Tin Game & Nhân Vật</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4 mt-3 sm:mt-4">
              <InputField label={VIETNAMESE.characterName} id="playerName" name="playerName" value={settings.playerName} onChange={handleChange} className="text-sm sm:text-base"/>
              <InputField label={VIETNAMESE.gender} id="playerGender" name="playerGender" value={settings.playerGender} onChange={handleChange} type="select" options={['Nam', 'Nữ', 'Khác']} className="text-sm sm:text-base"/>
            </div>
            <InputField label={VIETNAMESE.personality} id="playerPersonality" name="playerPersonality" value={settings.playerPersonality} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.backstory} id="playerBackstory" name="playerBackstory" value={settings.playerBackstory} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.goal} id="playerGoal" name="playerGoal" value={settings.playerGoal} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.startingTraits} id="playerStartingTraits" name="playerStartingTraits" value={settings.playerStartingTraits} onChange={handleChange} className="text-sm sm:text-base"/>
          </fieldset>
        );
      case 'worldSettings':
        return (
          <fieldset className="border border-gray-700 p-3 sm:p-4 rounded-md">
            <legend className="text-lg sm:text-xl font-semibold text-indigo-400 px-2">Thiết Lập Thế Giới</legend>
             <InputField 
                label={VIETNAMESE.saveGameNameLabel} 
                id="saveGameName" 
                name="saveGameName" 
                value={settings.saveGameName} 
                onChange={handleChange} 
                className="text-sm sm:text-base mt-3"
                placeholder={VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", settings.playerName || "...")}
            />
            <InputField label={VIETNAMESE.worldTheme} id="theme" name="theme" value={settings.theme} onChange={handleChange} className="mt-3 sm:mt-4 text-sm sm:text-base" />
            <InputField label={VIETNAMESE.worldSetting} id="settingDescription" name="settingDescription" value={settings.settingDescription} onChange={handleChange} textarea className="text-sm sm:text-base"/>
            <InputField label={VIETNAMESE.writingStyle} id="writingStyle" name="writingStyle" value={settings.writingStyle} onChange={handleChange} className="text-sm sm:text-base"/>
            <InputField
              label={VIETNAMESE.realmSystemLabel}
              id="heThongCanhGioi"
              name="heThongCanhGioi"
              value={settings.heThongCanhGioi}
              onChange={handleChange}
              placeholder={VIETNAMESE.realmSystemPlaceholder}
              className="text-sm sm:text-base"
            />
            <InputField
              label={VIETNAMESE.startingRealmLabel}
              id="canhGioiKhoiDau"
              name="canhGioiKhoiDau"
              value={settings.canhGioiKhoiDau}
              onChange={handleChange}
              placeholder={VIETNAMESE.startingRealmPlaceholder}
              className="text-sm sm:text-base"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-3 sm:gap-y-4">
              <InputField label={VIETNAMESE.difficulty} id="difficulty" name="difficulty" value={settings.difficulty} onChange={handleChange} type="select" options={['Dễ', 'Thường', 'Khó']} className="text-sm sm:text-base"/>
              <InputField label={VIETNAMESE.currencyName} id="currencyName" name="currencyName" value={settings.currencyName} onChange={handleChange} className="text-sm sm:text-base"/>
            </div>
            <InputField
              label={VIETNAMESE.nsfwModeLabel} id="nsfwMode" name="nsfwMode"
              type="checkbox" checked={settings.nsfwMode} onChange={handleChange} className="mt-1"
            />
          </fieldset>
        );
      case 'startingElements':
        return (
          <>
            {(['startingSkills', 'startingItems', 'startingNPCs', 'startingLore', 'startingLocations'] as const).map(section => {
              const itemsForSection = settings[section] || [];
              const sectionConfig = {
                startingSkills: { title: VIETNAMESE.startingSkillsSection, addFunc: addStartingSkill, removeFunc: removeStartingSkill, items: itemsForSection as StartingSkill[], renderFunc: (item: StartingSkill, index: number) => (
                  <>
                    <InputField label={`${VIETNAMESE.skillNameLabel} #${index + 1}`} id={`skillName-${index}`} value={item.name} onChange={(e) => handleStartingSkillChange(index, 'name', e.target.value)} placeholder="Ví dụ: Hỏa Cầu Thuật" className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.skillDescriptionLabel} id={`skillDesc-${index}`} value={item.description} onChange={(e) => handleStartingSkillChange(index, 'description', e.target.value)} textarea placeholder="Mô tả kỹ năng..." className="text-sm sm:text-base"/>
                  </>
                ), addButtonText: VIETNAMESE.addStartingSkill, removeButtonText: "Xóa"},
                startingItems: { title: VIETNAMESE.startingItemsSection, addFunc: addStartingItem, removeFunc: removeStartingItem, items: itemsForSection as StartingItem[], renderFunc: (item: StartingItem, index: number) => (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 sm:gap-x-4">
                      <InputField label={`${VIETNAMESE.itemNameLabel} #${index + 1}`} id={`itemName-${index}`} value={item.name} onChange={(e) => handleStartingItemChange(index, 'name', e.target.value)} placeholder="Ví dụ: Tẩy Tủy Đan" className="text-sm sm:text-base"/>
                      <InputField label={VIETNAMESE.itemTypeLabel} id={`itemType-${index}`} value={item.type} onChange={(e) => handleStartingItemChange(index, 'type', e.target.value)} placeholder="Đan dược" className="text-sm sm:text-base"/>
                    </div>
                    <InputField label={VIETNAMESE.itemDescriptionLabel} id={`itemDesc-${index}`} value={item.description} onChange={(e) => handleStartingItemChange(index, 'description', e.target.value)} textarea placeholder="Mô tả vật phẩm..." className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.itemQuantityLabel} id={`itemQuantity-${index}`} type="number" value={item.quantity} onChange={(e) => { const val = parseInt(e.target.value, 10); handleStartingItemChange(index, 'quantity', isNaN(val) || val < 1 ? 1 : val );}} min={1} className="text-sm sm:text-base"/>
                  </>
                ), addButtonText: VIETNAMESE.addStartingItem, removeButtonText: "Xóa"},
                startingNPCs: { title: VIETNAMESE.startingNPCsSection, addFunc: addStartingNPC, removeFunc: removeStartingNPC, items: itemsForSection as StartingNPC[], renderFunc: (item: StartingNPC, index: number) => (
                  <>
                    <InputField label={`${VIETNAMESE.npcNameLabel} #${index + 1}`} id={`npcName-${index}`} value={item.name} onChange={(e) => handleStartingNPCChange(index, 'name', e.target.value)} placeholder="Ví dụ: Lão Ăn Mày Bí Ẩn" className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.npcPersonalityLabel} id={`npcPersonality-${index}`} value={item.personality} onChange={(e) => handleStartingNPCChange(index, 'personality', e.target.value)} textarea placeholder="Kỳ quái, hay giúp người,..." className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.npcAffinityLabel} id={`npcAffinity-${index}`} type="number" value={item.initialAffinity} onChange={(e) => { const rawValue = e.target.value; let numericValue = parseInt(rawValue, 10); if (rawValue.trim() === '') { numericValue = 0; } else if (isNaN(numericValue)) { const currentVal = (settings.startingNPCs || [])[index]?.initialAffinity; numericValue = typeof currentVal === 'number' && !isNaN(currentVal) ? currentVal : 0; } else { numericValue = Math.max(-100, Math.min(100, numericValue)); } handleStartingNPCChange(index, 'initialAffinity', numericValue); }} min="-100" max="100" step="1" className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.npcDetailsLabel} id={`npcDetails-${index}`} value={item.details} onChange={(e) => handleStartingNPCChange(index, 'details', e.target.value)} textarea placeholder="Mô tả thêm về NPC, vai trò, hoặc tiểu sử ngắn..." className="text-sm sm:text-base"/>
                  </>
                ), addButtonText: VIETNAMESE.addStartingNPC, removeButtonText: "Xóa"},
                startingLore: { title: VIETNAMESE.startingLoreSection, addFunc: addStartingLore, removeFunc: removeStartingLore, items: itemsForSection as StartingLore[], renderFunc: (item: StartingLore, index: number) => (
                  <>
                    <InputField label={`${VIETNAMESE.loreTitleLabel} #${index + 1}`} id={`loreTitle-${index}`} value={item.title} onChange={(e) => handleStartingLoreChange(index, 'title', e.target.value)} placeholder="Ví dụ: Sự Tích Thanh Vân Kiếm" className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.loreContentLabel} id={`loreContent-${index}`} value={item.content} onChange={(e) => handleStartingLoreChange(index, 'content', e.target.value)} textarea placeholder="Nội dung chi tiết về tri thức này..." className="text-sm sm:text-base"/>
                  </>
                ), addButtonText: VIETNAMESE.addStartingLore, removeButtonText: "Xóa"},
                startingLocations: { title: VIETNAMESE.startingLocationsSection, addFunc: addStartingLocation, removeFunc: removeStartingLocation, items: itemsForSection as StartingLocation[], renderFunc: (item: StartingLocation, index: number) => (
                  <>
                    <InputField label={`${VIETNAMESE.locationNameLabel} #${index + 1}`} id={`locationName-${index}`} value={item.name} onChange={(e) => handleStartingLocationChange(index, 'name', e.target.value)} placeholder="Ví dụ: Thôn Tân Thủ" className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.locationDescriptionLabel} id={`locationDesc-${index}`} value={item.description} onChange={(e) => handleStartingLocationChange(index, 'description', e.target.value)} textarea placeholder="Mô tả chi tiết về địa điểm..." className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.locationIsSafeZoneLabel} id={`locationSafeZone-${index}`} type="checkbox" checked={item.isSafeZone || false} onChange={(e) => handleStartingLocationChange(index, 'isSafeZone', (e.target as HTMLInputElement).checked)} className="text-sm sm:text-base"/>
                    <InputField label={VIETNAMESE.locationRegionIdLabel} id={`locationRegion-${index}`} value={item.regionId || ''} onChange={(e) => handleStartingLocationChange(index, 'regionId', e.target.value)} placeholder="Ví dụ: Đồng Bằng Trung Tâm" className="text-sm sm:text-base"/>
                  </>
                ), addButtonText: VIETNAMESE.addStartingLocation, removeButtonText: "Xóa"},
              }[section];

              return (
                <details key={section} className="border border-gray-700 rounded-md group mb-4" open={sectionConfig.items.length > 0}>
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
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl bg-gray-900 shadow-2xl rounded-lg sm:rounded-xl p-4 sm:p-6 md:p-8">
        <div className="flex justify-between items-center mb-1 sm:mb-2">
            <h2 className="text-2xl sm:text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-sky-600">Kiến Tạo Thế Giới & Nhân Vật</h2>
        </div>

        {/* Tab Buttons */}
        <div className="mb-3 sm:mb-4 border-b border-gray-700">
          <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
            <button onClick={() => setActiveTab('aiAssist')} className={activeTab === 'aiAssist' ? activeTabStyle : inactiveTabStyle}>
              AI Hỗ Trợ
            </button>
            <button onClick={() => setActiveTab('characterStory')} className={activeTab === 'characterStory' ? activeTabStyle : inactiveTabStyle}>
              Nhân Vật
            </button>
            <button onClick={() => setActiveTab('worldSettings')} className={activeTab === 'worldSettings' ? activeTabStyle : inactiveTabStyle}>
              Thế Giới
            </button>
            <button onClick={() => setActiveTab('startingElements')} className={activeTab === 'startingElements' ? activeTabStyle : inactiveTabStyle}>
              Khởi Đầu
            </button>
          </nav>
        </div>
        
        <div className="flex justify-end space-x-2 mb-3 sm:mb-4">
             <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={handleExportSettings}
                className="text-emerald-400 hover:text-emerald-300 border-emerald-500 text-xs px-2 py-1"
            >
                {VIETNAMESE.exportWorldSettingsButton}
            </Button>
            <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => importSettingsFileRef.current?.click()}
                className="text-sky-400 hover:text-sky-300 border-sky-500 text-xs px-2 py-1"
            >
                {VIETNAMESE.importWorldSettingsButton}
            </Button>
            <input 
                type="file" 
                ref={importSettingsFileRef} 
                accept=".json" 
                onChange={handleImportSettingsFileChange} 
                className="hidden" 
            />
        </div>

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
              className="my-2 text-sky-400 hover:text-sky-300 border-sky-500 text-xs w-full py-1"
          >
              {VIETNAMESE.viewRawAiResponseButton || "Xem Phản Hồi Thô Từ AI"}
          </Button>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 mt-2">
          <div className="min-h-[300px] max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-420px)] overflow-y-auto custom-scrollbar pr-2"> {/* Added scroll and height constraints */}
            {renderTabContent()}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-4 sm:pt-6 gap-3 sm:gap-0 border-t border-gray-700">
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
