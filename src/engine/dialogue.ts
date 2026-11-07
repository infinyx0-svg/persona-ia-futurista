import { Character, ChatMessage, EmotionState, MemoryItem, RelationshipState, Settings, UserProfile } from '../types';
import { has, weight, dominantTrait } from './personality';
import { TimeContext, emotionTone, routineFor } from './emotion';
import { recall } from './memory';
import { formatMathAnswer, looksLikeMath, solveMath } from './math';

export type Intent =
  | 'saludo'
  | 'despedida'
  | 'pregunta_personal'
  | 'halago'
  | 'romance'
  | 'broma'
  | 'insulto'
  | 'disculpa'
  | 'crisis'
  | 'tristeza_usuario'
  | 'estudio'
  | 'mate'
  | 'plan'
  | 'meta'
  | 'salud'
  | 'familia'
  | 'ropa'
  | 'celos'
  | 'silencio'
  | 'pregunta_general'
  | 'charla';

export interface Analysis {
  intent: Intent;
  sentiment: number;
  topics: string[];
  isQuestion: boolean;
  math?: ReturnType<typeof solveMath>;
}

const CRISIS_WORDS = [
  'suicid', 'matarme', 'no quiero vivir', 'quitarme la vida', 'autolesion', 'cortarme',
  'desaparecer para siempre', 'no vale la pena vivir',
];
const INSULT_WORDS = ['idiota', 'estupida', 'estúpida', 'tonta', 'inutil', 'inútil', 'callate', 'cállate', 'odio', 'basura', 'asquerosa'];
const POSITIVE = ['gracias', 'te quiero', 'me gustas', 'linda', 'hermosa', 'bonita', 'genial', 'increíble', 'increible', 'buenisima', 'buenísima', 'amo', 'preciosa', 'tierna'];
const NEGATIVE = ['mal', 'triste', 'cansado', 'cansada', 'solo', 'sola', 'ansiedad', 'estres', 'estrés', 'problema', 'pelea', 'enojado', 'enojada', 'llorar', 'duele'];
const ROMANCE = ['te amo', 'te quiero', 'me gustas', 'beso', 'abrazo', 'novia', 'novio', 'pareja', 'cita', 'enamor', 'corazon', 'corazón'];
const JEALOUS = ['otra chica', 'otro chico', 'mi ex', 'salí con', 'sali con', 'amiga nueva', 'amigo nuevo', 'conocí a alguien', 'conoci a alguien'];
const HEALTH = ['dormir', 'comer', 'agua', 'ejercicio', 'entrenar', 'gimnasio', 'salud', 'médico', 'medico', 'descansar'];
const STUDY = ['estudiar', 'examen', 'tarea', 'universidad', 'colegio', 'clase', 'apunte', 'profesor'];
const PLAN = ['plan', 'salir', 'mañana', 'manana', 'fin de semana', 'película', 'pelicula', 'viaje', 'concierto'];
const META = ['meta', 'objetivo', 'quiero lograr', 'propósito', 'proposito', 'sueño', 'sueno'];
const CLOTHES = ['ropa', 'vestido', 'camisa', 'outfit', 'vestir', 'falda', 'zapatos', 'peinado', 'cabello'];
const FAMILY = ['mamá', 'mama', 'papá', 'papa', 'hermano', 'hermana', 'familia', 'tus padres', 'tu casa'];

