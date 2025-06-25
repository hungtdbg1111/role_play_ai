
import { KnowledgeBase, Item, PlayerStats, GameMessage } from '../../types';
import * as GameTemplates from '../../templates';
import { calculateEffectiveStats } from '../statsCalculationUtils'; // Assuming this might be needed if item updates affect stats

export const processItemAcquired = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];

    const itemName = tagParams.name;
    const itemTypeCombined = tagParams.type;
    const itemDescription = tagParams.description;
    const quantity = parseInt(tagParams.quantity || "1", 10);
    const rarity = (tagParams.rarity || GameTemplates.ItemRarity.PHO_THONG) as GameTemplates.EquipmentRarity;
    const value = parseInt(tagParams.value || "0", 10);
    // ... (extract all other params: slot, statBonusesJSON, uniqueEffectsList, etc.)

    if (!itemName || !itemTypeCombined || !itemDescription) {
        console.warn("ITEM_ACQUIRED: Missing name, type, or description.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    
    const typeParts = itemTypeCombined.split(" ");
    const category = typeParts[0] as GameTemplates.ItemCategoryValues;
    const subType = typeParts.length > 1 ? typeParts.slice(1).join(" ") : undefined;

    if (!Object.values(GameTemplates.ItemCategory).includes(category)) {
        console.warn(`ITEM_ACQUIRED: Invalid item category "${category}" for item "${itemName}". Skipping.`);
        return { updatedKb: newKb, systemMessages };
    }

    let newItem: Item | null = null;
    const baseItemData: Omit<Item, 'category'> & {category: GameTemplates.ItemCategoryValues} = { // Make category specific for base
        id: `item-${itemName.replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).substring(2,7)}`,
        name: itemName,
        description: itemDescription,
        quantity: isNaN(quantity) ? 1 : Math.max(1, quantity),
        rarity: Object.values(GameTemplates.ItemRarity).includes(rarity) ? rarity : GameTemplates.ItemRarity.PHO_THONG,
        value: isNaN(value) ? 0 : value,
        category: category,
    };
    
    // Logic for creating specific item types (Equipment, Potion, etc.)
    // This is a simplified version of the logic in the original performTagProcessing
    switch (category) {
        case GameTemplates.ItemCategory.EQUIPMENT:
            const equipmentType = tagParams.equipmentType as GameTemplates.EquipmentTypeValues || subType as GameTemplates.EquipmentTypeValues;
            if (!equipmentType || !Object.values(GameTemplates.EquipmentType).includes(equipmentType)) {
                 console.warn(`ITEM_ACQUIRED: Equipment item "${itemName}" has invalid/missing equipmentType: "${equipmentType}". Skipping.`);
                 break;
            }
            let statBonuses: Partial<PlayerStats> = {};
            try {
                if (tagParams.statBonusesJSON) statBonuses = JSON.parse(tagParams.statBonusesJSON);
            } catch (e) { console.warn("Error parsing statBonusesJSON for ITEM_ACQUIRED", e); }
            
            newItem = {
                ...baseItemData,
                category: GameTemplates.ItemCategory.EQUIPMENT,
                equipmentType: equipmentType,
                slot: tagParams.slot || undefined,
                statBonuses: statBonuses,
                uniqueEffects: tagParams.uniqueEffectsList ? tagParams.uniqueEffectsList.split(';').map(s => s.trim()).filter(s => s) : []
            } as GameTemplates.EquipmentTemplate;
            break;
        // ... (cases for Potion, Material, QuestItem, Miscellaneous)
        case GameTemplates.ItemCategory.POTION:
             const potionType = tagParams.potionType as GameTemplates.PotionTypeValues || subType as GameTemplates.PotionTypeValues;
             if (!potionType || !Object.values(GameTemplates.PotionType).includes(potionType)) {
                 console.warn(`ITEM_ACQUIRED: Potion item "${itemName}" has invalid/missing potionType: "${potionType}". Skipping.`);
                 break;
            }
            newItem = {
                ...baseItemData,
                category: GameTemplates.ItemCategory.POTION,
                potionType: potionType,
                effects: tagParams.effectsList ? tagParams.effectsList.split(';').map(s => s.trim()).filter(s => s) : [],
                durationTurns: tagParams.durationTurns ? parseInt(tagParams.durationTurns) : undefined,
                cooldownTurns: tagParams.cooldownTurns ? parseInt(tagParams.cooldownTurns) : undefined,
                isConsumedOnUse: true, usable: true, consumable: true,
            } as GameTemplates.PotionTemplate;
            break;
        // Add other categories here
        default:
             newItem = {
                ...baseItemData,
                category: category, // Keep original category if not specifically handled
             } as Item; // Fallback, might need more specific typing or error
    }


    if (newItem) {
        const existingItemIndex = newKb.inventory.findIndex(i => i.name === newItem!.name && i.category === newItem!.category);
        if (existingItemIndex > -1 && newItem.stackable !== false) {
            newKb.inventory[existingItemIndex].quantity += newItem.quantity;
        } else {
            newKb.inventory.push(newItem);
        }
        systemMessages.push({
            id: 'item-acquired-' + newItem.id, type: 'system',
            content: `Nhận được: ${newItem.name} (x${newItem.quantity})`,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    }
    return { updatedKb: newKb, systemMessages };
};

export const processItemConsumed = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const itemName = tagParams.name;
    const quantityConsumed = parseInt(tagParams.quantity || "1", 10);

    if (!itemName || isNaN(quantityConsumed) || quantityConsumed < 1) {
        console.warn("ITEM_CONSUMED: Missing or invalid name/quantity.", tagParams);
        return { updatedKb: newKb, systemMessages };
    }
    const itemIndex = newKb.inventory.findIndex(i => i.name === itemName);
    if (itemIndex > -1) {
        const originalQuantity = newKb.inventory[itemIndex].quantity;
        newKb.inventory[itemIndex].quantity -= quantityConsumed;
        const message = `Đã sử dụng: ${itemName} (x${quantityConsumed}). Còn lại: ${newKb.inventory[itemIndex].quantity}.`;
        if (newKb.inventory[itemIndex].quantity <= 0) {
            newKb.inventory.splice(itemIndex, 1);
        }
        systemMessages.push({
            id: 'item-consumed-' + Date.now(), type: 'system',
            content: message,
            timestamp: Date.now(), turnNumber: turnForSystemMessages
        });
    } else {
        console.warn(`ITEM_CONSUMED: Item "${itemName}" not found in inventory.`);
    }
    return { updatedKb: newKb, systemMessages };
};

export const processItemUpdate = (
    currentKb: KnowledgeBase,
    tagParams: Record<string, string>,
    turnForSystemMessages: number
): { updatedKb: KnowledgeBase; systemMessages: GameMessage[] } => {
    const newKb = JSON.parse(JSON.stringify(currentKb)) as KnowledgeBase;
    const systemMessages: GameMessage[] = [];
    const itemName = tagParams.name;
    const field = tagParams.field;
    const newValue = tagParams.newValue;
    const change = tagParams.change;

    if (!itemName || !field) { console.warn("ITEM_UPDATE: Missing item name or field.", tagParams); return { updatedKb: newKb, systemMessages }; }
    
    const itemIndex = newKb.inventory.findIndex(i => i.name === itemName);
    if (itemIndex > -1) {
        const itemToUpdate = newKb.inventory[itemIndex] as any; 
        let updateMessagePart = "";

        if (field.startsWith('statBonuses.')) {
            // ... (logic for statBonuses update) ...
        } else { 
            if (newValue !== undefined) {
                 if (typeof itemToUpdate[field] === 'number') itemToUpdate[field] = parseInt(newValue, 10);
                 else if (typeof itemToUpdate[field] === 'boolean') itemToUpdate[field] = newValue.toLowerCase() === 'true';
                 else itemToUpdate[field] = newValue;
                 updateMessagePart = `trường ${field} thành "${newValue}"`;
            } else if (change !== undefined && typeof itemToUpdate[field] === 'number') {
                // ... (logic for numeric change) ...
            }
        }
        
        if (updateMessagePart) {
             newKb.playerStats = calculateEffectiveStats(newKb.playerStats, newKb.equippedItems, newKb.inventory);
             systemMessages.push({
                id: 'item-updated-' + itemToUpdate.id, type: 'system',
                content: `Vật phẩm "${itemName}" đã cập nhật ${updateMessagePart}.`,
                timestamp: Date.now(), turnNumber: turnForSystemMessages
            });
        }
    } else {
        console.warn(`ITEM_UPDATE: Item "${itemName}" not found in inventory.`);
    }
    return { updatedKb: newKb, systemMessages };
};
