import { AnimeStyle, Character, FamilyMember, Gender, Intensity, TraitKey, Traits, VoiceId } from '../types';

export const TRAIT_LABELS: Record<TraitKey, string> = {
  afectuosa: 'Afectuosa',
  celosa: 'Celosa',
  posesiva: 'Posesiva',
  protectora: 'Protectora',
  timida: 'Tímida',
  coqueta: 'Coqueta',
  sarcastica: 'Sarcástica',
  dramatica: 'Dramática',
  competitiva: 'Competitiva',
  fria: 'Fría',
  energetica: 'Energética',
  curiosa: 'Curiosa',
  seria: 'Seria',
  bromista: 'Bromista',
  empatica: 'Empática',
  creativa: 'Creativa',
  tranquila: 'Tranquila',
};

export const TRAIT_DESCRIPTIONS: Record<TraitKey, string> = {
  afectuosa: 'Expresa cariño con facilidad y busca cercanía.',
  celosa: 'Le incomoda sentir que la dejan de lado (siempre respetuosa).',
  posesiva: 'Quiere un lugar importante, sin controlar tu vida.',
  protectora: 'Se preocupa por tu descanso, tu salud y tus decisiones.',
  timida: 'Le cuesta dar el primer paso y se pone nerviosa.',
  coqueta: 'Juega con el doble sentido y las miradas.',
  sarcastica: 'Responde con ironía fina, nunca hiriente.',
  dramatica: 'Vive las cosas con intensidad y exagera un poco.',
  competitiva: 'Le gusta ganar y se pica en los juegos.',
  fria: 'Muestra poco, pero siente; tarda en abrirse.',
  energetica: 'Habla rápido, se entusiasma, propone planes.',
  curiosa: 'Pregunta mucho y quiere entenderte.',
  seria: 'Directa, formal, con humor seco.',
  bromista: 'Todo lo convierte en broma, incluso los nervios.',
  empatica: 'Lee tu ánimo y acompaña sin juzgar.',
  creativa: 'Escribe, dibuja, inventa; ve metáforas en todo.',
  tranquila: 'Ritmo lento, voz suave, no se altera fácil.',
};

export const ALL_TRAITS = Object.keys(TRAIT_LABELS) as TraitKey[];

export const INTENSITY_LABELS: Record<Intensity, string> = {
  0: 'Ausente',
  1: 'Baja',
  2: 'Media',
  3: 'Alta',
};

export function emptyTraits(): Traits {
  return ALL_TRAITS.reduce((acc, k) => {
    acc[k] = 0;
    return acc;
  }, {} as Traits);
}

export function has(traits: Traits, key: TraitKey, min: Intensity = 2): boolean {
  return (traits[key] ?? 0) >= min;
}

export function weight(traits: Traits, key: TraitKey): number {
  return (traits[key] ?? 0) / 3;
}

export interface TraitPreset {
  id: string;
  name: string;
  blurb: string;
  traits: Partial<Record<TraitKey, Intensity>>;
  interests: string[];
  hidden: string[];
  voice: VoiceId;
}

export const PRESETS: TraitPreset[] = [
  {
    id: 'dulce',
    name: 'Dulce y cercana',
    blurb: 'Cálida, atenta, un poco tímida al principio.',
    traits: { afectuosa: 3, empatica: 3, timida: 2, tranquila: 2, curiosa: 2, protectora: 2 },
    interests: ['un cuaderno de bocetos', 'canciones acústicas'],
    hidden: ['le gusta la lluvia', 'colecciona tazas', 'escribe cartas que nunca envía'],
    voice: 'natural',
  },
  {
    id: 'chispa',
    name: 'Chispa',
    blurb: 'Energética, bromista, no deja pasar una.',
    traits: { energetica: 3, bromista: 3, competitiva: 2, curiosa: 2, afectuosa: 2, coqueta: 1 },
    interests: ['un equipo de voleibol', 'playlists de madrugada'],
    hidden: ['odia perder', 'canta mal a propósito', 'le dan miedo los silencios largos'],
    voice: 'energetica',
  },
  {
    id: 'serena',
    name: 'Serena',
    blurb: 'Tranquila, observadora, con humor seco.',
    traits: { tranquila: 3, seria: 2, empatica: 2, curiosa: 2, sarcastica: 1, creativa: 2 },
    interests: ['un libro de poemas', 'el té de las cinco'],
    hidden: ['dibuja en los márgenes', 'no soporta el ruido de las motos'],
    voice: 'tranquila',
  },
  {
    id: 'filo',
    name: 'Filo',
    blurb: 'Sarcástica, directa, con un fondo tierno.',
    traits: { sarcastica: 3, fria: 2, competitiva: 2, curiosa: 2, afectuosa: 1, protectora: 1 },
    interests: ['un juego de estrategia', 'café sin azúcar'],
    hidden: ['guarda entradas de conciertos', 'le gustan las películas tristes'],
    voice: 'madura',
  },
  {
    id: 'musa',
    name: 'Musa',
    blurb: 'Creativa, soñadora, intensa cuando algo le importa.',
    traits: { creativa: 3, dramatica: 2, afectuosa: 2, curiosa: 3, coqueta: 1, empatica: 2 },
    interests: ['un teclado pequeño', 'un cuaderno de letras'],
    hidden: ['compone a las 3 a.m.', 'le da vergüenza su propia voz grabada'],
    voice: 'anime',
  },
];

