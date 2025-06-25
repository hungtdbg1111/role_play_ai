import { PlayerStats } from './types'; // PlayerStats will be defined in types.ts

export const ItemRarity = {
    PHO_THONG: "Phổ Thông",
    HIEM: "Hiếm",
    QUY_BAU: "Quý Báu",
    CUC_PHAM: "Cực Phẩm",
    THAN_THOAI: "Thần Thoại",
    CHI_TON: "Chí Tôn"
} as const;
export type EquipmentRarity = typeof ItemRarity[keyof typeof ItemRarity];

export const ItemCategory = {
    EQUIPMENT: "Equipment",
    POTION: "Potion",
    MATERIAL: "Material",
    QUEST_ITEM: "QuestItem",
    MISCELLANEOUS: "Miscellaneous"
} as const;
export type ItemCategoryValues = typeof ItemCategory[keyof typeof ItemCategory];

export const EquipmentType = {
    VU_KHI: "Vũ Khí",
    GIAP_DAU: "Giáp Đầu",
    GIAP_THAN: "Giáp Thân",
    GIAP_TAY: "Giáp Tay",
    GIAP_CHAN: "Giáp Chân",
    TRANG_SUC: "Trang Sức",
    PHAP_BAO: "Pháp Bảo",
    THU_CUNG: "Thú Cưng" // Added Pet
} as const;
export type EquipmentTypeValues = typeof EquipmentType[keyof typeof EquipmentType];

export const PotionType = {
    HOI_PHUC: "Hồi Phục",
    TANG_CUONG: "Tăng Cường",
    GIAI_DOC: "Giải Độc",
    DAC_BIET: "Đặc Biệt"
} as const;
export type PotionTypeValues = typeof PotionType[keyof typeof PotionType];

export const MaterialType = {
    LINH_THAO: "Linh Thảo",
    KHOANG_THACH: "Khoáng Thạch",
    YEU_DAN: "Yêu Đan",
    DA_XUONG_YEU_THU: "Da/Xương Yêu Thú",
    LINH_HON: "Linh Hồn",
    VAT_LIEU_CHE_TAO_CHUNG: "Vật Liệu Chế Tạo Chung",
    KHAC: "Khác"
} as const;
export type MaterialTypeValues = typeof MaterialType[keyof typeof MaterialType];

export const SkillType = {
    CHUDONG_TANCONG: "Chủ Động Tấn Công",
    CHUDONG_PHONGNGU: "Chủ Động Phòng Ngự",
    CHUDONG_HOTRO: "Chủ Động Hỗ Trợ",
    BIDONG: "Bị Động",
    TULUYEN_CONGPHAP: "Tu Luyện Công Pháp",
    THANPHAP: "Thân Pháp",
    KHAC: "Khác"
} as const;
export type SkillTypeValues = typeof SkillType[keyof typeof SkillType];

export type SkillTargetType = 'Tự Thân' | 'Đồng Minh Đơn Lẻ' | 'Đồng Minh Toàn Bộ' | 'Kẻ Địch Đơn Lẻ' | 'Kẻ Địch Toàn Bộ' | 'Khu Vực';

export const FactionAlignment = {
    CHINH_NGHIA: 'Chính Nghĩa',
    TRUNG_LAP: 'Trung Lập',
    TA_AC: 'Tà Ác',
    HON_LOAN: 'Hỗn Loạn'
} as const;
export type FactionAlignmentValues = typeof FactionAlignment[keyof typeof FactionAlignment];

export interface BaseItemTemplate {
    id: string;
    name: string;
    description: string;
    category: ItemCategoryValues;
    rarity: EquipmentRarity;
    value?: number; // Gold value
    icon?: string; // Path to icon image
    stackable?: boolean;
    maxStack?: number;
    quantity: number; // All items have a quantity
}

export interface EquipmentTemplate extends BaseItemTemplate {
    category: typeof ItemCategory.EQUIPMENT;
    equipmentType: EquipmentTypeValues;
    slot?: string; // e.g., "Vũ Khí Chính", "Nhẫn", "Áo Giáp", "Thú Cưng Đồng Hành" - Made optional
    statBonuses: Partial<Omit<PlayerStats, 'realm' | 'currency' | 'isInCombat' | 'turn' | 'hieuUngBinhCanh' | 'baseMaxKinhNghiem' | 'baseMaxLinhLuc' | 'baseMaxSinhLuc' | 'baseSucTanCong' | 'activeStatusEffects' | 'sinhLuc' | 'linhLuc' | 'kinhNghiem'>>;
    uniqueEffects: string[]; // e.g., "Hút máu 5%", "Tăng 10% sát thương kỹ năng Hỏa"
    durability?: number;
    maxDurability?: number;
    levelRequirement?: number;
    usable?: boolean; // Can this be "used" actively from inventory (e.g. aPháp Bảo with an active effect)
    consumable?: boolean; // Is it consumed on use (typically false for equipment)
}

export interface PotionTemplate extends BaseItemTemplate {
    category: typeof ItemCategory.POTION;
    potionType: PotionTypeValues;
    effects: string[]; // e.g., "Hồi 100 HP", "Tăng 20 ATK trong 3 lượt", "Giải trừ trúng độc"
    durationTurns?: number;
    isConsumedOnUse: true; // Explicitly true for potions
    cooldownTurns?: number; // Cooldown before another potion of this type can be used
    usable: true; // Potions are inherently usable
    consumable: true; // Potions are inherently consumable
}

