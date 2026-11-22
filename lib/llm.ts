import AsyncStorage from '@react-native-async-storage/async-storage';
import { LLMRequest, LLMResponse } from '../shared/persona';

const SERVER_URL_KEY = 'server_url';
const CHAR_KEY = 'character';
const HISTORY_KEY = 'chat_history';
const MEM_KEY = 'memories';

export async function getServerUrl(): Promise<string | null> {
  return AsyncStorage.getItem(SERVER_URL_KEY);
}

export async function setServerUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
}

export async function loadJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function saveJson(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export { CHAR_KEY, HISTORY_KEY, MEM_KEY };

export class NoServerError extends Error {
  constructor() {
    super('NO_SERVER');
  }
}

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const url = await getServerUrl();
  if (!url) throw new NoServerError();
  const res = await fetch(url + '/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error('SERVER_' + res.status);
  return (await res.json()) as LLMResponse;
}
