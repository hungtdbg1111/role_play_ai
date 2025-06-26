import React, { useState, useCallback, ChangeEvent, useRef, useEffect } from 'react';
import { GameScreen, WorldSettings, StartingSkill, StartingItem, StartingNPC, StartingLore, StartingLocation, StartingFaction, PlayerStats, GenreType } from '../types'; 
import Button from './ui/Button';
import Modal from './ui/Modal';
import { VIETNAMESE, DEFAULT_WORLD_SETTINGS, CUSTOM_GENRE_VALUE, MAX_TOKENS_FANFIC, DEFAULT_VIOLENCE_LEVEL, DEFAULT_STORY_TONE, DEFAULT_NSFW_DESCRIPTION_STYLE } from '../constants';
import { generateWorldDetailsFromStory, generateFanfictionWorldDetails, countTokens } from '../services/geminiService';
import * as GameTemplates from '../templates';

// Import tab components
import AIAssistTab from './gameSetup/tabs/AIAssistTab';
import CharacterStoryTab from './gameSetup/tabs/CharacterStoryTab';
import WorldSettingsTab from './gameSetup/tabs/WorldSettingsTab';
import StartingElementsTab from './gameSetup/tabs/StartingElementsTab';

interface GameSetupScreenProps {
  setCurrentScreen: (screen: GameScreen) => void;
  onSetupComplete: (settings: WorldSettings, uploadedAvatarData?: string | null) => void;
}

type SetupTab = 'aiAssist' | 'characterStory' | 'worldSettings' | 'startingElements';

const activeTabStyle = "whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm border-indigo-500 text-indigo-400 focus:outline-none";
const inactiveTabStyle = "whitespace-nowrap py-3 px-3 sm:px-4 border-b-2 font-medium text-xs sm:text-sm border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500 focus:outline-none";

