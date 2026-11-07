import { Character, ChatMessage, MemoryItem } from '../types';
import { buildCharacter, emptyTraits, pick, randomSeed } from './personality';
import { buildMessage } from './dialogue';

export interface SecondaryProposal {
  name: string;
  role: string;
  age: number;
  reason: string;
  personality: string;
}

const NAMES = ['Nico', 'Vale', 'Ren', 'Sofi', 'Dani', 'Kai', 'Luca', 'Mila', 'Tomi', 'Ari'];
const ROLES = ['compañero de clase', 'compañera de trabajo', 'amigo del barrio', 'primo', 'compañero de equipo'];
const REASONS = [
  'me pidió que te presentara a alguien de mi grupo de estudio',
  'dice que quiere conocerte porque hablo mucho de ti',
  'va a estar en el mismo lugar que nosotros el sábado',
];

export function proposeSecondary(primary: Character, existing: Character[]): SecondaryProposal {
  const seed = randomSeed();
  const used = new Set(existing.map((c) => c.name));
  let name = pick(NAMES, seed);
  let guard = 0;
  while (used.has(name) && guard < 10) {
    name = pick(NAMES, seed + guard + 1);
    guard++;
  }
  return {
    name,
    role: pick(ROLES, seed + 2),
    age: Math.max(14, primary.age + (Math.abs(seed) % 5) - 2),
    reason: pick(REASONS, seed + 4),
    personality: pick(['bromista y directo', 'tranquilo y observador', 'curioso y hablador', 'serio pero leal'], seed + 6),
  };
}

export function materializeSecondary(proposal: SecondaryProposal, primary: Character): Character {
  const traits = emptyTraits();
  traits.curiosa = 2;
  traits.bromista = proposal.personality.includes('bromista') ? 3 : 1;
  traits.tranquila = proposal.personality.includes('tranquilo') ? 3 : 1;
  traits.seria = proposal.personality.includes('serio') ? 2 : 0;
  traits.empatica = 2;
  const c = buildCharacter({
    name: proposal.name,
    age: proposal.age,
    gender: 'no_binario',
    pronouns: 'elle',
    animeStyle: primary.animeStyle,
    traits,
  });
  return {
    ...c,
    isPrimary: false,
    bio: `${proposal.name}, ${proposal.role}. ${proposal.personality}.`,
    occupation: proposal.role,
    interests: ['su grupo de amigos', 'salir a caminar'],
    hiddenInterests: ['no le gusta hablar de su familia'],
  };
}

const SECONDARY_LINES = [
  'Oye, {user}. {primary} me contó que {topic}. ¿Es cierto?',
  'Hola. No te escribo por nada raro, solo quería saludar.',
  '¿Vas a ir el sábado? {primary} dijo que quizá sí.',
  'Te escribo rápido: ¿tienes los apuntes de la clase?',
  'Me dijo {primary} que estabas medio bajón. ¿Todo bien?',
];

export function secondaryMessage(
  secondary: Character,
  primary: Character,
  userName: string,
  memories: MemoryItem[],
): ChatMessage {
  const topic = memories[0]?.text.toLowerCase() ?? 'estabas con un proyecto nuevo';
  const line = pick(SECONDARY_LINES, randomSeed())
    .replace('{user}', userName)
    .replace('{primary}', primary.name)
    .replace('{topic}', topic);
  return buildMessage(secondary.id, 'character', line, [], 'text');
}

export function secondaryReply(secondary: Character, text: string): ChatMessage {
  const t = text.toLowerCase();
  let reply: string;
  if (/\?/.test(text)) reply = pick(['Buena pregunta. Creo que sí, pero no estoy seguro.', 'Ni idea, la verdad. Pregúntale a ' + secondary.name + '… digo, a mí no.'], randomSeed());
  else if (/hola|hey|buenas/.test(t)) reply = pick(['¡Hola! ¿Qué tal?', 'Hey. Todo bien por aquí.'], randomSeed());
  else if (/gracias/.test(t)) reply = 'De nada, para eso estamos.';
  else reply = pick(['Ya veo.', 'Suena bien.', 'Cuéntame más cuando puedas.'], randomSeed());
  return buildMessage(secondary.id, 'character', reply, [], 'text');
}
