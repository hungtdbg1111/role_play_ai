
import { KnowledgeBase, PlayerStats, GameMessage, RealmBaseStatDefinition } from '../../types';
import { DEFAULT_PLAYER_STATS, VIETNAMESE } from '../../constants';
import { calculateRealmBaseStats, calculateEffectiveStats } from '../statsCalculationUtils';

export const processPlayerStatsInit = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; realmChanged: boolean; turnIncremented: boolean } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const statsUpdates: Partial<PlayerStats> = {};
    let deferMaxSinhLuc = false;
    let deferMaxLinhLuc = false;
    let realmChanged = false;
    let turnIncremented = false;
    const oldRealm = newKb.playerStats.realm;

    Object.keys(tagParams).forEach(rawKey => {
        const key = rawKey.trim() as keyof PlayerStats;
        const valueStr = tagParams[rawKey].trim();

        if (!(key in DEFAULT_PLAYER_STATS)) {
            console.warn(`PLAYER_STATS_INIT: Unknown stat key "${key}". Skipping value "${valueStr}".`);
            return;
        }

        const targetType = typeof DEFAULT_PLAYER_STATS[key];

        if (key === 'isInCombat' || key === 'hieuUngBinhCanh') {
            (statsUpdates as any)[key] = valueStr.toLowerCase() === 'true';
        } else if (key === 'realm') {
            (statsUpdates as any)[key] = valueStr;
            if (valueStr !== oldRealm) realmChanged = true;
        } else if (targetType === 'number') {
            if (key === 'sinhLuc' && valueStr.toUpperCase() === 'MAX') {
                deferMaxSinhLuc = true;
            } else if (key === 'linhLuc' && valueStr.toUpperCase() === 'MAX') {
                deferMaxLinhLuc = true;
            } else {
                const numValue = parseInt(valueStr, 10);
                if (!isNaN(numValue)) {
                    (statsUpdates as any)[key] = numValue;
                } else {
                    console.warn(`PLAYER_STATS_INIT: Invalid number value "${valueStr}" for key "${key}". Using default.`);
                    const defaultVal = DEFAULT_PLAYER_STATS[key];
                    (statsUpdates as any)[key] = typeof defaultVal === 'number' ? defaultVal : 0;
                }
            }
        }
    });

    const initialRealmForCalc = statsUpdates.realm || newKb.playerStats.realm || DEFAULT_PLAYER_STATS.realm;
     if (typeof initialRealmForCalc !== 'string') {
        console.error(`PLAYER_STATS_INIT: initialRealmForCalc is not a string: ${initialRealmForCalc}. Fallback to default realm.`);
        statsUpdates.realm = DEFAULT_PLAYER_STATS.realm;
    }
    const baseRealmStats = calculateRealmBaseStats(statsUpdates.realm || DEFAULT_PLAYER_STATS.realm, newKb.realmProgressionList, newKb.currentRealmBaseStats);

    newKb.playerStats = {
        ...DEFAULT_PLAYER_STATS,
        ...baseRealmStats,
        ...statsUpdates
    } as PlayerStats;
     if (statsUpdates.realm) newKb.playerStats.realm = statsUpdates.realm;


    if (deferMaxSinhLuc) newKb.playerStats.sinhLuc = newKb.playerStats.maxSinhLuc;
    if (deferMaxLinhLuc) newKb.playerStats.linhLuc = newKb.playerStats.maxLinhLuc;
    
    newKb.playerStats.sinhLuc = Math.min(newKb.playerStats.sinhLuc, newKb.playerStats.maxSinhLuc);
    newKb.playerStats.linhLuc = Math.min(newKb.playerStats.linhLuc, newKb.playerStats.maxLinhLuc);
    newKb.playerStats.kinhNghiem = Math.min(newKb.playerStats.kinhNghiem, newKb.playerStats.maxKinhNghiem);
    
    newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);
    const newTurn = typeof statsUpdates.turn === 'number' ? statsUpdates.turn : 1;
    if (newKb.playerStats.turn !== newTurn) {
        newKb.playerStats.turn = newTurn;
        turnIncremented = newTurn > (currentKb.playerStats.turn || 0);
    }


    if (newKb.currentPageHistory?.length === 1 && newKb.currentPageHistory[0] > newKb.playerStats.turn) {
        newKb.currentPageHistory = [newKb.playerStats.turn];
    } else if (!newKb.currentPageHistory || newKb.currentPageHistory.length === 0) {
        newKb.currentPageHistory = [newKb.playerStats.turn];
    }
    
    return { updatedKb: newKb, systemMessages: [], realmChanged, turnIncremented };
};

