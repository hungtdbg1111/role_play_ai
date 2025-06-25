

import type { User as FirebaseUserType } from 'firebase/auth';
import { HarmCategory, HarmBlockThreshold } from "@google/genai";
import * as GameTemplates from './templates'; // Import all templates
import { AVAILABLE_GENRES as AVAILABLE_GENRES_VALUES, CUSTOM_GENRE_VALUE } from './constants'; // Import for GenreType

export enum GameScreen {
  Initial = 'Initial',
  GameSetup = 'GameSetup',
  Gameplay = 'Gameplay',
  ApiSettings = 'ApiSettings',
  LoadGameSelection = 'LoadGameSelection',
  StorageSettings = 'StorageSettings',
  ImportExport = 'ImportExport',
  Equipment = 'Equipment', 
  Crafting = 'Crafting',
}

export type FirebaseUser = FirebaseUserType;

export type StorageType = 'local' | 'cloud';

export interface FirebaseUserConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface StorageSettings {
  storageType: StorageType;
  firebaseUserConfig: FirebaseUserConfig | null;
}

export type StatusEffectType = 'buff' | 'debuff' | 'neutral';

export interface StatusEffect {
  id: string;
  name: string;
  description: string;
  type: StatusEffectType;
  durationTurns: number; // 0 or -1 for permanent or until removed by tag
  statModifiers: Partial<Record<keyof Omit<PlayerStats, 'realm' | 'currency' | 'isInCombat' | 'turn' | 'hieuUngBinhCanh' | 'activeStatusEffects' | 'sinhLuc' | 'linhLuc' | 'kinhNghiem' | 'baseMaxKinhNghiem' | 'baseMaxLinhLuc' | 'baseMaxSinhLuc' | 'baseSucTanCong'>, string | number>>; // e.g. {"sucTanCong": 10, "maxSinhLuc": "-5%"}
  specialEffects: string[]; // Text descriptions of non-stat effects
  icon?: string;
  source?: string; // e.g., skill name, item name, event
}

export interface PlayerStats {
  // Base stats (derived from realm or default if cultivation disabled)
  baseMaxSinhLuc: number;
  baseMaxLinhLuc: number; // Could be 0 or repurposed if cultivation disabled
  baseSucTanCong: number;
  baseMaxKinhNghiem: number; // Could be 0 or repurposed if cultivation disabled

  // Effective stats (base + equipment + temporary effects)
  sinhLuc: number;
  maxSinhLuc: number; // Effective Max HP
  linhLuc: number; // Effective Max MP/Stamina
  maxLinhLuc: number; // Effective Max MP/Stamina
  sucTanCong: number; // Effective Attack
  kinhNghiem: number; // Current EXP or Skill Points
  maxKinhNghiem: number; // Max EXP for current level or general level cap
  
  realm: string; // e.g., "Phàm Nhân Nhất Trọng" or "Người Thường Cấp 1"
  currency: number;
  isInCombat: boolean;
  turn: number;
  hieuUngBinhCanh: boolean; // Bottleneck effect (only if cultivation enabled)
  activeStatusEffects: StatusEffect[]; // New: Active status effects
}


// Use the new InventoryItem union from templates.ts as the primary Item type
export type Item = GameTemplates.InventoryItem;
// Use the new SkillTemplate from templates.ts as the primary Skill type
export type Skill = GameTemplates.SkillTemplate;
// Use the new NPCTemplate from templates.ts as the primary NPC type
export type NPC = GameTemplates.NPCTemplate;
// Use the new LocationTemplate from templates.ts as the primary GameLocation type
export type GameLocation = GameTemplates.LocationTemplate;
// Define Faction type using FactionTemplate
export type Faction = GameTemplates.FactionTemplate;


export interface QuestObjective {
  id: string;
  text: string;
  completed: boolean;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'failed';
  objectives: QuestObjective[];
}

export interface Companion { // Companion can remain simpler or also be templated later
  id: string;
  name: string;
  description: string;
  hp: number; 
  maxHp: number;
  mana: number; // May need to adapt if cultivation disabled
  maxMana: number;
  atk: number;
}

export interface WorldLoreEntry {
  id: string;
  title: string;
  content: string;
}

