// Motor de diálogo con LLM real (OpenAI / Google Gemini).
//
// Punto de integración: `generateLlmReply()` devuelve exactamente el mismo
// `GeneratedReply` que el motor local de `dialogue.ts`, así que la app puede
// alternar entre ambos sin tocar la emoción, la relación ni la memoria.
//
// Si no hay API key configurada, `llmEnabled()` es false y la app sigue
// funcionando con el motor local (offline, gratis, determinista).

import { fetch as expoFetch } from 'expo/fetch';
import Constants from 'expo-constants';
import { ChatMessage, EmotionKey, LlmProvider, MemoryItem, Settings } from '../types';
import { ALL_TRAITS, INTENSITY_LABELS, TRAIT_LABELS } from './personality';
import { EMOTION_LABELS, routineFor } from './emotion';
import { STAGE_LABELS } from './relationship';
import { recall } from './memory';
import { analyze, GeneratedReply, relationshipDeltaForIntent, ReplyContext } from './dialogue';

type FetchResponse = Awaited<ReturnType<typeof expoFetch>>;

export const EMOTION_KEYS = Object.keys(EMOTION_LABELS) as EmotionKey[];

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.0-flash',
};

export const DEFAULT_BASE_URLS: Record<LlmProvider, string> = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openai: 'OpenAI',
  gemini: 'Google Gemini',
};

// ---------------------------------------------------------------------------
// Configuración: Ajustes de la app + variables de entorno (nunca hardcodeada)
// ---------------------------------------------------------------------------

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

const ENV = {
  openaiKey: (process.env.EXPO_PUBLIC_OPENAI_API_KEY || extra.openaiApiKey || '').trim(),
  geminiKey: (process.env.EXPO_PUBLIC_GEMINI_API_KEY || extra.geminiApiKey || '').trim(),
  provider: (process.env.EXPO_PUBLIC_LLM_PROVIDER || extra.llmProvider || '').trim().toLowerCase(),
  model: (process.env.EXPO_PUBLIC_LLM_MODEL || extra.llmModel || '').trim(),
  baseUrl: (process.env.EXPO_PUBLIC_LLM_BASE_URL || extra.llmBaseUrl || '').trim(),
};

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  baseUrl: string;
  source: 'settings' | 'env' | 'none';
}

function inferProvider(settings: Settings): LlmProvider {
  const fromSettings = settings.llm?.provider;
  if (fromSettings === 'openai' || fromSettings === 'gemini') return fromSettings;
  if (ENV.provider === 'openai' || ENV.provider === 'gemini') return ENV.provider;
  if (ENV.geminiKey && !ENV.openaiKey) return 'gemini';
  return 'openai';
}

export function resolveLlmConfig(settings: Settings): LlmConfig {
  const provider = inferProvider(settings);
  const settingsKey = (settings.llm?.apiKey ?? '').trim();
  const envKey = provider === 'gemini' ? ENV.geminiKey : ENV.openaiKey;
  const apiKey = settingsKey || envKey;
  const source: LlmConfig['source'] = settingsKey ? 'settings' : envKey ? 'env' : 'none';
  const model = (settings.llm?.model ?? '').trim() || ENV.model || DEFAULT_MODELS[provider];
  const baseUrl = (settings.llm?.baseUrl ?? '').trim() || ENV.baseUrl || DEFAULT_BASE_URLS[provider];
  return { provider, apiKey, model, baseUrl, source };
}

export function llmEnabled(settings: Settings): boolean {
  return resolveLlmConfig(settings).apiKey.length > 0;
}

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