export const processStatsUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; realmChanged: boolean; turnIncremented: boolean; removedBinhCanh: boolean } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const statsUpdates: Partial<PlayerStats> = {};
    const systemMessages: GameMessage[] = [];
    let realmChanged = false;
    let turnIncremented = false;
    let removedBinhCanh = false;
    const oldRealm = newKb.playerStats.realm;
    const oldTurnForThisTagProcessing = newKb.playerStats.turn;
    const statsBeforeThisTag = { ...newKb.playerStats };

    Object.keys(tagParams).forEach(rawKey => {
        const key = rawKey.trim() as keyof PlayerStats;
        const valueStr = tagParams[rawKey].trim();

        if (!(key in newKb.playerStats)) {
            console.warn(`STATS_UPDATE: Unknown stat key "${key}" in playerStats. Skipping value "${valueStr}".`);
            return;
        }

        if (key === 'isInCombat' || key === 'hieuUngBinhCanh') {
            (statsUpdates as any)[key] = valueStr.toLowerCase() === 'true';
            if (key === 'hieuUngBinhCanh' && !( (statsUpdates as any)[key])) removedBinhCanh = true;
        } else if (key === 'turn') {
            let parsedTurn;
            if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                parsedTurn = oldTurnForThisTagProcessing + parseInt(valueStr, 10);
            } else {
                parsedTurn = parseInt(valueStr, 10);
            }
            if (!isNaN(parsedTurn)) {
                (statsUpdates as any)[key] = parsedTurn;
                if (parsedTurn > oldTurnForThisTagProcessing) turnIncremented = true;
            }
        } else if (key === 'realm') {
            (statsUpdates as any)[key] = valueStr;
            if (valueStr !== oldRealm) realmChanged = true;
        } else if (key === 'kinhNghiem' && valueStr.endsWith('%')) {
            const percentage = parseFloat(valueStr.slice(0, -1));
            if (!isNaN(percentage)) {
                const expGain = Math.floor(newKb.playerStats.maxKinhNghiem * (percentage / 100));
                (statsUpdates as any)[key] = (newKb.playerStats.kinhNghiem || 0) + expGain;
            }
        } else if (typeof newKb.playerStats[key] === 'number') {
            const baseValue = (newKb.playerStats[key] as number) || 0;
            let numericValueToAssign: number | undefined = undefined;
            if (valueStr.toUpperCase() === 'MAX' && (key === 'sinhLuc' || key === 'linhLuc')) {
               numericValueToAssign = newKb.playerStats[key === 'sinhLuc' ? 'maxSinhLuc' : 'maxLinhLuc'];
            } else if (valueStr.startsWith('+') || valueStr.startsWith('-')) {
                const change = parseInt(valueStr, 10);
                if (!isNaN(change)) numericValueToAssign = baseValue + change;
            } else {
                const absoluteValue = parseInt(valueStr, 10);
                if (!isNaN(absoluteValue)) numericValueToAssign = absoluteValue;
            }
            if (numericValueToAssign !== undefined) (statsUpdates as any)[key] = numericValueToAssign;
        }
    });

    newKb.playerStats = { ...newKb.playerStats, ...statsUpdates };
    if (newKb.playerStats.realm && typeof newKb.playerStats.realm !== 'string') {
        console.warn(`STATS_UPDATE: Realm value is not a string: ${newKb.playerStats.realm}. Reverting to old realm "${oldRealm}".`);
        newKb.playerStats.realm = oldRealm; 
        realmChanged = false; 
    }

    if (realmChanged) {
        const baseRealmStats = calculateRealmBaseStats(newKb.playerStats.realm, newKb.realmProgressionList, newKb.currentRealmBaseStats);
        newKb.playerStats = { ...newKb.playerStats, ...baseRealmStats };
    }
    newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);

    const statsAfterThisTag = newKb.playerStats;
    if ((tagParams.sinhLuc || (tagParams.sinhLuc?.toUpperCase() === 'MAX')) && statsAfterThisTag.sinhLuc !== statsBeforeThisTag.sinhLuc) {
        const change = statsAfterThisTag.sinhLuc - statsBeforeThisTag.sinhLuc;
        systemMessages.push({ id: 'stat-change-sinhLuc-' + Date.now(), type: 'system', content: `Sinh lực thay đổi: ${statsBeforeThisTag.sinhLuc} -> ${statsAfterThisTag.sinhLuc} (${change > 0 ? '+' : ''}${change}).`, timestamp: Date.now(), turnNumber: turnForSystemMessages });
    }
    // ... (similar checks and messages for linhLuc, kinhNghiem, currency, realm, hieuUngBinhCanh)

    if (newKb.playerStats.kinhNghiem < 0) newKb.playerStats.kinhNghiem = 0;
    newKb.playerStats.sinhLuc = Math.min(newKb.playerStats.sinhLuc, newKb.playerStats.maxSinhLuc);
    newKb.playerStats.linhLuc = Math.min(newKb.playerStats.linhLuc, newKb.playerStats.maxLinhLuc);

    return { updatedKb: newKb, systemMessages, realmChanged, turnIncremented, removedBinhCanh };
};

export const processRemoveBinhCanhEffect = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[]; removedBinhCanh: boolean } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    let removedBinhCanh = false;

    if (newKb.playerStats.hieuUngBinhCanh) {
        newKb.playerStats.hieuUngBinhCanh = false;
        removedBinhCanh = true;
        const expGain = parseInt(tagParams.kinhNghiemGain || "1", 10);
        if (!isNaN(expGain) && expGain > 0) {
            newKb.playerStats.kinhNghiem += expGain;
        }
        systemMessages.push({
            id: 'binh-canh-removed-breakthrough-' + Date.now(), type: 'system',
            content: "Cơ duyên đã đến, bạn cảm thấy bình cảnh sắp được phá vỡ!",
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }
    return { updatedKb: newKb, systemMessages, removedBinhCanh };
};
