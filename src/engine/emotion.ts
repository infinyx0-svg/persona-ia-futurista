import { Character, EmotionKey, EmotionState, RelationshipState, Settings } from '../types';
import { has, weight } from './personality';

export const EMOTION_LABELS: Record<EmotionKey, string> = {
  feliz: 'Feliz',
  tranquila: 'Tranquila',
  curiosa: 'Curiosa',
  timida: 'Tímida',
  molesta: 'Molesta',
  triste: 'Triste',
  cansada: 'Cansada',
  emocionada: 'Emocionada',
  juguetona: 'Juguetona',
  distante: 'Distante',
};

export const EMOTION_FACE: Record<EmotionKey, { mouth: number; brow: number; eye: number; blush: number }> = {
  feliz: { mouth: 1, brow: 0.2, eye: 0.9, blush: 0.5 },
  tranquila: { mouth: 0.5, brow: 0, eye: 0.6, blush: 0.2 },
  curiosa: { mouth: 0.4, brow: 0.6, eye: 1, blush: 0.2 },
  timida: { mouth: 0.2, brow: 0.5, eye: 0.4, blush: 0.9 },
  molesta: { mouth: -0.7, brow: -0.9, eye: 0.5, blush: 0.1 },
  triste: { mouth: -0.8, brow: -0.4, eye: 0.3, blush: 0.1 },
  cansada: { mouth: -0.2, brow: -0.2, eye: 0.2, blush: 0.1 },
  emocionada: { mouth: 1, brow: 0.8, eye: 1, blush: 0.7 },
  juguetona: { mouth: 0.8, brow: 0.4, eye: 0.8, blush: 0.4 },
  distante: { mouth: 0, brow: 0, eye: 0.4, blush: 0 },
};

export interface TimeContext {
  hour: number;
  weekday: number;
  partOfDay: 'madrugada' | 'mañana' | 'tarde' | 'noche';
  weather: string;
}

export function timeContext(weather = 'nublado'): TimeContext {
  const now = new Date();
  const hour = now.getHours();
  const partOfDay =
    hour < 6 ? 'madrugada' : hour < 12 ? 'mañana' : hour < 19 ? 'tarde' : 'noche';
  return { hour, weekday: now.getDay(), partOfDay, weather };
}

export function routineFor(character: Character, ctx: TimeContext): string {
  const student = character.age < 23;
  if (ctx.partOfDay === 'madrugada') return 'debería estar durmiendo';
  if (ctx.partOfDay === 'mañana') return student ? 'va camino a clases' : 'está empezando el día';
  if (ctx.partOfDay === 'tarde') return student ? 'salió de clases hace poco' : 'está en medio de su jornada';
  return student ? 'está repasando apuntes' : 'ya terminó su día';
}

export function availability(character: Character, ctx: TimeContext): 'disponible' | 'ocupada' | 'cansada' {
  if (ctx.partOfDay === 'madrugada') return 'cansada';
  if (ctx.partOfDay === 'mañana' && ctx.weekday >= 1 && ctx.weekday <= 5) return 'ocupada';
  if (has(character.traits, 'tranquila', 2)) return 'disponible';
  return 'disponible';
}

export interface EmotionInput {
  intent: string;
  sentiment: number; // -1..1
  relationship: RelationshipState;
  character: Character;
  ctx: TimeContext;
  previous: EmotionState;
}