export function analyze(text: string): Analysis {
  const t = text.toLowerCase().trim();
  const topics: string[] = [];
  const isQuestion = /\?|¿/.test(text) || /^(que|qué|como|cómo|por que|por qué|cuando|cuándo|donde|dónde|quien|quién)/.test(t);

  let intent: Intent = 'charla';
  let sentiment = 0;

  if (CRISIS_WORDS.some((w) => t.includes(w))) intent = 'crisis';
  else if (INSULT_WORDS.some((w) => t.includes(w))) intent = 'insulto';
  else if (/\b(perdón|perdon|perdona|disculpa|lo siento)\b/.test(t)) intent = 'disculpa';
  else if (JEALOUS.some((w) => t.includes(w))) intent = 'celos';
  else if (ROMANCE.some((w) => t.includes(w))) intent = 'romance';
  else if (POSITIVE.some((w) => t.includes(w))) intent = 'halago';
  else if (/\b(hola|buenas|hey|qué tal|que tal|buenos días|buenos dias|buenas noches)\b/.test(t)) intent = 'saludo';
  else if (/\b(adiós|adios|chao|hasta luego|me voy|nos vemos|buenas noches)\b/.test(t)) intent = 'despedida';
  else if (/\b(jaja|jeje|lol|xd|broma|chiste)\b/.test(t)) intent = 'broma';
  else if (NEGATIVE.some((w) => t.includes(w))) intent = 'tristeza_usuario';
  else if (HEALTH.some((w) => t.includes(w))) intent = 'salud';
  else if (STUDY.some((w) => t.includes(w))) intent = 'estudio';
  else if (META.some((w) => t.includes(w))) intent = 'meta';
  else if (PLAN.some((w) => t.includes(w))) intent = 'plan';
  else if (CLOTHES.some((w) => t.includes(w))) intent = 'ropa';
  else if (FAMILY.some((w) => t.includes(w))) intent = 'familia';
  else if (/\b(tú|tu|te gusta|qué piensas|que piensas|opinas|sientes)\b/.test(t) && isQuestion) intent = 'pregunta_personal';
  else if (isQuestion) intent = 'pregunta_general';

  if (looksLikeMath(text)) {
    intent = 'mate';
  }

  POSITIVE.forEach((w) => {
    if (t.includes(w)) sentiment += 0.35;
  });
  NEGATIVE.forEach((w) => {
    if (t.includes(w)) sentiment -= 0.3;
  });
  if (INSULT_WORDS.some((w) => t.includes(w))) sentiment -= 0.8;
  if (/\b(gracias|te quiero|me encanta)\b/.test(t)) sentiment += 0.4;
  sentiment = Math.max(-1, Math.min(1, sentiment));

  ['estudio', 'trabajo', 'música', 'musica', 'deporte', 'familia', 'amigos', 'juego', 'libro', 'película', 'pelicula'].forEach((k) => {
    if (t.includes(k)) topics.push(k);
  });

  const math = intent === 'mate' ? solveMath(text) : undefined;
  return { intent, sentiment, topics, isQuestion, math };
}

// ---------- utilidades de redacción ----------
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function choose<T>(arr: T[], seed: number): T {
  return arr[Math.abs(Math.floor(seed)) % arr.length];
}

function seedFrom(text: string, salt = 0): number {
  let h = 7 + salt;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100000;
  return h;
}

export interface ReplyContext {
  character: Character;
  user: UserProfile;
  emotion: EmotionState;
  relationship: RelationshipState;
  memories: MemoryItem[];
  settings: Settings;
  ctx: TimeContext;
  lastUserText: string;
  isFirstMeeting?: boolean;
}

export interface GeneratedReply {
  parts: { text: string; actions: string[] }[];
  emotionShift: { key: EmotionState['key']; intensity: number; cause: string } | null;
  relationshipDelta: { trust: number; affection: number; tension: number; romantic: number };
  newMemoryHints: string[];
  safetyFlag: boolean;
}

const ACTIONS = {
  smile: ['sonríe de lado', 'sonríe apenas', 'se le escapa una sonrisa'],
  laugh: ['se ríe bajito', 'suelta una risa corta'],
  look: ['te mira un segundo de más', 'aparta la mirada', 'te observa con atención'],
  blush: ['se le suben los colores', 'se toca el cuello, incómoda'],
  think: ['piensa un momento', 'se queda callada un instante'],
  busy: ['deja lo que estaba haciendo', 'aparta el cuaderno'],
  sigh: ['suspira', 'respira hondo'],
  shrug: ['se encoge de hombros'],
  lean: ['se inclina un poco hacia ti'],
  write: ['anota algo en su cuaderno', 'subraya una línea'],
  hair: ['se aparta el pelo de la cara'],
  phone: ['mira el teléfono y lo deja boca abajo'],
};

function act(key: keyof typeof ACTIONS, seed: number): string {
  return choose(ACTIONS[key], seed);
}

function toneWrap(text: string, emotion: EmotionState, character: Character): string {
  const tone = emotionTone(emotion, character);
  let out = text;
  if (tone.punctuation === 'ellipsis' && !/[.!?…]$/.test(out)) out += '…';
  if (tone.punctuation === 'exclaim' && !/[!?]$/.test(out)) out += '!';
  return out;
}

