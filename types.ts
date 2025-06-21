

import type { User as FirebaseUserType } from 'firebase/auth';
import { HarmCategory, HarmBlockThreshold } from "@google/genai"; 
import * as GameTemplates from './templates'; // Import all templates

export enum GameScreen {
  Initial = 'Initial',
  GameSetup = 'GameSetup',
  Gameplay = 'Gameplay',
  ApiSettings = 'ApiSettings',
  LoadGameSelection = 'LoadGameSelection', 
  StorageSettings = 'StorageSettings', 
  ImportExport = 'ImportExport', 
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

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  atk: number;
  exp: number;
  maxExp: number;
  level: number;
  realm: string; 
  currency: number;
  isInCombat: boolean;
  turn: number;
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
  mana: number;
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
  description: string; // AI provides this, game can map to a full SkillTemplate
}

export interface StartingItem {
  name: string;
  description: string;
  quantity: number;
  type: string; // AI provides a general type, game can map to ItemCategory and specific item type
}

export interface StartingNPC {
  name: string;
  personality: string; // AI provides this
  initialAffinity: number; 
  details: string; // AI provides this
}

export interface StartingLore {
  title: string;
  content: string;
}

export interface StartingLocation { // New interface for starting locations
  name: string;
  description: string;
  isSafeZone?: boolean;
  regionId?: string;
}

export interface WorldSettings {
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
  startingLocations: StartingLocation[]; // Added starting locations
  nsfwMode?: boolean; 
  originalStorySummary?: string; // Renamed from fanficMainPlot
}

export interface TurnHistoryEntry {
  knowledgeBaseSnapshot: KnowledgeBase; // Snapshot of KB *before* this turn's action was processed
  gameMessagesSnapshot: GameMessage[];  // Snapshot of messages *before* this turn's action was processed
}

export interface KnowledgeBase {
  playerStats: PlayerStats;
  inventory: Item[]; // Now uses the new rich Item type (InventoryItem union)
  playerSkills: Skill[]; // Now uses SkillTemplate
  allQuests: Quest[]; 
  discoveredNPCs: NPC[]; // Now uses NPCTemplate
  discoveredLocations: GameLocation[]; // Now uses LocationTemplate
  discoveredFactions: Faction[]; // New field for factions
  realmProgressionList: string[];
  worldConfig: WorldSettings | null;
  companions: Companion[];
  worldLore: WorldLoreEntry[];
  appVersion?: string; 
  pageSummaries?: Record<number, string>;
  currentPageHistory?: number[];
  lastSummarizedTurn?: number;
  turnHistory?: TurnHistoryEntry[]; // For rollback functionality
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
  model: string;
  safetySettings?: SafetySetting[]; 
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
    size?: number; // Estimated size in bytes
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
  keywordHighlight: StyleSettingProperty; // New
}

export interface GeneratedWorldElements {
  startingSkills: StartingSkill[];
  startingItems: StartingItem[];
  startingNPCs: StartingNPC[];
  startingLore: StartingLore[];
  startingLocations?: StartingLocation[]; // Added starting locations
  playerName?: string;
  playerPersonality?: string;
  playerBackstory?: string;
  playerGoal?: string;
  playerStartingTraits?: string;
  worldTheme?: string;
  worldSettingDescription?: string;
  worldWritingStyle?: string;
  currencyName?: string;
  originalStorySummary?: string;
}