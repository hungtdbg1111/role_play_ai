
import { PlayerStats, RealmBaseStatDefinition, Item, EquipmentSlotId, StatusEffect } from '../types';
import { DEFAULT_PLAYER_STATS, SUB_REALM_NAMES, DEFAULT_TIERED_STATS, VIETNAMESE, DEFAULT_MORTAL_STATS } from '../constants';
import * as GameTemplates from '../templates';

// Calculates base stats (maxHP, maxMP, baseATK, maxEXP) based on realm.
export const calculateRealmBaseStats = (
    realmString: string,
    mainRealmList: string[],
    currentRealmBaseStatsMap: Record<string, RealmBaseStatDefinition>
): Pick<PlayerStats, 'baseMaxSinhLuc' | 'baseMaxLinhLuc' | 'baseSucTanCong' | 'baseMaxKinhNghiem'> => {
    if (typeof realmString !== 'string') {
        console.error(`[calculateRealmBaseStats] realmString is not a string: ${JSON.stringify(realmString)}. Using fallback.`); // Keep critical error
        realmString = DEFAULT_PLAYER_STATS.realm;
    }

    if (realmString === VIETNAMESE.mortalRealmName || realmString === DEFAULT_MORTAL_STATS.realm) {
        return {
            baseMaxKinhNghiem: DEFAULT_MORTAL_STATS.baseMaxKinhNghiem,
            baseMaxSinhLuc: DEFAULT_MORTAL_STATS.baseMaxSinhLuc,
            baseMaxLinhLuc: DEFAULT_MORTAL_STATS.baseMaxLinhLuc,
            baseSucTanCong: DEFAULT_MORTAL_STATS.baseSucTanCong,
        };
    }

    let mainRealmName = "";
    let subRealmName = "";
    
    const directMainRealmMatch = mainRealmList.find(mr => mr.trim() === realmString.trim());

    if (directMainRealmMatch) {
        mainRealmName = directMainRealmMatch;
        subRealmName = SUB_REALM_NAMES[SUB_REALM_NAMES.length - 1]; 
    } else {
        const sortedMainRealmList = [...mainRealmList].sort((a,b) => b.length - a.length);
        for (const potentialMainRealm of sortedMainRealmList) {
            if (realmString.startsWith(potentialMainRealm)) {
                const remainingPart = realmString.substring(potentialMainRealm.length).trim();
                if (SUB_REALM_NAMES.includes(remainingPart)) {
                    mainRealmName = potentialMainRealm;
                    subRealmName = remainingPart;
                    break;
                }
            }
        }
    }
    
    const fallbackTierDefinition = DEFAULT_TIERED_STATS[0] || { hpBase: 10, hpInc: 1, mpBase: 10, mpInc: 1, atkBase: 1, atkInc: 0, expBase: 10, expInc: 1 };

    if (!mainRealmName || !subRealmName) {
        if (realmString !== "Không rõ" && realmString !== VIETNAMESE.mortalRealmName && realmString !== DEFAULT_MORTAL_STATS.realm) {
            // Silent for known non-parsable strings like "Không rõ"
        }
        return {
            baseMaxKinhNghiem: fallbackTierDefinition.expBase,
            baseMaxSinhLuc: fallbackTierDefinition.hpBase,
            baseMaxLinhLuc: fallbackTierDefinition.mpBase,
            baseSucTanCong: fallbackTierDefinition.atkBase,
        };
    }
    
    const subRealmIndex = SUB_REALM_NAMES.indexOf(subRealmName);
    
    if (subRealmIndex === -1) {
         let tierDefinitionForError = currentRealmBaseStatsMap[mainRealmName] || fallbackTierDefinition;
         return {
            baseMaxKinhNghiem: tierDefinitionForError.expBase,
            baseMaxSinhLuc: tierDefinitionForError.hpBase,
            baseMaxLinhLuc: tierDefinitionForError.mpBase,
            baseSucTanCong: tierDefinitionForError.atkBase,
        };
    }
    
    let tierDefinition = currentRealmBaseStatsMap[mainRealmName];
    if (!tierDefinition) {
      const mainRealmIndexInList = mainRealmList.findIndex(r => r.trim() === mainRealmName.trim());
      if (mainRealmIndexInList !== -1 && mainRealmIndexInList < DEFAULT_TIERED_STATS.length) {
          tierDefinition = DEFAULT_TIERED_STATS[mainRealmIndexInList];
      } else {
          tierDefinition = fallbackTierDefinition;
      }
    }
    
    const calculatedBaseMaxSinhLuc = tierDefinition.hpBase + (subRealmIndex * tierDefinition.hpInc);
    const calculatedBaseMaxLinhLuc = tierDefinition.mpBase + (subRealmIndex * tierDefinition.mpInc);
    const calculatedBaseSucTanCong = tierDefinition.atkBase + (subRealmIndex * tierDefinition.atkInc);
    const calculatedBaseMaxKinhNghiem = tierDefinition.expBase + (subRealmIndex * tierDefinition.expInc);
    
    return {
        baseMaxKinhNghiem: Math.max(10, calculatedBaseMaxKinhNghiem),
        baseMaxSinhLuc: Math.max(10, calculatedBaseMaxSinhLuc),
        baseMaxLinhLuc: Math.max(0, calculatedBaseMaxLinhLuc),
        baseSucTanCong: Math.max(1, calculatedBaseSucTanCong),
    };
};