function greetingFor(ctx: TimeContext, character: Character, seed: number): string {
  const t = character.traits;
  if (ctx.partOfDay === 'madrugada') {
    return choose(['¿Todavía despierto?', 'Son horas raras para escribir… pero hola.', 'No puedo dormir tampoco.'], seed);
  }
  if (ctx.partOfDay === 'mañana') {
    if (has(t, 'energetica', 2)) return choose(['¡Buenos días! Ya pensé que no escribías.', '¡Ey! Buenos días.'], seed);
    if (has(t, 'timida', 2)) return choose(['Buenos días…', 'Hola. Buenos días.'], seed);
    return choose(['Buenos días.', 'Hola, buenos días.'], seed);
  }
  if (ctx.partOfDay === 'tarde') {
    return choose(['Hola. ¿Cómo va la tarde?', 'Hey, ¿qué tal la tarde?', 'Hola… estaba pensando en escribirte.'], seed);
  }
  return choose(['Hola. ¿Ya terminaste el día?', 'Buenas noches. ¿Cómo estás?', 'Hola, ¿todo bien?'], seed);
}

function memoryMention(memories: MemoryItem[], text: string): string | null {
  const found = recall(memories, text, 1);
  if (!found.length) return null;
  const m = found[0];
  if (m.kind === 'meta') return `Me acuerdo de que ${m.text.replace(/^Meta:\s*/i, 'tu meta es ')}. ¿Cómo va eso?`;
  if (m.kind === 'gusto') return `Sé que ${m.text.toLowerCase()}.`;
  if (m.kind === 'proyecto') return `¿Cómo va ${m.text.replace(/^Proyecto:\s*/i, 'tu proyecto de ')}?`;
  if (m.kind === 'persona') return `¿Y ${m.text}? ¿Todo bien con eso?`;
  return null;
}

