import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppData,
  AuthUser,
  ChatMessage,
  DeviceReport,
  EmotionState,
  LlmSettings,
  MemoryItem,
  Outfit,
  PerfMode,
  Settings,
  UserProfile,
} from '../types';
import { authModeLabel, restoreSession, signIn as authSignIn, signOut as authSignOut, signUp as authSignUp } from '../lib/auth';
import { clearData, emptyData, loadData, saveData } from '../lib/storage';
import { buildCharacter, CreateCharacterInput } from '../engine/personality';
import { analyze, buildMessage, firstMeetingOpening, generateReply, GeneratedReply } from '../engine/dialogue';
import { generateLlmReply, llmEnabled, resolveLlmConfig, testConnection } from '../engine/llm';
import { nextEmotion, timeContext } from '../engine/emotion';
import { extractMemories, mergeMemories } from '../engine/memory';
import { applyDelta, breakUp, canBecomePartner, confirmPartner } from '../engine/relationship';
import { addOutfit, initialWardrobe, proposeOutfit, removeOutfit, wearOutfit } from '../engine/wardrobe';
import { createWorld, PlaceOption, suggestPlaces } from '../engine/world';
import { materializeSecondary, proposeSecondary, SecondaryProposal, secondaryReply } from '../engine/secondary';
import { diagnoseDevice } from '../lib/device';

export type Route = 'boot' | 'welcome' | 'signup' | 'login' | 'onboarding' | 'main';

export type Tab = 'chat' | 'persona' | 'mente' | 'gente' | 'armario' | 'ajustes';