export interface MaterialTemplate extends BaseItemTemplate {
    category: typeof ItemCategory.MATERIAL;
    materialType: MaterialTypeValues;
    usable: false; // Materials are typically not "used" directly but are ingredients
    consumable: false; // Consumed in crafting, not by direct "use" action
}

export interface QuestItemTemplate extends BaseItemTemplate {
    category: typeof ItemCategory.QUEST_ITEM;
    questIdAssociated: string; // The quest this item is related to
    isConsumedOnQuestCompletion?: boolean;
    usable: false; // Quest items are usually passive or for specific interactions
    consumable: false; // Consumed by quest logic, not direct "use"
}

export interface MiscellaneousItemTemplate extends BaseItemTemplate {
    category: typeof ItemCategory.MISCELLANEOUS;
    // For items that don't fit other categories, e.g. books for lore, keys
    usable: boolean; // e.g. a book might be usable to read
    consumable: boolean;
}

// Union type for all items that can be in inventory
export type InventoryItem = EquipmentTemplate | PotionTemplate | MaterialTemplate | QuestItemTemplate | MiscellaneousItemTemplate;

export interface NPCTemplate {
    id: string;
    name: string;
    title?: string; // e.g., "Trưởng Lão", "Thợ Rèn"
    gender?: 'Nam' | 'Nữ' | 'Khác' | 'Không rõ'; 
    description: string; // Detailed backstory, role in world
    personalityTraits: string[]; // e.g., "Hào hiệp", "Tham lam", "Nhút nhát"
    affinity: number; // -100 to 100, player's standing with this NPC
    factionId?: string; // ID of the Faction they belong to
    avatarUrl?: string; // Placeholder, random URL, or Cloudinary URL
    
    realm?: string; // NPC's cultivation realm or level descriptor
    baseStatOverrides?: Partial<Pick<PlayerStats, 'baseMaxSinhLuc' | 'baseMaxLinhLuc' | 'baseSucTanCong' | 'baseMaxKinhNghiem'>>; // For AI to specify non-standard base stats for their realm
    stats?: Partial<PlayerStats>; // For current stats (like current HP) or further specific overrides to calculated stats.
    
    skills?: string[]; // IDs of skills they can use
    inventoryIds?: string[]; // IDs of items they might carry or drop
    shopInventoryIds?: string[]; // If they are a merchant
    dialogueTemplates?: Record<string, string>;
    questGiverForIds?: string[]; // IDs of quests this NPC can assign
    isEssential?: boolean; // Cannot be killed if true
    locationId?: string; // Current or default location
    level?: number; // Optional general level, if not using realm system or for non-combat scaling
}

export interface SkillTemplate {
    id: string;
    name: string;
    description: string; // General description
    skillType: SkillTypeValues; // Broad category
    detailedEffect: string; // Detailed effect description, maps to old 'effect'
    icon?: string;
    manaCost: number; // Default to 0 if not specified
    damageMultiplier: number; // Multiplier for player's ATK. For "atk*scale". Default 0.
    baseDamage: number; // Default 0
    healingAmount: number; // Default 0
    buffsApplied?: Array<{ stat: keyof PlayerStats | string; amount: number | string; durationTurns: number; chance?: number }>;
    debuffsApplied?: Array<{ stat: keyof PlayerStats | string; amount: number | string; durationTurns: number; chance?: number }>;
    otherEffects?: string[]; // Text descriptions of other effects, e.g., "Gây choáng", "Đẩy lùi"
    targetType?: SkillTargetType; // Optional, AI might not specify
    cooldown?: number; // Renamed from cooldownTurns for consistency, default 0
    currentCooldown?: number; // Tracks current cooldown
    levelRequirement?: number;
    requiredRealm?: string;
    prerequisiteSkillId?: string;
    isUltimate?: boolean;
    xpGainOnUse?: number;
}

export interface LocationTemplate {
    id: string;
    name: string;
    description: string; // Detailed description of the area, atmosphere, lore
    mapIcon?: string;
    regionId?: string; // Larger region this location belongs to
    travelConnections?: Record<string, { locationId: string; travelTimeTurns?: number; requirements?: string }>;
    discoverableNPCIds?: string[];
    discoverableItemIds?: string[];
    resourceNodes?: Array<{ materialId: string; quantityRange: [number, number]; respawnTimeTurns?: number; toolRequired?: string }>;
    isSafeZone?: boolean;
    environmentalEffects?: string[];
    ambientSound?: string;
    requiredLevel?: number;
    requiredQuestIdForEntry?: string;
}

export interface FactionTemplate {
    id: string;
    name: string;
    description: string; // History, goals, ideology
    bannerIcon?: string;
    leaderNPCId?: string;
    keyNPCIds?: string[];
    baseLocationId?: string; // Headquarters
    alliedFactionIds?: string[];
    enemyFactionIds?: string[];
    alignment: FactionAlignmentValues;
    playerReputation: number; // Current player reputation with this faction
    reputationTiers?: Record<string, { threshold: number; title: string; benefits?: string[] }>;
    joinRequirements?: string; // Text description of how to join
    ranks?: Array<{ rankName: string; reputationRequired: number; benefits?: string[] }>;
}