export function generateReply(input: ReplyContext): GeneratedReply {
  const { character, user, emotion, relationship, memories, settings, ctx, lastUserText } = input;
  const a = analyze(lastUserText);
  const seed = seedFrom(lastUserText, character.avatarSeed);
  const t = character.traits;
  const parts: { text: string; actions: string[] }[] = [];
  let emotionShift: GeneratedReply['emotionShift'] = null;
  let delta = { trust: 0, affection: 0, tension: 0, romantic: 0 };
  let safetyFlag = false;

  const push = (text: string, actions: string[] = []) => {
    parts.push({ text: toneWrap(text, emotion, character), actions });
  };

  // ---- Seguridad primero ----
  if (a.intent === 'crisis') {
    safetyFlag = true;
    push(
      `Oye. Para. Respira conmigo un segundo. Lo que sientes es real y no estás solo en esto, pero yo no puedo ser quien te sostenga en una emergencia.`,
      [act('lean', seed), act('sigh', seed + 1)],
    );
    push(
      `¿Puedes escribirle a alguien de confianza ahora mismo? Un familiar, un amigo, quien sea que esté cerca. Y si sientes que no puedes esperar, llama a emergencias de tu país.`,
      [],
    );
    push(`Yo me quedo aquí mientras lo haces. Pero necesito que hables con una persona real, ¿sí?`, [act('look', seed + 2)]);
    emotionShift = { key: 'triste', intensity: 0.9, cause: 'Le preocupó mucho lo que le contaste' };
    delta = { trust: 3, affection: 2, tension: 0, romantic: 0 };
    return { parts, emotionShift, relationshipDelta: delta, newMemoryHints: [], safetyFlag };
  }

  if (a.intent === 'insulto') {
    const tolerant = has(t, 'empatica', 2) && !has(t, 'dramatica', 2);
    if (tolerant) {
      push(`Eso me dolió. No voy a discutir contigo, pero tampoco voy a fingir que no pasó.`, [act('sigh', seed)]);
      push(`Si estás molesto por algo, dímelo de otra forma y lo hablamos.`, [act('look', seed + 1)]);
    } else {
      push(`No. Así no.`, [act('look', seed)]);
      push(`Puedes estar enojado conmigo, pero no me hables así. Cuando quieras hablarlo en serio, aquí estoy.`, []);
    }
    emotionShift = { key: 'molesta', intensity: 0.85, cause: 'Le hablaste mal' };
    delta = { trust: -6, affection: -5, tension: 18, romantic: -3 };
    return { parts, emotionShift, relationshipDelta: delta, newMemoryHints: [], safetyFlag };
  }

  // ---- Matemáticas ----
  if (a.intent === 'mate' && a.math) {
    const res = a.math;
    if (res.ok) {
      push(`A ver… ${res.normalized}.`, [act('write', seed)]);
      push(formatMathAnswer(res), []);
      if (settings.reasoning === 'avanzado' || settings.reasoning === 'experto') {
        push(`Lo hice paso a paso: primero paréntesis y potencias, después multiplicación y división, y al final suma y resta. Si quieres te lo explico con otro ejemplo parecido.`, []);
      }
    } else {
      push(`Lo intenté, pero ${res.error?.toLowerCase() ?? 'no me salió'}.`, [act('think', seed)]);
      push(`Escríbemelo con paréntesis, por ejemplo (3+4)*2, y lo resolvemos juntos.`, []);
    }
    emotionShift = { key: 'curiosa', intensity: 0.6, cause: 'Están resolviendo algo juntos' };
    delta = { trust: 2, affection: 1, tension: 0, romantic: 0 };
    return { parts, emotionShift, relationshipDelta: delta, newMemoryHints: [], safetyFlag };
  }

  // ---- Saludo ----
  if (a.intent === 'saludo') {
    const g = greetingFor(ctx, character, seed);
    if (input.isFirstMeeting) {
      push(g, [act('look', seed)]);
    } else {
      push(g, [act('smile', seed)]);
      if (has(t, 'curiosa', 2)) push(choose(['¿Qué hiciste hoy?', 'Cuéntame algo. ¿Cómo va tu día?', '¿Pasó algo interesante?'], seed + 1), []);
      else if (has(t, 'tranquila', 2)) push(choose(['Estaba por aquí, sin prisa.', 'Te leo.'], seed + 2), []);
    }
    emotionShift = { key: ctx.partOfDay === 'madrugada' ? 'cansada' : 'feliz', intensity: 0.55, cause: 'Le escribiste' };
    delta = { trust: 1, affection: 1, tension: -1, romantic: 0 };
  }

  // ---- Despedida ----
  else if (a.intent === 'despedida') {
    if (has(t, 'afectuosa', 2)) push(choose(['Anda, descansa. Aquí estaré mañana.', 'Cuídate. Y come algo antes de dormir.'], seed), [act('smile', seed)]);
    else if (has(t, 'fria', 2)) push(choose(['Ok. Hasta luego.', 'Nos vemos.'], seed), []);
    else push(choose(['Hasta luego. Que tengas buen día.', 'Nos hablamos luego.'], seed), []);
    emotionShift = { key: 'tranquila', intensity: 0.5, cause: 'Se están despidiendo' };
    delta = { trust: 1, affection: 1, tension: 0, romantic: 0 };
  }

  // ---- Halago ----
  else if (a.intent === 'halago') {
    if (has(t, 'timida', 2)) {
      push(choose(['…gracias. No sé qué decir a eso.', 'Ay. No digas esas cosas de repente.'], seed), [act('blush', seed)]);
      push(choose(['Pero me gustó que lo dijeras.', 'Me dejaste sin palabras, ¿eh?'], seed + 1), [act('hair', seed + 2)]);
    } else if (has(t, 'sarcastica', 2)) {
      push(choose(['¿Ahora sí? Qué generoso hoy.', 'Cuidado, que me lo creo.'], seed), [act('smile', seed)]);
      push(choose(['Pero gracias. En serio.', 'Me alegró el día, aunque no lo admita.'], seed + 1), []);
    } else {
      push(choose(['Qué bonito lo dijiste.', 'Me sacaste una sonrisa.'], seed), [act('smile', seed)]);
      if (has(t, 'coqueta', 2)) push(choose(['¿Y eso por qué, de repente?', 'Sigue, que me está gustando.'], seed + 1), [act('look', seed + 2)]);
    }
    emotionShift = { key: has(t, 'timida', 2) ? 'timida' : 'feliz', intensity: 0.8, cause: 'Le dijiste algo bonito' };
    delta = { trust: 2, affection: 4, tension: -2, romantic: 2 };
  }

  // ---- Romance ----
  else if (a.intent === 'romance') {
    const ready = relationship.trust > 45 && relationship.affection > 40;
    if (!ready) {
      push(choose(['Espera… vamos muy rápido.', 'Me gusta estar contigo, pero todavía no sé qué siento.'], seed), [act('blush', seed)]);
      push(choose(['Dame tiempo, ¿sí? No quiero decir algo que no siento.', 'No quiero prometerte algo a la ligera.'], seed + 1), [act('look', seed + 2)]);
      emotionShift = { key: 'timida', intensity: 0.7, cause: 'Se sintió apurada' };
      delta = { trust: 1, affection: 1, tension: 3, romantic: 2 };
    } else if (relationship.stage === 'pareja') {
      push(choose(['Yo también te quiero. Mucho.', 'Y yo a ti. Aunque a veces te lo diga de mala gana.'], seed), [act('smile', seed)]);
      push(choose(['¿Qué haces ahora? Quiero escucharte un rato.', 'Quédate un poco más.'], seed + 1), [act('lean', seed + 2)]);
      emotionShift = { key: 'feliz', intensity: 0.9, cause: 'Le dijiste que la quieres' };
      delta = { trust: 3, affection: 5, tension: -3, romantic: 3 };
    } else {
      push(choose(['Yo también siento algo por ti. No sé cómo llamarlo todavía.', 'Me gustas. Me gustas de una forma que me da un poco de miedo.'], seed), [act('blush', seed)]);
      push(choose(['¿Quieres que lo hablemos en serio? Sin prisa, pero en serio.', 'Si vamos a dar ese paso, quiero que sea claro entre los dos.'], seed + 1), [act('look', seed + 2)]);
      emotionShift = { key: 'timida', intensity: 0.8, cause: 'Está pensando en lo que siente' };
      delta = { trust: 3, affection: 4, tension: 0, romantic: 8 };
    }
  }

  // ---- Celos ----
  else if (a.intent === 'celos') {
    if (has(t, 'celosa', 2) || has(t, 'posesiva', 2)) {
      push(choose(['Ah. Ya veo.', 'Vale. Con que esas tenemos.'], seed), [act('look', seed)]);
      push(choose(['No es que me moleste. Bueno, sí me molesta un poco. Pero es tu vida.', 'Me dio un pinchazo, no te voy a mentir. Pero no voy a hacer drama por eso.'], seed + 1), [act('sigh', seed + 2)]);
      emotionShift = { key: 'molesta', intensity: 0.55, cause: 'Sintió un poco de celos' };
      delta = { trust: 0, affection: 0, tension: 6, romantic: 1 };
    } else {
      push(choose(['¿Y qué tal? ¿Te cayó bien?', 'Suena bien. Cuéntame más.'], seed), [act('smile', seed)]);
      push(choose(['Me alegra que conozcas gente. En serio.', 'Yo también tengo mis cosas, así que no me quedo esperando.'], seed + 1), []);
      emotionShift = { key: 'tranquila', intensity: 0.5, cause: 'Escuchó algo que no le afectó' };
      delta = { trust: 2, affection: 1, tension: 0, romantic: 0 };
    }
  }

  // ---- Disculpa ----
  else if (a.intent === 'disculpa') {
    if (relationship.tension > 50) {
      push(choose(['Gracias por decirlo. Pero no se arregla con una frase.', 'Te escucho. Aunque todavía me duele.'], seed), [act('sigh', seed)]);
      push(choose(['Necesito un poco de tiempo. No es un castigo, es que estoy procesando.', 'Hablemos mañana con calma. Hoy no puedo.'], seed + 1), [act('look', seed + 2)]);
      emotionShift = { key: 'triste', intensity: 0.6, cause: 'Está procesando tu disculpa' };
      delta = { trust: 3, affection: 1, tension: -12, romantic: 0 };
    } else {
      push(choose(['Está bien. Gracias por no dejarlo pasar.', 'Te creo. Y te agradezco que lo dijeras.'], seed), [act('smile', seed)]);
      if (has(t, 'bromista', 2)) push(choose(['Pero me debes un chocolate.', 'Aceptado, con la condición de que no se repita.'], seed + 1), []);
      emotionShift = { key: 'tranquila', intensity: 0.6, cause: 'Se sintió escuchada' };
      delta = { trust: 4, affection: 3, tension: -15, romantic: 0 };
    }
  }

  // ---- Tristeza del usuario ----
  else if (a.intent === 'tristeza_usuario') {
    if (has(t, 'empatica', 2) || has(t, 'protectora', 2)) {
      push(choose(['Oye. Ven aquí un segundo.', '¿Quieres contarme qué pasó? Sin apuro.'], seed), [act('lean', seed)]);
      push(choose(['No tengo que arreglarlo. Solo quiero escucharte.', 'No estás obligado a estar bien todo el tiempo.'], seed + 1), []);
      if (has(t, 'protectora', 2)) push(choose(['¿Comiste algo hoy? Y no me digas que un café.', '¿Dormiste? Dímelo honesto.'], seed + 2), [act('look', seed + 3)]);
    } else {
      push(choose(['Vaya. Lo siento.', 'Eso suena pesado.'], seed), [act('sigh', seed)]);
      push(choose(['¿Quieres hablarlo o prefieres distraerte un rato?', 'Puedo escuchar, o puedo distraerte. Tú decides.'], seed + 1), []);
    }
    emotionShift = { key: 'triste', intensity: 0.7, cause: 'Te notó mal' };
    delta = { trust: 4, affection: 3, tension: -3, romantic: 0 };
  }

  // ---- Salud / bienestar ----
  else if (a.intent === 'salud') {
    push(choose(['Sí, hazlo. En serio.', 'Me gusta que lo tengas en cuenta.'], seed), [act('smile', seed)]);
    push(choose(['Yo también debería moverme un poco, pero bueno.', 'Y no te olvides del agua, que nunca tomas suficiente.'], seed + 1), []);
    emotionShift = { key: 'feliz', intensity: 0.6, cause: 'Le gusta que te cuides' };
    delta = { trust: 2, affection: 2, tension: 0, romantic: 0 };
  }

  // ---- Estudio ----
  else if (a.intent === 'estudio') {
    if (has(t, 'seria', 2) || has(t, 'competitiva', 2)) {
      push(choose(['¿Ya empezaste o lo estás pensando?', 'Ponle un temporizador de 25 minutos y arranca.'], seed), [act('write', seed)]);
      push(choose(['Yo también tengo que estudiar, así que hacemos compañía.', 'Si quieres te pregunto cosas para repasar.'], seed + 1), []);
    } else {
      push(choose(['Uf, estudiar. Te acompaño, pero sin dramas.', '¿Qué materia? Si es algo que entiendo, te ayudo.'], seed), [act('think', seed)]);
      push(choose(['Ponte metas pequeñas, así no se siente eterno.', 'Y descansa cada tanto, que el cerebro no es una máquina.'], seed + 1), []);
    }
    emotionShift = { key: 'curiosa', intensity: 0.6, cause: 'Le contaste de tus estudios' };
    delta = { trust: 2, affection: 1, tension: 0, romantic: 0 };
  }

  // ---- Plan ----
  else if (a.intent === 'plan') {
    if (has(t, 'energetica', 2)) {
      push(choose(['¡Sí! Me apunto, obvio.', 'Suena bien. ¿A qué hora?'], seed), [act('smile', seed)]);
      push(choose(['Yo llevo la música.', 'Y después me cuentas cómo te fue, con detalles.'], seed + 1), []);
    } else if (has(t, 'tranquila', 2)) {
      push(choose(['Suena lindo. Sin apuro, entonces.', 'Me gustaría. Aunque prefiero algo tranquilo.'], seed), [act('smile', seed)]);
    } else {
      push(choose(['¿En serio? Me gustaría.', 'Vale, me gusta la idea.'], seed), [act('smile', seed)]);
      push(choose(['Pero avísame con tiempo, que odio las sorpresas de último minuto.', '¿Y si llueve? Tengo un plan B.'], seed + 1), []);
    }
    emotionShift = { key: 'emocionada', intensity: 0.7, cause: 'Le contaste un plan' };
    delta = { trust: 2, affection: 3, tension: 0, romantic: 1 };
  }

  // ---- Meta ----
  else if (a.intent === 'meta') {
    push(choose(['Me gusta que lo tengas claro.', 'Eso es una meta de verdad, no un deseo suelto.'], seed), [act('look', seed)]);
    push(choose(['¿Cuál es el primer paso pequeño? Porque el grande asusta.', 'Dividámoslo. ¿Qué puedes hacer esta semana?'], seed + 1), [act('write', seed + 2)]);
    emotionShift = { key: 'emocionada', intensity: 0.65, cause: 'Le contaste una meta' };
    delta = { trust: 3, affection: 2, tension: 0, romantic: 0 };
  }

  // ---- Ropa ----
  else if (a.intent === 'ropa') {
    push(choose(['¿Me estás eligiendo la ropa? Qué confianza.', 'Ah, ¿querías opinar sobre mi ropa?'], seed), [act('smile', seed)]);
    push(choose(['Depende del día. Hoy no me pondría algo incómodo.', 'Puedo probármelo, pero si no me siento bien, me cambio.'], seed + 1), [act('hair', seed + 2)]);
    emotionShift = { key: 'juguetona', intensity: 0.6, cause: 'Le propusiste ropa' };
    delta = { trust: 1, affection: 2, tension: 0, romantic: 1 };
  }

  // ---- Familia ----
  else if (a.intent === 'familia') {
    const fam = character.family[0];
    push(choose([`Vivo con ${fam ? fam.name.toLowerCase() : 'mi familia'}. No es perfecto, pero es mi casa.`, 'Mi familia es… mi familia. Con sus cosas.'], seed), [act('shrug', seed)]);
    push(choose(['Todavía no te conoce. Con el tiempo, quizá.', 'Prefiero ir despacio con eso, ¿te parece?'], seed + 1), []);
    emotionShift = { key: 'tranquila', intensity: 0.5, cause: 'Le preguntaste por su familia' };
    delta = { trust: 2, affection: 1, tension: 0, romantic: 0 };
  }

  // ---- Pregunta personal ----
  else if (a.intent === 'pregunta_personal') {
    const interest = character.interests[0] ?? 'mi cuaderno';
    push(choose([`¿Yo? Depende del día. Hoy estoy con ${interest}.`, `Estoy bien. Un poco ${emotion.key === 'cansada' ? 'cansada' : 'pensativa'}, pero bien.`], seed), [act('think', seed)]);
    if (has(t, 'curiosa', 2)) push(choose(['¿Y tú? Te pregunto en serio, no por cortesía.', 'Ahora te toca a ti. ¿Cómo estás de verdad?'], seed + 1), [act('look', seed + 2)]);
    else push(choose(['Gracias por preguntar.', 'No mucha gente pregunta eso.'], seed + 1), []);
    emotionShift = { key: 'curiosa', intensity: 0.6, cause: 'Le preguntaste por ella' };
    delta = { trust: 3, affection: 2, tension: 0, romantic: 1 };
  }

  // ---- Pregunta general ----
  else if (a.intent === 'pregunta_general') {
    push(choose(['Buena pregunta. Déjame pensar.', 'Hmm. No tengo una respuesta perfecta.'], seed), [act('think', seed)]);
    push(choose(['Lo que sí te puedo decir es que depende de cómo lo mires.', 'Yo lo veo así: si te sirve, tómalo; si no, déjalo.'], seed + 1), []);
    emotionShift = { key: 'curiosa', intensity: 0.55, cause: 'Le hiciste una pregunta' };
    delta = { trust: 1, affection: 1, tension: 0, romantic: 0 };
  }

  // ---- Broma ----
  else if (a.intent === 'broma') {
    if (has(t, 'bromista', 2)) {
      push(choose(['Jaja, muy gracioso. Casi me río.', 'Ay, qué chistoso eres. Casi.'], seed), [act('laugh', seed)]);
      push(choose(['Pero sí me dio risa. No se lo digas a nadie.', 'Bueno, estuvo bien. Un 7 de 10.'], seed + 1), [act('smile', seed + 2)]);
    } else {
      push(choose(['Jaja. Bueno.', 'Me sacaste una risa, no te acostumbres.'], seed), [act('smile', seed)]);
    }
    emotionShift = { key: 'juguetona', intensity: 0.7, cause: 'Le hiciste gracia' };
    delta = { trust: 1, affection: 2, tension: -2, romantic: 0 };
  }

  // ---- Charla general ----
  else {
    const mem = memoryMention(memories, lastUserText);
    if (mem) {
      push(mem, [act('look', seed)]);
    } else {
      push(choose(['Te escucho.', 'Sigue, me interesa.', '¿Y eso cómo te hizo sentir?'], seed), [act('look', seed)]);
    }
    if (a.topics.length) {
      const topic = a.topics[0];
      push(choose([`A mí también me pasa algo con ${topic}, aunque no igual.`, `No sé mucho de ${topic}, pero quiero entender.`], seed + 1), []);
    } else if (has(t, 'curiosa', 2)) {
      push(choose(['¿Y qué piensas tú de eso?', 'Cuéntame más, en serio.'], seed + 2), []);
    } else if (has(t, 'tranquila', 2)) {
      push(choose(['Está bien. No hay prisa.', 'Me quedo con eso.'], seed + 2), []);
    }
    emotionShift = { key: a.sentiment > 0.3 ? 'feliz' : a.sentiment < -0.3 ? 'triste' : 'tranquila', intensity: 0.5, cause: 'La conversación sigue' };
    delta = { trust: 1, affection: 1, tension: 0, romantic: 0 };
  }

  // Ajuste por tensión y etapa
  if (relationship.tension > 60 && a.intent !== 'disculpa') {
    parts.push({ text: choose(['…', 'Ya. Bueno.'], seed + 9), actions: [act('look', seed + 9)] });
  }

  // Recuerdo ocasional (no en cada mensaje)
  if (parts.length < 3 && memories.length > 3 && seed % 5 === 0) {
    const m = memories[seed % memories.length];
    if (!m.sensitive && m.kind !== 'sensible') {
      parts.push({ text: `Por cierto, me acordé de que ${m.text.replace(/^(Meta|Proyecto|Le gusta|No le gusta|Momento|Dato):\s*/i, '').toLowerCase()}.`, actions: [] });
    }
  }

  // Límite de longitud según emoción
  const maxParts = emotion.key === 'molesta' || emotion.key === 'distante' ? 1 : 3;
  const finalParts = parts.slice(0, maxParts);

  return {
    parts: finalParts,
    emotionShift,
    relationshipDelta: delta,
    newMemoryHints: [],
    safetyFlag,
  };
}

