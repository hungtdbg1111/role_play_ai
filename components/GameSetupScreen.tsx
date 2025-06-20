

import React, { useState, useCallback, ChangeEvent, useRef } from 'react';
import { GameScreen, WorldSettings, StartingSkill, StartingItem, StartingNPC, StartingLore } from '../types';
import Button from './ui/Button';
import Spinner from './ui/Spinner'; 
import { VIETNAMESE, DEFAULT_WORLD_SETTINGS, MAX_TOKENS_FANFIC } from '../constants';
import { generateWorldDetailsFromStory, generateFanfictionWorldDetails, countTokens } from '../services/geminiService';

interface GameSetupScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSetupComplete: (settings: WorldSettings) => void;
}

interface InputFieldProps {
  label: string;
  id: string;
  name?: string; 
  value?: string | number; 
  checked?: boolean; 
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  type?: string;
  options?: string[];
  textarea?: boolean;
  className?: string; 
  placeholder?: string;
  min?: number | string; 
  max?: number | string; 
  step?: number | string;
  rows?: number;
  disabled?: boolean;
}

const InputField: React.FC<InputFieldProps> = ({ label, id, name, value, checked, onChange, type = "text", options, textarea, className = "", placeholder, min, max, step, rows = 2, disabled = false }) => (
  <div className={`mb-4 ${type === 'checkbox' ? 'flex items-center' : ''}`}>
    {type === 'checkbox' ? (
      <>
        <input 
          type="checkbox" 
          id={id} 
          name={name} 
          checked={checked} 
          onChange={onChange} 
          className={`h-5 w-5 text-indigo-600 border-gray-500 rounded focus:ring-indigo-500 bg-gray-700 mr-2 ${className}`} 
          disabled={disabled}
        />
        <label htmlFor={id} className="text-sm font-medium text-gray-300 select-none">
          {label}
        </label>
      </>
    ) : (
      <>
        <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        {textarea ? (
          <textarea id={id} name={name} value={value as string ?? ''} onChange={onChange} rows={rows} className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`} placeholder={placeholder} disabled={disabled} />
        ) : type === 'select' && options ? (
          <select id={id} name={name} value={value as string ?? ''} onChange={onChange} className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`} disabled={disabled}>
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input 
            type={type} 
            id={id} 
            name={name} 
            value={value ?? ''}  
            onChange={onChange} 
            className={`w-full p-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-100 transition-colors duration-150 ${className}`} 
            placeholder={placeholder} 
            min={min} 
            max={max} 
            step={step} 
            disabled={disabled}
          />
        )}
      </>
    )}
  </div>
);