const GameSetupScreen = ({ setCurrentScreen, onSetupComplete }: GameSetupScreenProps): JSX.Element => {
  const [settings, setSettings] = useState<WorldSettings>({
    ...DEFAULT_WORLD_SETTINGS,
    saveGameName: DEFAULT_WORLD_SETTINGS.saveGameName || '',
    genre: DEFAULT_WORLD_SETTINGS.genre,
    customGenreName: DEFAULT_WORLD_SETTINGS.customGenreName || '',
    isCultivationEnabled: DEFAULT_WORLD_SETTINGS.isCultivationEnabled,
    startingSkills: [...(DEFAULT_WORLD_SETTINGS.startingSkills || [])],
    startingItems: (DEFAULT_WORLD_SETTINGS.startingItems || []).map(item => ({
        ...item, 
        category: item.category || GameTemplates.ItemCategory.MISCELLANEOUS, 
        quantity: item.quantity || 1
    })),
    startingNPCs: [...(DEFAULT_WORLD_SETTINGS.startingNPCs || [])],
    startingLore: [...(DEFAULT_WORLD_SETTINGS.startingLore || [])],
    startingLocations: [...(DEFAULT_WORLD_SETTINGS.startingLocations || [])],
    startingFactions: [...(DEFAULT_WORLD_SETTINGS.startingFactions || [])],
    originalStorySummary: DEFAULT_WORLD_SETTINGS.originalStorySummary || "",
    heThongCanhGioi: DEFAULT_WORLD_SETTINGS.heThongCanhGioi,
    canhGioiKhoiDau: DEFAULT_WORLD_SETTINGS.canhGioiKhoiDau,
    playerAvatarUrl: DEFAULT_WORLD_SETTINGS.playerAvatarUrl,
    nsfwMode: DEFAULT_WORLD_SETTINGS.nsfwMode || false,
    nsfwDescriptionStyle: DEFAULT_WORLD_SETTINGS.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE,
    violenceLevel: DEFAULT_WORLD_SETTINGS.violenceLevel || DEFAULT_VIOLENCE_LEVEL,
    storyTone: DEFAULT_WORLD_SETTINGS.storyTone || DEFAULT_STORY_TONE,
  });

  const [activeTab, setActiveTab] = useState<SetupTab>('aiAssist');

  // Player Avatar states
  const [playerAvatarPreviewUrl, setPlayerAvatarPreviewUrl] = useState<string | null>(null);
  const [playerUploadedAvatarData, setPlayerUploadedAvatarData] = useState<string | null>(null);


  // State related to AI Assist Tab
  const [storyIdea, setStoryIdea] = useState('');
  // isOriginalStoryIdeaNsfw removed, use settings.nsfwMode
  const [fanficSourceType, setFanficSourceType] = useState<'name' | 'file'>('name');
  const [fanficStoryName, setFanficStoryName] = useState('');
  const [fanficFile, setFanficFile] = useState<File | null>(null);
  const [fanficFileContent, setFanficFileContent] = useState<string | null>(null);
  const [fanficTokenCount, setFanficTokenCount] = useState<number | null>(null);
  const [fanficPlayerDescription, setFanficPlayerDescription] = useState('');
  // isFanficIdeaNsfw removed, use settings.nsfwMode
  const [originalStorySummary, setOriginalStorySummary] = useState<string>(settings.originalStorySummary || '');
  const [showOriginalStorySummaryInput, setShowOriginalStorySummaryInput] = useState<boolean>(!!settings.originalStorySummary);
  const fanficFileInputRef = useRef<HTMLInputElement>(null);


  // General state for screen
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);
  const [generatorMessage, setGeneratorMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isGeneratingFanficDetails, setIsGeneratingFanficDetails] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const importSettingsFileRef = useRef<HTMLInputElement>(null);
  const [rawApiResponseText, setRawApiResponseText] = useState<string | null>(null);
  const [showRawResponseModal, setShowRawResponseModal] = useState(false);
  const [sentWorldGenPrompt, setSentWorldGenPrompt] = useState<string | null>(null);
  const [showSentPromptModal, setShowSentPromptModal] = useState(false);

  // State for StartingElementsTab collapsible sections
  const [isSkillsSectionOpen, setIsSkillsSectionOpen] = useState(false);
  const [isItemsSectionOpen, setIsItemsSectionOpen] = useState(false);
  const [isNpcsSectionOpen, setIsNpcsSectionOpen] = useState(false);
  const [isLoreSectionOpen, setIsLoreSectionOpen] = useState(false);
  const [isLocationsSectionOpen, setIsLocationsSectionOpen] = useState(false);
  const [isFactionsSectionOpen, setIsFactionsSectionOpen] = useState(false);


  // Effect 1: When raw avatar data changes (e.g., user uploads, AI generates base64, user types URL that is passed via onPlayerAvatarDataChange in CharacterStoryTab)
  // This data is the "source of truth" for the current user interaction for preview.
  useEffect(() => {
    if (playerUploadedAvatarData && (playerUploadedAvatarData.startsWith('http') || playerUploadedAvatarData.startsWith('data:'))) {
      setPlayerAvatarPreviewUrl(playerUploadedAvatarData);
    } else if (!playerUploadedAvatarData) {
      setPlayerAvatarPreviewUrl(null);
    }
    // If playerUploadedAvatarData is some placeholder like "uploaded_via_file", this effect won't set a preview from it.
    // The preview would only be set if actual base64 or URL data is in playerUploadedAvatarData.
  }, [playerUploadedAvatarData]);

  // Effect 2: When settings.playerAvatarUrl changes (e.g., due to import, or AI assist directly modifying settings)
  // This needs to synchronize playerUploadedAvatarData and playerAvatarPreviewUrl
  useEffect(() => {
    if (settings.playerAvatarUrl) {
      if (settings.playerAvatarUrl.startsWith('http') || settings.playerAvatarUrl.startsWith('data:')) {
        // If settings.playerAvatarUrl is a direct URL/Data URI, it becomes the source of truth
        setPlayerUploadedAvatarData(settings.playerAvatarUrl);
        // playerAvatarPreviewUrl will be updated by Effect 1 reacting to playerUploadedAvatarData change.
      } else if (settings.playerAvatarUrl === 'uploaded_via_file' || settings.playerAvatarUrl === 'upload_pending_after_ai_gen_cloudinary_fail') {
        // These are placeholders. It means the actual data *should* be in playerUploadedAvatarData if the state is consistent
        // from a previous user action or save/load that preserves playerUploadedAvatarData.
        // If playerUploadedAvatarData is NOT already set with base64 for these placeholders, clear the preview.
        if (!playerUploadedAvatarData || !playerUploadedAvatarData.startsWith('data:')) {
           setPlayerAvatarPreviewUrl(null); 
        } else {
           setPlayerAvatarPreviewUrl(playerUploadedAvatarData); // Ensure preview shows if base64 is there
        }
      }
    } else { // settings.playerAvatarUrl is undefined/null/empty
      setPlayerUploadedAvatarData(null); // This will trigger Effect 1 to clear playerAvatarPreviewUrl
    }
  }, [settings.playerAvatarUrl]); // Removed playerUploadedAvatarData from deps here to prevent potential loops.


  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setSettings(prev => {
            const newSettings = { ...prev, [name]: checked };
            if (name === 'isCultivationEnabled' && !checked) {
                newSettings.heThongCanhGioi = VIETNAMESE.noCultivationSystem;
                newSettings.canhGioiKhoiDau = VIETNAMESE.mortalRealmName;
            } else if (name === 'isCultivationEnabled' && checked) {
                if (prev.heThongCanhGioi === VIETNAMESE.noCultivationSystem || !prev.heThongCanhGioi) {
                    newSettings.heThongCanhGioi = DEFAULT_WORLD_SETTINGS.heThongCanhGioi;
                }
                if (prev.canhGioiKhoiDau === VIETNAMESE.mortalRealmName || !prev.canhGioiKhoiDau) {
                    newSettings.canhGioiKhoiDau = DEFAULT_WORLD_SETTINGS.canhGioiKhoiDau;
                }
            }
            return newSettings;
        });
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
    if (name === 'playerName' && !settings.saveGameName) {
        setSettings(prev => ({ ...prev, saveGameName: VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", value) }))
    }
    if (name === 'genre' && value !== CUSTOM_GENRE_VALUE) { 
        setSettings(prev => ({ ...prev, customGenreName: "" }));
    }
    if (generatorMessage) setGeneratorMessage(null);
    if (rawApiResponseText) setRawApiResponseText(null);
    if (sentWorldGenPrompt) setSentWorldGenPrompt(null);
  }, [generatorMessage, rawApiResponseText, sentWorldGenPrompt, settings.saveGameName]);

  const handleOriginalStorySummaryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSummary = e.target.value;
    setOriginalStorySummary(newSummary);
    // Also update settings directly if needed, or rely on handleSubmit to consolidate
    setSettings(prev => ({ ...prev, originalStorySummary: newSummary }));
    if (rawApiResponseText) setRawApiResponseText(null);
    if (sentWorldGenPrompt) setSentWorldGenPrompt(null);
  };
  
  // Handlers for Starting Elements
  const handleStartingSkillChange = (index: number, field: keyof StartingSkill, value: string) => {
    setSettings(prev => {
      const newSkills = [...(prev.startingSkills || [])];
      newSkills[index] = { ...newSkills[index], [field]: value };
      return { ...prev, startingSkills: newSkills };
    });
  };
  const addStartingSkill = () => setSettings(prev => ({ ...prev, startingSkills: [...(prev.startingSkills || []), { name: '', description: '' }] }));
  const removeStartingSkill = (index: number) => setSettings(prev => ({ ...prev, startingSkills: (prev.startingSkills || []).filter((_, i) => i !== index) }));

  const handleStartingItemChange = (
    index: number,
    field: keyof StartingItem | `equipmentDetails.${keyof NonNullable<StartingItem['equipmentDetails']>}` | `potionDetails.${keyof NonNullable<StartingItem['potionDetails']>}` | `materialDetails.${keyof NonNullable<StartingItem['materialDetails']>}` | `questItemDetails.${keyof NonNullable<StartingItem['questItemDetails']>}` | `miscDetails.${keyof NonNullable<StartingItem['miscDetails']>}`,
    value: any 
  ) => {
    setSettings(prev => {
      const newItems = [...(prev.startingItems || [])];
      const itemToUpdate = { ...(newItems[index] || {}) } as StartingItem; 

      if (!itemToUpdate.equipmentDetails) itemToUpdate.equipmentDetails = {};
      if (!itemToUpdate.potionDetails) itemToUpdate.potionDetails = {};
      if (!itemToUpdate.materialDetails) itemToUpdate.materialDetails = {};
      if (!itemToUpdate.questItemDetails) itemToUpdate.questItemDetails = {};
      if (!itemToUpdate.miscDetails) itemToUpdate.miscDetails = {};

      if (field.startsWith('equipmentDetails.')) {
        const subField = field.substring('equipmentDetails.'.length) as keyof NonNullable<StartingItem['equipmentDetails']>;
        if (itemToUpdate.equipmentDetails) {
            if (subField === 'uniqueEffects' || subField === 'uniqueEffectsString') {
                itemToUpdate.equipmentDetails.uniqueEffectsString = value as string; 
                itemToUpdate.equipmentDetails.uniqueEffects = (value as string).split(';').map(s => s.trim()).filter(s => s);
            } else if (subField === 'statBonuses' || subField === 'statBonusesString') {
                itemToUpdate.equipmentDetails.statBonusesString = value as string;
                try {
                   const parsed = JSON.parse(value); // Attempt to parse
                   if(typeof parsed === 'object' && parsed !== null) {
                     itemToUpdate.equipmentDetails.statBonuses = parsed as Partial<PlayerStats>;
                   } // If not valid JSON, it remains a string (as per your original logic implicitly)
                } catch { /* Keep as string if not valid JSON */ }
            } else {
                 (itemToUpdate.equipmentDetails as any)[subField] = value;
            }
        }
      } else if (field.startsWith('potionDetails.')) {
        const subField = field.substring('potionDetails.'.length) as keyof NonNullable<StartingItem['potionDetails']>;
        if (itemToUpdate.potionDetails) {
             if (subField === 'effects' || subField === 'effectsString') {
                itemToUpdate.potionDetails.effectsString = value as string;
                itemToUpdate.potionDetails.effects = (value as string).split(';').map(s => s.trim()).filter(s => s);
            } else {
                (itemToUpdate.potionDetails as any)[subField] = value;
            }
        }
      } else if (field.startsWith('materialDetails.')) {
        const subField = field.substring('materialDetails.'.length) as keyof NonNullable<StartingItem['materialDetails']>;
        if (itemToUpdate.materialDetails) (itemToUpdate.materialDetails as any)[subField] = value;
      } else if (field.startsWith('questItemDetails.')) {
        const subField = field.substring('questItemDetails.'.length) as keyof NonNullable<StartingItem['questItemDetails']>;
         if (itemToUpdate.questItemDetails) (itemToUpdate.questItemDetails as any)[subField] = value;
      } else if (field.startsWith('miscDetails.')) {
        const subField = field.substring('miscDetails.'.length) as keyof NonNullable<StartingItem['miscDetails']>;
        if (itemToUpdate.miscDetails) (itemToUpdate.miscDetails as any)[subField] = (typeof value === 'string' && (value === 'true' || value === 'false')) ? value === 'true' : value;
      } else {
        const directField = field as keyof StartingItem;
        if (directField === 'quantity' || directField === 'value') {
          (itemToUpdate as any)[directField] = parseInt(value as string, 10) || 0;
        } else {
          (itemToUpdate as any)[directField] = value;
        }
      }
      // Logic to clear details when category changes
      if (field === 'category') {
        const newCategory = value as GameTemplates.ItemCategoryValues;
        if (newCategory !== GameTemplates.ItemCategory.EQUIPMENT) itemToUpdate.equipmentDetails = {};
        if (newCategory !== GameTemplates.ItemCategory.POTION) itemToUpdate.potionDetails = {};
        if (newCategory !== GameTemplates.ItemCategory.MATERIAL) itemToUpdate.materialDetails = {};
        if (newCategory !== GameTemplates.ItemCategory.QUEST_ITEM) itemToUpdate.questItemDetails = {};
        if (newCategory !== GameTemplates.ItemCategory.MISCELLANEOUS) itemToUpdate.miscDetails = {};
      }
      newItems[index] = itemToUpdate;
      return { ...prev, startingItems: newItems };
    });
  };
  const addStartingItem = () => setSettings(prev => ({ ...prev, startingItems: [...(prev.startingItems || []), { name: '', description: '', quantity: 1, category: GameTemplates.ItemCategory.MISCELLANEOUS, rarity: GameTemplates.ItemRarity.PHO_THONG, value: 0, equipmentDetails: {}, potionDetails: {}, materialDetails: {}, questItemDetails: {}, miscDetails: {} }] }));
  const removeStartingItem = (index: number) => setSettings(prev => ({ ...prev, startingItems: (prev.startingItems || []).filter((_, i) => i !== index) }));

  const handleStartingNPCChange = (index: number, field: keyof StartingNPC, value: string | number) => setSettings(prev => { const newNPCs = [...(prev.startingNPCs || [])]; newNPCs[index] = { ...newNPCs[index], [field]: value }; return { ...prev, startingNPCs: newNPCs }; });
  const addStartingNPC = () => setSettings(prev => ({ ...prev, startingNPCs: [...(prev.startingNPCs || []), { name: '', personality: '', initialAffinity: 0, details: '', gender: 'Không rõ', realm: '' }] }));
  const removeStartingNPC = (index: number) => setSettings(prev => ({ ...prev, startingNPCs: (prev.startingNPCs || []).filter((_, i) => i !== index) }));

  const handleStartingLoreChange = (index: number, field: keyof StartingLore, value: string) => setSettings(prev => { const newLore = [...(prev.startingLore || [])]; newLore[index] = { ...newLore[index], [field]: value }; return { ...prev, startingLore: newLore }; });
  const addStartingLore = () => setSettings(prev => ({ ...prev, startingLore: [...(prev.startingLore || []), { title: '', content: '' }] }));
  const removeStartingLore = (index: number) => setSettings(prev => ({ ...prev, startingLore: (prev.startingLore || []).filter((_, i) => i !== index) }));

  const handleStartingLocationChange = (index: number, field: keyof StartingLocation, value: string | boolean) => setSettings(prev => { const newLocations = [...(prev.startingLocations || [])]; newLocations[index] = { ...newLocations[index], [field]: value }; return { ...prev, startingLocations: newLocations }; });
  const addStartingLocation = () => setSettings(prev => ({ ...prev, startingLocations: [...(prev.startingLocations || []), { name: '', description: '', isSafeZone: false, regionId: '' }] }));
  const removeStartingLocation = (index: number) => setSettings(prev => ({ ...prev, startingLocations: (prev.startingLocations || []).filter((_, i) => i !== index) }));

  const handleStartingFactionChange = (index: number, field: keyof StartingFaction, value: string | number) => setSettings(prev => { const newFactions = [...(prev.startingFactions || [])]; newFactions[index] = { ...newFactions[index], [field]: value }; return { ...prev, startingFactions: newFactions }; });
  const addStartingFaction = () => setSettings(prev => ({ ...prev, startingFactions: [...(prev.startingFactions || []), { name: '', description: '', alignment: GameTemplates.FactionAlignment.TRUNG_LAP, initialPlayerReputation: 0 }] }));
  const removeStartingFaction = (index: number) => setSettings(prev => ({ ...prev, startingFactions: (prev.startingFactions || []).filter((_, i) => i !== index) }));

  // AI Assist Generation Handlers
  const handleGenerateFromStoryIdea = async () => {
    if (!storyIdea.trim()) { setGeneratorMessage({ text: 'Vui lòng nhập ý tưởng cốt truyện.', type: 'error' }); return; }
    setIsGeneratingDetails(true); setGeneratorMessage(null); setRawApiResponseText(null); setSentWorldGenPrompt(null);
    try {
      const {response, rawText, constructedPrompt} = await generateWorldDetailsFromStory(
        storyIdea, 
        settings.nsfwMode || false, 
        settings.genre, 
        settings.isCultivationEnabled,
        settings.violenceLevel || DEFAULT_VIOLENCE_LEVEL,
        settings.storyTone || DEFAULT_STORY_TONE,
        settings.genre === CUSTOM_GENRE_VALUE ? settings.customGenreName : undefined,
        settings.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE,
        (prompt) => setGeneratorMessage({ text: `Đang gửi prompt (dài ${prompt.length} ký tự)...`, type: 'info'}) 
      );
      setRawApiResponseText(rawText); setSentWorldGenPrompt(constructedPrompt);

      const validatedStartingItems = response.startingItems.map(item => {
        if (item.category === GameTemplates.ItemCategory.MATERIAL) {
            if (!item.materialDetails) {
                item.materialDetails = { type: GameTemplates.MaterialType.KHAC };
            } else if (!item.materialDetails.type || !Object.values(GameTemplates.MaterialType).includes(item.materialDetails.type as GameTemplates.MaterialTypeValues)) {
                item.materialDetails.type = GameTemplates.MaterialType.KHAC;
            }
        }
        return item;
      });

      setSettings(prev => ({
        ...prev,
        theme: response.worldTheme || prev.theme, settingDescription: response.worldSettingDescription || prev.settingDescription, writingStyle: response.worldWritingStyle || prev.writingStyle, currencyName: response.currencyName || prev.currencyName, playerName: response.playerName || prev.playerName, playerGender: response.playerGender || prev.playerGender, playerPersonality: response.playerPersonality || prev.playerPersonality, playerBackstory: response.playerBackstory || prev.playerBackstory, playerGoal: response.playerGoal || prev.playerGoal, playerStartingTraits: response.playerStartingTraits || prev.playerStartingTraits,
        startingSkills: response.startingSkills.length > 0 ? response.startingSkills : prev.startingSkills, 
        startingItems: validatedStartingItems.length > 0 ? validatedStartingItems : prev.startingItems, 
        startingNPCs: response.startingNPCs.length > 0 ? response.startingNPCs.map(npc => ({...npc, gender: npc.gender || 'Không rõ'})) : prev.startingNPCs, 
        startingLore: response.startingLore.length > 0 ? response.startingLore : prev.startingLore,
        startingLocations: response.startingLocations && response.startingLocations.length > 0 ? response.startingLocations : prev.startingLocations, startingFactions: response.startingFactions && response.startingFactions.length > 0 ? response.startingFactions : prev.startingFactions,
        heThongCanhGioi: settings.isCultivationEnabled && response.heThongCanhGioi ? response.heThongCanhGioi : (settings.isCultivationEnabled ? prev.heThongCanhGioi : VIETNAMESE.noCultivationSystem), canhGioiKhoiDau: settings.isCultivationEnabled && response.canhGioiKhoiDau ? response.canhGioiKhoiDau : (settings.isCultivationEnabled ? prev.canhGioiKhoiDau : VIETNAMESE.mortalRealmName),
        genre: response.genre || prev.genre, customGenreName: response.genre === CUSTOM_GENRE_VALUE && response.customGenreName ? response.customGenreName : (response.genre === CUSTOM_GENRE_VALUE ? prev.customGenreName : ""), isCultivationEnabled: response.isCultivationEnabled !== undefined ? response.isCultivationEnabled : prev.isCultivationEnabled,
        nsfwDescriptionStyle: settings.nsfwMode && response.nsfwDescriptionStyle ? response.nsfwDescriptionStyle : prev.nsfwDescriptionStyle,
        violenceLevel: settings.nsfwMode && response.violenceLevel ? response.violenceLevel : prev.violenceLevel,
        storyTone: settings.nsfwMode && response.storyTone ? response.storyTone : prev.storyTone,
        // playerAvatarUrl is NOT set from AI response here anymore
      }));
      // If AI provided an avatar URL, set it to playerUploadedAvatarData for preview and App.tsx processing
      if (response.playerAvatarUrl && response.playerAvatarUrl.startsWith('http')) {
        setPlayerUploadedAvatarData(response.playerAvatarUrl);
      }
      setGeneratorMessage({ text: VIETNAMESE.worldDetailsGeneratedSuccess, type: 'success' });
    } catch (e) { const errorMsg = e instanceof Error ? e.message : String(e); setGeneratorMessage({ text: `${VIETNAMESE.errorGeneratingWorldDetails} ${errorMsg}`, type: 'error' });
    } finally { setIsGeneratingDetails(false); }
  };

  const handleFanficFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeneratorMessage(null); setRawApiResponseText(null); setSentWorldGenPrompt(null);
    const file = e.target.files?.[0];
    if (file) {
      setFanficFile(file); setFanficFileContent(null); setFanficTokenCount(null); setIsLoadingTokens(true); setGeneratorMessage({ text: `Đang đọc file "${file.name}"...`, type: 'info' });
      try {
        const content = await file.text(); setFanficFileContent(content); setGeneratorMessage({ text: `Đang tính token cho file "${file.name}"...`, type: 'info' });
        const tokens = await countTokens(content); setFanficTokenCount(tokens);
        if (tokens > MAX_TOKENS_FANFIC) setGeneratorMessage({ text: VIETNAMESE.tokenCountExceededError(MAX_TOKENS_FANFIC), type: 'error' });
        else setGeneratorMessage({ text: `File "${file.name}" đã sẵn sàng. Ước tính ${tokens} token.`, type: 'success' });
      } catch (err) { const errorMsg = err instanceof Error ? err.message : String(err); setGeneratorMessage({ text: `Lỗi xử lý file: ${errorMsg}`, type: 'error' });
      } finally { setIsLoadingTokens(false); }
    } else { setFanficFile(null); setFanficFileContent(null); setFanficTokenCount(null); }
  };

  const handleGenerateFromFanfic = async () => {
    let sourceMaterialContent = ''; let isContentProvided = false;
    if (fanficSourceType === 'file') {
      if (!fanficFile || !fanficFileContent) { setGeneratorMessage({ text: VIETNAMESE.pleaseSelectFile, type: 'error' }); return; }
      if (fanficTokenCount && fanficTokenCount > MAX_TOKENS_FANFIC) { setGeneratorMessage({ text: VIETNAMESE.tokenCountExceededError(MAX_TOKENS_FANFIC), type: 'error' }); return; }
      sourceMaterialContent = fanficFileContent; isContentProvided = true;
    } else { 
      if (!fanficStoryName.trim()) { setGeneratorMessage({ text: VIETNAMESE.pleaseEnterStoryName, type: 'error' }); return; }
      sourceMaterialContent = fanficStoryName.trim(); isContentProvided = false;
    }
    setIsGeneratingFanficDetails(true); setGeneratorMessage(null); setRawApiResponseText(null); setSentWorldGenPrompt(null);
    try {
      const {response, rawText, constructedPrompt} = await generateFanfictionWorldDetails(
        sourceMaterialContent, 
        isContentProvided, 
        fanficPlayerDescription, 
        settings.nsfwMode || false, 
        settings.genre, 
        settings.isCultivationEnabled,
        settings.violenceLevel || DEFAULT_VIOLENCE_LEVEL,
        settings.storyTone || DEFAULT_STORY_TONE,
        settings.genre === CUSTOM_GENRE_VALUE ? settings.customGenreName : undefined, 
        settings.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE,
        (prompt) => setGeneratorMessage({ text: `Đang gửi prompt (dài ${prompt.length} ký tự)...`, type: 'info'})
      );
      setRawApiResponseText(rawText); setSentWorldGenPrompt(constructedPrompt);

      const validatedStartingItems = response.startingItems.map(item => {
        if (item.category === GameTemplates.ItemCategory.MATERIAL) {
            if (!item.materialDetails) {
                item.materialDetails = { type: GameTemplates.MaterialType.KHAC };
            } else if (!item.materialDetails.type || !Object.values(GameTemplates.MaterialType).includes(item.materialDetails.type as GameTemplates.MaterialTypeValues)) {
                item.materialDetails.type = GameTemplates.MaterialType.KHAC;
            }
        }
        return item;
      });

      setSettings(prev => ({
        ...prev,
        theme: response.worldTheme || prev.theme, settingDescription: response.worldSettingDescription || prev.settingDescription, writingStyle: response.worldWritingStyle || prev.writingStyle, currencyName: response.currencyName || prev.currencyName, playerName: response.playerName || prev.playerName, playerGender: response.playerGender || prev.playerGender, playerPersonality: response.playerPersonality || prev.playerPersonality, playerBackstory: response.playerBackstory || prev.playerBackstory, playerGoal: response.playerGoal || prev.playerGoal, playerStartingTraits: response.playerStartingTraits || prev.playerStartingTraits,
        startingSkills: response.startingSkills.length > 0 ? response.startingSkills : prev.startingSkills, 
        startingItems: validatedStartingItems.length > 0 ? validatedStartingItems : prev.startingItems, 
        startingNPCs: response.startingNPCs.length > 0 ? response.startingNPCs.map(npc => ({...npc, gender: npc.gender || 'Không rõ'})) : prev.startingNPCs, 
        startingLore: response.startingLore.length > 0 ? response.startingLore : prev.startingLore,
        startingLocations: response.startingLocations && response.startingLocations.length > 0 ? response.startingLocations : prev.startingLocations, startingFactions: response.startingFactions && response.startingFactions.length > 0 ? response.startingFactions : prev.startingFactions,
        originalStorySummary: response.originalStorySummary || prev.originalStorySummary,
        heThongCanhGioi: settings.isCultivationEnabled && response.heThongCanhGioi ? response.heThongCanhGioi : (settings.isCultivationEnabled ? prev.heThongCanhGioi : VIETNAMESE.noCultivationSystem), canhGioiKhoiDau: settings.isCultivationEnabled && response.canhGioiKhoiDau ? response.canhGioiKhoiDau : (settings.isCultivationEnabled ? prev.canhGioiKhoiDau : VIETNAMESE.mortalRealmName),
        genre: response.genre || prev.genre, customGenreName: response.genre === CUSTOM_GENRE_VALUE && response.customGenreName ? response.customGenreName : (response.genre === CUSTOM_GENRE_VALUE ? prev.customGenreName : ""), isCultivationEnabled: response.isCultivationEnabled !== undefined ? response.isCultivationEnabled : prev.isCultivationEnabled,
        nsfwDescriptionStyle: settings.nsfwMode && response.nsfwDescriptionStyle ? response.nsfwDescriptionStyle : prev.nsfwDescriptionStyle,
        violenceLevel: settings.nsfwMode && response.violenceLevel ? response.violenceLevel : prev.violenceLevel,
        storyTone: settings.nsfwMode && response.storyTone ? response.storyTone : prev.storyTone,
        // playerAvatarUrl is NOT set from AI response here anymore
      }));
      // If AI provided an avatar URL, set it to playerUploadedAvatarData for preview and App.tsx processing
      if (response.playerAvatarUrl && response.playerAvatarUrl.startsWith('http')) {
        setPlayerUploadedAvatarData(response.playerAvatarUrl);
      }
      if (response.originalStorySummary) { setOriginalStorySummary(response.originalStorySummary); setShowOriginalStorySummaryInput(true); }
      setGeneratorMessage({ text: VIETNAMESE.fanficDetailsGeneratedSuccess, type: 'success' });
    } catch (e) { const errorMsg = e instanceof Error ? e.message : String(e); setGeneratorMessage({ text: `${VIETNAMESE.errorGeneratingFanficDetails} ${errorMsg}`, type: 'error' });
    } finally { setIsGeneratingFanficDetails(false); }
  };
  
  const handleSubmit = () => {
    if(!settings.saveGameName.trim()){ setGeneratorMessage({text: VIETNAMESE.saveGameNameRequiredError, type: 'error'}); setActiveTab('worldSettings'); return; }
    let missingFieldsError = "Vui lòng điền đầy đủ các trường thông tin cơ bản: "; const missingFields: string[] = [];
    if (!settings.theme.trim()) missingFields.push("Chủ đề"); if (!settings.settingDescription.trim()) missingFields.push("Bối cảnh"); if (!settings.writingStyle.trim()) missingFields.push("Văn phong"); if (!settings.playerName.trim()) missingFields.push("Tên nhân vật"); if (!settings.playerPersonality.trim()) missingFields.push("Tính cách NV"); if (!settings.playerBackstory.trim()) missingFields.push("Tiểu sử NV"); if (!settings.playerGoal.trim()) missingFields.push("Mục tiêu NV");
    if (settings.isCultivationEnabled) { if (!settings.heThongCanhGioi.trim() || settings.heThongCanhGioi === VIETNAMESE.noCultivationSystem) missingFields.push("Hệ thống cảnh giới"); if (!settings.canhGioiKhoiDau.trim() || settings.canhGioiKhoiDau === VIETNAMESE.mortalRealmName) missingFields.push("Cảnh giới khởi đầu"); }
    if (settings.genre === CUSTOM_GENRE_VALUE && !settings.customGenreName?.trim()) missingFields.push(VIETNAMESE.customGenreNameLabel);
    if (missingFields.length > 0) { setGeneratorMessage({ text: missingFieldsError + missingFields.join(', ') + ".", type: "error" }); if(!settings.playerName.trim() || !settings.playerPersonality.trim() || !settings.playerBackstory.trim() || !settings.playerGoal.trim()) setActiveTab('characterStory'); else if (!settings.theme.trim() || !settings.settingDescription.trim() || !settings.writingStyle.trim() || (settings.isCultivationEnabled && (!settings.heThongCanhGioi.trim() || !settings.canhGioiKhoiDau.trim())) || (settings.genre === CUSTOM_GENRE_VALUE && !settings.customGenreName?.trim())) setActiveTab('worldSettings'); return; }
    const finalSettings = { ...settings, originalStorySummary: originalStorySummary };
    if (!finalSettings.isCultivationEnabled) { finalSettings.heThongCanhGioi = ""; finalSettings.canhGioiKhoiDau = ""; }
    if (finalSettings.genre !== CUSTOM_GENRE_VALUE) finalSettings.customGenreName = "";
    
    // Ensure playerAvatarUrl in settings reflects the chosen avatar data source
    // playerUploadedAvatarData holds the actual data (base64 or URL)
    // settings.playerAvatarUrl is more like a state descriptor for how it was set
    if (playerUploadedAvatarData) {
      if (playerUploadedAvatarData.startsWith('data:')) {
        finalSettings.playerAvatarUrl = "uploaded_via_file"; // Or the specific AI gen fail state if that's in playerUploadedAvatarData
      } else if (playerUploadedAvatarData.startsWith('http')) {
        finalSettings.playerAvatarUrl = playerUploadedAvatarData;
      } else {
        // This case handles placeholders like 'upload_pending_after_ai_gen_cloudinary_fail'
        // if it somehow ended up in playerUploadedAvatarData. Or if playerUploadedAvatarData is not a recognized format.
        // We need to ensure finalSettings.playerAvatarUrl reflects the correct state description.
        // If playerUploadedAvatarData is 'upload_pending_after_ai_gen_cloudinary_fail', then finalSettings.playerAvatarUrl should be too.
        // If playerUploadedAvatarData is 'uploaded_via_file' (e.g., from CharacterStoryTab handleChange), then that's fine.
        // For now, let's be explicit:
        if (settings.playerAvatarUrl === 'upload_pending_after_ai_gen_cloudinary_fail') {
             finalSettings.playerAvatarUrl = 'upload_pending_after_ai_gen_cloudinary_fail';
        } else if (settings.playerAvatarUrl === 'uploaded_via_file') {
             finalSettings.playerAvatarUrl = 'uploaded_via_file';
        } else {
             finalSettings.playerAvatarUrl = undefined; // If unsure, clear it
        }
      }
    } else { // No playerUploadedAvatarData
        finalSettings.playerAvatarUrl = undefined;
    }

    onSetupComplete(finalSettings, playerUploadedAvatarData); 
  };

  const handleExportSettings = () => {
    try {
      const settingsToExport = { ...settings, originalStorySummary }; const jsonString = JSON.stringify(settingsToExport, null, 2); const blob = new Blob([jsonString], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.download = `DaoDoAI_WorldSettings_${settings.saveGameName || 'Untitled'}.json`; link.href = url; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
      setGeneratorMessage({ text: VIETNAMESE.worldSettingsExportedSuccess, type: 'success' });
    } catch (error) { console.error("Error exporting world settings:", error); setGeneratorMessage({ text: VIETNAMESE.errorExportingWorldSettings, type: 'error' }); }
  };

  const handleImportSettingsFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string; const importedSettings = JSON.parse(content) as WorldSettings;
          if (importedSettings && importedSettings.theme !== undefined && importedSettings.playerName !== undefined) {
            setSettings({ 
              ...DEFAULT_WORLD_SETTINGS, 
              ...importedSettings, 
              isCultivationEnabled: importedSettings.isCultivationEnabled === undefined ? true : importedSettings.isCultivationEnabled, 
              genre: importedSettings.genre || DEFAULT_WORLD_SETTINGS.genre, 
              customGenreName: importedSettings.genre === CUSTOM_GENRE_VALUE ? (importedSettings.customGenreName || '') : '', 
              startingSkills: importedSettings.startingSkills || [], 
              startingItems: importedSettings.startingItems || [], 
              startingNPCs: importedSettings.startingNPCs || [], 
              startingLore: importedSettings.startingLore || [], 
              startingLocations: importedSettings.startingLocations || [], 
              startingFactions: importedSettings.startingFactions || [], 
              playerAvatarUrl: importedSettings.playerAvatarUrl, // This will trigger useEffect to update preview/data
              nsfwMode: importedSettings.nsfwMode || false,
              nsfwDescriptionStyle: importedSettings.nsfwDescriptionStyle || DEFAULT_NSFW_DESCRIPTION_STYLE,
              violenceLevel: importedSettings.violenceLevel || DEFAULT_VIOLENCE_LEVEL,
              storyTone: importedSettings.storyTone || DEFAULT_STORY_TONE,
            });
            setOriginalStorySummary(importedSettings.originalStorySummary || ''); 
            setShowOriginalStorySummaryInput(!!importedSettings.originalStorySummary);
            // The useEffect hook that depends on settings.playerAvatarUrl will handle updating
            // playerAvatarPreviewUrl and playerUploadedAvatarData.
            setGeneratorMessage({ text: VIETNAMESE.worldSettingsImportedSuccess, type: 'success' }); 
            setActiveTab('worldSettings'); 
          } else setGeneratorMessage({ text: VIETNAMESE.invalidWorldSettingsFile, type: 'error' });
        } catch (error) { console.error("Error importing world settings:", error); setGeneratorMessage({ text: VIETNAMESE.errorImportingWorldSettings, type: 'error' }); }
      };
      reader.readAsText(file);
    }
    if (importSettingsFileRef.current) importSettingsFileRef.current.value = "";
  };
  

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-800 p-4">
      <div className="w-full max-w-4xl bg-gray-900 shadow-2xl rounded-xl p-6 space-y-6">
        <h1 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
          {VIETNAMESE.newGame}
        </h1>
        <div className="flex flex-col sm:flex-row gap-2 justify-center items-center mb-4">
            <Button onClick={handleExportSettings} variant="secondary" className="w-full sm:w-auto">
                {VIETNAMESE.exportWorldSettingsButton}
            </Button>
            <Button onClick={() => importSettingsFileRef.current?.click()} variant="secondary" className="w-full sm:w-auto">
                {VIETNAMESE.importWorldSettingsButton}
            </Button>
            <input type="file" ref={importSettingsFileRef} onChange={handleImportSettingsFileChange} accept=".json" className="hidden" />
        </div>

        {generatorMessage && (
          <div className={`p-3 rounded-md text-sm ${ generatorMessage.type === 'success' ? 'bg-green-600/80 text-white' : generatorMessage.type === 'error' ? 'bg-red-600/80 text-white' : 'bg-blue-600/80 text-white' }`}>
            {generatorMessage.text}
            {sentWorldGenPrompt && generatorMessage.type !== 'info' && ( <Button variant="ghost" size="sm" onClick={() => setShowSentPromptModal(true)} className="ml-2 mt-1 text-xs !p-1 border-current hover:bg-white/20"> {VIETNAMESE.viewSentPromptButton} </Button> )}
            {rawApiResponseText && generatorMessage.type !== 'info' && ( <Button variant="ghost" size="sm" onClick={() => setShowRawResponseModal(true)} className="ml-2 mt-1 text-xs !p-1 border-current hover:bg-white/20"> {VIETNAMESE.viewRawAiResponseButton} </Button> )}
          </div>
        )}

        <div className="border-b border-gray-700 sticky top-0 bg-gray-900 z-10 -mx-6 px-6 mb-2">
          <nav className="-mb-px flex space-x-2 sm:space-x-4 overflow-x-auto pb-px hide-scrollbar" aria-label="Tabs">
            <button onClick={() => setActiveTab('aiAssist')} className={activeTab === 'aiAssist' ? activeTabStyle : inactiveTabStyle}>AI Hỗ Trợ</button>
            <button onClick={() => setActiveTab('characterStory')} className={activeTab === 'characterStory' ? activeTabStyle : inactiveTabStyle}>Nhân Vật & Cốt Truyện</button>
            <button onClick={() => setActiveTab('worldSettings')} className={activeTab === 'worldSettings' ? activeTabStyle : inactiveTabStyle}>Thiết Lập Thế Giới</button>
            <button onClick={() => setActiveTab('startingElements')} className={activeTab === 'startingElements' ? activeTabStyle : inactiveTabStyle}>Yếu Tố Khởi Đầu</button>
          </nav>
        </div>

        <div className="max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar pr-2 pb-4 -mr-2">
          {activeTab === 'aiAssist' && (
            <AIAssistTab
              settings={settings} // Pass full settings
              handleChange={handleChange} // Pass handleChange for nsfwMode and other settings
              storyIdea={storyIdea} setStoryIdea={setStoryIdea}
              // isOriginalStoryIdeaNsfw and setIsOriginalStoryIdeaNsfw are removed
              handleGenerateFromStoryIdea={handleGenerateFromStoryIdea} isGeneratingDetails={isGeneratingDetails}
              fanficSourceType={fanficSourceType} setFanficSourceType={setFanficSourceType}
              fanficStoryName={fanficStoryName} setFanficStoryName={setFanficStoryName}
              fanficFile={fanficFile} handleFanficFileChange={handleFanficFileChange}
              fanficTokenCount={fanficTokenCount} isLoadingTokens={isLoadingTokens}
              fanficPlayerDescription={fanficPlayerDescription} setFanficPlayerDescription={setFanficPlayerDescription}
              // isFanficIdeaNsfw and setIsFanficIdeaNsfw are removed
              handleGenerateFromFanfic={handleGenerateFromFanfic} isGeneratingFanficDetails={isGeneratingFanficDetails}
              originalStorySummary={originalStorySummary} handleOriginalStorySummaryChange={handleOriginalStorySummaryChange}
              showOriginalStorySummaryInput={showOriginalStorySummaryInput} setShowOriginalStorySummaryInput={setShowOriginalStorySummaryInput}
              fanficFileInputRef={fanficFileInputRef}
            />
          )}
          {activeTab === 'characterStory' && (
            <CharacterStoryTab
              settings={settings}
              handleChange={handleChange}
              playerAvatarPreviewUrl={playerAvatarPreviewUrl} // Pass down for preview
              setPlayerAvatarPreviewUrl={setPlayerAvatarPreviewUrl} // Allow CharacterStoryTab to update preview
              onPlayerAvatarDataChange={setPlayerUploadedAvatarData} // Allow CharacterStoryTab to set the raw data
            />
          )}
          {activeTab === 'worldSettings' && (
            <WorldSettingsTab settings={settings} handleChange={handleChange} />
          )}
          {activeTab === 'startingElements' && (
            <StartingElementsTab
              settings={settings}
              isSkillsSectionOpen={isSkillsSectionOpen} setIsSkillsSectionOpen={setIsSkillsSectionOpen}
              handleStartingSkillChange={handleStartingSkillChange} addStartingSkill={addStartingSkill} removeStartingSkill={removeStartingSkill}
              isItemsSectionOpen={isItemsSectionOpen} setIsItemsSectionOpen={setIsItemsSectionOpen}
              handleStartingItemChange={handleStartingItemChange} addStartingItem={addStartingItem} removeStartingItem={removeStartingItem}
              isNpcsSectionOpen={isNpcsSectionOpen} setIsNpcsSectionOpen={setIsNpcsSectionOpen}
              handleStartingNPCChange={handleStartingNPCChange} addStartingNPC={addStartingNPC} removeStartingNPC={removeStartingNPC}
              isLoreSectionOpen={isLoreSectionOpen} setIsLoreSectionOpen={setIsLoreSectionOpen}
              handleStartingLoreChange={handleStartingLoreChange} addStartingLore={addStartingLore} removeStartingLore={removeStartingLore}
              isLocationsSectionOpen={isLocationsSectionOpen} setIsLocationsSectionOpen={setIsLocationsSectionOpen}
              handleStartingLocationChange={handleStartingLocationChange} addStartingLocation={addStartingLocation} removeStartingLocation={removeStartingLocation}
              isFactionsSectionOpen={isFactionsSectionOpen} setIsFactionsSectionOpen={setIsFactionsSectionOpen}
              handleStartingFactionChange={handleStartingFactionChange} addStartingFaction={addStartingFaction} removeStartingFaction={removeStartingFaction}
            />
          )}
        </div>

        <div className="mt-8 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gray-700 space-y-3 sm:space-y-0 sm:space-x-4">
          <Button variant="secondary" onClick={() => setCurrentScreen(GameScreen.Initial)} className="w-full sm:w-auto">
            {VIETNAMESE.goBackButton}
          </Button>
          <Button variant="primary" size="lg" onClick={handleSubmit} className="w-full sm:w-auto" isLoading={isGeneratingDetails || isGeneratingFanficDetails} disabled={isGeneratingDetails || isGeneratingFanficDetails} >
            {VIETNAMESE.startGame}
          </Button>
        </div>
      </div>
      {showRawResponseModal && rawApiResponseText && ( <Modal isOpen={showRawResponseModal} onClose={() => setShowRawResponseModal(false)} title={VIETNAMESE.rawAiResponseModalTitle}> <pre className="whitespace-pre-wrap break-all bg-gray-700 p-3 rounded-md text-xs text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar"> {rawApiResponseText} </pre> </Modal> )}
      {showSentPromptModal && sentWorldGenPrompt && ( <Modal isOpen={showSentPromptModal} onClose={() => setShowSentPromptModal(false)} title={VIETNAMESE.sentPromptModalTitle}> <pre className="whitespace-pre-wrap break-all bg-gray-700 p-3 rounded-md text-xs text-gray-200 max-h-[60vh] overflow-y-auto custom-scrollbar"> {sentWorldGenPrompt} </pre> </Modal> )}
    </div>
  );
};

export default GameSetupScreen;