// Starting entities remain simple for AI generation, game logic can map them to richer templates
export interface StartingSkill {
  name: string;
  description: string; 
}

export interface StartingItem {
  name: string;
  description: string;
  quantity: number;
  category: GameTemplates.ItemCategoryValues;
  rarity?: GameTemplates.EquipmentRarity;
  value?: number;

  equipmentDetails?: {
    type?: GameTemplates.EquipmentTypeValues; 
    slot?: string;
    statBonuses?: Partial<Omit<PlayerStats, 'realm' | 'currency' | 'isInCombat' | 'turn' | 'hieuUngBinhCanh' | 'baseMaxKinhNghiem' | 'baseMaxLinhLuc' | 'baseMaxSinhLuc' | 'baseSucTanCong' | 'activeStatusEffects'>>; 
    statBonusesString?: string; 
    uniqueEffects?: string[];
    uniqueEffectsString?: string; 
  };
  potionDetails?: {
    type?: GameTemplates.PotionTypeValues; 
    effects?: string[];
    effectsString?: string; 
    durationTurns?: number;
    cooldownTurns?: number;
  };
  materialDetails?: {
    type?: GameTemplates.MaterialTypeValues; 
  };
  questItemDetails?: {
    questIdAssociated?: string;
  };
  miscDetails?: {
    usable?: boolean;
    consumable?: boolean;
  };
  aiPreliminaryType?: string; // Used by AI assist to help categorize, then game logic confirms
}


export interface StartingNPC {
  name: string;
  personality: string; 
  initialAffinity: number;
  details: string; 
  gender?: 'Nam' | 'Nữ' | 'Khác' | 'Không rõ'; // Gender for starting NPC definition
  realm?: string; // Realm for starting NPC definition
  avatarUrl?: string; // Can be placeholder or Cloudinary URL
}

export interface StartingLore {
  title: string;
  content: string;
}

export interface StartingLocation { 
  name: string;
  description: string;
  isSafeZone?: boolean;
  regionId?: string;
}

export interface StartingFaction {
  name: string;
  description: string;
  alignment: GameTemplates.FactionAlignmentValues;
  initialPlayerReputation: number;
}

export type GenreType = typeof AVAILABLE_GENRES_VALUES[number];
export type CustomGenreType = typeof CUSTOM_GENRE_VALUE;

export interface WorldSettings {
  saveGameName: string; 
  theme: string;
  settingDescription: string;
  writingStyle: string;
  difficulty: 'Dễ' | 'Thường' | 'Khó';
  currencyName: string;
  playerName: string;
  playerGender: 'Nam' | 'Nữ' | 'Khác';
  playerPersonality: string;
  playerBackstory: string;
  playerGoal: string;
  playerStartingTraits: string;
  startingSkills: StartingSkill[];
  startingItems: StartingItem[]; 
  startingNPCs: StartingNPC[];
  startingLore: StartingLore[];
  startingLocations: StartingLocation[];
  startingFactions: StartingFaction[]; 
  nsfwMode?: boolean;
  originalStorySummary?: string;
  
  // Genre and Cultivation System
  genre: GenreType;
  customGenreName?: string; // For "Khác (Tự định nghĩa)"
  isCultivationEnabled: boolean;
  heThongCanhGioi: string; // e.g., "Phàm Nhân - Luyện Khí - Trúc Cơ" - Only if isCultivationEnabled
  canhGioiKhoiDau: string; // e.g., "Phàm Nhân Nhất Trọng" - Only if isCultivationEnabled

  // Player Avatar
  playerAvatarUrl?: string; // URL (Cloudinary, placeholder, or 'uploaded_via_file' if data is in KB)
}

export interface TurnHistoryEntry {
  knowledgeBaseSnapshot: KnowledgeBase; 
  gameMessagesSnapshot: GameMessage[];  
}

export interface RealmBaseStatDefinition {
  hpBase: number;         
  hpInc: number;          
  mpBase: number;         
  mpInc: number;          
  atkBase: number;        
  atkInc: number;         
  expBase: number;        
  expInc: number;         
}

export type EquipmentSlotId = 
  | 'mainWeapon' 
  | 'offHandWeapon' 
  | 'head' 
  | 'body' 
  | 'hands' 
  | 'legs' 
  | 'artifact' 
  | 'pet' 
  | 'accessory1' 
  | 'accessory2';