export function nextEmotion(input: EmotionInput): EmotionState {
  const { intent, sentiment, relationship, character, ctx, previous } = input;
  const now = Date.now();
  let key: EmotionKey = previous.key;
  let intensity = previous.intensity;
  let cause = previous.cause;

  const set = (k: EmotionKey, i: number, c: string) => {
    key = k;
    intensity = Math.max(0.15, Math.min(1, i));
    cause = c;
  };

  if (intent === 'crisis') set('triste', 0.85, 'Le preocupó lo que le contaste');
  else if (intent === 'insulto') set('molesta', 0.9, 'Le hablaste mal');
  else if (intent === 'disculpa') set(relationship.tension > 40 ? 'triste' : 'tranquila', 0.6, 'Está procesando tu disculpa');
  else if (intent === 'halago') set(has(character.traits, 'timida', 2) ? 'timida' : 'feliz', 0.8, 'Le dijiste algo bonito');
  else if (intent === 'romance') set(has(character.traits, 'coqueta', 2) ? 'juguetona' : 'timida', 0.75, 'Se puso nerviosa');
  else if (intent === 'plan' || intent === 'meta') set('emocionada', 0.7, 'Le contaste un plan');
  else if (intent === 'estudio' || intent === 'mate') set('curiosa', 0.65, 'Están resolviendo algo juntos');
  else if (intent === 'saludo') set(ctx.partOfDay === 'madrugada' ? 'cansada' : 'feliz', 0.55, 'Le escribiste');
  else if (intent === 'despedida') set('tranquila', 0.5, 'Se está despidiendo');
  else if (intent === 'tristeza_usuario') set('triste', 0.7, 'Te notó mal');
  else if (intent === 'broma') set('juguetona', 0.7, 'Le hiciste gracia');
  else if (intent === 'pregunta_personal') set('curiosa', 0.6, 'Le preguntaste por ella');
  else if (sentiment > 0.4) set('feliz', Math.min(0.9, intensity + 0.1), 'La conversación va bien');
  else if (sentiment < -0.4) set('molesta', Math.min(0.8, intensity + 0.15), 'Algo le molestó');
  else if (ctx.partOfDay === 'madrugada') set('cansada', 0.6, 'Es muy tarde');
  else if (relationship.tension > 55) set('distante', 0.6, 'Hay tensión entre ustedes');
  else if (intensity > 0.2) intensity = Math.max(0.2, intensity - 0.05);

  return { key, intensity, cause, updatedAt: now };
}

export function emotionTone(emotion: EmotionState, character: Character): {
  prefix: string;
  suffix: string;
  punctuation: 'none' | 'ellipsis' | 'exclaim';
  brevity: number;
} {
  const t = character.traits;
  switch (emotion.key) {
    case 'molesta':
      return { prefix: '', suffix: '', punctuation: 'none', brevity: 0.7 };
    case 'triste':
      return { prefix: '', suffix: '', punctuation: 'ellipsis', brevity: 0.8 };
    case 'timida':
      return { prefix: '', suffix: '', punctuation: 'ellipsis', brevity: 0.9 };
    case 'emocionada':
      return { prefix: '', suffix: '', punctuation: 'exclaim', brevity: 1.1 };
    case 'juguetona':
      return { prefix: '', suffix: '', punctuation: 'exclaim', brevity: 1 };
    case 'cansada':
      return { prefix: '', suffix: '', punctuation: 'ellipsis', brevity: 0.6 };
    case 'distante':
      return { prefix: '', suffix: '', punctuation: 'none', brevity: 0.5 };
    default:
      return { prefix: '', suffix: '', punctuation: 'none', brevity: weight(t, 'energetica') > 0.5 ? 1.1 : 1 };
  }
}

export function emotionColor(key: EmotionKey): string {
  switch (key) {
    case 'feliz':
    case 'emocionada':
      return '#FFD166';
    case 'molesta':
      return '#FB7185';
    case 'triste':
      return '#6C8CFF';
    case 'timida':
      return '#F0A6D0';
    case 'juguetona':
      return '#22D3EE';
    case 'cansada':
      return '#8C93A8';
    case 'distante':
      return '#8B84B8';
    default:
      return '#A9B8D8';
  }
}

export function emotionHint(emotion: EmotionState, settings: Settings): string {
  if (settings.control === 'estricto') return EMOTION_LABELS[emotion.key];
  return EMOTION_LABELS[emotion.key];
}
