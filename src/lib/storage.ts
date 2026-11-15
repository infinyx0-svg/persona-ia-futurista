import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_SETTINGS,
  DEFAULT_TRAITS,
  type Message,
  type PersonaState,
  type Settings,
} from '../types';

const K = {
  settings: 'pia.settings.v2',
  persona: 'pia.persona.v2',
  messages: 'pia.messages.v2',
  onboarded: 'pia.onboarded.v2',
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(K.settings);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(s: Settings): Promise<void> {
  await AsyncStorage.setItem(K.settings, JSON.stringify(s));
}

export function newPersona(name = 'Aria'): PersonaState {
  return {
    name,
    traits: { ...DEFAULT_TRAITS },
    bond: 'Todavía no nos conocemos.',
    trust: 0.1,
    turns: 0,
    facts: [],
    stage: 'desconocidos',
  };
}

export async function loadPersona(): Promise<PersonaState> {
  try {
    const raw = await AsyncStorage.getItem(K.persona);
    if (!raw) return newPersona();
    const p = JSON.parse(raw);
    return { ...newPersona(), ...p, traits: { ...DEFAULT_TRAITS, ...(p.traits || {}) } };
  } catch {
    return newPersona();
  }
}

export async function savePersona(p: PersonaState): Promise<void> {
  await AsyncStorage.setItem(K.persona, JSON.stringify(p));
}

export async function loadMessages(): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(K.messages);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function saveMessages(m: Message[]): Promise<void> {
  // guardamos solo los ultimos 400 para no crecer sin limite
  const trimmed = m.slice(-400);
  await AsyncStorage.setItem(K.messages, JSON.stringify(trimmed));
}

export async function isOnboarded(): Promise<boolean> {
  return (await AsyncStorage.getItem(K.onboarded)) === '1';
}

export async function setOnboarded(): Promise<void> {
  await AsyncStorage.setItem(K.onboarded, '1');
}

export async function resetAll(): Promise<void> {
  await AsyncStorage.multiRemove([K.settings, K.persona, K.messages, K.onboarded]);
}
