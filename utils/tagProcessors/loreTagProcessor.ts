
import { KnowledgeBase, GameMessage, NPC, GameLocation, WorldLoreEntry, Faction, PlayerStats, ApiConfig } from '../../types';
import { NPCTemplate } from '../../templates'; 
import { ALL_FACTION_ALIGNMENTS, VIETNAMESE, DEFAULT_MORTAL_STATS, FEMALE_AVATAR_BASE_URL, MAX_FEMALE_AVATAR_INDEX, MALE_AVATAR_PLACEHOLDER_URL } from '../../constants';
import * as GameTemplates from '../../templates';
import { calculateRealmBaseStats } from '../statsCalculationUtils'; 
import { getApiSettings, generateImageUnified } from '../../services/geminiService'; // Updated import
import { uploadImageToCloudinary } from '../../services/cloudinaryService'; 

export const processNpc = async (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number,
    setKnowledgeBaseDirectly: React.Dispatch<React.SetStateAction<KnowledgeBase>>,
    logNpcAvatarPromptCallback?: (prompt: string) => void // New callback
): Promise<{ updatedKb: KnowledgeBase; systemMessages: GameMessage[] }> => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const npcName = tagParams.name;
    const gender = tagParams.gender as NPC['gender'] || 'Không rõ';
    const description = tagParams.description;
    const personality = tagParams.personality;
    const affinity = parseInt(tagParams.affinity || "0", 10);
    const factionId = tagParams.factionId;
    const npcRealm = tagParams.realm; 
    const statsJSON = tagParams.statsJSON;
    const baseStatOverridesJSON = tagParams.baseStatOverridesJSON;
    let aiSuggestedAvatarUrl = tagParams.avatarUrl; 

    const legacyHp = parseInt(tagParams.hp || "0", 10);
    const legacyAtk = parseInt(tagParams.atk || "0", 10);

    if (!npcName) {
        console.warn("NPC: Missing NPC name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const existingNpcIndex = newKb.discoveredNPCs.findIndex(n => n.name === npcName);
    let npcToProcess: NPC;
    let isNewNpc = false;

    if (existingNpcIndex > -1) {
        npcToProcess = newKb.discoveredNPCs[existingNpcIndex];
        if (description) npcToProcess.description = description;
        if (personality) npcToProcess.personalityTraits = personality.split(',').map(p => p.trim());
        if (!isNaN(affinity)) npcToProcess.affinity = affinity;
        if (factionId) npcToProcess.factionId = factionId;
        if (gender) npcToProcess.gender = gender;
        if (npcRealm) npcToProcess.realm = npcRealm;
        if (aiSuggestedAvatarUrl) npcToProcess.avatarUrl = aiSuggestedAvatarUrl;

        systemMessages.push({
            id: 'npc-info-updated-' + Date.now(), type: 'system',
            content: `Thông tin NPC ${npcName} đã được cập nhật.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
        isNewNpc = true;
        npcToProcess = {
            id: `npc-${npcName.replace(/\s+/g, '-')}-${Date.now()}`,
            name: npcName,
            gender: gender,
            description: description || "Không có mô tả.",
            personalityTraits: personality ? personality.split(',').map(p => p.trim()) : [],
            affinity: isNaN(affinity) ? 0 : affinity,
            factionId: factionId || undefined,
            realm: npcRealm || (newKb.worldConfig?.isCultivationEnabled ? (newKb.playerStats.realm || VIETNAMESE.mortalRealmName) : VIETNAMESE.mortalRealmName),
            stats: {}, 
            baseStatOverrides: {},
            avatarUrl: aiSuggestedAvatarUrl || undefined,
        };
        newKb.discoveredNPCs.push(npcToProcess);
        systemMessages.push({
            id: 'npc-discovered-' + Date.now(), type: 'system',
            content: `Bạn đã gặp NPC mới: ${npcName}.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }
    
    const apiSettings = getApiSettings();
    const npcIdToUpdate = npcToProcess.id; // Capture ID for async closure

    if (apiSettings.autoGenerateNpcAvatars && (isNewNpc || !npcToProcess.avatarUrl || npcToProcess.avatarUrl.startsWith('https://via.placeholder.com') || npcToProcess.avatarUrl.includes('FEMALE_AVATAR_BASE_URL_placeholder'))) {
        
        // Set initial placeholder immediately
        if (!npcToProcess.avatarUrl || npcToProcess.avatarUrl.startsWith('https://via.placeholder.com') || npcToProcess.avatarUrl.includes('FEMALE_AVATAR_BASE_URL_placeholder')) {
            npcToProcess.avatarUrl = npcToProcess.gender === 'Nữ'
                ? `${FEMALE_AVATAR_BASE_URL}${Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1}.png` // Temp random
                : MALE_AVATAR_PLACEHOLDER_URL;
        }
        systemMessages.push({
            id: `npc-avatar-generating-${npcIdToUpdate}`, type: 'system',
            content: `Đang tạo ảnh đại diện AI cho NPC ${npcName}...`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
        
        // Fire and forget async avatar generation
        (async () => {
          let cloudinaryUrl: string | undefined;
          let avatarError: Error | undefined;
          let avatarPromptForGeneration = "";
          try {
            avatarPromptForGeneration = `Một bức chân dung chi tiết của NPC tên ${npcToProcess.name}, `;
            if (npcToProcess.gender && npcToProcess.gender !== 'Không rõ') avatarPromptForGeneration += `giới tính ${npcToProcess.gender}, `;
            if (npcToProcess.personalityTraits && npcToProcess.personalityTraits.length > 0) avatarPromptForGeneration += `tính cách ${npcToProcess.personalityTraits.join(', ')}, `;
            avatarPromptForGeneration += `trong thế giới ${newKb.worldConfig?.theme || 'fantasy'}. ${npcToProcess.description || ''} Phong cách: cinematic portrait, fantasy art, high detail.`;
            
            if(logNpcAvatarPromptCallback) {
                logNpcAvatarPromptCallback(avatarPromptForGeneration);
            }
            const rawBase64ImageData = await generateImageUnified(avatarPromptForGeneration); 
            
            if (rawBase64ImageData) {
                let cloudinaryUploadType: 'npc_male' | 'npc_female';
                if (npcToProcess.gender === 'Nữ') {
                    cloudinaryUploadType = 'npc_female';
                } else { 
                    cloudinaryUploadType = 'npc_male';
                }
                cloudinaryUrl = await uploadImageToCloudinary(rawBase64ImageData, cloudinaryUploadType, `npc_${npcIdToUpdate}`);
            }
          } catch (err) {
            avatarError = err instanceof Error ? err : new Error(String(err));
            console.error(`Async avatar generation for NPC ${npcIdToUpdate} failed:`, avatarError);
          } finally {
            setKnowledgeBaseDirectly(prevKb => {
                const updatedNPCs = prevKb.discoveredNPCs.map(n =>
                    n.id === npcIdToUpdate ? { ...n, avatarUrl: cloudinaryUrl || (npcToProcess.gender === 'Nữ' ? `${FEMALE_AVATAR_BASE_URL}${Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1}.png` : MALE_AVATAR_PLACEHOLDER_URL) } : n
                );
                console.log(`Avatar for ${npcName}: ${cloudinaryUrl || (avatarError ? 'Error - ' + avatarError.message : 'Generated, no URL/Error in generation')}`);
                return { ...prevKb, discoveredNPCs: updatedNPCs };
            });
          }
        })();
    } else if (!npcToProcess.avatarUrl) { 
         npcToProcess.avatarUrl = npcToProcess.gender === 'Nữ'
            ? `${FEMALE_AVATAR_BASE_URL}${Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1}.png`
            : MALE_AVATAR_PLACEHOLDER_URL;
    }


    let calculatedBaseStats: Partial<PlayerStats> = {};
    if (npcToProcess.realm && newKb.worldConfig?.isCultivationEnabled) {
        calculatedBaseStats = calculateRealmBaseStats(
            npcToProcess.realm,
            newKb.realmProgressionList, 
            newKb.currentRealmBaseStats 
        );
    } else { 
        calculatedBaseStats = {
            baseMaxSinhLuc: DEFAULT_MORTAL_STATS.baseMaxSinhLuc,
            baseMaxLinhLuc: DEFAULT_MORTAL_STATS.baseMaxLinhLuc,
            baseSucTanCong: DEFAULT_MORTAL_STATS.baseSucTanCong,
            baseMaxKinhNghiem: DEFAULT_MORTAL_STATS.baseMaxKinhNghiem,
        };
    }
    
    if (baseStatOverridesJSON) {
        try {
            const overrides = JSON.parse(baseStatOverridesJSON) as NPCTemplate['baseStatOverrides'];
            if (overrides) {
                npcToProcess.baseStatOverrides = overrides; 
                calculatedBaseStats = { ...calculatedBaseStats, ...overrides };
            }
        } catch (e) {
            console.warn(`NPC (${npcName}): Could not parse baseStatOverridesJSON: ${baseStatOverridesJSON}`, e);
        }
    }
    
    if (!npcToProcess.stats) npcToProcess.stats = {};
    npcToProcess.stats.baseMaxSinhLuc = calculatedBaseStats.baseMaxSinhLuc;
    npcToProcess.stats.baseMaxLinhLuc = calculatedBaseStats.baseMaxLinhLuc;
    npcToProcess.stats.baseSucTanCong = calculatedBaseStats.baseSucTanCong;
    npcToProcess.stats.baseMaxKinhNghiem = calculatedBaseStats.baseMaxKinhNghiem;

    npcToProcess.stats.maxSinhLuc = calculatedBaseStats.baseMaxSinhLuc;
    npcToProcess.stats.maxLinhLuc = calculatedBaseStats.baseMaxLinhLuc;
    npcToProcess.stats.sucTanCong = calculatedBaseStats.baseSucTanCong;
    npcToProcess.stats.maxKinhNghiem = calculatedBaseStats.baseMaxKinhNghiem;
    
    npcToProcess.stats.sinhLuc = calculatedBaseStats.baseMaxSinhLuc; 
    npcToProcess.stats.linhLuc = calculatedBaseStats.baseMaxLinhLuc; 
    npcToProcess.stats.kinhNghiem = 0;

    if (statsJSON) {
        try {
            const specificStats = JSON.parse(statsJSON) as Partial<PlayerStats>;
            npcToProcess.stats = { ...npcToProcess.stats, ...specificStats };
        } catch (e) {
            console.warn(`NPC (${npcName}): Could not parse statsJSON: ${statsJSON}`, e);
        }
    } else if (!npcToProcess.realm && (legacyHp > 0 || legacyAtk > 0)) {
        if (legacyHp > 0) {
            npcToProcess.stats.maxSinhLuc = legacyHp;
            npcToProcess.stats.sinhLuc = legacyHp;
        }
        if (legacyAtk > 0) {
            npcToProcess.stats.sucTanCong = legacyAtk;
        }
    }
    
    if (npcToProcess.stats.sinhLuc !== undefined && npcToProcess.stats.maxSinhLuc !== undefined) {
        npcToProcess.stats.sinhLuc = Math.max(0, Math.min(npcToProcess.stats.sinhLuc, npcToProcess.stats.maxSinhLuc));
    }
    if (npcToProcess.stats.linhLuc !== undefined && npcToProcess.stats.maxLinhLuc !== undefined) {
        npcToProcess.stats.linhLuc = Math.max(0, Math.min(npcToProcess.stats.linhLuc, npcToProcess.stats.maxLinhLuc));
    }

    return { updatedKb: newKb, systemMessages };
};

export const processNpcUpdate = async (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number,
    setKnowledgeBaseDirectly: React.Dispatch<React.SetStateAction<KnowledgeBase>>,
    logNpcAvatarPromptCallback?: (prompt: string) => void // New callback
): Promise<{ updatedKb: KnowledgeBase; systemMessages: GameMessage[] }> => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const npcName = tagParams.name;

    if (!npcName) {
        console.warn("NPC_UPDATE: Missing NPC name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    const npcIndex = newKb.discoveredNPCs.findIndex(n => n.name === npcName);
    if (npcIndex > -1) {
        const npcToUpdate = newKb.discoveredNPCs[npcIndex];
        const npcIdToUpdate = npcToUpdate.id; // For async closure
        if (!npcToUpdate.stats) npcToUpdate.stats = {}; 
        let updatedFieldsCount = 0;
        let realmUpdated = false;
        let detailsChangedForAvatar = false;

        if (tagParams.newName && tagParams.newName !== npcName) {
            npcToUpdate.name = tagParams.newName;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.gender && npcToUpdate.gender !== tagParams.gender) {
            npcToUpdate.gender = tagParams.gender as NPC['gender'];
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.description && npcToUpdate.description !== tagParams.description) {
            npcToUpdate.description = tagParams.description;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.personality) {
            const newPersonality = tagParams.personality.split(',').map(p => p.trim());
            if (JSON.stringify(npcToUpdate.personalityTraits) !== JSON.stringify(newPersonality)) {
                npcToUpdate.personalityTraits = newPersonality;
                updatedFieldsCount++;
                detailsChangedForAvatar = true;
            }
        }
        if (tagParams.affinity) {
            const affinityChange = parseInt(tagParams.affinity, 10);
            if (!isNaN(affinityChange)) {
                npcToUpdate.affinity = Math.max(-100, Math.min(100, (npcToUpdate.affinity || 0) + affinityChange));
                updatedFieldsCount++;
            } else if (tagParams.affinity.startsWith("=")){
                 const directAffinity = parseInt(tagParams.affinity.substring(1), 10);
                 if(!isNaN(directAffinity)) npcToUpdate.affinity = Math.max(-100, Math.min(100, directAffinity));
                 updatedFieldsCount++;
            }
        }
        if (tagParams.factionId) {
            npcToUpdate.factionId = tagParams.factionId;
            updatedFieldsCount++;
        }
        if (tagParams.realm && npcToUpdate.realm !== tagParams.realm) {
            npcToUpdate.realm = tagParams.realm;
            realmUpdated = true;
            updatedFieldsCount++;
            detailsChangedForAvatar = true;
        }
        if (tagParams.avatarUrl && npcToUpdate.avatarUrl !== tagParams.avatarUrl) { 
            npcToUpdate.avatarUrl = tagParams.avatarUrl; 
            updatedFieldsCount++;
        }
        if (tagParams.statsJSON) {
            try {
                const specificStats = JSON.parse(tagParams.statsJSON) as Partial<PlayerStats>;
                npcToUpdate.stats = { ...npcToUpdate.stats, ...specificStats };
                updatedFieldsCount++;
            } catch (e) { console.warn(`NPC_UPDATE (${npcName}): Could not parse statsJSON: ${tagParams.statsJSON}`, e); }
        }
        if (tagParams.baseStatOverridesJSON) {
            try {
                const overrides = JSON.parse(tagParams.baseStatOverridesJSON) as NPCTemplate['baseStatOverrides'];
                if (overrides) {
                    npcToUpdate.baseStatOverrides = overrides;
                    realmUpdated = true; 
                    updatedFieldsCount++;
                }
            } catch (e) { console.warn(`NPC_UPDATE (${npcName}): Could not parse baseStatOverridesJSON: ${tagParams.baseStatOverridesJSON}`, e); }
        }
        
        if(realmUpdated && npcToUpdate.realm && newKb.worldConfig?.isCultivationEnabled){
            const baseStats = calculateRealmBaseStats(npcToUpdate.realm, newKb.realmProgressionList, newKb.currentRealmBaseStats);
            npcToUpdate.stats = { ...npcToUpdate.stats, ...baseStats, ...(npcToUpdate.baseStatOverrides || {}) };
            npcToUpdate.stats.sinhLuc = npcToUpdate.stats.maxSinhLuc; 
            npcToUpdate.stats.linhLuc = npcToUpdate.stats.maxLinhLuc;
        }
        
        if (npcToUpdate.stats!.sinhLuc !== undefined && npcToUpdate.stats!.maxSinhLuc !== undefined) {
            npcToUpdate.stats!.sinhLuc = Math.max(0, Math.min(npcToUpdate.stats!.sinhLuc, npcToUpdate.stats!.maxSinhLuc));
        }
        if (npcToUpdate.stats!.linhLuc !== undefined && npcToUpdate.stats!.maxLinhLuc !== undefined) {
            npcToUpdate.stats!.linhLuc = Math.max(0, Math.min(npcToUpdate.stats!.linhLuc, npcToUpdate.stats!.maxLinhLuc));
        }

        const apiSettings = getApiSettings();
        if (apiSettings.autoGenerateNpcAvatars && detailsChangedForAvatar && (!npcToUpdate.avatarUrl || npcToUpdate.avatarUrl.startsWith('https://via.placeholder.com') || npcToUpdate.avatarUrl.includes('FEMALE_AVATAR_BASE_URL_placeholder'))) {
            npcToUpdate.avatarUrl = npcToUpdate.gender === 'Nữ'
                ? `${FEMALE_AVATAR_BASE_URL}${Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1}.png`
                : MALE_AVATAR_PLACEHOLDER_URL;
            systemMessages.push({
                id: `npc-avatar-regenerating-${npcIdToUpdate}`, type: 'system',
                content: `Đang tạo lại ảnh đại diện AI cho NPC ${npcToUpdate.name} do thông tin thay đổi...`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });

            (async () => {
              let cloudinaryUrl: string | undefined;
              let avatarError: Error | undefined;
              let avatarPromptForGeneration = "";
              try {
                avatarPromptForGeneration = `Một bức chân dung chi tiết của NPC tên ${npcToUpdate.name}, `;
                if (npcToUpdate.gender && npcToUpdate.gender !== 'Không rõ') avatarPromptForGeneration += `giới tính ${npcToUpdate.gender}, `;
                if (npcToUpdate.personalityTraits && npcToUpdate.personalityTraits.length > 0) avatarPromptForGeneration += `tính cách ${npcToUpdate.personalityTraits.join(', ')}, `;
                avatarPromptForGeneration += `trong thế giới ${newKb.worldConfig?.theme || 'fantasy'}. ${npcToUpdate.description || ''} Phong cách: cinematic portrait, fantasy art, high detail.`;
                
                if(logNpcAvatarPromptCallback) {
                    logNpcAvatarPromptCallback(avatarPromptForGeneration);
                }
                const rawBase64ImageData = await generateImageUnified(avatarPromptForGeneration); 
                if (rawBase64ImageData) {
                    let cloudinaryUploadType: 'npc_male' | 'npc_female';
                    if (npcToUpdate.gender === 'Nữ') {
                        cloudinaryUploadType = 'npc_female';
                    } else { 
                        cloudinaryUploadType = 'npc_male';
                    }
                    cloudinaryUrl = await uploadImageToCloudinary(rawBase64ImageData, cloudinaryUploadType, `npc_${npcIdToUpdate}_updated`);
                }
              } catch (err) {
                 avatarError = err instanceof Error ? err : new Error(String(err));
                 console.error(`Async avatar re-generation for NPC ${npcIdToUpdate} failed:`, avatarError);
              } finally {
                 setKnowledgeBaseDirectly(prevKb => {
                    const npcStillExists = prevKb.discoveredNPCs.find(n => n.id === npcIdToUpdate);
                    let finalAvatarUrlForUpdate = MALE_AVATAR_PLACEHOLDER_URL; 
                    if(npcStillExists) { 
                         finalAvatarUrlForUpdate = cloudinaryUrl || (npcStillExists.gender === 'Nữ'
                            ? `${FEMALE_AVATAR_BASE_URL}${Math.floor(Math.random() * MAX_FEMALE_AVATAR_INDEX) + 1}.png`
                            : MALE_AVATAR_PLACEHOLDER_URL);
                    } else if (cloudinaryUrl) { 
                        finalAvatarUrlForUpdate = cloudinaryUrl;
                    }

                    const updatedNPCs = prevKb.discoveredNPCs.map(n =>
                        n.id === npcIdToUpdate ? { ...n, avatarUrl: finalAvatarUrlForUpdate } : n
                    );
                    console.log(`Avatar for ${npcToUpdate.name} (update): ${cloudinaryUrl || (avatarError ? 'Error - ' + avatarError.message : 'Generated, no URL/Error in generation')}`);
                    return { ...prevKb, discoveredNPCs: updatedNPCs };
                });
              }
            })();
        }

        if (updatedFieldsCount > 0) {
            systemMessages.push({
                id: 'npc-data-updated-' + Date.now(), type: 'system',
                content: `Thông tin NPC ${tagParams.newName || npcName} đã được cập nhật.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    } else {
        console.warn(`NPC_UPDATE: NPC "${npcName}" not found.`);
        return processNpc(currentKb, tagParams, turnForSystemMessages, setKnowledgeBaseDirectly, logNpcAvatarPromptCallback);
    }
    return { updatedKb: newKb, systemMessages };
};


export const processLoreLocation = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const locationName = tagParams.name;
    const description = tagParams.description;
    const isSafeZone = tagParams.isSafeZone?.toLowerCase() === 'true';
    const regionId = tagParams.regionId;

    if (!locationName || !description) {
        console.warn("LORE_LOCATION: Missing location name or description.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }

    if (!newKb.discoveredLocations.find(l => l.name === locationName)) {
        newKb.discoveredLocations.push({
            id: `loc-${locationName.replace(/\s+/g, '-')}-${Date.now()}`,
            name: locationName,
            description: description,
            isSafeZone: isSafeZone,
            regionId: regionId || undefined,
        });
        systemMessages.push({
            id: 'location-discovered-' + Date.now(), type: 'system',
            content: `Khám phá ra địa điểm mới: ${locationName}.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }
    return { updatedKb: newKb, systemMessages };
};


export const processLocationUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const locationName = tagParams.name;

    if (!locationName) {
        console.warn("LOCATION_UPDATE: Missing location name.", tagParams);
        systemMessages.push({ id: 'loc-update-error-noname', type: 'system', content: '[DEBUG] Lỗi cập nhật địa điểm: Thiếu tên.', timestamp: Date.now(), turnNumber: turnForSystemMessages });
        return { updatedKb: newKb, systemMessages };
    }
    const locIndex = newKb.discoveredLocations.findIndex(l => l.name === locationName);
    if (locIndex > -1) {
        const locToUpdate = newKb.discoveredLocations[locIndex];
        let updatedFieldsCount = 0;
        if (tagParams.newName && tagParams.newName !== locationName) {
            locToUpdate.name = tagParams.newName;
            updatedFieldsCount++;
        }
        if (tagParams.description) {
            locToUpdate.description = tagParams.description;
            updatedFieldsCount++;
        }
        if (tagParams.isSafeZone !== undefined) {
            locToUpdate.isSafeZone = tagParams.isSafeZone.toLowerCase() === 'true';
            updatedFieldsCount++;
        }
        if (tagParams.regionId) {
            locToUpdate.regionId = tagParams.regionId;
            updatedFieldsCount++;
        }
        // Add other updatable fields here
        if (updatedFieldsCount > 0) {
            systemMessages.push({
                id: `location-updated-${locToUpdate.id}`, type: 'system',
                content: `Thông tin địa điểm "${locationName}" đã được cập nhật.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    } else {
        console.warn(`LOCATION_UPDATE: Location "${locationName}" not found.`);
        systemMessages.push({ id: `loc-update-error-notfound-${locationName}`, type: 'system', content: `[DEBUG] Lỗi cập nhật: Không tìm thấy địa điểm "${locationName}".`, timestamp: Date.now(), turnNumber: turnForSystemMessages });
    }
    return { updatedKb: newKb, systemMessages };
};

export const processWorldLoreAdd = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const title = tagParams.title;
    const content = tagParams.content;

    if (!title || !content) {
        console.warn("WORLD_LORE_ADD: Missing title or content.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    if (!newKb.worldLore.find(l => l.title === title)) {
        newKb.worldLore.push({
            id: `lore-${title.replace(/\s+/g, '-')}-${Date.now()}`,
            title,
            content
        });
        systemMessages.push({
            id: 'lore-added-' + Date.now(), type: 'system',
            content: `Tri thức mới được thêm: ${title}.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }
    return { updatedKb: newKb, systemMessages };
};

export const processWorldLoreUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const title = tagParams.title;

    if (!title) {
        console.warn("WORLD_LORE_UPDATE: Missing title.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    const loreIndex = newKb.worldLore.findIndex(l => l.title === title);
    if (loreIndex > -1) {
        const loreToUpdate = newKb.worldLore[loreIndex];
        let updatedFieldsCount = 0;
        if (tagParams.newTitle && tagParams.newTitle !== title) {
            loreToUpdate.title = tagParams.newTitle;
            updatedFieldsCount++;
        }
        if (tagParams.content) {
            loreToUpdate.content = tagParams.content;
            updatedFieldsCount++;
        }
        if (updatedFieldsCount > 0) {
            systemMessages.push({
                id: `lore-updated-${loreToUpdate.id}`, type: 'system',
                content: `Tri thức "${title}" đã được cập nhật.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    } else {
         console.warn(`WORLD_LORE_UPDATE: Lore with title "${title}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};


export const processFactionDiscovered = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;
    const description = tagParams.description;
    const alignment = tagParams.alignment as GameTemplates.FactionAlignmentValues;
    const playerReputation = parseInt(tagParams.playerReputation || "0", 10);

    if (!name || !description || !alignment || !ALL_FACTION_ALIGNMENTS.includes(alignment)) {
        console.warn("FACTION_DISCOVERED: Missing or invalid parameters.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    if (!newKb.discoveredFactions.find(f => f.name === name)) {
        newKb.discoveredFactions.push({
            id: `faction-${name.replace(/\s+/g, '-')}-${Date.now()}`,
            name,
            description,
            alignment,
            playerReputation: isNaN(playerReputation) ? 0 : playerReputation,
        });
        systemMessages.push({
            id: 'faction-discovered-' + Date.now(), type: 'system',
            content: `Bạn đã khám phá ra phe phái mới: ${name}.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }
    return { updatedKb: newKb, systemMessages };
};

export const processFactionUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;

    if (!name) {
        console.warn("FACTION_UPDATE: Missing faction name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    const factionIndex = newKb.discoveredFactions.findIndex(f => f.name === name);
    if (factionIndex > -1) {
        const factionToUpdate = newKb.discoveredFactions[factionIndex];
        let updatedFieldsCount = 0;
        if (tagParams.newName && tagParams.newName !== name) {
            factionToUpdate.name = tagParams.newName;
            updatedFieldsCount++;
        }
        if (tagParams.description) {
            factionToUpdate.description = tagParams.description;
            updatedFieldsCount++;
        }
        if (tagParams.alignment && ALL_FACTION_ALIGNMENTS.includes(tagParams.alignment as GameTemplates.FactionAlignmentValues)) {
            factionToUpdate.alignment = tagParams.alignment as GameTemplates.FactionAlignmentValues;
            updatedFieldsCount++;
        }
        if (tagParams.playerReputation) {
            const repStr = tagParams.playerReputation;
            let newRep = factionToUpdate.playerReputation;
            if (repStr.startsWith('=')) {
                newRep = parseInt(repStr.substring(1), 10);
            } else if (repStr.startsWith('+=')) {
                newRep += parseInt(repStr.substring(2), 10);
            } else if (repStr.startsWith('-=')) {
                newRep -= parseInt(repStr.substring(2), 10);
            } else {
                 newRep = parseInt(repStr, 10);
            }
            if (!isNaN(newRep)) {
                factionToUpdate.playerReputation = Math.max(-100, Math.min(100, newRep));
                updatedFieldsCount++;
            }
        }
        // Add other updatable fields like leader, baseLocation, allies, enemies
        if (updatedFieldsCount > 0) {
             systemMessages.push({
                id: `faction-updated-${factionToUpdate.id}`, type: 'system',
                content: `Thông tin phe phái "${name}" đã được cập nhật.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    } else {
        console.warn(`FACTION_UPDATE: Faction "${name}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};

export const processFactionRemove = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const name = tagParams.name;

    if (!name) {
        console.warn("FACTION_REMOVE: Missing faction name.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    const initialLength = newKb.discoveredFactions.length;
    newKb.discoveredFactions = newKb.discoveredFactions.filter(f => f.name !== name);
    if (newKb.discoveredFactions.length < initialLength) {
        systemMessages.push({
            id: `faction-removed-${name.replace(/\s+/g, '-')}`, type: 'system',
            content: `Phe phái "${name}" đã bị xóa khỏi danh sách đã biết.`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
        console.warn(`FACTION_REMOVE: Faction "${name}" not found.`);
    }
    return { updatedKb: newKb, systemMessages };
};