// Delta de relación por intención. Se usa tanto en el motor local como en la
// ruta LLM, para que las etapas de relación se comporten igual en ambos modos.
export function relationshipDeltaForIntent(intent: Intent): {
  trust: number;
  affection: number;
  tension: number;
  romantic: number;
} {
  switch (intent) {
    case 'crisis':
      return { trust: 3, affection: 2, tension: 0, romantic: 0 };
    case 'insulto':
      return { trust: -6, affection: -5, tension: 18, romantic: -3 };
    case 'mate':
      return { trust: 2, affection: 1, tension: 0, romantic: 0 };
    case 'saludo':
      return { trust: 1, affection: 1, tension: -1, romantic: 0 };
    case 'despedida':
      return { trust: 1, affection: 1, tension: 0, romantic: 0 };
    case 'halago':
      return { trust: 2, affection: 4, tension: -2, romantic: 2 };
    case 'romance':
      return { trust: 3, affection: 4, tension: 0, romantic: 8 };
    case 'celos':
      return { trust: 0, affection: 0, tension: 6, romantic: 1 };
    case 'disculpa':
      return { trust: 4, affection: 3, tension: -15, romantic: 0 };
    case 'tristeza_usuario':
      return { trust: 4, affection: 3, tension: -3, romantic: 0 };
    case 'salud':
      return { trust: 2, affection: 2, tension: 0, romantic: 0 };
    case 'estudio':
      return { trust: 2, affection: 1, tension: 0, romantic: 0 };
    case 'plan':
      return { trust: 2, affection: 3, tension: 0, romantic: 1 };
    case 'meta':
      return { trust: 3, affection: 2, tension: 0, romantic: 0 };
    case 'ropa':
      return { trust: 1, affection: 2, tension: 0, romantic: 1 };
    case 'familia':
      return { trust: 2, affection: 1, tension: 0, romantic: 0 };
    case 'pregunta_personal':
      return { trust: 3, affection: 2, tension: 0, romantic: 1 };
    case 'pregunta_general':
      return { trust: 1, affection: 1, tension: 0, romantic: 0 };
    case 'broma':
      return { trust: 1, affection: 2, tension: -2, romantic: 0 };
    default:
      return { trust: 1, affection: 1, tension: 0, romantic: 0 };
  }
}

