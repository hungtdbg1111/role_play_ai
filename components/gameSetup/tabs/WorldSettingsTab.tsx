import React, { ChangeEvent } from 'react';
import { WorldSettings } from '../../../types';
import InputField from '../../ui/InputField';
import { VIETNAMESE, AVAILABLE_GENRES, CUSTOM_GENRE_VALUE } from '../../../constants';

interface WorldSettingsTabProps {
  settings: WorldSettings;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const WorldSettingsTab: React.FC<WorldSettingsTabProps> = ({ settings, handleChange }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
      <InputField
        label={VIETNAMESE.saveGameNameLabel}
        id="saveGameName"
        name="saveGameName"
        value={settings.saveGameName}
        onChange={handleChange}
        placeholder={settings.playerName ? VIETNAMESE.saveGameNamePlaceholder.replace("[Tên Nhân Vật]", settings.playerName) : VIETNAMESE.saveGameNamePlaceholder.replace(" [Tên Nhân Vật]", "")}
      />
      <InputField 
        label={VIETNAMESE.worldTheme} 
        id="theme" 
        name="theme" 
        value={settings.theme} 
        onChange={handleChange} 
      />
      <InputField 
        label={VIETNAMESE.genreLabel} 
        id="genre" 
        name="genre" 
        type="select" 
        options={AVAILABLE_GENRES as unknown as string[]} 
        value={settings.genre} 
        onChange={handleChange} 
      />
      {settings.genre === CUSTOM_GENRE_VALUE && (
        <InputField
          label={VIETNAMESE.customGenreNameLabel}
          id="customGenreName"
          name="customGenreName"
          value={settings.customGenreName || ''}
          onChange={handleChange}
          placeholder={VIETNAMESE.customGenreNamePlaceholder}
        />
      )}
      <InputField 
        label={VIETNAMESE.worldSetting} 
        id="settingDescription" 
        name="settingDescription" 
        value={settings.settingDescription} 
        onChange={handleChange} 
        textarea 
        rows={3} 
      />
      <InputField 
        label={VIETNAMESE.writingStyle} 
        id="writingStyle" 
        name="writingStyle" 
        value={settings.writingStyle} 
        onChange={handleChange} 
        textarea 
      />
      <InputField 
        label={VIETNAMESE.difficulty} 
        id="difficulty" 
        name="difficulty" 
        type="select" 
        options={['Dễ', 'Thường', 'Khó']} 
        value={settings.difficulty} 
        onChange={handleChange} 
      />
      <InputField 
        label={VIETNAMESE.currencyName} 
        id="currencyName" 
        name="currencyName" 
        value={settings.currencyName} 
        onChange={handleChange} 
      />
      <InputField 
        label={VIETNAMESE.nsfwModeLabel} 
        id="nsfwMode" 
        name="nsfwMode" 
        type="checkbox" 
        checked={settings.nsfwMode} 
        onChange={handleChange} 
      />
      
      <div className="md:col-span-2 border-t border-gray-700 pt-4 mt-2">
        <InputField 
          label={VIETNAMESE.enableCultivationSystemLabel} 
          id="isCultivationEnabled" 
          name="isCultivationEnabled" 
          type="checkbox" 
          checked={settings.isCultivationEnabled} 
          onChange={handleChange} 
        />
        {settings.isCultivationEnabled && (
          <>
            <InputField 
              label={VIETNAMESE.realmSystemLabel} 
              id="heThongCanhGioi" 
              name="heThongCanhGioi" 
              value={settings.heThongCanhGioi} 
              onChange={handleChange} 
              placeholder={VIETNAMESE.realmSystemPlaceholder} 
            />
            <InputField 
              label={VIETNAMESE.startingRealmLabel} 
              id="canhGioiKhoiDau" 
              name="canhGioiKhoiDau" 
              value={settings.canhGioiKhoiDau} 
              onChange={handleChange} 
              placeholder={VIETNAMESE.startingRealmPlaceholder} 
            />
          </>
        )}
        {!settings.isCultivationEnabled && (
          <p className="text-sm text-gray-400 italic">{VIETNAMESE.cultivationSystemDisabledNote}</p>
        )}
      </div>
    </div>
  );
};

export default WorldSettingsTab;
