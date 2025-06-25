
import React, { ChangeEvent } from 'react';
import { WorldSettings, StartingSkill, StartingItem, StartingNPC, StartingLore, StartingLocation, StartingFaction, PlayerStats } from '../../../types';
import Button from '../../ui/Button';
import InputField from '../../ui/InputField';
import { VIETNAMESE, ALL_FACTION_ALIGNMENTS } from '../../../constants';
import * as GameTemplates from '../../../templates';

interface StartingElementsTabProps {
  settings: WorldSettings;
  isSkillsSectionOpen: boolean;
  setIsSkillsSectionOpen: (isOpen: boolean) => void;
  handleStartingSkillChange: (index: number, field: keyof StartingSkill, value: string) => void;
  addStartingSkill: () => void;
  removeStartingSkill: (index: number) => void;

  isItemsSectionOpen: boolean;
  setIsItemsSectionOpen: (isOpen: boolean) => void;
  handleStartingItemChange: (
    index: number,
    field: keyof StartingItem | `equipmentDetails.${keyof NonNullable<StartingItem['equipmentDetails']>}` | `potionDetails.${keyof NonNullable<StartingItem['potionDetails']>}` | `materialDetails.${keyof NonNullable<StartingItem['materialDetails']>}` | `questItemDetails.${keyof NonNullable<StartingItem['questItemDetails']>}` | `miscDetails.${keyof NonNullable<StartingItem['miscDetails']>}`,
    value: any
  ) => void;
  addStartingItem: () => void;
  removeStartingItem: (index: number) => void;

  isNpcsSectionOpen: boolean;
  setIsNpcsSectionOpen: (isOpen: boolean) => void;
  handleStartingNPCChange: (index: number, field: keyof StartingNPC, value: string | number) => void;
  addStartingNPC: () => void;
  removeStartingNPC: (index: number) => void;

  isLoreSectionOpen: boolean;
  setIsLoreSectionOpen: (isOpen: boolean) => void;
  handleStartingLoreChange: (index: number, field: keyof StartingLore, value: string) => void;
  addStartingLore: () => void;
  removeStartingLore: (index: number) => void;
  
  isLocationsSectionOpen: boolean;
  setIsLocationsSectionOpen: (isOpen: boolean) => void;
  handleStartingLocationChange: (index: number, field: keyof StartingLocation, value: string | boolean) => void;
  addStartingLocation: () => void;
  removeStartingLocation: (index: number) => void;

  isFactionsSectionOpen: boolean;
  setIsFactionsSectionOpen: (isOpen: boolean) => void;
  handleStartingFactionChange: (index: number, field: keyof StartingFaction, value: string | number) => void;
  addStartingFaction: () => void;
  removeStartingFaction: (index: number) => void;
}

const CollapsibleSectionHeader: React.FC<{ title: string; isOpen: boolean; onToggle: () => void; itemCount?: number }> = ({ title, isOpen, onToggle, itemCount }) => (
  <legend
    className="text-lg font-semibold text-gray-300 px-2 py-2 w-full cursor-pointer hover:bg-gray-700/50 rounded-md transition-colors duration-150 flex justify-between items-center"
    onClick={onToggle}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onToggle()}
    aria-expanded={isOpen}
  >
    <span>{title} {itemCount !== undefined && `(${itemCount})`}</span>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  </legend>
);


