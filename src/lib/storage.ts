import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, Settings, UserProfile } from '../types';

const KEY_PREFIX = 'personaia:v1:';
const dataKey = (uid: string) => `${KEY_PREFIX}data:${uid}`;
const sessionKey = `${KEY_PREFIX}session`;
const localUsersKey = `${KEY_PREFIX}localusers`;

export const defaultSettings: Settings = {
  perfMode: 'equilibrado',
  storageMode: 'ligero',
  reasoning: 'normal',
  control: 'equilibrado',
  voice: 'natural',
  voiceRate: 0.95,
  subtitles: false,
  allowFamilyContact: true,
  allowSecondarySpontaneous: true,
  theme: 'noche',
  haptics: true,
  llm: { provider: 'openai', apiKey: '', model: '', baseUrl: '' },
};

export function emptyData(user: UserProfile | null = null): AppData {
  const now = Date.now();
  return {
    version: 1,
    user,
    primary: null,
    secondary: [],
    messages: [],
    memories: [],
    relationship: {
      stage: 'desconocidos',
      trust: 5,
      affection: 5,
      tension: 0,
      romanticInterest: 0,
      history: [],
      partnerConfirmed: false,
    },
    emotion: {
      key: 'curiosa',
      intensity: 0.4,
      cause: 'Primer día',
      updatedAt: now,
    },
    wardrobe: { outfits: [], currentOutfitId: '', pendingProposalId: null, lastChangeAt: now },
    world: null,
    settings: { ...defaultSettings, llm: { ...defaultSettings.llm } },
    onboardingStep: 'user_profile',
    deviceReport: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function loadData(uid: string): Promise<AppData | null> {
  const raw = await AsyncStorage.getItem(dataKey(uid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppData;
    const mergedSettings: Settings = {
      ...defaultSettings,
      ...parsed.settings,
      llm: { ...defaultSettings.llm, ...(parsed.settings?.llm ?? {}) },
    };
    return { ...emptyData(parsed.user), ...parsed, settings: mergedSettings };
  } catch {
    return null;
  }
}

export async function saveData(uid: string, data: AppData): Promise<void> {
  const payload: AppData = { ...data, updatedAt: Date.now() };
  await AsyncStorage.setItem(dataKey(uid), JSON.stringify(payload));
}

export async function clearData(uid: string): Promise<void> {
  await AsyncStorage.removeItem(dataKey(uid));
}

export async function saveSession(session: unknown): Promise<void> {
  await AsyncStorage.setItem(sessionKey, JSON.stringify(session));
}

export async function readSession<T>(): Promise<T | null> {
  const raw = await AsyncStorage.getItem(sessionKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(sessionKey);
}

// ---- Almacén local de credenciales (modo sin Supabase) ----
export interface LocalUserRecord {
  id: string;
  email: string;
  salt: string;
  hash: string;
  createdAt: number;
}

function simpleHash(input: string): string {
  // Hash determinista ligero (FNV-1a de 64 bits en hex). No es criptográfico:
  // el modo local es para desarrollo/pruebas; producción usa Supabase Auth.
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193) >>> 0;
    h2 = (Math.imul(h2 ^ c, 0x85ebca6b) + i) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}

export function makeSalt(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function hashPassword(password: string, salt: string): string {
  return simpleHash(`${salt}::${password}::personaia`);
}

export async function readLocalUsers(): Promise<LocalUserRecord[]> {
  const raw = await AsyncStorage.getItem(localUsersKey);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as LocalUserRecord[];
  } catch {
    return [];
  }
}

export async function writeLocalUsers(users: LocalUserRecord[]): Promise<void> {
  await AsyncStorage.setItem(localUsersKey, JSON.stringify(users));
}