export interface EquipmentSlotConfig {
  id: EquipmentSlotId;
  labelKey: keyof typeof import('./constants').VIETNAMESE; 
  accepts: GameTemplates.EquipmentTypeValues[];
  icon?: string; 
}

export interface KnowledgeBase {
  playerStats: PlayerStats;
  inventory: Item[]; 
  equippedItems: Record<EquipmentSlotId, Item['id'] | null>; 
  playerSkills: Skill[]; 
  allQuests: Quest[];
  discoveredNPCs: NPC[]; 
  discoveredLocations: GameLocation[]; 
  discoveredFactions: Faction[]; 
  realmProgressionList: string[]; // Only if cultivation enabled
  currentRealmBaseStats: Record<string, RealmBaseStatDefinition>; // Only if cultivation enabled
  worldConfig: WorldSettings | null;
  companions: Companion[];
  worldLore: WorldLoreEntry[];
  appVersion?: string;
  pageSummaries?: Record<number, string>;
  currentPageHistory?: number[];
  lastSummarizedTurn?: number;
  turnHistory?: TurnHistoryEntry[]; 

  autoSaveTurnCounter: number;      
  currentAutoSaveSlotIndex: number; 
  autoSaveSlotIds: (string | null)[]; 
  manualSaveId: string | null;        
  manualSaveName: string | null;   
  
  playerAvatarData?: string; // Base64 data for player's uploaded avatar (before Cloudinary upload) or Cloudinary URL post-upload.
}

export interface AiChoice {
  text: string;
  actionTag?: string;
}

export interface GameMessage {
  id: string;
  type: 'narration' | 'choice' | 'system' | 'player_action' | 'error' | 'page_summary';
  content: string; 
  timestamp: number;
  choices?: AiChoice[];
  isPlayerInput?: boolean;
  turnNumber: number;
}

export interface ParsedAiResponse {
  narration: string;
  choices: AiChoice[];
  tags: string[];
  systemMessage?: string;
}

export interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

export interface ApiConfig {
  apiKeySource: 'system' | 'user';
  userApiKey: string;
  model: string; // For text generation
  imageModel: string; // For image generation
  safetySettings?: SafetySetting[];
  autoGenerateNpcAvatars: boolean; 
}

export interface SaveGameData {
  id?: string; 
  name: string;
  timestamp: any; 
  knowledgeBase: KnowledgeBase;
  gameMessages: GameMessage[];
  appVersion?: string;
}

export interface SaveGameMeta {
    id: string;
    name: string;
    timestamp: Date;
    size?: number; 
}

export type PlayerActionInputType = 'action' | 'story';
export type ResponseLength = 'default' | 'short' | 'medium' | 'long';

// Gameplay Style Settings
export interface StyleSettingProperty {
  fontFamily?: string;
  fontSize?: string;
  textColor: string;
  backgroundColor?: string;
}

export interface StyleSettings {
  narration: StyleSettingProperty;
  playerAction: StyleSettingProperty;
  choiceButton: StyleSettingProperty;
  keywordHighlight: StyleSettingProperty; 
}

export interface GeneratedWorldElements {
  startingSkills: StartingSkill[];
  startingItems: StartingItem[]; 
  startingNPCs: StartingNPC[];
  startingLore: StartingLore[];
  startingLocations?: StartingLocation[];
  startingFactions?: StartingFaction[]; 
  playerName?: string;
  playerGender?: 'Nam' | 'Nữ' | 'Khác';
  playerPersonality?: string;
  playerBackstory?: string;
  playerGoal?: string;
  playerStartingTraits?: string;
  playerAvatarUrl?: string; // Could be Cloudinary URL from AI generation during setup
  worldTheme?: string;
  worldSettingDescription?: string;
  worldWritingStyle?: string;
  currencyName?: string;
  originalStorySummary?: string;
  heThongCanhGioi?: string; // Only if cultivation enabled
  canhGioiKhoiDau?: string; // Only if cultivation enabled
  saveGameName?: string; 
  genre?: GenreType; 
  customGenreName?: string; // For "Khác (Tự định nghĩa)"
  isCultivationEnabled?: boolean; 
}