const StartingElementsTab: React.FC<StartingElementsTabProps> = ({
  settings,
  isSkillsSectionOpen, setIsSkillsSectionOpen, handleStartingSkillChange, addStartingSkill, removeStartingSkill,
  isItemsSectionOpen, setIsItemsSectionOpen, handleStartingItemChange, addStartingItem, removeStartingItem,
  isNpcsSectionOpen, setIsNpcsSectionOpen, handleStartingNPCChange, addStartingNPC, removeStartingNPC,
  isLoreSectionOpen, setIsLoreSectionOpen, handleStartingLoreChange, addStartingLore, removeStartingLore,
  isLocationsSectionOpen, setIsLocationsSectionOpen, handleStartingLocationChange, addStartingLocation, removeStartingLocation,
  isFactionsSectionOpen, setIsFactionsSectionOpen, handleStartingFactionChange, addStartingFaction, removeStartingFaction
}) => {
  return (
    <div className="space-y-2">
      <fieldset className="border border-gray-700 p-0 rounded-md">
        <CollapsibleSectionHeader
          title={VIETNAMESE.startingSkillsSection}
          isOpen={isSkillsSectionOpen}
          onToggle={() => setIsSkillsSectionOpen(!isSkillsSectionOpen)}
          itemCount={settings.startingSkills.length}
        />
        {isSkillsSectionOpen && (
          <div className="p-4 space-y-2">
            {settings.startingSkills.map((skill, index) => (
              <div key={index} className="space-y-2 border-b border-gray-800 py-3">
                <InputField label={`${VIETNAMESE.skillNameLabel} ${index + 1}`} id={`skillName-${index}`} value={skill.name} onChange={(e) => handleStartingSkillChange(index, 'name', e.target.value)} />
                <InputField label={VIETNAMESE.skillDescriptionLabel} id={`skillDesc-${index}`} value={skill.description} onChange={(e) => handleStartingSkillChange(index, 'description', e.target.value)} textarea rows={2} />
                <div className="text-right mt-2">
                  <Button variant="danger" size="sm" onClick={() => removeStartingSkill(index)}>{VIETNAMESE.removeSkill}</Button>
                </div>
              </div>
            ))}
            <Button onClick={addStartingSkill} variant="secondary" size="sm" className="mt-3">{VIETNAMESE.addStartingSkill}</Button>
          </div>
        )}
      </fieldset>

      <fieldset className="border border-gray-700 p-0 rounded-md">
        <CollapsibleSectionHeader
            title={VIETNAMESE.startingItemsSection}
            isOpen={isItemsSectionOpen}
            onToggle={() => setIsItemsSectionOpen(!isItemsSectionOpen)}
            itemCount={settings.startingItems.length}
        />
        {isItemsSectionOpen && (
            <div className="p-4 space-y-2">
                {(settings.startingItems || []).map((item, index) => (
                    <div key={index} className="space-y-3 border-b border-gray-800 py-3">
                        <div className="space-y-2">
                            <InputField label={`${VIETNAMESE.itemNameLabel} ${index + 1}`} id={`itemName-${index}`} value={item.name} onChange={(e) => handleStartingItemChange(index, 'name', e.target.value)} />
                            <InputField label={VIETNAMESE.itemQuantityLabel} id={`itemQuantity-${index}`} type="number" value={item.quantity} onChange={(e) => handleStartingItemChange(index, 'quantity', parseInt(e.target.value, 10))} min={1} />
                            <InputField label={VIETNAMESE.itemTypeLabel} id={`itemCategory-${index}`} type="select"
                                options={Object.values(GameTemplates.ItemCategory)}
                                value={item.category} onChange={(e) => handleStartingItemChange(index, 'category', e.target.value as GameTemplates.ItemCategoryValues)} />
                        </div>
                        <InputField label={VIETNAMESE.itemDescriptionLabel} id={`itemDesc-${index}`} value={item.description} onChange={(e) => handleStartingItemChange(index, 'description', e.target.value)} textarea rows={2} />

                        {item.category === GameTemplates.ItemCategory.EQUIPMENT && (
                            <div className="space-y-2 mt-2 p-3 border border-gray-600 rounded-md bg-gray-800/50">
                                <InputField label="Loại Trang Bị" id={`equipType-${index}`} type="select" options={Object.values(GameTemplates.EquipmentType)} value={item.equipmentDetails?.type || ''} onChange={(e) => handleStartingItemChange(index, 'equipmentDetails.type', e.target.value)} />
                                <InputField label="Vị Trí Trang Bị" id={`equipSlot-${index}`} value={item.equipmentDetails?.slot || ''} onChange={(e) => handleStartingItemChange(index, 'equipmentDetails.slot', e.target.value)} placeholder="Vd: Vũ Khí Chính, Thú Cưng Đồng Hành" />
                                <InputField label="Độ Hiếm" id={`equipRarity-${index}`} type="select" options={Object.values(GameTemplates.ItemRarity)} value={item.rarity || ''} onChange={(e) => handleStartingItemChange(index, 'rarity', e.target.value)} />
                                <InputField label="Giá Trị" id={`equipValue-${index}`} type="number" value={item.value || 0} onChange={(e) => handleStartingItemChange(index, 'value', parseInt(e.target.value, 10))} />
                                <InputField label="Chỉ Số Cộng Thêm (JSON hoặc Text)" id={`equipStats-${index}`} value={item.equipmentDetails?.statBonusesString || (item.equipmentDetails?.statBonuses ? JSON.stringify(item.equipmentDetails.statBonuses) : '')} onChange={(e) => handleStartingItemChange(index, 'equipmentDetails.statBonusesString', e.target.value)} placeholder='{"sucTanCong": 5} hoặc Tăng 5 công' textarea rows={2}/>
                                <InputField label="Hiệu Ứng Đặc Biệt (cách nhau bởi ';')" id={`equipEffects-${index}`} value={item.equipmentDetails?.uniqueEffectsString || (item.equipmentDetails?.uniqueEffects ? item.equipmentDetails.uniqueEffects.join(';') : '')} onChange={(e) => handleStartingItemChange(index, 'equipmentDetails.uniqueEffectsString', e.target.value)} placeholder="Hút máu;Tăng tốc" textarea rows={2}/>
                            </div>
                        )}
                        {item.category === GameTemplates.ItemCategory.POTION && (
                            <div className="space-y-2 mt-2 p-3 border border-gray-600 rounded-md bg-gray-800/50">
                                <InputField label="Loại Đan Dược" id={`potionType-${index}`} type="select" options={Object.values(GameTemplates.PotionType)} value={item.potionDetails?.type || ''} onChange={(e) => handleStartingItemChange(index, 'potionDetails.type', e.target.value)} />
                                <InputField label="Độ Hiếm" id={`potionRarity-${index}`} type="select" options={Object.values(GameTemplates.ItemRarity)} value={item.rarity || ''} onChange={(e) => handleStartingItemChange(index, 'rarity', e.target.value)} />
                                <InputField label="Giá Trị" id={`potionValue-${index}`} type="number" value={item.value || 0} onChange={(e) => handleStartingItemChange(index, 'value', parseInt(e.target.value, 10))} />
                                <InputField label="Hiệu Ứng (cách nhau bởi ';')" id={`potionEffects-${index}`} value={item.potionDetails?.effectsString || (item.potionDetails?.effects ? item.potionDetails.effects.join(';') : '')} onChange={(e) => handleStartingItemChange(index, 'potionDetails.effectsString', e.target.value)} placeholder="Hồi 100 HP;Tăng 20 ATK" textarea rows={2}/>
                                <InputField label="Thời Gian Hiệu Lực (lượt)" id={`potionDuration-${index}`} type="number" value={item.potionDetails?.durationTurns || 0} onChange={(e) => handleStartingItemChange(index, 'potionDetails.durationTurns', parseInt(e.target.value, 10))} />
                                <InputField label="Thời Gian Hồi (lượt)" id={`potionCooldown-${index}`} type="number" value={item.potionDetails?.cooldownTurns || 0} onChange={(e) => handleStartingItemChange(index, 'potionDetails.cooldownTurns', parseInt(e.target.value, 10))} />
                            </div>
                        )}
                        {item.category === GameTemplates.ItemCategory.MATERIAL && (
                            <div className="space-y-2 mt-2 p-3 border border-gray-600 rounded-md bg-gray-800/50">
                                <InputField label="Loại Nguyên Liệu" id={`materialType-${index}`} type="select" options={Object.values(GameTemplates.MaterialType)} value={item.materialDetails?.type || ''} onChange={(e) => handleStartingItemChange(index, 'materialDetails.type', e.target.value)} />
                                <InputField label="Độ Hiếm" id={`materialRarity-${index}`} type="select" options={Object.values(GameTemplates.ItemRarity)} value={item.rarity || ''} onChange={(e) => handleStartingItemChange(index, 'rarity', e.target.value)} />
                                <InputField label="Giá Trị" id={`materialValue-${index}`} type="number" value={item.value || 0} onChange={(e) => handleStartingItemChange(index, 'value', parseInt(e.target.value, 10))} />
                            </div>
                        )}
                        {item.category === GameTemplates.ItemCategory.QUEST_ITEM && (
                            <div className="space-y-2 mt-2 p-3 border border-gray-600 rounded-md bg-gray-800/50">
                                <InputField label="ID Nhiệm Vụ Liên Quan" id={`questItemId-${index}`} value={item.questItemDetails?.questIdAssociated || ''} onChange={(e) => handleStartingItemChange(index, 'questItemDetails.questIdAssociated', e.target.value)} />
                                <InputField label="Độ Hiếm" id={`questRarity-${index}`} type="select" options={Object.values(GameTemplates.ItemRarity)} value={item.rarity || ''} onChange={(e) => handleStartingItemChange(index, 'rarity', e.target.value)} />
                            </div>
                        )}
                        {item.category === GameTemplates.ItemCategory.MISCELLANEOUS && (
                            <div className="space-y-2 mt-2 p-3 border border-gray-600 rounded-md bg-gray-800/50">
                                <InputField label="Có thể sử dụng?" id={`miscUsable-${index}`} type="checkbox" checked={item.miscDetails?.usable || false} onChange={(e) => handleStartingItemChange(index, 'miscDetails.usable', (e.target as HTMLInputElement).checked)} />
                                <InputField label="Có thể tiêu hao?" id={`miscConsumable-${index}`} type="checkbox" checked={item.miscDetails?.consumable || false} onChange={(e) => handleStartingItemChange(index, 'miscDetails.consumable', (e.target as HTMLInputElement).checked)} />
                                <InputField label="Độ Hiếm" id={`miscRarity-${index}`} type="select" options={Object.values(GameTemplates.ItemRarity)} value={item.rarity || ''} onChange={(e) => handleStartingItemChange(index, 'rarity', e.target.value)} />
                                <InputField label="Giá Trị" id={`miscValue-${index}`} type="number" value={item.value || 0} onChange={(e) => handleStartingItemChange(index, 'value', parseInt(e.target.value, 10))} />
                            </div>
                        )}
                        <div className="text-right mt-2">
                        <Button variant="danger" size="sm" onClick={() => removeStartingItem(index)}>{VIETNAMESE.removeItem}</Button>
                        </div>
                    </div>
                ))}
                <Button onClick={addStartingItem} variant="secondary" size="sm" className="mt-3">{VIETNAMESE.addStartingItem}</Button>
            </div>
        )}
      </fieldset>

      <fieldset className="border border-gray-700 p-0 rounded-md">
        <CollapsibleSectionHeader
          title={VIETNAMESE.startingNPCsSection}
          isOpen={isNpcsSectionOpen}
          onToggle={() => setIsNpcsSectionOpen(!isNpcsSectionOpen)}
          itemCount={settings.startingNPCs.length}
        />
        {isNpcsSectionOpen && (
          <div className="p-4 space-y-2">
            {settings.startingNPCs.map((npc, index) => (
              <div key={index} className="space-y-2 border-b border-gray-800 py-3">
                <InputField label={`${VIETNAMESE.npcNameLabel} ${index + 1}`} id={`npcName-${index}`} value={npc.name} onChange={(e) => handleStartingNPCChange(index, 'name', e.target.value)} />
                <InputField 
                  label={VIETNAMESE.npcGenderLabel} 
                  id={`npcGender-${index}`} 
                  type="select" 
                  options={['Không rõ', 'Nam', 'Nữ', 'Khác']} 
                  value={npc.gender || 'Không rõ'} 
                  onChange={(e) => handleStartingNPCChange(index, 'gender', e.target.value)} 
                />
                <InputField label={VIETNAMESE.npcPersonalityLabel} id={`npcPersonality-${index}`} value={npc.personality} onChange={(e) => handleStartingNPCChange(index, 'personality', e.target.value)} />
                <InputField label={VIETNAMESE.npcAffinityLabel} id={`npcAffinity-${index}`} type="number" value={npc.initialAffinity} onChange={(e) => handleStartingNPCChange(index, 'initialAffinity', parseInt(e.target.value, 10))} min={-100} max={100} />
                {settings.isCultivationEnabled && (
                  <InputField 
                    label={VIETNAMESE.npcRealmLabel} 
                    id={`npcRealm-${index}`} 
                    value={npc.realm || ''} 
                    onChange={(e) => handleStartingNPCChange(index, 'realm', e.target.value)} 
                    placeholder="Vd: Luyện Khí Kỳ, Trúc Cơ Viên Mãn" 
                  />
                )}
                <InputField label={VIETNAMESE.npcDetailsLabel} id={`npcDetails-${index}`} value={npc.details} onChange={(e) => handleStartingNPCChange(index, 'details', e.target.value)} textarea rows={2} />
                <div className="text-right mt-2">
                  <Button variant="danger" size="sm" onClick={() => removeStartingNPC(index)}>{VIETNAMESE.removeNPC}</Button>
                </div>
              </div>
            ))}
            <Button onClick={addStartingNPC} variant="secondary" size="sm" className="mt-3">{VIETNAMESE.addStartingNPC}</Button>
          </div>
        )}
      </fieldset>

      <fieldset className="border border-gray-700 p-0 rounded-md">
        <CollapsibleSectionHeader
          title={VIETNAMESE.startingLoreSection}
          isOpen={isLoreSectionOpen}
          onToggle={() => setIsLoreSectionOpen(!isLoreSectionOpen)}
          itemCount={settings.startingLore.length}
        />
        {isLoreSectionOpen && (
          <div className="p-4 space-y-2">
            {settings.startingLore.map((lore, index) => (
              <div key={index} className="space-y-2 border-b border-gray-800 py-3">
                <InputField label={`${VIETNAMESE.loreTitleLabel} ${index + 1}`} id={`loreTitle-${index}`} value={lore.title} onChange={(e) => handleStartingLoreChange(index, 'title', e.target.value)} />
                <InputField label={VIETNAMESE.loreContentLabel} id={`loreContent-${index}`} value={lore.content} onChange={(e) => handleStartingLoreChange(index, 'content', e.target.value)} textarea rows={3} />
                <div className="text-right mt-2">
                  <Button variant="danger" size="sm" onClick={() => removeStartingLore(index)}>{VIETNAMESE.removeLore}</Button>
                </div>
              </div>
            ))}
            <Button onClick={addStartingLore} variant="secondary" size="sm" className="mt-3">{VIETNAMESE.addStartingLore}</Button>
          </div>
        )}
      </fieldset>

      <fieldset className="border border-gray-700 p-0 rounded-md">
        <CollapsibleSectionHeader
          title={VIETNAMESE.startingLocationsSection}
          isOpen={isLocationsSectionOpen}
          onToggle={() => setIsLocationsSectionOpen(!isLocationsSectionOpen)}
          itemCount={settings.startingLocations.length}
        />
        {isLocationsSectionOpen && (
          <div className="p-4 space-y-2">
            {settings.startingLocations.map((location, index) => (
              <div key={index} className="space-y-2 border-b border-gray-800 py-3">
                <InputField label={`${VIETNAMESE.locationNameLabel} ${index + 1}`} id={`locName-${index}`} value={location.name} onChange={(e) => handleStartingLocationChange(index, 'name', e.target.value)} />
                <InputField label={VIETNAMESE.locationDescriptionLabel} id={`locDesc-${index}`} value={location.description} onChange={(e) => handleStartingLocationChange(index, 'description', e.target.value)} textarea rows={2} />
                <InputField label={VIETNAMESE.locationIsSafeZoneLabel} id={`locSafe-${index}`} type="checkbox" checked={location.isSafeZone} onChange={(e) => handleStartingLocationChange(index, 'isSafeZone', (e.target as HTMLInputElement).checked)} />
                <InputField label={VIETNAMESE.locationRegionIdLabel} id={`locRegion-${index}`} value={location.regionId || ''} onChange={(e) => handleStartingLocationChange(index, 'regionId', e.target.value)} />
                <div className="text-right mt-2">
                  <Button variant="danger" size="sm" onClick={() => removeStartingLocation(index)}>{VIETNAMESE.removeLocation}</Button>
                </div>
              </div>
            ))}
            <Button onClick={addStartingLocation} variant="secondary" size="sm" className="mt-3">{VIETNAMESE.addStartingLocation}</Button>
          </div>
        )}
      </fieldset>
      
      <fieldset className="border border-gray-700 p-0 rounded-md">
        <CollapsibleSectionHeader
          title={VIETNAMESE.startingFactionsSection}
          isOpen={isFactionsSectionOpen}
          onToggle={() => setIsFactionsSectionOpen(!isFactionsSectionOpen)}
          itemCount={settings.startingFactions.length}
        />
        {isFactionsSectionOpen && (
          <div className="p-4 space-y-2">
            {settings.startingFactions.map((faction, index) => (
              <div key={index} className="space-y-2 border-b border-gray-800 py-3">
                <InputField label={`${VIETNAMESE.factionNameLabel} ${index + 1}`} id={`factionName-${index}`} value={faction.name} onChange={(e) => handleStartingFactionChange(index, 'name', e.target.value)} />
                <InputField label={VIETNAMESE.factionDescriptionLabel} id={`factionDesc-${index}`} value={faction.description} onChange={(e) => handleStartingFactionChange(index, 'description', e.target.value)} textarea rows={2}/>
                <InputField label={VIETNAMESE.factionAlignmentLabel} id={`factionAlign-${index}`} type="select" options={ALL_FACTION_ALIGNMENTS} value={faction.alignment} onChange={(e) => handleStartingFactionChange(index, 'alignment', e.target.value as GameTemplates.FactionAlignmentValues)} />
                <InputField label={VIETNAMESE.factionReputationLabel} id={`factionRep-${index}`} type="number" value={faction.initialPlayerReputation} onChange={(e) => handleStartingFactionChange(index, 'initialPlayerReputation', parseInt(e.target.value, 10))} min={-100} max={100} />
                <div className="text-right mt-2">
                  <Button variant="danger" size="sm" onClick={() => removeStartingFaction(index)}>{VIETNAMESE.removeFaction}</Button>
                </div>
              </div>
            ))}
            <Button onClick={addStartingFaction} variant="secondary" size="sm" className="mt-3">{VIETNAMESE.addStartingFaction}</Button>
          </div>
        )}
      </fieldset>
    </div>
  );
};

export default StartingElementsTab;