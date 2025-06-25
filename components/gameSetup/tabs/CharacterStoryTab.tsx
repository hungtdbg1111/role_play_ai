
import React, { ChangeEvent, useState, useEffect } from 'react';
import { WorldSettings } from '../../../types';
import InputField from '../../ui/InputField';
import Button from '../../ui/Button';
import Spinner from '../../ui/Spinner';
import { VIETNAMESE, FEMALE_AVATAR_BASE_URL, MAX_FEMALE_AVATAR_INDEX, MALE_AVATAR_PLACEHOLDER_URL, CLOUDINARY_CLOUD_NAME } from '../../../constants';
import { generateImageUnified } from '../../../services/geminiService'; 
import { uploadImageToCloudinary } from '../../../services/cloudinaryService';

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

  useEffect(() => {
    // If settings.playerAvatarUrl exists (e.g., from imported settings or previous AI gen)
    // and it's not a base64 string or 'uploaded_via_file', set it as preview.
    // This ensures that if a Cloudinary URL was saved, it's used.
    if (settings.playerAvatarUrl && 
        !settings.playerAvatarUrl.startsWith('data:') && 
        settings.playerAvatarUrl !== 'uploaded_via_file' &&
        playerAvatarPreviewUrl !== settings.playerAvatarUrl) { // Avoid loop if already set
      setPlayerAvatarPreviewUrl(settings.playerAvatarUrl);
      onPlayerAvatarDataChange(settings.playerAvatarUrl); // Notify parent it's a URL
    }
  }, [settings.playerAvatarUrl, setPlayerAvatarPreviewUrl, onPlayerAvatarDataChange, playerAvatarPreviewUrl]);


  const handleRandomAvatar = () => {
    const randomIndex = Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1;
    const randomUrl = `${FEMALE_AVATAR_BASE_URL}${randomIndex}.png`;
    setPlayerAvatarPreviewUrl(randomUrl);
    onPlayerAvatarDataChange(randomUrl); // Pass URL to parent
    handleChange({ target: { name: 'playerAvatarUrl', value: randomUrl } } as any); // Update settings directly with URL
    setAiAvatarPrompt(''); 
    setAiAvatarError(null);
  };

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPlayerAvatarPreviewUrl(base64String); // Show base64 preview immediately
        onPlayerAvatarDataChange(base64String); // Pass base64 to parent for later Cloudinary upload
        // Settings.playerAvatarUrl will be updated by App.tsx after successful Cloudinary upload
        handleChange({ target: { name: 'playerAvatarUrl', value: 'uploaded_via_file' } } as any); // Mark as pending upload
        setAiAvatarPrompt('');
        setAiAvatarError(null);
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
  };

  const handleGenerateAiAvatar = async () => {
    if (!aiAvatarPrompt.trim()) {
      setAiAvatarError(VIETNAMESE.aiAvatarPromptRequiredError || "Vui lòng nhập mô tả cho ảnh đại diện.");
      return;
    }
    setIsGeneratingAiAvatar(true);
    setAiAvatarError(null);
    try {
      const rawBase64ImageData = await generateImageUnified(aiAvatarPrompt); // Use unified service
      const fullBase64DataUri = `data:image/png;base64,${rawBase64ImageData}`;
      setPlayerAvatarPreviewUrl(fullBase64DataUri); // Show base64 preview first
      
      // Attempt to upload to Cloudinary immediately
      try {
        const playerNameSlug = settings.playerName?.replace(/\s+/g, '_').toLowerCase() || `player_${Date.now()}`;
        // Pass raw base64 to Cloudinary service
        const cloudinaryUrl = await uploadImageToCloudinary(rawBase64ImageData, 'player', `player_${playerNameSlug}`);
        setPlayerAvatarPreviewUrl(cloudinaryUrl); // Update preview to Cloudinary URL
        onPlayerAvatarDataChange(cloudinaryUrl); // Pass Cloudinary URL to parent
        handleChange({ target: { name: 'playerAvatarUrl', value: cloudinaryUrl } } as any); // Update settings with Cloudinary URL
      } catch (uploadError) {
        console.error("Cloudinary upload failed for AI generated player avatar:", uploadError);
        setAiAvatarError("Tạo ảnh thành công, nhưng tải lên Cloudinary thất bại. Ảnh sẽ được lưu trữ tạm thời.");
        // Fallback: pass base64 data URI if Cloudinary upload fails, for temporary display
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
          <div className="space-y-2">
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

          <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-gray-700 mt-3">
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