interface AppContextValue {
  ready: boolean;
  route: Route;
  tab: Tab;
  setTab: (t: Tab) => void;
  user: AuthUser | null;
  data: AppData;
  authMode: string;
  busy: boolean;
  error: string | null;
  clearError: () => void;
  signUp: (email: string, password: string) => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  go: (r: Route) => void;
  saveUserProfile: (p: UserProfile) => Promise<void>;
  createCompanion: (input: CreateCharacterInput) => Promise<void>;
  placeOptions: () => PlaceOption[];
  choosePlace: (p: PlaceOption) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  sendSticker: (emoji: string) => Promise<void>;
  typing: boolean;
  streamingText: string;
  llmError: string | null;
  llmActive: boolean;
  llmSource: 'settings' | 'env' | 'none';
  retryLast: () => Promise<void>;
  testLlm: () => Promise<{ ok: boolean; message: string }>;
  updateLlm: (patch: Partial<LlmSettings>) => Promise<void>;
  setEmotion: (e: EmotionState) => void;
  addMemory: (text: string, kind?: MemoryItem['kind']) => Promise<void>;
  updateMemory: (id: string, text: string) => Promise<void>;
  deleteMemory: (id: string) => Promise<void>;
  becomePartner: () => Promise<void>;
  endRelationship: (reason: string) => Promise<void>;
  wear: (id: string) => Promise<void>;
  addNewOutfit: (o: Omit<Outfit, 'id'>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  propose: () => Promise<Outfit | null>;
  acceptProposal: () => Promise<void>;
  rejectProposal: () => Promise<void>;
  proposeNewSecondary: () => SecondaryProposal | null;
  acceptSecondary: (p: SecondaryProposal) => Promise<void>;
  sendSecondaryMessage: (characterId: string, text: string) => Promise<void>;
  removeSecondary: (id: string) => Promise<void>;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  runDiagnosis: () => Promise<DeviceReport>;
  applyRecommendedMode: () => Promise<void>;
  resetWorld: () => Promise<void>;
  resetAll: () => Promise<void>;
  messagesFor: (characterId: string) => ChatMessage[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<Route>('boot');
  const [tab, setTab] = useState<Tab>('chat');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [data, setData] = useState<AppData>(emptyData());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [llmError, setLlmError] = useState<string | null>(null);
  const lastUserTextRef = useRef('');
  const dataRef = useRef<AppData>(data);
  dataRef.current = data;

  const persist = useCallback(
    async (next: AppData, uid?: string) => {
      setData(next);
      dataRef.current = next;
      const id = uid ?? user?.id;
      if (id) await saveData(id, next);
    },
    [user?.id],
  );

  // ---- arranque ----
  useEffect(() => {
    (async () => {
      const session = await restoreSession();
      if (session) {
        setUser(session);
        const stored = await loadData(session.id);
        if (stored) {
          setData(stored);
          dataRef.current = stored;
          setRoute(stored.primary ? 'main' : 'onboarding');
        } else {
          const fresh = emptyData(null);
          setData(fresh);
          dataRef.current = fresh;
          setRoute('onboarding');
        }
      } else {
        setRoute('welcome');
      }
      setReady(true);
    })();
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError(null);
    const res = await authSignUp(email, password);
    setBusy(false);
    if (res.error || !res.user) {
      setError(res.error ?? 'No se pudo crear la cuenta.');
      return false;
    }
    setUser(res.user);
    const fresh = emptyData(null);
    await saveData(res.user.id, fresh);
    setData(fresh);
    dataRef.current = fresh;
    setRoute('onboarding');
    return true;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setBusy(true);
    setError(null);
    const res = await authSignIn(email, password);
    setBusy(false);
    if (res.error || !res.user) {
      setError(res.error ?? 'No se pudo iniciar sesión.');
      return false;
    }
    setUser(res.user);
    const stored = await loadData(res.user.id);
    const next = stored ?? emptyData(null);
    setData(next);
    dataRef.current = next;
    setRoute(next.primary ? 'main' : 'onboarding');
    return true;
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
    setData(emptyData());
    dataRef.current = emptyData();
    setRoute('welcome');
    setTab('chat');
  }, []);

  const go = useCallback((r: Route) => setRoute(r), []);

  // ---- onboarding ----
  const saveUserProfile = useCallback(
    async (p: UserProfile) => {
      const next: AppData = { ...dataRef.current, user: p, onboardingStep: 'companion' };
      await persist(next);
    },
    [persist],
  );

  const createCompanion = useCallback(
    async (input: CreateCharacterInput) => {
      const character = buildCharacter(input);
      const next: AppData = {
        ...dataRef.current,
        primary: character,
        wardrobe: initialWardrobe(),
        onboardingStep: 'meeting',
        emotion: { key: 'curiosa', intensity: 0.5, cause: 'Primer encuentro', updatedAt: Date.now() },
      };
      await persist(next);
    },
    [persist],
  );

  const placeOptions = useCallback(() => {
    const u = dataRef.current.user;
    if (!u) return [];
    return suggestPlaces(u);
  }, []);

  const choosePlace = useCallback(
    async (p: PlaceOption) => {
      const current = dataRef.current;
      if (!current.primary || !current.user) return;
      const world = createWorld(p, current.user);
      const opening = firstMeetingOpening(current.primary, p.name);
      const msgs: ChatMessage[] = [
        buildMessage('system', 'system', `Primer encuentro en ${p.name}.`, [], 'text'),
        ...opening.map((o) => buildMessage(current.primary!.id, 'character', o.text, o.actions, 'text')),
      ];
      const next: AppData = {
        ...current,
        world,
        messages: msgs,
        onboardingStep: 'done',
        relationship: { ...current.relationship, stage: 'conocidos', trust: 12, affection: 8 },
      };
      await persist(next);
      setRoute('main');
      setTab('chat');
    },
    [persist],
  );

  // ---- chat ----
  // Aplica una respuesta (local o LLM) al estado: mensajes, emoción, relación y
  // memoria. Es el mismo camino para ambos motores, así que las etapas de
  // relación y la memoria se comportan igual.
  const applyReply = useCallback(
    async (base: AppData, reply: GeneratedReply, userText: string, ctx: ReturnType<typeof timeContext>) => {
      const primary = base.primary;
      if (!primary) return;
      const newMsgs: ChatMessage[] = reply.parts.map((p) =>
        buildMessage(primary.id, 'character', p.text, p.actions, 'text', reply.emotionShift?.key),
      );
      const a = analyze(userText);
      const emotion: EmotionState = reply.emotionShift
        ? {
            key: reply.emotionShift.key,
            intensity: reply.emotionShift.intensity,
            cause: reply.emotionShift.cause,
            updatedAt: Date.now(),
          }
        : nextEmotion({
            intent: a.intent,
            sentiment: a.sentiment,
            relationship: base.relationship,
            character: primary,
            ctx,
            previous: base.emotion,
          });
      const relationship = applyDelta(base.relationship, reply.relationshipDelta, userText.slice(0, 60));
      const extracted = extractMemories(userText, primary.id);
      const memories = mergeMemories(base.memories, extracted);
      await persist({
        ...base,
        messages: [...base.messages, ...newMsgs],
        emotion,
        relationship,
        memories,
      });
    },
    [persist],
  );

  // Ruta LLM: streaming + reintento + aviso de error. Si falla, NO se inventa
  // una respuesta: se muestra el error y el usuario puede reintentar.
  const runLlm = useCallback(
    async (base: AppData, userText: string) => {
      const primary = base.primary;
      const profile = base.user;
      if (!primary || !profile) return;
      const ctx = timeContext(base.world?.weather ?? 'nublado');
      setLlmError(null);
      setTyping(true);
      setStreamingText('');
      try {
        const reply = await generateLlmReply({
          character: primary,
          user: profile,
          emotion: base.emotion,
          relationship: base.relationship,
          memories: base.memories,
          settings: base.settings,
          ctx,
          lastUserText: userText,
          history: base.messages,
          onDelta: (full) => setStreamingText(full),
        });
        setStreamingText('');
        setTyping(false);
        await applyReply(base, reply, userText, ctx);
      } catch (e) {
        setStreamingText('');
        setTyping(false);
        setLlmError(e instanceof Error ? e.message : 'No se pudo obtener respuesta del modelo.');
      }
    },
    [applyReply],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const current = dataRef.current;
      const primary = current.primary;
      const profile = current.user;
      if (!primary || !profile || !text.trim()) return;

      const clean = text.trim();
      const userMsg = buildMessage(primary.id, 'user', clean, [], 'text');
      const withUser: AppData = { ...current, messages: [...current.messages, userMsg] };
      await persist(withUser);
      lastUserTextRef.current = clean;

      const ctx = timeContext(current.world?.weather ?? 'nublado');

      // Con API key configurada se usa el LLM real; si no, el motor local.
      if (llmEnabled(current.settings)) {
        await runLlm(withUser, clean);
        return;
      }

      setTyping(true);
      const reply = generateReply({
        character: primary,
        user: profile,
        emotion: current.emotion,
        relationship: current.relationship,
        memories: current.memories,
        settings: current.settings,
        ctx,
        lastUserText: clean,
      });

      const delay = current.settings.perfMode === 'ligero' ? 450 : 900;
      await new Promise((r) => setTimeout(r, delay));
      setTyping(false);
      await applyReply(withUser, reply, clean, ctx);
    },
    [persist, runLlm, applyReply],
  );

  const retryLast = useCallback(async () => {
    const t = lastUserTextRef.current;
    if (!t) return;
    await runLlm(dataRef.current, t);
  }, [runLlm]);

  const testLlm = useCallback(async () => {
    return testConnection(resolveLlmConfig(dataRef.current.settings));
  }, []);

  const updateLlm = useCallback(
    async (patch: Partial<LlmSettings>) => {
      const current = dataRef.current;
      await persist({
        ...current,
        settings: { ...current.settings, llm: { ...current.settings.llm, ...patch } },
      });
    },
    [persist],
  );

  const sendSticker = useCallback(
    async (emoji: string) => {
      const current = dataRef.current;
      const primary = current.primary;
      if (!primary) return;
      const msg = buildMessage(primary.id, 'user', emoji, [], 'sticker');
      const next = { ...current, messages: [...current.messages, msg] };
      await persist(next);
      setTyping(true);
      await new Promise((r) => setTimeout(r, 600));
      const replies = ['jaja, me gusta ese', '¿me lo mandas en serio?', 'qué tonto', 'me sacaste una sonrisa'];
      const reply = buildMessage(
        primary.id,
        'character',
        replies[Math.floor(Math.random() * replies.length)],
        ['sonríe'],
        'text',
      );
      setTyping(false);
      await persist({ ...next, messages: [...next.messages, reply] });
    },
    [persist],
  );

  const setEmotion = useCallback((e: EmotionState) => {
    const next = { ...dataRef.current, emotion: e };
    setData(next);
    dataRef.current = next;
  }, []);

  // ---- memoria ----
  const addMemory = useCallback(
    async (text: string, kind: MemoryItem['kind'] = 'dato') => {
      const current = dataRef.current;
      const item: MemoryItem = {
        id: `mem_${Date.now().toString(36)}`,
        kind,
        text: text.trim(),
        createdAt: Date.now(),
        sensitive: kind === 'sensible',
        source: 'manual',
        characterId: current.primary?.id ?? 'primary',
      };
      await persist({ ...current, memories: [item, ...current.memories] });
    },
    [persist],
  );

  const updateMemory = useCallback(
    async (id: string, text: string) => {
      const current = dataRef.current;
      await persist({
        ...current,
        memories: current.memories.map((m) => (m.id === id ? { ...m, text } : m)),
      });
    },
    [persist],
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      await persist({ ...current, memories: current.memories.filter((m) => m.id !== id) });
    },
    [persist],
  );

