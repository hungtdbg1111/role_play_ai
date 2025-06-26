
import React, { ChangeEvent, useState, useEffect } from 'react';
import { WorldSettings } from '../../../types';
import InputField from '../../ui/InputField';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import { VIETNAMESE, FEMALE_AVATAR_BASE_URL, MAX_FEMALE_AVATAR_INDEX, MALE_AVATAR_PLACEHOLDER_URL, CLOUDINARY_CLOUD_NAME } from '../../../constants';
import { generateImageUnified } from '../../../services/geminiService'; 
import { uploadImageToCloudinary } from '../../../services/cloudinaryService';
import { isValidImageUrl } from '../../../utils/imageValidationUtils';

interface CharacterStoryTabProps {
  settings: WorldSettings;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  playerAvatarPreviewUrl: string | null; 
  setPlayerAvatarPreviewUrl: (url: string | null) => void; 
  onPlayerAvatarDataChange: (data: string | null) => void; 
}

const CharacterStoryTab: React.FC<CharacterStoryTabProps> = ({
  settings,
  handleChange,
  playerAvatarPreviewUrl, 
  setPlayerAvatarPreviewUrl, 
  onPlayerAvatarDataChange, 
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [aiAvatarPrompt, setAiAvatarPrompt] = useState('');
  const [isGeneratingAiAvatar, setIsGeneratingAiAvatar] = useState(false);
  const [aiAvatarError, setAiAvatarError] = useState<string | null>(null);

  // State for player avatar URL input during setup
  const [showPlayerSetupAvatarUrlInput, setShowPlayerSetupAvatarUrlInput] = useState(false);
  const [playerAvatarUrlInput, setPlayerAvatarUrlInput] = useState(''); 
  const [isPlayerAvatarUrlValidating, setIsPlayerAvatarUrlValidating] = useState(false);
  const [playerAvatarUrlError, setPlayerAvatarUrlError] = useState<string | null>(null);

  useEffect(() => {
    if (playerAvatarPreviewUrl && playerAvatarPreviewUrl.startsWith('http')) {
      setPlayerAvatarUrlInput(playerAvatarPreviewUrl);
    } else {
      setPlayerAvatarUrlInput('');
    }
  }, [playerAvatarPreviewUrl]);


  const handleRandomAvatar = () => {
    const randomIndex = Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1;
    const randomUrl = `${FEMALE_AVATAR_BASE_URL}${randomIndex}.png`;
    setPlayerAvatarPreviewUrl(randomUrl); 
    onPlayerAvatarDataChange(randomUrl);  
    handleChange({ target: { name: 'playerAvatarUrl', value: randomUrl } } as any); 
    setAiAvatarPrompt(''); 
    setAiAvatarError(null);
    setPlayerAvatarUrlError(null);
    setShowPlayerSetupAvatarUrlInput(false);
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPlayerAvatarPreviewUrl(base64String); 
        onPlayerAvatarDataChange(base64String); 
        handleChange({ target: { name: 'playerAvatarUrl', value: 'uploaded_via_file' } } as any); 
        setAiAvatarPrompt('');
        setAiAvatarError(null);
        setPlayerAvatarUrlError(null);
        setShowPlayerSetupAvatarUrlInput(false);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleRemoveAvatar = () => {
    setPlayerAvatarPreviewUrl(null);
    onPlayerAvatarDataChange(null);
    handleChange({ target: { name: 'playerAvatarUrl', value: undefined } } as any);
    if(fileInputRef.current) fileInputRef.current.value = "";
    setAiAvatarPrompt('');
    setAiAvatarError(null);
    setPlayerAvatarUrlInput(''); 
    setPlayerAvatarUrlError(null);
    setShowPlayerSetupAvatarUrlInput(false);
  };

  const handleGenerateAiAvatar = async () => {
    if (!aiAvatarPrompt.trim()) {
      setAiAvatarError(VIETNAMESE.aiAvatarPromptRequiredError || "Vui lòng nhập mô tả cho ảnh đại diện.");
      return;
    }
    setIsGeneratingAiAvatar(true);
    setAiAvatarError(null);
    setPlayerAvatarUrlInput(''); 
    setPlayerAvatarUrlError(null);
    setShowPlayerSetupAvatarUrlInput(false); 
    try {
      const rawBase64ImageData = await generateImageUnified(aiAvatarPrompt); 
      const fullBase64DataUri = `data:image/png;base64,${rawBase64ImageData}`;
      
      try {
        const playerNameSlug = settings.playerName?.replace(/\s+/g, '_').toLowerCase() || `player_${Date.now()}`;
        const cloudinaryUrl = await uploadImageToCloudinary(rawBase64ImageData, 'player', `player_${playerNameSlug}`);
        setPlayerAvatarPreviewUrl(cloudinaryUrl); 
        onPlayerAvatarDataChange(cloudinaryUrl); 
        handleChange({ target: { name: 'playerAvatarUrl', value: cloudinaryUrl } } as any); 
      } catch (uploadError) {
        console.error("Cloudinary upload failed for AI generated player avatar:", uploadError);
        setAiAvatarError("Tạo ảnh thành công, nhưng tải lên Cloudinary thất bại. Ảnh sẽ được lưu trữ tạm thời.");
        setPlayerAvatarPreviewUrl(fullBase64DataUri); 
        onPlayerAvatarDataChange(fullBase64DataUri); 
        handleChange({ target: { name: 'playerAvatarUrl', value: 'upload_pending_after_ai_gen_cloudinary_fail' } } as any); 
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setAiAvatarError(`${VIETNAMESE.errorGeneratingAiAvatar} ${errorMessage}`);
    } finally {
      setIsGeneratingAiAvatar(false);
    }
  };

  const handlePlayerSetupAvatarUrlSubmit = async () => {
    if (!playerAvatarUrlInput.trim()) return;
    setIsPlayerAvatarUrlValidating(true);
    setPlayerAvatarUrlError(null);
    const isValid = await isValidImageUrl(playerAvatarUrlInput);
    setIsPlayerAvatarUrlValidating(false);
    if (isValid) {
      setPlayerAvatarPreviewUrl(playerAvatarUrlInput); 
      onPlayerAvatarDataChange(playerAvatarUrlInput);  
      handleChange({ target: { name: 'playerAvatarUrl', value: playerAvatarUrlInput } } as any); 
      setAiAvatarPrompt(''); 
      setAiAvatarError(null);
      if (fileInputRef.current) fileInputRef.current.value = ""; 
      setShowPlayerSetupAvatarUrlInput(false); 
    } else {
      setPlayerAvatarUrlError(VIETNAMESE.avatarUrlInvalid);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
        <InputField
          label={VIETNAMESE.characterName}
          id="playerName"
          name="playerName"
          value={settings.playerName}
          onChange={handleChange}
        />
        <InputField
          label={VIETNAMESE.gender}
          id="playerGender"
          name="playerGender"
          type="select"
          options={['Nam', 'Nữ', 'Khác']}
          value={settings.playerGender}
          onChange={handleChange}
        />
        <InputField
          label={VIETNAMESE.personality}
          id="playerPersonality"
          name="playerPersonality"
          value={settings.playerPersonality}
          onChange={handleChange}
          textarea
        />
        <InputField
          label={VIETNAMESE.backstory}
          id="playerBackstory"
          name="playerBackstory"
          value={settings.playerBackstory}
          onChange={handleChange}
          textarea
          rows={3}
        />
        <InputField
          label={VIETNAMESE.goal}
          id="playerGoal"
          name="playerGoal"
          value={settings.playerGoal}
          onChange={handleChange}
          textarea
          rows={3}
        />
        <InputField
          label={VIETNAMESE.startingTraits}
          id="playerStartingTraits"
          name="playerStartingTraits"
          value={settings.playerStartingTraits}
          onChange={handleChange}
          textarea
          placeholder={VIETNAMESE.startingTraits}
        />
      </div>

      <fieldset className="border border-gray-700 p-4 rounded-md mt-4">
        <legend className="text-md font-semibold text-gray-300 px-1">{VIETNAMESE.playerAvatarSectionTitle}</legend>
        <div className="mt-2 space-y-3">
          {playerAvatarPreviewUrl && (
            <div className="mb-3 text-center">
              <p className="text-sm text-gray-400 mb-1">{VIETNAMESE.avatarPreviewLabel}</p>
              <img src={playerAvatarPreviewUrl} alt="Player Avatar Preview" className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover mx-auto border-2 border-indigo-500 shadow-lg" />
            </div>
          )}
           
           <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setShowPlayerSetupAvatarUrlInput(!showPlayerSetupAvatarUrlInput);
              if (!showPlayerSetupAvatarUrlInput && playerAvatarPreviewUrl?.startsWith('http')) {
                setPlayerAvatarUrlInput(playerAvatarPreviewUrl);
              } else if (!showPlayerSetupAvatarUrlInput) {
                setPlayerAvatarUrlInput('');
              }
              setPlayerAvatarUrlError(null);
            }}
            className="w-full text-sm border-cyan-600 hover:bg-cyan-700/50"
            aria-expanded={showPlayerSetupAvatarUrlInput}
            disabled={isGeneratingAiAvatar}
            >
            {showPlayerSetupAvatarUrlInput ? "Đóng Nhập URL" : VIETNAMESE.avatarUrlInputLabel.replace(":", "")}
          </Button>

          {showPlayerSetupAvatarUrlInput && (
            <div className="mt-1.5 p-2 border border-gray-600 rounded-md bg-gray-800/30">
                <InputField
                label=""
                id="playerAvatarUrlInputSetup"
                value={playerAvatarUrlInput} 
                onChange={(e) => setPlayerAvatarUrlInput(e.target.value)}
                placeholder={VIETNAMESE.avatarUrlInputPlaceholder}
                disabled={isGeneratingAiAvatar || isPlayerAvatarUrlValidating}
                className="!mb-1.5"
                />
                <Button
                    type="button"
                    variant="primary"
                    onClick={handlePlayerSetupAvatarUrlSubmit}
                    className="w-full text-xs !py-1"
                    isLoading={isPlayerAvatarUrlValidating}
                    disabled={isGeneratingAiAvatar || isPlayerAvatarUrlValidating || !playerAvatarUrlInput.trim()}
                    loadingText={VIETNAMESE.avatarUrlValidating}
                >
                    {VIETNAMESE.confirmUrlButton}
                </Button>
                {isPlayerAvatarUrlValidating && <Spinner size="sm" text={VIETNAMESE.avatarUrlValidating} className="mt-1 text-xs" />}
                {playerAvatarUrlError && <p className="text-xs text-red-400 mt-1">{playerAvatarUrlError}</p>}
            </div>
          )}


          <div className="space-y-2 pt-2 border-t border-gray-700/50">
            <InputField
              label={VIETNAMESE.aiAvatarPromptLabel}
              id="aiAvatarPrompt"
              value={aiAvatarPrompt}
              onChange={(e) => {
                setAiAvatarPrompt(e.target.value);
                if (aiAvatarError) setAiAvatarError(null);
              }}
              placeholder={VIETNAMESE.aiAvatarPromptPlaceholder}
              disabled={isGeneratingAiAvatar}
            />
            <Button 
              type="button" 
              variant="primary" 
              onClick={handleGenerateAiAvatar} 
              className="w-full bg-purple-600 hover:bg-purple-700 focus:ring-purple-500"
              isLoading={isGeneratingAiAvatar}
              disabled={isGeneratingAiAvatar || !aiAvatarPrompt.trim()}
              loadingText={VIETNAMESE.generatingAiAvatarMessage}
            >
              {VIETNAMESE.generateAiAvatarButtonLabel}
            </Button>
            {isGeneratingAiAvatar && <Spinner size="sm" className="mx-auto mt-2" />}
            {aiAvatarError && <p className="text-xs text-red-400 mt-1 text-center">{aiAvatarError}</p>}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-700/50 mt-3">
            <Button type="button" variant="secondary" onClick={handleRandomAvatar} className="w-full sm:flex-1" disabled={isGeneratingAiAvatar}>
              {VIETNAMESE.randomAvatarButtonLabel}
            </Button>
            <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full sm:flex-1" disabled={isGeneratingAiAvatar}>
              {VIETNAMESE.uploadAvatarButtonLabel}
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarUpload}
              accept="image/png, image/jpeg, image/webp, image/gif"
              className="hidden"
              disabled={isGeneratingAiAvatar}
            />
          </div>
           {playerAvatarPreviewUrl && (
             <Button type="button" variant="danger" onClick={handleRemoveAvatar} className="w-full mt-2 text-xs" disabled={isGeneratingAiAvatar}>
              {VIETNAMESE.removeUploadedAvatarButtonLabel}
            </Button>
           )}
        </div>
      </fieldset>
    </div>
  );
};

export default CharacterStoryTab;