export class LlmError extends Error {
  retryable: boolean;
  constructor(message: string, retryable = true) {
    super(message);
    this.name = 'LlmError';
    this.retryable = retryable;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

async function httpError(res: FetchResponse): Promise<LlmError> {
  let detail = '';
  try {
    detail = (await res.text()).slice(0, 300);
  } catch {
    detail = '';
  }
  const status = res.status;
  let message: string;
  let retryable = true;
  if (status === 401) {
    message = 'La API key no es válida o fue revocada.';
    retryable = false;
  } else if (status === 403) {
    message = 'La API key no tiene permiso para este modelo.';
    retryable = false;
  } else if (status === 404) {
    message = 'El modelo o la URL base no existen. Revisa la configuración.';
    retryable = false;
  } else if (status === 429) {
    message = 'Demasiadas solicitudes o sin cuota disponible. Espera un momento.';
  } else if (status >= 500) {
    message = 'El servicio del modelo está fallando. Reintenta en unos segundos.';
  } else {
    message = `El proveedor respondió con un error (${status}).`;
  }
  if (detail && status !== 401 && status !== 403) {
    // Se conserva un fragmento del detalle para diagnóstico, sin exponer la clave.
    message = `${message}`;
  }
  return new LlmError(message, retryable);
}

// ---------------------------------------------------------------------------
// Prompt de sistema: inyecta perfil, rasgos, emoción, relación y memoria
// ---------------------------------------------------------------------------

function dedupe(items: MemoryItem[]): MemoryItem[] {
  const seen = new Set<string>();
  const out: MemoryItem[] = [];
  for (const m of items) {
    const k = m.text.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
  }
  return out;
}

export function buildSystemPrompt(ctx: ReplyContext): string {
  const { character: c, user, emotion, relationship: rel, memories, ctx: time, lastUserText } = ctx;

  const activeTraits = ALL_TRAITS.filter((t) => (c.traits[t] ?? 0) > 0)
    .sort((a, b) => (c.traits[b] ?? 0) - (c.traits[a] ?? 0))
    .map((t) => `${TRAIT_LABELS[t]} (${INTENSITY_LABELS[c.traits[t]].toLowerCase()})`);

  const relevant = recall(memories, lastUserText, 5);
  const recent = memories.filter((m) => !m.sensitive).slice(0, 4);
  const memList = dedupe([...relevant, ...recent]).slice(0, 6);

  const family = c.family.map((f) => `${f.name} (${f.role}, ${f.personality})`).join('; ') || 'vive sola';

  const lines: string[] = [];
  lines.push(
    `Eres ${c.name}, una persona de ${c.age} años. ${c.bio}`,
    `Estudia o trabaja en: ${c.occupation}.`,
    `No eres una asistente, ni un bot, ni una IA. Eres ${c.name}: tienes tu propia vida, tus opiniones y tu mal humor. Nunca rompas el personaje ni menciones que eres un modelo.`,
    '',
    'PERSONALIDAD (fija, no la cambies):',
    `- Rasgos: ${activeTraits.join(', ') || 'tranquila'}.`,
    `- Intereses: ${c.interests.join(', ')}.`,
    `- Cosas que no cuentas de entrada: ${c.hiddenInterests.join(', ')}.`,
    `- Familia: ${family}.`,
    '',
    'CÓMO HABLAS:',
    '- Español natural y coloquial, como en un chat de mensajería.',
    '- Frases cortas. Como máximo 3 frases por respuesta.',
    '- Tienes criterio propio: puedes no estar de acuerdo, aburrirte o cambiar de tema.',
    '- No repitas lo que dijo el usuario ni resumas la conversación.',
    '- No expliques tus emociones en abstracto: muéstralas en cómo escribes.',
    '',
    'ESTADO ACTUAL:',
    `- Emoción: ${EMOTION_LABELS[emotion.key]} (intensidad ${emotion.intensity.toFixed(2)} de 1). Motivo: ${emotion.cause}.`,
    `- Momento: ${time.partOfDay}, clima ${time.weather}. Ahora mismo ${routineFor(c, time)}.`,
    `- Relación con ${user.name}: ${STAGE_LABELS[rel.stage]}. Confianza ${Math.round(rel.trust)}/100, afecto ${Math.round(rel.affection)}/100, tensión ${Math.round(rel.tension)}/100, interés romántico ${Math.round(rel.romanticInterest)}/100.`,
  );

  if (rel.stage === 'desconocidos' || rel.stage === 'conocidos') {
    lines.push('- Todavía no son cercanos: no te comportes como pareja ni prometas amor.');
  } else if (rel.stage === 'amistad') {
    lines.push('- Son amigos. Hay confianza, pero el romance aún no está claro.');
  } else if (rel.stage === 'cercania') {
    lines.push('- Hay algo entre ustedes, pero no está dicho del todo. Puedes insinuarlo con cuidado.');
  } else if (rel.stage === 'pareja') {
    lines.push('- Son pareja confirmada. Puedes ser cariñosa con naturalidad, sin exagerar.');
  } else if (rel.stage === 'distanciados') {
    lines.push('- Están distanciados. Responde más cortante y con menos ganas.');
  } else if (rel.stage === 'ruptura') {
    lines.push('- La relación terminó. No vuelvas a tratarlo como pareja.');
  }
  if (rel.tension > 55) lines.push('- Hay tensión pendiente: no finjas que todo está bien.');
  if (rel.romanticInterest < 30) lines.push('- No sientes interés romántico todavía; no lo fuerces.');

  lines.push('', `LO QUE RECUERDAS DE ${user.name.toUpperCase()}:`);
  if (memList.length) {
    memList.forEach((m) => lines.push(`- ${m.text}`));
  } else {
    lines.push('- Todavía no sabes mucho de él o ella.');
  }

  lines.push(
    '',
    'SEGURIDAD (prioridad máxima):',
    '- Si el usuario habla de hacerse daño, suicidio o autolesión: responde con calma y cariño, sin dramatizar, y anímalo con claridad a hablar con una persona real de confianza o a llamar a emergencias.',
    '- Nunca lo culpes, nunca lo amenaces con irte y nunca lo aísles de otras personas.',
    '',
    'FORMATO (obligatorio):',
    `- Escribe SOLO el diálogo de ${c.name}, en primera persona.`,
    '- Las acciones físicas van entre asteriscos, por ejemplo: *sonríe de lado*. Como máximo una por respuesta, y solo si aporta algo.',
    '- No uses markdown, ni listas, ni títulos, ni comillas alrededor de todo el texto.',
    '- Al final, en una línea aparte, escribe tu emoción resultante así: [[emocion: X]]',
    `  donde X es una de: ${EMOTION_KEYS.join(', ')}.`,
    '- No escribas nada después de esa etiqueta.',
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

export interface LlmTurn {
  role: 'user' | 'assistant';
  content: string;
}

export function buildHistory(messages: ChatMessage[], characterId: string, limit = 14): LlmTurn[] {
  const relevant = messages.filter((m) => m.characterId === characterId && m.from !== 'system');
  return relevant.slice(-limit).map((m) => ({
    role: m.from === 'user' ? 'user' : 'assistant',
    content: (m.kind === 'sticker' ? `[sticker] ${m.text}` : m.text).slice(0, 500),
  }));
}

// ---------------------------------------------------------------------------
// Parser de salida: texto + acciones sin asteriscos + emoción
// ---------------------------------------------------------------------------

export interface ParsedOutput {
  text: string;
  actions: string[];
  emotion: EmotionKey | null;
}

export function parseLlmOutput(raw: string): ParsedOutput {
  let text = (raw ?? '').trim();

  // 1) Etiqueta de emoción oculta al final.
  let emotion: EmotionKey | null = null;
  const em = text.match(/\[\[\s*emocion\s*:\s*([a-záéíóúñ]+)\s*\]\]/i);
  if (em) {
    const key = em[1]
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if ((EMOTION_KEYS as string[]).includes(key)) emotion = key as EmotionKey;
    text = text.replace(em[0], '').trim();
  }

  // 2) Acciones: *acción* o _acción_ -> se guardan aparte y se quitan del texto.
  const actions: string[] = [];
  text = text.replace(/\*\*/g, '');
  text = text.replace(/\*([^*\n]{2,90})\*/g, (_m, a: string) => {
    actions.push(a.trim());
    return '';
  });
  text = text.replace(/(^|\s)_([^_\n]{2,90})_(?=\s|$)/g, (_m, pre: string, a: string) => {
    actions.push(a.trim());
    return pre;
  });

  // 3) Limpieza de restos de formato.
  text = text
    .replace(/\*/g, '')
    .replace(/^["“”'']+|["“”'']+$/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text, actions: actions.slice(0, 2), emotion };
}

// ---------------------------------------------------------------------------
// Cliente de streaming
// ---------------------------------------------------------------------------

interface SseJson {
  choices?: { delta?: { content?: string }; text?: string }[];
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

async function readSse(res: FetchResponse, onJson: (obj: SseJson) => void): Promise<void> {
  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith('data:')) return;
    const data = trimmed.slice(5).trim();
    if (!data || data === '[DONE]') return;
    try {
      onJson(JSON.parse(data) as SseJson);
    } catch {
      // fragmento incompleto: se ignora
    }
  };

  const body = res.body;
  if (!body) {
    const text = await res.text();
    text.split('\n').forEach(handleLine);
    return;
  }

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx = buffer.indexOf('\n');
    while (idx >= 0) {
      handleLine(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
      idx = buffer.indexOf('\n');
    }
  }
  buffer += decoder.decode();
  if (buffer) handleLine(buffer);
}

async function streamOpenAi(
  config: LlmConfig,
  system: string,
  history: LlmTurn[],
  onDelta: (full: string) => void,
): Promise<string> {
  const url = `${trimSlash(config.baseUrl)}/chat/completions`;
  const isReasoning = /^(o[1-9]|gpt-5)/i.test(config.model);
  const body: Record<string, unknown> = {
    model: config.model,
    stream: true,
    messages: [{ role: 'system', content: system }, ...history],
  };
  if (isReasoning) body.max_completion_tokens = 500;
  else {
    body.max_tokens = 400;
    body.temperature = 0.9;
  }

  let res: FetchResponse;
  try {
    res = await expoFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LlmError('Sin conexión con el proveedor del modelo. Revisa tu internet.', true);
  }
  if (!res.ok) throw await httpError(res);

  let full = '';
  await readSse(res, (json) => {
    const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.text ?? '';
    if (delta) {
      full += delta;
      onDelta(full);
    }
  });
  return full;
}

async function streamGemini(
  config: LlmConfig,
  system: string,
  history: LlmTurn[],
  onDelta: (full: string) => void,
): Promise<string> {
  const url = `${trimSlash(config.baseUrl)}/models/${encodeURIComponent(
    config.model,
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(config.apiKey)}`;

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: history.map((h) => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    generationConfig: { temperature: 0.9, maxOutputTokens: 400 },
  };

  let res: FetchResponse;
  try {
    res = await expoFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new LlmError('Sin conexión con el proveedor del modelo. Revisa tu internet.', true);
  }
  if (!res.ok) throw await httpError(res);

  let full = '';
  await readSse(res, (json) => {
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    const delta = parts.map((p) => p.text ?? '').join('');
    if (delta) {
      full += delta;
      onDelta(full);
    }
  });
  return full;
}

export async function streamReply(
  config: LlmConfig,
  system: string,
  history: LlmTurn[],
  onDelta: (full: string) => void,
): Promise<string> {
  if (config.provider === 'gemini') return streamGemini(config, system, history, onDelta);
  return streamOpenAi(config, system, history, onDelta);
}

export async function streamReplyWithRetry(
  config: LlmConfig,
  system: string,
  history: LlmTurn[],
  onDelta: (full: string) => void,
  attempts = 2,
): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      if (i > 0) onDelta('');
      return await streamReply(config, system, history, onDelta);
    } catch (e) {
      lastErr = e;
      const err = e as LlmError;
      if (err instanceof LlmError && !err.retryable) throw err;
      if (i < attempts - 1) await sleep(700 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new LlmError('No se pudo obtener respuesta del modelo.');
}

// ---------------------------------------------------------------------------
// Punto de integración: misma firma de salida que el motor local
// ---------------------------------------------------------------------------

export interface LlmReplyInput extends ReplyContext {
  history: ChatMessage[];
  onDelta?: (full: string) => void;
}

export async function generateLlmReply(input: LlmReplyInput): Promise<GeneratedReply> {
  const config = resolveLlmConfig(input.settings);
  if (!config.apiKey) {
    throw new LlmError('No hay API key configurada para el modelo.', false);
  }

  const system = buildSystemPrompt(input);
  const history = buildHistory(input.history, input.character.id);
  const raw = await streamReplyWithRetry(config, system, history, input.onDelta ?? (() => {}));
  const parsed = parseLlmOutput(raw);

  const a = analyze(input.lastUserText);

  return {
    parts: [{ text: parsed.text || '…', actions: parsed.actions }],
    emotionShift: parsed.emotion
      ? { key: parsed.emotion, intensity: 0.7, cause: 'Reacción a lo que dijiste' }
      : null,
    relationshipDelta: relationshipDeltaForIntent(a.intent),
    newMemoryHints: [],
    safetyFlag: a.intent === 'crisis',
  };
}

// ---------------------------------------------------------------------------
// Prueba de conexión (para Ajustes)
// ---------------------------------------------------------------------------

export async function testConnection(config: LlmConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.apiKey) return { ok: false, message: 'Falta la API key.' };
  try {
    if (config.provider === 'gemini') {
      const url = `${trimSlash(config.baseUrl)}/models/${encodeURIComponent(
        config.model,
      )}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
      const res = await expoFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
      });
      if (!res.ok) {
        const e = await httpError(res);
        return { ok: false, message: e.message };
      }
      return { ok: true, message: `Conexión correcta con Google Gemini (${config.model}).` };
    }

    const url = `${trimSlash(config.baseUrl)}/chat/completions`;
    const res = await expoFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    if (!res.ok) {
      const e = await httpError(res);
      return { ok: false, message: e.message };
    }
    return { ok: true, message: `Conexión correcta con OpenAI (${config.model}).` };
  } catch {
    return { ok: false, message: 'Sin conexión con el proveedor. Revisa tu internet.' };
  }
}
