

import type { User as FirebaseUserType } from 'firebase/auth';
import { HarmCategory, HarmBlockThreshold } from "@google/genai"; 

export enum GameScreen {
  Initial = 'Initial',
  GameSetup = 'GameSetup',
  Gameplay = 'Gameplay',
  ApiSettings = 'ApiSettings',
  LoadGameSelection = 'LoadGameSelection', 
}

export type FirebaseUser = FirebaseUserType;

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

export interface Item {
  id: string;
  name: string;
  type: string; 
  description: string;
  effect?: string; 
  quantity: number;
  usable?: boolean;
  consumable?: boolean;
  slot?: string; 
  statsBonus?: Partial<PlayerStats>;
}

export interface Skill {
  id: string;
  name: string;
  type: string; 
  description: string;
  manaCost?: number;
  cooldown?: number;
  currentCooldown?: number;
  effect: string;
}

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

export interface NPC {
  id: string;
  name: string;
  description?: string; 
  hp?: number;
  atk?: number;
  // Affinity is not a direct field in the game's NPC struct,
  // but initial affinity from setup can be part of description for AI.
}

export interface GameLocation {
  id: string;
  name: string;
  description: string; 
}

export interface Companion {
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

export interface StartingSkill {
  name: string;
  description: string;
}

export interface StartingItem {
  name: string;
  description: string;
  quantity: number;
  type: string;
}

export interface StartingNPC {
  name: string;
  personality: string;
  initialAffinity: number; // e.g., 0-100
  details: string;
}

export interface StartingLore {
  title: string;
  content: string;
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
  nsfwMode?: boolean; 
}

export interface KnowledgeBase {
  playerStats: PlayerStats;
  inventory: Item[];
  playerSkills: Skill[];
  allQuests: Quest[]; 
  discoveredNPCs: NPC[];
  discoveredLocations: GameLocation[];
  realmProgressionList: string[];
  worldConfig: WorldSettings | null;
  companions: Companion[];
  worldLore: WorldLoreEntry[];
  appVersion?: string; 
}

export interface AiChoice {
  text: string;
  actionTag?: string; 
}

export interface GameMessage {
  id: string;
  type: 'narration' | 'choice' | 'system' | 'player_action' | 'error';
  content: string;
  timestamp: number;
  choices?: AiChoice[];
  isPlayerInput?: boolean; 
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
  apiKeySource: 'system' | 'user'; // Added: Specifies the source of the API key
  userApiKey: string;             // Changed: Stores user's API key if apiKeySource is 'user'
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
}

export type PlayerActionInputType = 'action' | 'story';
export type ResponseLength = 'default' | 'short' | 'medium' | 'long';