  // ---- relación ----
  const becomePartner = useCallback(async () => {
    const current = dataRef.current;
    if (!canBecomePartner(current.relationship)) return;
    const rel = confirmPartner(current.relationship);
    const primary = current.primary;
    const msgs = primary
      ? [
          buildMessage(primary.id, 'character', 'Entonces sí. Somos pareja.', ['te mira a los ojos'], 'text', 'feliz'),
          buildMessage(primary.id, 'character', 'No prometo que sea perfecto, pero sí que va a ser de verdad.', [], 'text', 'feliz'),
        ]
      : [];
    await persist({ ...current, relationship: rel, messages: [...current.messages, ...msgs] });
  }, [persist]);

  const endRelationship = useCallback(
    async (reason: string) => {
      const current = dataRef.current;
      const rel = breakUp(current.relationship, reason);
      const primary = current.primary;
      const msgs = primary
        ? [buildMessage(primary.id, 'character', 'Necesito parar. No es una amenaza, es que ya no puedo seguir así.', ['baja la mirada'], 'text', 'triste')]
        : [];
      await persist({ ...current, relationship: rel, messages: [...current.messages, ...msgs] });
    },
    [persist],
  );

  // ---- armario ----
  const wear = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      await persist({ ...current, wardrobe: wearOutfit(current.wardrobe, id) });
    },
    [persist],
  );

  const addNewOutfit = useCallback(
    async (o: Omit<Outfit, 'id'>) => {
      const current = dataRef.current;
      await persist({ ...current, wardrobe: addOutfit(current.wardrobe, o) });
    },
    [persist],
  );

  const remove = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      await persist({ ...current, wardrobe: removeOutfit(current.wardrobe, id) });
    },
    [persist],
  );

  const propose = useCallback(async () => {
    const current = dataRef.current;
    if (!current.primary) return null;
    const ctx = timeContext(current.world?.weather ?? 'nublado');
    const outfit = proposeOutfit(current.primary, current.world?.weather ?? 'nublado', ctx.partOfDay);
    const next: AppData = {
      ...current,
      wardrobe: { ...current.wardrobe, outfits: [...current.wardrobe.outfits, outfit], pendingProposalId: outfit.id },
    };
    await persist(next);
    return outfit;
  }, [persist]);

  const acceptProposal = useCallback(async () => {
    const current = dataRef.current;
    const id = current.wardrobe.pendingProposalId;
    if (!id) return;
    await persist({ ...current, wardrobe: wearOutfit(current.wardrobe, id) });
  }, [persist]);

  const rejectProposal = useCallback(async () => {
    const current = dataRef.current;
    const id = current.wardrobe.pendingProposalId;
    if (!id) return;
    await persist({
      ...current,
      wardrobe: {
        ...current.wardrobe,
        outfits: current.wardrobe.outfits.filter((o) => o.id !== id),
        pendingProposalId: null,
      },
    });
  }, [persist]);

  // ---- secundarios ----
  const proposeNewSecondary = useCallback(() => {
    const current = dataRef.current;
    if (!current.primary) return null;
    return proposeSecondary(current.primary, current.secondary);
  }, []);

  const acceptSecondary = useCallback(
    async (p: SecondaryProposal) => {
      const current = dataRef.current;
      if (!current.primary) return;
      const character = materializeSecondary(p, current.primary);
      const intro = buildMessage(
        character.id,
        'character',
        `Hola, soy ${character.name}. ${current.primary.name} me habló de ti.`,
        ['saluda con la mano'],
        'text',
      );
      await persist({
        ...current,
        secondary: [...current.secondary, character],
        messages: [...current.messages, intro],
      });
    },
    [persist],
  );

  const sendSecondaryMessage = useCallback(
    async (characterId: string, text: string) => {
      const current = dataRef.current;
      const character = current.secondary.find((c) => c.id === characterId);
      if (!character) return;
      const userMsg = buildMessage(characterId, 'user', text, [], 'text');
      const reply = secondaryReply(character, text);
      await persist({ ...current, messages: [...current.messages, userMsg, reply] });
    },
    [persist],
  );

  const removeSecondary = useCallback(
    async (id: string) => {
      const current = dataRef.current;
      await persist({
        ...current,
        secondary: current.secondary.filter((c) => c.id !== id),
        messages: current.messages.filter((m) => m.characterId !== id),
      });
    },
    [persist],
  );

  // ---- ajustes ----
  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const current = dataRef.current;
      await persist({ ...current, settings: { ...current.settings, ...patch } });
    },
    [persist],
  );

  const runDiagnosis = useCallback(async () => {
    const report = await diagnoseDevice();
    const current = dataRef.current;
    await persist({ ...current, deviceReport: report });
    return report;
  }, [persist]);

  const applyRecommendedMode = useCallback(async () => {
    const current = dataRef.current;
    const rec: PerfMode = current.deviceReport?.recommended ?? 'equilibrado';
    await persist({ ...current, settings: { ...current.settings, perfMode: rec } });
  }, [persist]);

  const resetWorld = useCallback(async () => {
    const current = dataRef.current;
    const next: AppData = {
      ...emptyData(current.user),
      settings: current.settings,
      deviceReport: current.deviceReport,
      onboardingStep: 'companion',
    };
    await persist(next);
    setRoute('onboarding');
  }, [persist]);

  const resetAll = useCallback(async () => {
    if (user) await clearData(user.id);
    const fresh = emptyData(null);
    setData(fresh);
    dataRef.current = fresh;
    setRoute('onboarding');
  }, [user]);

  const messagesFor = useCallback(
    (characterId: string) => data.messages.filter((m) => m.characterId === characterId),
    [data.messages],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      route,
      tab,
      setTab,
      user,
      data,
      authMode: authModeLabel,
      busy,
      error,
      clearError: () => setError(null),
      signUp,
      signIn,
      signOut,
      go,
      saveUserProfile,
      createCompanion,
      placeOptions,
      choosePlace,
      sendMessage,
      sendSticker,
      typing,
      streamingText,
      llmError,
      llmActive: llmEnabled(data.settings),
      llmSource: resolveLlmConfig(data.settings).source,
      retryLast,
      testLlm,
      updateLlm,
      setEmotion,
      addMemory,
      updateMemory,
      deleteMemory,
      becomePartner,
      endRelationship,
      wear,
      addNewOutfit,
      remove,
      propose,
      acceptProposal,
      rejectProposal,
      proposeNewSecondary,
      acceptSecondary,
      sendSecondaryMessage,
      removeSecondary,
      updateSettings,
      runDiagnosis,
      applyRecommendedMode,
      resetWorld,
      resetAll,
      messagesFor,
    }),
    [
      ready, route, tab, user, data, busy, error, signUp, signIn, signOut, go,
      saveUserProfile, createCompanion, placeOptions, choosePlace, sendMessage,
      sendSticker, typing, streamingText, llmError, retryLast, testLlm, updateLlm,
      setEmotion, addMemory, updateMemory, deleteMemory,
      becomePartner, endRelationship, wear, addNewOutfit, remove, propose,
      acceptProposal, rejectProposal, proposeNewSecondary, acceptSecondary,
      sendSecondaryMessage, removeSecondary, updateSettings, runDiagnosis,
      applyRecommendedMode, resetWorld, resetAll, messagesFor,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
