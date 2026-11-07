// Tipos centrales de Persona IA
export type Gender = 'femenino' | 'masculino' | 'no_binario';

export type AnimeStyle = 'tierno' | 'moderno' | 'semirrealista';

export type TraitKey =
  | 'afectuosa'
  | 'celosa'
  | 'posesiva'
  | 'protectora'
  | 'timida'
  | 'coqueta'
  | 'sarcastica'
  | 'dramatica'
  | 'competitiva'
  | 'fria'
  | 'energetica'
  | 'curiosa'
  | 'seria'
  | 'bromista'
  | 'empatica'
  | 'creativa'
  | 'tranquila';

export type Intensity = 0 | 1 | 2 | 3; // 0 = ausente, 1 baja, 2 media, 3 alta

export type Traits = Record<TraitKey, Intensity>;

export type EmotionKey =
  | 'feliz'
  | 'tranquila'
  | 'curiosa'
  | 'timida'
  | 'molesta'
  | 'triste'
  | 'cansada'
  | 'emocionada'
  | 'juguetona'
  | 'distante';

export interface EmotionState {
  key: EmotionKey;
  intensity: number; // 0..1
  cause: string;
  updatedAt: number;
}

export type RelationshipStage =
  | 'desconocidos'
  | 'conocidos'
  | 'amistad'
  | 'cercania'
  | 'pareja'
  | 'distanciados'
  | 'ruptura';

export interface RelationshipState {
  stage: RelationshipStage;
  trust: number; // 0..100
  affection: number; // 0..100
  tension: number; // 0..100
  romanticInterest: number; // 0..100
  history: { at: number; text: string; delta: number }[];
  partnerConfirmed: boolean;
}

export interface MemoryItem {
  id: string;
  kind: 'gusto' | 'meta' | 'persona' | 'proyecto' | 'momento' | 'sensible' | 'dato';
  text: string;
  createdAt: number;
  sensitive: boolean;
  source: 'auto' | 'manual';
  characterId: string;
}

export interface Outfit {
  id: string;
  name: string;
  top: string; // color hex
  bottom: string;
  hair: string;
  accessory: string;
  vibe: 'casual' | 'estudio' | 'deporte' | 'salida' | 'casa' | 'frio';
  owned: boolean;
  proposedBy: 'sistema' | 'ella' | 'usuario';
}

export interface WardrobeState {
  outfits: Outfit[];
  currentOutfitId: string;
  pendingProposalId: string | null;
  lastChangeAt: number;
}

export interface Character {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  pronouns: string;
  animeStyle: AnimeStyle;
  traits: Traits;
  locked: boolean;
  interests: string[];
  hiddenInterests: string[];
  family: FamilyMember[];
  isPrimary: boolean;
  avatarSeed: number;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  voice: VoiceId;
  createdAt: number;
  bio: string;
  occupation: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: 'mama' | 'papa' | 'tutor' | 'hermano' | 'hermana' | 'abuelo' | 'abuela';
  personality: string;
  attitude: number; // -100..100 hacia el usuario
  canContact: boolean;
}

export type VoiceId = 'anime' | 'natural' | 'energetica' | 'tranquila' | 'madura';

export interface ChatMessage {
  id: string;
  characterId: string;
  from: 'user' | 'character' | 'system';
  text: string;
  actions: string[];
  at: number;
  kind: 'text' | 'sticker' | 'audio' | 'image' | 'link';
  meta?: Record<string, string>;
  emotion?: EmotionKey;
}

export interface UserProfile {
  name: string;
  age: number;
  pronouns: string;
  occupation: string;
  country: string;
  city: string;
  useFictionalCity: boolean;
  timezone: string;
}

export interface WorldState {
  placeId: string;
  placeName: string;
  placeDescription: string;
  weather: 'soleado' | 'nublado' | 'lluvia' | 'frio' | 'calor';
  dayIndex: number;
  startedAt: number;
}

export type LlmProvider = 'openai' | 'gemini';

export interface LlmSettings {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
}

export type PerfMode = 'completo' | 'equilibrado' | 'ligero';
export type StorageMode = 'ligero' | 'completo';
export type ReasoningLevel = 'basico' | 'normal' | 'avanzado' | 'experto';
export type ControlLevel = 'auto' | 'equilibrado' | 'estricto';

export interface Settings {
  perfMode: PerfMode;
  storageMode: StorageMode;
  reasoning: ReasoningLevel;
  control: ControlLevel;
  voice: VoiceId;
  voiceRate: number;
  subtitles: boolean;
  allowFamilyContact: boolean;
  allowSecondarySpontaneous: boolean;
  theme: 'noche' | 'aurora' | 'sakura';
  haptics: boolean;
  llm: LlmSettings;
}

export interface DeviceReport {
  platform: string;
  osVersion: string;
  model: string;
  totalMemory: number;
  freeDisk: number;
  batteryLevel: number | null;
  batteryState: string;
  audioOk: boolean;
  recommended: PerfMode;
  notes: string[];
  checkedAt: number;
}

export interface AppData {
  version: number;
  user: UserProfile | null;
  primary: Character | null;
  secondary: Character[];
  messages: ChatMessage[];
  memories: MemoryItem[];
  relationship: RelationshipState;
  emotion: EmotionState;
  wardrobe: WardrobeState;
  world: WorldState | null;
  settings: Settings;
  onboardingStep: string;
  deviceReport: DeviceReport | null;
  createdAt: number;
  updatedAt: number;
}

export interface AuthUser {
  id: string;
  email: string;
  provider: 'supabase' | 'local';
}
