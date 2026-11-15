import type { Emotion, Message, PersonaState, Traits } from '../types';

/**
 * Evolucion de la personalidad.
 *
 * Los rasgos se mueven poco a poco segun como habla el usuario: si escribe
 * mucho y con cariño, sube la calidez; si bromea, sube el humor; si es seco,
 * sube la timidez y baja la energia. Nunca da saltos bruscos.
 */

const clamp = (v: number) => Math.max(0.05, Math.min(0.95, v));

interface Signals {
  warmth: number; // -1..1
  energy: number;
  humor: number;
  curiosity: number;
  intimacy: number;
  length: number; // 0..1
  questions: number; // 0..1
}

const WARM_WORDS = [
  'gracias', 'te quiero', 'cariño', 'guapa', 'bonita', 'me gustas', 'preciosa',
  'abrazo', 'beso', 'amor', 'quiero', 'adoro', 'encantas', 'linda', 'hermosa',
  'buenas noches', 'buenos días', 'cuídate', 'te extraño', 'te echo de menos',
];

const COLD_WORDS = [
  'cállate', 'tonta', 'odio', 'estúpida', 'idiota', 'molesta', 'pesada',
  'no me hables', 'déjame', 'aburrida', 'inútil',
];

const HUMOR_MARKS = ['jaja', 'jeje', '😂', '🤣', '😅', 'lol', 'xd', 'jajaja'];

const SAD_WORDS = [
  'triste', 'solo', 'sola', 'cansado', 'cansada', 'mal', 'fatal', 'deprimido',
  'llorar', 'duele', 'ansiedad', 'miedo', 'preocupado',
];

function analyze(text: string): Signals {
  const t = text.toLowerCase();
  const words = t.split(/\s+/).filter(Boolean);
  const len = words.length;

  let warmth = 0;
  for (const w of WARM_WORDS) if (t.includes(w)) warmth += 0.35;
  for (const w of COLD_WORDS) if (t.includes(w)) warmth -= 0.5;
  for (const w of SAD_WORDS) if (t.includes(w)) warmth += 0.15; // pide consuelo

  let humor = 0;
  for (const m of HUMOR_MARKS) if (t.includes(m)) humor += 0.4;

  const questions = (t.match(/\?/g) || []).length > 0 ? 1 : 0;
  const exclam = (t.match(/!/g) || []).length;

  return {
    warmth: Math.max(-1, Math.min(1, warmth)),
    energy: Math.min(1, exclam * 0.3 + (len > 12 ? 0.3 : 0)),
    humor: Math.min(1, humor),
    curiosity: questions,
    intimacy: Math.min(1, warmth > 0 ? warmth : 0),
    length: Math.min(1, len / 30),
    questions,
  };
}

export function evolveTraits(
  traits: Traits,
  userText: string,
  turns: number
): Traits {
  const s = analyze(userText);
  // cuanto mas avanzada la relacion, mas se mueve la personalidad
  const rate = 0.035 + Math.min(0.05, turns * 0.0015);

  const next: Traits = { ...traits };

  next.calidez = clamp(next.calidez + s.warmth * rate * 1.4);
  next.energia = clamp(next.energia + (s.energy - 0.3) * rate);
  next.humor = clamp(next.humor + (s.humor - 0.2) * rate * 1.2);
  next.curiosidad = clamp(next.curiosidad + (s.questions ? rate : -rate * 0.3));
  next.romanticismo = clamp(next.romanticismo + s.intimacy * rate * 1.1);
  next.timidez = clamp(next.timidez - s.intimacy * rate * 0.9 + (s.length < 0.1 ? rate * 0.4 : 0));
  next.franqueza = clamp(next.franqueza + (s.warmth < -0.2 ? rate * 0.8 : 0));
  next.sarcasmo = clamp(next.sarcasmo + (s.humor > 0.4 ? rate * 0.6 : -rate * 0.2));

  return next;
}

export function evolveTrust(persona: PersonaState, userText: string): number {
  const s = analyze(userText);
  const delta = 0.012 + s.intimacy * 0.02 + s.length * 0.01 - (s.warmth < -0.3 ? 0.03 : 0);
  return Math.max(0, Math.min(1, persona.trust + delta));
}

export function stageFor(trust: number, turns: number): PersonaState['stage'] {
  if (turns < 4 || trust < 0.2) return 'desconocidos';
  if (trust < 0.45) return 'conociendose';
  if (trust < 0.72) return 'cercanos';
  return 'intimos';
}