export const calculateEffectiveStats = (
    currentStats: PlayerStats, 
    equippedItemIds: Record<EquipmentSlotId, Item['id'] | null>,
    inventory: Item[]
): PlayerStats => {
    const effectiveStats: PlayerStats = {
        ...currentStats, 
        maxSinhLuc: currentStats.baseMaxSinhLuc,
        maxLinhLuc: currentStats.baseMaxLinhLuc,
        sucTanCong: currentStats.baseSucTanCong,
        maxKinhNghiem: currentStats.baseMaxKinhNghiem,
    };

    for (const slotId in equippedItemIds) {
        const itemId = equippedItemIds[slotId as EquipmentSlotId];
        if (itemId) {
            const equippedItem = inventory.find(item => item.id === itemId);
            if (equippedItem && equippedItem.category === GameTemplates.ItemCategory.EQUIPMENT) {
                const equipment = equippedItem as GameTemplates.EquipmentTemplate;
                if (equipment.statBonuses) { 
                    for (const statKey in equipment.statBonuses) {
                        const key = statKey as keyof typeof equipment.statBonuses; 
                        const bonusValue = equipment.statBonuses[key];
                        if (typeof bonusValue === 'number') {
                            if (key === 'maxSinhLuc') effectiveStats.maxSinhLuc += bonusValue;
                            else if (key === 'maxLinhLuc') effectiveStats.maxLinhLuc += bonusValue;
                            else if (key === 'sucTanCong') effectiveStats.sucTanCong += bonusValue;
                            else if (key === 'maxKinhNghiem') effectiveStats.maxKinhNghiem += bonusValue;
                        }
                    }
                }
            }
        }
    }

    if (currentStats.activeStatusEffects && currentStats.activeStatusEffects.length > 0) {
        currentStats.activeStatusEffects.forEach(effect => {
            for (const statKey in effect.statModifiers) {
                const key = statKey as keyof PlayerStats;
                const modValue = effect.statModifiers[key as keyof typeof effect.statModifiers];

                if (typeof modValue === 'string') {
                    if (modValue.endsWith('%')) {
                        const percentage = parseFloat(modValue.slice(0, -1)) / 100;
                        if (!isNaN(percentage) && typeof effectiveStats[key] === 'number') {
                            (effectiveStats[key] as number) *= (1 + percentage);
                        }
                    } else {
                        const flatChange = parseInt(modValue, 10);
                        if (!isNaN(flatChange) && typeof effectiveStats[key] === 'number') {
                           (effectiveStats[key] as number) += flatChange;
                        }
                    }
                } else if (typeof modValue === 'number') {
                    if (typeof effectiveStats[key] === 'number') {
                        (effectiveStats[key] as number) += modValue;
                    }
                }
            }
        });
    }
    
    effectiveStats.maxSinhLuc = Math.round(effectiveStats.maxSinhLuc);
    effectiveStats.maxLinhLuc = Math.round(effectiveStats.maxLinhLuc);
    effectiveStats.sucTanCong = Math.round(effectiveStats.sucTanCong);
    effectiveStats.maxKinhNghiem = Math.round(effectiveStats.maxKinhNghiem);


    effectiveStats.sinhLuc = Math.max(0, Math.min(effectiveStats.sinhLuc, effectiveStats.maxSinhLuc));
    effectiveStats.linhLuc = Math.max(0, Math.min(effectiveStats.linhLuc, effectiveStats.maxLinhLuc));
    effectiveStats.kinhNghiem = Math.max(0, effectiveStats.kinhNghiem); 
    
    effectiveStats.maxSinhLuc = Math.max(10, effectiveStats.maxSinhLuc);
    effectiveStats.maxLinhLuc = Math.max(0, effectiveStats.maxLinhLuc); 
    effectiveStats.sucTanCong = Math.max(1, effectiveStats.sucTanCong);
    effectiveStats.maxKinhNghiem = Math.max(10, effectiveStats.maxKinhNghiem);

    return effectiveStats;
};