const GameSetupScreen: React.FC<GameSetupScreenProps> = ({ setCurrentScreen, onSetupComplete }) => {
  const [settings, setSettings] = useState<WorldSettings>({
    ...DEFAULT_WORLD_SETTINGS,
    startingSkills: [...(DEFAULT_WORLD_SETTINGS.startingSkills || [])],
    startingItems: [...(DEFAULT_WORLD_SETTINGS.startingItems || [])],
    startingNPCs: [...(DEFAULT_WORLD_SETTINGS.startingNPCs || [])],
    startingLore: [...(DEFAULT_WORLD_SETTINGS.startingLore || [])],
  });
  
  // State for original story idea generator
  const [storyIdea, setStoryIdea] = useState('');
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [generatorMessage, setGeneratorMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // State for fanfiction generator
  const [fanficSourceType, setFanficSourceType] = useState<'name' | 'file'>('name');
  const [fanficStoryName, setFanficStoryName] = useState('');
  const [fanficFile, setFanficFile] = useState<File | null>(null);
  const [fanficFileContent, setFanficFileContent] = useState<string | null>(null);
  const [fanficTokenCount, setFanficTokenCount] = useState<number | null>(null);
  const [fanficPlayerDescription, setFanficPlayerDescription] = useState('');
  const [isGeneratingFanficDetails, setIsGeneratingFanficDetails] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const fanficFileInputRef = useRef<HTMLInputElement>(null);


  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setSettings(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
    if (generatorMessage) setGeneratorMessage(null); // Clear message on manual form change
  }, [generatorMessage]);

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

  const handleGenerateDetails = async () => {
    if (!storyIdea.trim()) {
      setGeneratorMessage({ text: "Vui lòng nhập ý tưởng cốt truyện.", type: 'error' });
      return;
    }
    setIsGeneratingDetails(true);
    setGeneratorMessage({text: VIETNAMESE.generatingWorldDetails, type: 'info'});
    try {
      const generatedElements = await generateWorldDetailsFromStory(storyIdea);
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
      }));
      setGeneratorMessage({ text: VIETNAMESE.worldDetailsGeneratedSuccess, type: 'success' });
    } catch (error) {
      console.error("Error generating world details:", error);
      setGeneratorMessage({ text: `${VIETNAMESE.errorGeneratingWorldDetails} ${error instanceof Error ? error.message : ''}`, type: 'error' });
    } finally {
      setIsGeneratingDetails(false);
    }
  };
  
  const handleFanficFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    setGeneratorMessage(null);
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
    } else {
      setFanficFile(null);
    }
  };

  const handleGenerateFanficDetails = async () => {
    let sourceMaterial: string = '';
    let isSourceContent = false;

    if (fanficSourceType === 'name') {
      if (!fanficStoryName.trim()) {
        setGeneratorMessage({ text: VIETNAMESE.pleaseEnterStoryName, type: 'error' });
        return;
      }
      sourceMaterial = fanficStoryName.trim();
    } else { // 'file'
      if (!fanficFileContent || !fanficFile) {
        setGeneratorMessage({ text: VIETNAMESE.pleaseSelectFile, type: 'error' });
        return;
      }
      if (fanficTokenCount && fanficTokenCount > MAX_TOKENS_FANFIC) {
        setGeneratorMessage({ text: VIETNAMESE.tokenCountExceededError(MAX_TOKENS_FANFIC), type: 'error'});
        return;
      }
      sourceMaterial = fanficFileContent;
      isSourceContent = true;
    }
    
    setIsGeneratingFanficDetails(true);
    setGeneratorMessage({text: VIETNAMESE.generatingFanficDetails, type: 'info'});
    try {
      const generatedElements = await generateFanfictionWorldDetails(sourceMaterial, isSourceContent, fanficPlayerDescription.trim());
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
        startingNPCs: generatedElements.response.startingNPCs.length > 0 ? generatedElements.response.startingNPCs : prev.startingNPCs, // NPCs can be many
        startingLore: generatedElements.response.startingLore.length > 0 ? generatedElements.response.startingLore : prev.startingLore,   // Lore can be many
      }));
      setGeneratorMessage({ text: VIETNAMESE.fanficDetailsGeneratedSuccess, type: 'success' });
    } catch (error) {
      console.error("Error generating fanfiction world details:", error);
      setGeneratorMessage({ text: `${VIETNAMESE.errorGeneratingFanficDetails} ${error instanceof Error ? error.message : ''}`, type: 'error' });
    } finally {
      setIsGeneratingFanficDetails(false);
    }
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedSettings = {
        ...settings,
        startingNPCs: settings.startingNPCs.map(npc => ({
            ...npc,
            initialAffinity: typeof npc.initialAffinity === 'number' && !isNaN(npc.initialAffinity) ? Math.max(-100, Math.min(100, npc.initialAffinity)) : 0,
        })),
        startingItems: settings.startingItems.map(item => ({
            ...item,
            quantity: typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        }))
    };
    onSetupComplete(sanitizedSettings);
    setCurrentScreen(GameScreen.Gameplay);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4 sm:p-6">
      <div className="w-full max-w-3xl bg-gray-900 shadow-2xl rounded-xl p-6 sm:p-8">
        <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-sky-600 mb-8">Kiến Tạo Thế Giới & Nhân Vật</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Story Idea Generator Section (Original) */}
          <fieldset className="border border-purple-700 p-4 rounded-md bg-purple-900/10">
            <legend className="text-xl font-semibold text-purple-400 px-2">{VIETNAMESE.storyIdeaGeneratorSection}</legend>
            <InputField
              label={VIETNAMESE.storyIdeaDescriptionLabel}
              id="storyIdea"
              name="storyIdea"
              value={storyIdea}
              onChange={(e) => { setStoryIdea(e.target.value); if (generatorMessage) setGeneratorMessage(null); }}
              textarea
              rows={3}
              placeholder={VIETNAMESE.storyIdeaDescriptionPlaceholder}
              className="mt-2"
            />
            <Button
              type="button"
              variant="primary"
              onClick={handleGenerateDetails}
              isLoading={isGeneratingDetails}
              loadingText={VIETNAMESE.generatingWorldDetails}
              className="mt-3 bg-purple-600 hover:bg-purple-700 focus:ring-purple-500 w-full sm:w-auto"
            >
              {VIETNAMESE.generateDetailsFromStoryButton}
            </Button>
          </fieldset>
          
          {/* Fanfiction Story Generator Section */}
          <fieldset className="border border-green-700 p-4 rounded-md bg-green-900/10">
            <legend className="text-xl font-semibold text-green-400 px-2">{VIETNAMESE.fanficStoryGeneratorSection}</legend>
            <div className="mt-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">{VIETNAMESE.fanficSourceTypeLabel}</label>
              <div className="flex space-x-4 mb-3">
                <label className="flex items-center text-gray-200">
                  <input type="radio" name="fanficSourceType" value="name" checked={fanficSourceType === 'name'} onChange={() => { setFanficSourceType('name'); setGeneratorMessage(null); }} className="h-4 w-4 text-green-500 focus:ring-green-400 border-gray-600 bg-gray-700"/>
                  <span className="ml-2">{VIETNAMESE.fanficSourceTypeName}</span>
                </label>
                <label className="flex items-center text-gray-200">
                  <input type="radio" name="fanficSourceType" value="file" checked={fanficSourceType === 'file'} onChange={() => { setFanficSourceType('file'); setGeneratorMessage(null); }} className="h-4 w-4 text-green-500 focus:ring-green-400 border-gray-600 bg-gray-700"/>
                  <span className="ml-2">{VIETNAMESE.fanficSourceTypeFile}</span>
                </label>
              </div>

              {fanficSourceType === 'name' && (
                <InputField
                  label={VIETNAMESE.fanficStoryNameLabel}
                  id="fanficStoryName"
                  value={fanficStoryName}
                  onChange={(e) => { setFanficStoryName(e.target.value); if (generatorMessage) setGeneratorMessage(null);}}
                  placeholder={VIETNAMESE.fanficStoryNamePlaceholder}
                />
              )}
              {fanficSourceType === 'file' && (
                <div>
                  <label htmlFor="fanficFile" className="block text-sm font-medium text-gray-300 mb-1">{VIETNAMESE.fanficFileUploadLabel}</label>
                  <input
                    type="file"
                    id="fanficFile"
                    ref={fanficFileInputRef}
                    accept=".txt,text/plain"
                    onChange={handleFanficFileChange}
                    className="w-full text-sm text-gray-300 bg-gray-700 border border-gray-600 rounded-md file:mr-3 file:py-2 file:px-3 file:rounded-l-md file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  {isLoadingTokens && <Spinner size="sm" text={VIETNAMESE.tokenCountCalculating} className="mt-2" />}
                </div>
              )}
               <InputField
                  label={VIETNAMESE.fanficPlayerDescriptionLabel}
                  id="fanficPlayerDescription"
                  value={fanficPlayerDescription}
                  onChange={(e) => { setFanficPlayerDescription(e.target.value); if (generatorMessage) setGeneratorMessage(null);}}
                  textarea
                  rows={2}
                  placeholder={VIETNAMESE.fanficPlayerDescriptionPlaceholder}
                  className="mt-3"
                />
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerateFanficDetails}
                isLoading={isGeneratingFanficDetails}
                loadingText={VIETNAMESE.generatingFanficDetails}
                className="mt-3 bg-green-600 hover:bg-green-700 focus:ring-green-500 w-full sm:w-auto"
                disabled={isLoadingTokens || (fanficSourceType === 'file' && fanficTokenCount !== null && fanficTokenCount > MAX_TOKENS_FANFIC)}
              >
                {VIETNAMESE.generateFanficButton}
              </Button>
            </div>
          </fieldset>
          
           {/* Generator Message Display (Shared for both generators) */}
           {generatorMessage && (
            <div className={`my-3 p-3 text-sm rounded-md border ${
                generatorMessage.type === 'success' ? 'bg-green-600/20 text-green-300 border-green-500' :
                generatorMessage.type === 'error' ? 'bg-red-600/20 text-red-300 border-red-500' :
                'bg-blue-600/20 text-blue-300 border-blue-500' // info
            }`}>
              {generatorMessage.text}
            </div>
          )}


          {/* Character Info */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-xl font-semibold text-indigo-400 px-2">Thông Tin Nhân Vật</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <InputField label={VIETNAMESE.characterName} id="playerName" name="playerName" value={settings.playerName} onChange={handleChange} />
              <InputField label={VIETNAMESE.gender} id="playerGender" name="playerGender" value={settings.playerGender} onChange={handleChange} type="select" options={['Nam', 'Nữ', 'Khác']} />
            </div>
            <InputField label={VIETNAMESE.personality} id="playerPersonality" name="playerPersonality" value={settings.playerPersonality} onChange={handleChange} textarea />
            <InputField label={VIETNAMESE.backstory} id="playerBackstory" name="playerBackstory" value={settings.playerBackstory} onChange={handleChange} textarea />
            <InputField label={VIETNAMESE.goal} id="playerGoal" name="playerGoal" value={settings.playerGoal} onChange={handleChange} textarea />
            <InputField label={VIETNAMESE.startingTraits} id="playerStartingTraits" name="playerStartingTraits" value={settings.playerStartingTraits} onChange={handleChange} />
          </fieldset>

          {/* Starting Skills Section */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-xl font-semibold text-indigo-400 px-2">{VIETNAMESE.startingSkillsSection}</legend>
            {settings.startingSkills.map((skill, index) => (
              <div key={`skill-${index}-${skill.name || index}`} className="p-3 border border-gray-600 rounded-md my-3 bg-gray-800/50 relative">
                <InputField 
                  label={`${VIETNAMESE.skillNameLabel} #${index + 1}`} 
                  id={`skillName-${index}`} 
                  value={skill.name} 
                  onChange={(e) => handleStartingSkillChange(index, 'name', e.target.value)} 
                  placeholder="Ví dụ: Hỏa Cầu Thuật"
                />
                <InputField 
                  label={VIETNAMESE.skillDescriptionLabel} 
                  id={`skillDesc-${index}`} 
                  value={skill.description} 
                  onChange={(e) => handleStartingSkillChange(index, 'description', e.target.value)} 
                  textarea 
                  placeholder="Mô tả kỹ năng..."
                />
                <Button 
                  type="button" variant="danger" size="sm" onClick={() => removeStartingSkill(index)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs"
                  aria-label={`${VIETNAMESE.removeSkill} #${index + 1}`}
                >Xóa</Button>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addStartingSkill} className="text-indigo-400 hover:text-indigo-300 border-indigo-500 mt-2">
              {VIETNAMESE.addStartingSkill}
            </Button>
          </fieldset>

          {/* Starting Items Section */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-xl font-semibold text-indigo-400 px-2">{VIETNAMESE.startingItemsSection}</legend>
            {settings.startingItems.map((item, index) => (
              <div key={`item-${index}-${item.name || index}`} className="p-3 border border-gray-600 rounded-md my-3 bg-gray-800/50 relative">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                  <InputField 
                    label={`${VIETNAMESE.itemNameLabel} #${index + 1}`} id={`itemName-${index}`} 
                    value={item.name} onChange={(e) => handleStartingItemChange(index, 'name', e.target.value)}
                    placeholder="Ví dụ: Tẩy Tủy Đan"
                  />
                  <InputField 
                    label={VIETNAMESE.itemTypeLabel} id={`itemType-${index}`} 
                    value={item.type} onChange={(e) => handleStartingItemChange(index, 'type', e.target.value)}
                    placeholder="Đan dược"
                  />
                </div>
                <InputField 
                  label={VIETNAMESE.itemDescriptionLabel} id={`itemDesc-${index}`} 
                  value={item.description} onChange={(e) => handleStartingItemChange(index, 'description', e.target.value)} 
                  textarea placeholder="Mô tả vật phẩm..."
                />
                <InputField 
                  label={VIETNAMESE.itemQuantityLabel} id={`itemQuantity-${index}`} type="number" 
                  value={item.quantity} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    handleStartingItemChange(index, 'quantity', isNaN(val) || val < 1 ? 1 : val );
                  }} 
                  min={1}
                />
                <Button 
                  type="button" variant="danger" size="sm" onClick={() => removeStartingItem(index)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs"
                  aria-label={`${VIETNAMESE.removeItem} #${index + 1}`}
                >Xóa</Button>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addStartingItem} className="text-indigo-400 hover:text-indigo-300 border-indigo-500 mt-2">
              {VIETNAMESE.addStartingItem}
            </Button>
          </fieldset>
          
          {/* World Settings */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-xl font-semibold text-indigo-400 px-2">Thiết Lập Thế Giới</legend>
            <InputField label={VIETNAMESE.worldTheme} id="theme" name="theme" value={settings.theme} onChange={handleChange} className="mt-4" />
            <InputField label={VIETNAMESE.worldSetting} id="settingDescription" name="settingDescription" value={settings.settingDescription} onChange={handleChange} textarea />
            <InputField label={VIETNAMESE.writingStyle} id="writingStyle" name="writingStyle" value={settings.writingStyle} onChange={handleChange} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputField label={VIETNAMESE.difficulty} id="difficulty" name="difficulty" value={settings.difficulty} onChange={handleChange} type="select" options={['Dễ', 'Thường', 'Khó']} />
              <InputField label={VIETNAMESE.currencyName} id="currencyName" name="currencyName" value={settings.currencyName} onChange={handleChange} />
            </div>
            <InputField
              label={VIETNAMESE.nsfwModeLabel} id="nsfwMode" name="nsfwMode"
              type="checkbox" checked={settings.nsfwMode} onChange={handleChange} className="mt-1" 
            />
          </fieldset>

           {/* Starting NPCs Section */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-xl font-semibold text-indigo-400 px-2">{VIETNAMESE.startingNPCsSection}</legend>
            {settings.startingNPCs.map((npc, index) => (
              <div key={`npc-${index}-${npc.name || index}`} className="p-3 border border-gray-600 rounded-md my-3 bg-gray-800/50 relative">
                <InputField 
                  label={`${VIETNAMESE.npcNameLabel} #${index + 1}`} 
                  id={`npcName-${index}`} 
                  value={npc.name} 
                  onChange={(e) => handleStartingNPCChange(index, 'name', e.target.value)}
                  placeholder="Ví dụ: Lão Ăn Mày Bí Ẩn"
                />
                <InputField 
                  label={VIETNAMESE.npcPersonalityLabel} 
                  id={`npcPersonality-${index}`} 
                  value={npc.personality} 
                  onChange={(e) => handleStartingNPCChange(index, 'personality', e.target.value)} 
                  textarea
                  placeholder="Kỳ quái, hay giúp người,..."
                />
                <InputField 
                  label={VIETNAMESE.npcAffinityLabel} 
                  id={`npcAffinity-${index}`} 
                  type="number"
                  value={npc.initialAffinity} 
                  onChange={(e) => {
                    const rawValue = e.target.value;
                    let numericValue = parseInt(rawValue, 10);

                    if (rawValue.trim() === '') {
                      numericValue = 0; 
                    } else if (isNaN(numericValue)) {
                      const currentVal = settings.startingNPCs[index].initialAffinity;
                      numericValue = typeof currentVal === 'number' && !isNaN(currentVal) ? currentVal : 0;
                    } else {
                      numericValue = Math.max(-100, Math.min(100, numericValue));
                    }
                    handleStartingNPCChange(index, 'initialAffinity', numericValue);
                  }}
                  min="-100" max="100" step="1"
                />
                <InputField 
                  label={VIETNAMESE.npcDetailsLabel} 
                  id={`npcDetails-${index}`} 
                  value={npc.details} 
                  onChange={(e) => handleStartingNPCChange(index, 'details', e.target.value)} 
                  textarea 
                  placeholder="Mô tả thêm về NPC, vai trò, hoặc tiểu sử ngắn..."
                />
                <Button 
                  type="button" variant="danger" size="sm" onClick={() => removeStartingNPC(index)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs"
                  aria-label={`${VIETNAMESE.removeNPC} #${index + 1}`}
                >Xóa</Button>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addStartingNPC} className="text-indigo-400 hover:text-indigo-300 border-indigo-500 mt-2">
              {VIETNAMESE.addStartingNPC}
            </Button>
          </fieldset>

          {/* Starting Lore Section */}
          <fieldset className="border border-gray-700 p-4 rounded-md">
            <legend className="text-xl font-semibold text-indigo-400 px-2">{VIETNAMESE.startingLoreSection}</legend>
            {settings.startingLore.map((lore, index) => (
              <div key={`lore-${index}-${lore.title || index}`} className="p-3 border border-gray-600 rounded-md my-3 bg-gray-800/50 relative">
                <InputField 
                  label={`${VIETNAMESE.loreTitleLabel} #${index + 1}`} 
                  id={`loreTitle-${index}`} 
                  value={lore.title} 
                  onChange={(e) => handleStartingLoreChange(index, 'title', e.target.value)}
                  placeholder="Ví dụ: Sự Tích Thanh Vân Kiếm"
                />
                <InputField 
                  label={VIETNAMESE.loreContentLabel} 
                  id={`loreContent-${index}`} 
                  value={lore.content} 
                  onChange={(e) => handleStartingLoreChange(index, 'content', e.target.value)} 
                  textarea 
                  placeholder="Nội dung chi tiết về tri thức này..."
                />
                <Button 
                  type="button" variant="danger" size="sm" onClick={() => removeStartingLore(index)}
                  className="absolute top-2 right-2 px-2 py-1 text-xs"
                  aria-label={`${VIETNAMESE.removeLore} #${index + 1}`}
                >Xóa</Button>
              </div>
            ))}
            <Button type="button" variant="ghost" onClick={addStartingLore} className="text-indigo-400 hover:text-indigo-300 border-indigo-500 mt-2">
              {VIETNAMESE.addStartingLore}
            </Button>
          </fieldset>


          <div className="flex justify-between items-center pt-6">
             <Button type="button" variant="ghost" onClick={() => setCurrentScreen(GameScreen.Initial)}>
              {VIETNAMESE.goBackButton}
            </Button>
            <Button type="submit" variant="primary" size="lg">
              {VIETNAMESE.startGame}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GameSetupScreen;
