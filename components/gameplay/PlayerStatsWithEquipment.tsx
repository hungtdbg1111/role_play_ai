
import React, { useState, ChangeEvent, useRef } from 'react'; 
import { PlayerStats, Item, EquipmentSlotId, KnowledgeBase, StatusEffect } from '../../../types';
import { VIETNAMESE, FEMALE_AVATAR_BASE_URL, MAX_FEMALE_AVATAR_INDEX, MALE_AVATAR_PLACEHOLDER_URL } from '../../../constants';
import * as GameTemplates from '../../../templates';
import Modal from '../../ui/Modal'; 
import Button from '../../ui/Button'; // Import Button for avatar change

interface PlayerStatsWithEquipmentProps {
  playerStats: PlayerStats; 
  equippedItems: Record<EquipmentSlotId, Item['id'] | null>;
  inventory: Item[]; 
  currencyName?: string;
  playerName?: string;
  playerGender?: string;
  playerAvatarUrl?: string; 
  playerAvatarData?: string; 
  worldConfig?: KnowledgeBase['worldConfig']; 
  isPlayerContext?: boolean; // To conditionally show player-specific controls
  onPlayerAvatarUploadRequest?: (base64Data: string) => void; // Callback for player avatar upload
  isUploadingPlayerAvatar?: boolean; // Loading state for player avatar
}