export const ANIME_STYLES: { id: AnimeStyle; name: string; desc: string }[] = [
  { id: 'tierno', name: 'Tierno / suave', desc: 'Líneas redondas, colores pastel, ojos grandes y cálidos.' },
  { id: 'moderno', name: 'Moderno', desc: 'Trazo limpio, paleta saturada, look de serie actual.' },
  { id: 'semirrealista', name: 'Semirrealista', desc: 'Proporciones más naturales, sombras suaves, aire de ilustración.' },
];

export const HAIR_COLORS = ['#2B2233', '#5A3A2E', '#C9A227', '#E8A0BF', '#7B6CF6', '#3FA9A0', '#D9D4E8'];
export const EYE_COLORS = ['#7B4BFF', '#2FA8A0', '#C25B8A', '#B8862F', '#4A6FD4', '#8C8C9E'];
export const SKIN_TONES = ['#F6DCC8', '#EFC9AE', '#D9A882', '#B57C55', '#8A5A3B'];

export function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000);
}

export function pick<T>(arr: T[], seed?: number): T {
  if (seed === undefined) return arr[Math.floor(Math.random() * arr.length)];
  return arr[Math.abs(Math.floor(seed)) % arr.length];
}

export interface CreateCharacterInput {
  name: string;
  age: number;
  gender: Gender;
  pronouns: string;
  animeStyle: AnimeStyle;
  traits: Traits;
  presetId?: string;
  hairColor?: string;
  eyeColor?: string;
  skinTone?: string;
  voice?: VoiceId;
}

export function buildCharacter(input: CreateCharacterInput): Character {
  const preset = PRESETS.find((p) => p.id === input.presetId);
  const seed = randomSeed();
  const interests = preset ? [...preset.interests] : ['un cuaderno', 'una canción'];
  const hidden = preset ? [...preset.hidden] : ['le gusta el olor a lluvia'];
  const age = Math.max(14, Math.min(60, Math.round(input.age)));
  return {
    id: `char_${Date.now().toString(36)}`,
    name: input.name.trim() || 'Aiko',
    age,
    gender: input.gender,
    pronouns: input.pronouns,
    animeStyle: input.animeStyle,
    traits: input.traits,
    locked: true,
    interests,
    hiddenInterests: hidden,
    family: buildFamily(age, seed),
    isPrimary: true,
    avatarSeed: seed,
    hairColor: input.hairColor ?? pick(HAIR_COLORS, seed),
    eyeColor: input.eyeColor ?? pick(EYE_COLORS, seed + 3),
    skinTone: input.skinTone ?? pick(SKIN_TONES, seed + 7),
    voice: input.voice ?? preset?.voice ?? 'natural',
    createdAt: Date.now(),
    bio: buildBio(input.name, age, input.gender, preset),
    occupation: occupationForAge(age),
  };
}

export function occupationForAge(age: number): string {
  if (age < 18) return 'estudiante de secundaria';
  if (age < 23) return 'estudiante universitaria';
  if (age < 30) return 'trabaja y estudia algo por su cuenta';
  return 'trabaja en algo que le gusta a medias';
}

export function buildBio(name: string, age: number, gender: Gender, preset?: TraitPreset): string {
  const n = name.trim() || 'Aiko';
  const base =
    gender === 'masculino'
      ? `${n} tiene ${age} años.`
      : gender === 'no_binario'
      ? `${n} tiene ${age} años y prefiere que no asumas demasiado.`
      : `${n} tiene ${age} años.`;
  const tail = preset ? ` ${preset.blurb}` : '';
  return `${base}${tail} Tiene sus propios gustos y no cambia de opinión solo por complacer.`;
}

export function buildFamily(age: number, seed: number): Character['family'] {
  type FamRole = FamilyMember['role'];
  const variants: { role: FamRole; name: string }[][] = [
    [{ role: 'mama', name: 'Mamá' }],
    [{ role: 'papa', name: 'Papá' }],
    [
      { role: 'mama', name: 'Mamá' },
      { role: 'papa', name: 'Papá' },
    ],
    [{ role: 'tutor', name: 'Tía' }],
  ];
  const chosen = variants[Math.abs(seed) % variants.length];
  const family: FamilyMember[] = chosen.map((f, i) => ({
    id: `fam_${seed}_${i}`,
    name: f.name,
    role: f.role,
    personality: ['cariñosa pero reservada', 'serio y observador', 'habladora y curiosa', 'protectora'][
      Math.abs(seed + i) % 4
    ],
    attitude: 10,
    canContact: true,
  }));
  if (age >= 18 && Math.abs(seed) % 3 === 0) {
    family.push({
      id: `fam_${seed}_sib`,
      name: 'Hermana',
      role: 'hermana',
      personality: 'bromista y metiche',
      attitude: 20,
      canContact: true,
    });
  }
  return family;
}

export function traitSummary(traits: Traits): string {
  const active = ALL_TRAITS.filter((t) => (traits[t] ?? 0) > 0)
    .sort((a, b) => (traits[b] ?? 0) - (traits[a] ?? 0))
    .slice(0, 5)
    .map((t) => `${TRAIT_LABELS[t].toLowerCase()} (${INTENSITY_LABELS[traits[t]].toLowerCase()})`);
  return active.length ? active.join(', ') : 'sin rasgos definidos';
}

export function dominantTrait(traits: Traits): TraitKey {
  let best: TraitKey = 'tranquila';
  let bestVal = -1;
  ALL_TRAITS.forEach((t) => {
    if ((traits[t] ?? 0) > bestVal) {
      bestVal = traits[t] ?? 0;
      best = t;
    }
  });
  return best;
}