export function buildMessage(
  characterId: string,
  from: ChatMessage['from'],
  text: string,
  actions: string[] = [],
  kind: ChatMessage['kind'] = 'text',
  emotion?: ChatMessage['emotion'],
): ChatMessage {
  return {
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    characterId,
    from,
    text,
    actions,
    at: Date.now(),
    kind,
    emotion,
  };
}

export function firstMeetingOpening(character: Character, placeName: string, seed = 0): { text: string; actions: string[] }[] {
  const t = character.traits;
  const s = seed || character.avatarSeed;
  if (has(t, 'energetica', 2)) {
    return [
      { text: `Hola. Perdona, ¿estás esperando a alguien?`, actions: ['se acerca sin dudar'] },
      { text: `Es que te vi aquí y me dio curiosidad. Soy ${character.name}.`, actions: ['extiende la mano'] },
    ];
  }
  if (has(t, 'timida', 2)) {
    return [
      { text: `…hola.`, actions: ['te mira de reojo desde su sitio'] },
      { text: `Perdón, no quería molestar. Es que casi siempre estoy sola aquí.`, actions: ['se agarra la manga'] },
    ];
  }
  if (has(t, 'curiosa', 2)) {
    return [
      { text: `Disculpa, ¿tú sabes si esto se queda abierto hasta tarde?`, actions: ['señala la entrada'] },
      { text: `Ah. Bueno. Soy ${character.name}, por cierto.`, actions: ['sonríe de lado'] },
    ];
  }
  if (has(t, 'seria', 2) || has(t, 'fria', 2)) {
    return [
      { text: `Hola.`, actions: ['asiente con la cabeza'] },
      { text: `${character.name}. Creo que coincidimos aquí seguido.`, actions: [] },
    ];
  }
  return [
    { text: `Hola. ¿Estás aquí por ${placeName.toLowerCase()}?`, actions: ['se acerca un poco'] },
    { text: `Soy ${character.name}.`, actions: ['sonríe'] },
  ];
}