/** Corta una captura en la primera conjunción o verbo que la alargue. */
function tidy(s: string): string {
  const cut = s
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+(?:y|e|pero|aunque|porque|que|cuando|mientras|también|además)\s+/i)[0];
  return cut.replace(/[.,;:!?]+$/, '').trim();
}

/** Extrae hechos memorables del mensaje del usuario. */
export function extractFacts(userText: string): string[] {
  const facts: string[] = [];
  const t = userText.trim();
  if (t.length < 8) return facts;

  const patterns: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/\bme llamo ([A-ZÁÉÍÓÚÑa-záéíóúñ ]{2,20})/i, (m) => `Se llama ${tidy(m[1])}`],
    [/\bmi nombre es ([A-ZÁÉÍÓÚÑa-záéíóúñ ]{2,20})/i, (m) => `Se llama ${tidy(m[1])}`],
    [/\btengo (\d{1,2}) años/i, (m) => `Tiene ${m[1]} años`],
    [/\btrabajo (?:en|de) ([^.,;!?]{3,40})/i, (m) => `Trabaja en ${tidy(m[1])}`],
    [/\bestudio ([^.,;!?]{3,40})/i, (m) => `Estudia ${tidy(m[1])}`],
    [/\bmi (?:perro|gato|mascota) se llama ([A-Za-zÁÉÍÓÚÑáéíóúñ]{2,20})/i, (m) => `Su mascota se llama ${m[1]}`],
    [/\bsoy de ([A-ZÁÉÍÓÚÑa-záéíóúñ ]{3,25})/i, (m) => `Es de ${tidy(m[1])}`],
    [/\bvivo en ([A-ZÁÉÍÓÚÑa-záéíóúñ ]{3,25})/i, (m) => `Vive en ${tidy(m[1])}`],
    [/\bme gusta(?:n)? ([^.,;!?]{3,50})/i, (m) => `Le gusta ${tidy(m[1])}`],
    [/\bmi cumpleaños es ([^.,;!?]{3,30})/i, (m) => `Su cumpleaños es ${tidy(m[1])}`],
  ];

  for (const [re, fn] of patterns) {
    const m = t.match(re);
    if (m) {
      const f = fn(m);
      // descartar capturas que quedaron demasiado cortas o vacias
      if (f.length > 8 && !/\b(?:de|en|y)$/.test(f)) facts.push(f);
    }
  }
  return facts;
}

export function mergeFacts(existing: string[], incoming: string[]): string[] {
  const out = [...existing];
  for (const f of incoming) {
    const dup = out.some(
      (e) => e.toLowerCase().slice(0, 18) === f.toLowerCase().slice(0, 18)
    );
    if (!dup) out.push(f);
  }
  return out.slice(-24);
}

/** Frase de vinculo que resume la relacion. */
export function bondFor(stage: PersonaState['stage'], traits: Traits): string {
  const warm = traits.calidez > 0.65;
  switch (stage) {
    case 'desconocidos':
      return 'Os estáis tanteando. Ella todavía no sabe qué esperar de ti.';
    case 'conociendose':
      return warm
        ? 'Le caes bien y empieza a relajarse contigo.'
        : 'Se está acostumbrando a ti, aunque mantiene la guardia.';
    case 'cercanos':
      return warm
        ? 'Te tiene cariño de verdad y te cuenta cosas que no cuenta a otros.'
        : 'Confía en ti y ya no necesita medir cada palabra.';
    case 'intimos':
      return 'Eres su persona. Habla contigo sin filtros y te busca cuando está mal.';
  }
}

/** Emocion coherente con la personalidad y el mensaje. */
export function pickEmotion(
  suggested: Emotion,
  traits: Traits,
  userText: string
): Emotion {
  const t = userText.toLowerCase();
  const sad = SAD_WORDS.some((w) => t.includes(w));

  // si el usuario esta mal, la calidez manda
  if (sad && traits.calidez > 0.55) return 'triste';
  if (sad && traits.calidez <= 0.55) return 'pensativa';

  // la timidez amortigua las emociones intensas
  if (traits.timidez > 0.7 && (suggested === 'emocionada' || suggested === 'feliz')) {
    return 'timida';
  }
  // el humor empuja hacia lo alegre
  if (traits.humor > 0.7 && suggested === 'neutral') return 'feliz';

  return suggested;
}
