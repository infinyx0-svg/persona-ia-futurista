/**
 * Tipos compartidos de Persona IA.
 */

export type Emotion =
  | 'neutral'
  | 'feliz'
  | 'triste'
  | 'enfadado'
  | 'sorprendida'
  | 'pensativa'
  | 'timida'
  | 'carinosa'
  | 'aburrida'
  | 'emocionada';

export const EMOTIONS: Emotion[] = [
  'neutral',
  'feliz',
  'triste',
  'enfadado',
  'sorprendida',
  'pensativa',
  'timida',
  'carinosa',
  'aburrida',
  'emocionada',
];

export const EMOTION_LABEL: Record<Emotion, string> = {
  neutral: 'Neutral',
  feliz: 'Feliz',
  triste: 'Triste',
  enfadado: 'Enfadada',
  sorprendida: 'Sorprendida',
  pensativa: 'Pensativa',
  timida: 'Tímida',
  carinosa: 'Cariñosa',
  aburrida: 'Aburrida',
  emocionada: 'Emocionada',
};

export const EMOTION_EMOJI: Record<Emotion, string> = {
  neutral: '🙂',
  feliz: '😄',
  triste: '😢',
  enfadado: '😠',
  sorprendida: '😮',
  pensativa: '🤔',
  timida: '😳',
  carinosa: '🥰',
  aburrida: '😑',
  emocionada: '🤩',
};

/** Rasgos de personalidad, todos 0..1. */
export interface Traits {
  calidez: number; // frialdad <-> afecto
  energia: number; // calma <-> vivacidad
  humor: number; // seriedad <-> juego
  curiosidad: number; // indiferencia <-> interes
  franqueza: number; // tacto <-> sinceridad directa
  timidez: number; // seguridad <-> pudor
  romanticismo: number; // amistad <-> coqueteo
  sarcasmo: number; // literalidad <-> ironia
}

export const DEFAULT_TRAITS: Traits = {
  calidez: 0.62,
  energia: 0.55,
  humor: 0.5,
  curiosidad: 0.6,
  franqueza: 0.5,
  timidez: 0.35,
  romanticismo: 0.3,
  sarcasmo: 0.25,
};

export const TRAIT_LABEL: Record<keyof Traits, string> = {
  calidez: 'Calidez',
  energia: 'Energía',
  humor: 'Humor',
  curiosidad: 'Curiosidad',
  franqueza: 'Franqueza',
  timidez: 'Timidez',
  romanticismo: 'Romanticismo',
  sarcasmo: 'Sarcasmo',
};

export interface Message {
  id: string;
  role: 'user' | 'persona';
  text: string;
  ts: number;
  emotion?: Emotion;
  /** Accion fisica que acompaña al mensaje (modo persona). */
  action?: string;
}

export interface PersonaState {
  name: string;
  traits: Traits;
  /** Resumen acumulado de la relacion, en una frase. */
  bond: string;
  /** Nivel de confianza 0..1. */
  trust: number;
  /** Numero de mensajes intercambiados. */
  turns: number;
  /** Hechos que recuerda sobre el usuario. */
  facts: string[];
  /** Etapa de la relacion. */
  stage: 'desconocidos' | 'conociendose' | 'cercanos' | 'intimos';
}

export interface Settings {
  llmProvider: 'pollinations' | 'openai' | 'custom';
  llmApiKey: string;
  llmBaseUrl: string;
  llmModel: string;
  ttsProvider: 'elevenlabs' | 'openai' | 'device';
  ttsApiKey: string;
  ttsVoiceId: string;
  autoSpeak: boolean;
  userName: string;
}

export const DEFAULT_SETTINGS: Settings = {
  llmProvider: 'pollinations',
  llmApiKey: '',
  llmBaseUrl: '',
  llmModel: 'openai',
  ttsProvider: 'elevenlabs',
  ttsApiKey: '',
  ttsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  autoSpeak: true,
  userName: '',
};