const PlayerStatsWithEquipment: React.FC<PlayerStatsWithEquipmentProps> = ({
  playerStats,
  equippedItems,
  inventory,
  currencyName,
  playerName,
  playerGender,
  playerAvatarUrl, // This is worldConfig.playerAvatarUrl
  playerAvatarData, // This is knowledgeBase.playerAvatarData
  worldConfig,
  isPlayerContext,
  onPlayerAvatarUploadRequest,
  isUploadingPlayerAvatar,
}) => {
  const [selectedStatusEffect, setSelectedStatusEffect] = useState<StatusEffect | null>(null);
  const isCultivationEnabled = worldConfig?.isCultivationEnabled !== undefined ? worldConfig.isCultivationEnabled : true;
  const playerAvatarFileInputRef = useRef<HTMLInputElement>(null);
  
  const getBonusForStat = (statKey: keyof Omit<PlayerStats, 'realm' | 'currency' | 'isInCombat' | 'turn' | 'hieuUngBinhCanh' | 'sinhLuc' | 'linhLuc' | 'kinhNghiem' | 'activeStatusEffects' >): number => {
    let totalBonus = 0;
    for (const slotId in equippedItems) {
      const itemId = equippedItems[slotId as EquipmentSlotId];
      if (itemId) {
        const item = inventory.find(i => i.id === itemId);
        if (item && item.category === GameTemplates.ItemCategory.EQUIPMENT) {
          const equipment = item as GameTemplates.EquipmentTemplate;
          if (equipment.statBonuses && typeof equipment.statBonuses[statKey] === 'number') {
            totalBonus += equipment.statBonuses[statKey]!;
          }
        }
      }
    }
    return totalBonus;
  };

  const renderStatLine = (
    label: string, 
    baseValue: number, 
    effectiveValue: number, 
    bonusValue?: number,
    currentStatValueForDisplay?: number
    ) => {
    const equipBonus = bonusValue !== undefined ? bonusValue : (effectiveValue - baseValue);
    const displayValue = currentStatValueForDisplay !== undefined 
        ? `${currentStatValueForDisplay}/${effectiveValue}` 
        : effectiveValue;
    
    let displayedBonusString = "";
    if (equipBonus !== 0) {
         displayedBonusString = ` (CB: ${baseValue}, TB: ${equipBonus > 0 ? '+' : ''}${equipBonus})`;
    }

    return (
      <div className="text-sm py-0.5">
        <span className="font-semibold text-indigo-300">{label}: </span>
        <span className="text-gray-100" title={`Cơ bản: ${baseValue}, Trang bị: ${equipBonus > 0 ? '+' : ''}${equipBonus}`}>
          {displayValue}
          {equipBonus !== 0 && (
            <span className={`ml-1 text-xs ${equipBonus > 0 ? 'text-green-400' : 'text-red-400'}`}>
              ({baseValue}{equipBonus > 0 ? `+${equipBonus}` : equipBonus})
            </span>
          )}
        </span>
      </div>
    );
  };

  const realmLabel = isCultivationEnabled ? VIETNAMESE.realmLabel : "Trạng Thái/Cấp Độ";
  const energyLabel = isCultivationEnabled ? VIETNAMESE.linhLucLabel : "Năng Lượng/Thể Lực";
  const experienceLabel = isCultivationEnabled ? VIETNAMESE.kinhNghiemLabel : "Kinh Nghiệm (Chung)";

  const getStatusEffectTypeColor = (type: StatusEffect['type']) => {
    switch (type) {
      case 'buff': return 'text-green-400';
      case 'debuff': return 'text-red-400';
      case 'neutral': return 'text-gray-400';
      default: return 'text-gray-200';
    }
  };
  
  const formatStatModifiers = (modifiers: StatusEffect['statModifiers']) => {
    if (!modifiers || Object.keys(modifiers).length === 0) return "Không có.";
    return Object.entries(modifiers).map(([key, value]) => {
        let statName = key;
        if (key === 'maxSinhLuc') statName = "Sinh Lực Tối Đa";
        else if (key === 'maxLinhLuc') statName = "Linh Lực Tối Đa";
        else if (key === 'sucTanCong') statName = "Sức Tấn Công";
        // Add more translations if needed
        return `${statName}: ${value}`;
    }).join('; ');
  };

  const getPlayerAvatarSrc = () => {
    if (playerAvatarData && (playerAvatarData.startsWith('http://') || playerAvatarData.startsWith('https://') || playerAvatarData.startsWith('data:image'))) {
      return playerAvatarData;
    }
    if (playerAvatarUrl && playerAvatarUrl !== 'uploaded_via_file' && (playerAvatarUrl.startsWith('http://') || playerAvatarUrl.startsWith('https://'))) {
      return playerAvatarUrl;
    }
    const defaultFemaleAvatar = `${FEMALE_AVATAR_BASE_URL}${Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1}.png`;
    return playerGender === 'Nữ' ? defaultFemaleAvatar : MALE_AVATAR_PLACEHOLDER_URL;
  };

  const handlePlayerAvatarFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onPlayerAvatarUploadRequest) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        onPlayerAvatarUploadRequest(base64String);
      };
      reader.readAsDataURL(file);
      if (playerAvatarFileInputRef.current) { // Reset file input
          playerAvatarFileInputRef.current.value = "";
      }
    }
  };


  return (
    <>
    <div className="bg-gray-800 p-3 sm:p-4 rounded-lg shadow-md border border-gray-700">
      <div className="flex items-start mb-3 border-b border-gray-700 pb-2">
        <img 
            src={getPlayerAvatarSrc()} 
            alt={VIETNAMESE.playerAvatarLabel} 
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-indigo-500 shadow-md mr-3 sm:mr-4"
        />
        <div className="flex-grow">
            <h3 className="text-lg font-semibold text-indigo-400">
            <span>{VIETNAMESE.playerStatsSection}</span>
            {isCultivationEnabled && playerStats.hieuUngBinhCanh && (
                <span className="block text-xs font-bold text-red-400 bg-red-900/50 px-2 py-0.5 rounded-full border border-red-600 animate-pulse mt-1">
                {VIETNAMESE.bottleneckEffectLabel}
                </span>
            )}
            </h3>
            {isPlayerContext && (
              <div className="mt-1">
                <input
                  type="file"
                  ref={playerAvatarFileInputRef}
                  onChange={handlePlayerAvatarFileChange}
                  accept="image/png, image/jpeg, image/webp, image/gif"
                  className="hidden"
                  id="player-avatar-upload-input"
                  disabled={isUploadingPlayerAvatar}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => playerAvatarFileInputRef.current?.click()}
                  className="text-xs !py-1 !px-2 border-indigo-500 hover:bg-indigo-700/50"
                  isLoading={isUploadingPlayerAvatar}
                  loadingText={VIETNAMESE.uploadingAvatarMessage}
                  disabled={isUploadingPlayerAvatar}
                >
                  {VIETNAMESE.changeAvatarButtonLabel}
                </Button>
              </div>
            )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-0.5">
        {playerName && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{VIETNAMESE.characterName}: </span>{playerName}</div>}
        {playerGender && <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{VIETNAMESE.gender}: </span>{playerGender}</div>}
        {(playerName || playerGender) && <div className="md:col-span-2 h-1 my-1 border-t border-gray-700/50"></div>}

        {renderStatLine(VIETNAMESE.sinhLucLabel, playerStats.baseMaxSinhLuc, playerStats.maxSinhLuc, getBonusForStat('maxSinhLuc'), playerStats.sinhLuc)}
        {(isCultivationEnabled || playerStats.maxLinhLuc > 0 || playerStats.baseMaxLinhLuc > 0) && renderStatLine(energyLabel, playerStats.baseMaxLinhLuc, playerStats.maxLinhLuc, getBonusForStat('maxLinhLuc'), playerStats.linhLuc)}
        {renderStatLine(VIETNAMESE.sucTanCongLabel, playerStats.baseSucTanCong, playerStats.sucTanCong, getBonusForStat('sucTanCong'))}
        
        <div className="text-sm py-0.5 col-span-1 md:col-span-2">
            <span className="font-semibold text-indigo-300">{realmLabel}: </span>
            <span className="text-amber-400 font-semibold">{playerStats.realm}</span>
        </div>
        
        {(isCultivationEnabled || playerStats.maxKinhNghiem > 0 || playerStats.baseMaxKinhNghiem > 0) && renderStatLine(experienceLabel, playerStats.baseMaxKinhNghiem, playerStats.maxKinhNghiem, getBonusForStat('maxKinhNghiem'), playerStats.kinhNghiem)}

        <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">{currencyName || "Tiền Tệ"}: </span>{playerStats.currency}</div>
        <div className="text-sm py-0.5"><span className="font-semibold text-indigo-300">Lượt: </span>{playerStats.turn}</div>
      </div>
      
      {playerStats.activeStatusEffects && playerStats.activeStatusEffects.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700">
            <h4 className="text-md font-semibold text-indigo-300 mb-1.5">{VIETNAMESE.statusEffectsSection}</h4>
            <ul className="space-y-1 text-xs">
                {playerStats.activeStatusEffects.map(effect => (
                    <li 
                        key={effect.id} 
                        className="p-1.5 bg-gray-700/50 rounded-md border border-gray-600/70 hover:bg-gray-600/70 cursor-pointer transition-colors" 
                        title={`Nhấn để xem chi tiết hiệu ứng ${effect.name}`}
                        onClick={() => setSelectedStatusEffect(effect)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSelectedStatusEffect(effect)}
                    >
                        <div className="flex justify-between items-center">
                            <span className={`font-medium ${getStatusEffectTypeColor(effect.type)}`}>{effect.name}</span>
                            <span className="text-gray-400">
                                {effect.durationTurns > 0 ? VIETNAMESE.statusEffectDuration(effect.durationTurns) : (effect.durationTurns === 0 || effect.durationTurns === -1) ? VIETNAMESE.statusEffectPermanent : ''}
                            </span>
                        </div>
                        {effect.specialEffects && effect.specialEffects.length > 0 && (
                             <p className="text-gray-300 text-[11px] italic mt-0.5 pl-1 truncate">Ảnh hưởng: {effect.specialEffects.join('; ')}</p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>

    {selectedStatusEffect && (
        <Modal
            isOpen={!!selectedStatusEffect}
            onClose={() => setSelectedStatusEffect(null)}
            title={`Chi Tiết Hiệu Ứng: ${selectedStatusEffect.name}`}
        >
            <div className="space-y-2 text-sm">
                <p><strong className="text-indigo-300">Tên:</strong> {selectedStatusEffect.name}</p>
                <p>
                    <strong className="text-indigo-300">Loại:</strong> 
                    <span className={`ml-1 font-semibold ${getStatusEffectTypeColor(selectedStatusEffect.type)}`}>
                        {selectedStatusEffect.type === 'buff' ? VIETNAMESE.statusEffectTypeBuff :
                         selectedStatusEffect.type === 'debuff' ? VIETNAMESE.statusEffectTypeDebuff :
                         VIETNAMESE.statusEffectTypeNeutral}
                    </span>
                </p>
                <p><strong className="text-indigo-300">Mô tả:</strong> {selectedStatusEffect.description}</p>
                <p>
                    <strong className="text-indigo-300">Thời gian:</strong> 
                    {selectedStatusEffect.durationTurns > 0 
                        ? VIETNAMESE.statusEffectDuration(selectedStatusEffect.durationTurns) 
                        : (selectedStatusEffect.durationTurns === 0 || selectedStatusEffect.durationTurns === -1) 
                            ? VIETNAMESE.statusEffectPermanent 
                            : 'Không rõ thời gian'}
                </p>
                {selectedStatusEffect.statModifiers && Object.keys(selectedStatusEffect.statModifiers).length > 0 && (
                    <p><strong className="text-indigo-300">Ảnh hưởng chỉ số:</strong> {formatStatModifiers(selectedStatusEffect.statModifiers)}</p>
                )}
                {selectedStatusEffect.specialEffects && selectedStatusEffect.specialEffects.length > 0 && (
                    <div>
                        <strong className="text-indigo-300">Hiệu ứng đặc biệt khác:</strong>
                        <ul className="list-disc list-inside pl-4 text-gray-300">
                            {selectedStatusEffect.specialEffects.map((eff, idx) => <li key={idx}>{eff}</li>)}
                        </ul>
                    </div>
                )}
                {selectedStatusEffect.source && <p className="text-xs text-gray-400 mt-3">Nguồn gốc: {selectedStatusEffect.source}</p>}
            </div>
        </Modal>
    )}
    </>
  );
};

export default PlayerStatsWithEquipment;
