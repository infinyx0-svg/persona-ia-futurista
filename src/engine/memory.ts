import { MemoryItem } from '../types';

let counter = 0;
function newId(): string {
  counter += 1;
  return `mem_${Date.now().toString(36)}_${counter}`;
}

interface Rule {
  kind: MemoryItem['kind'];
  re: RegExp;
  build: (m: RegExpMatchArray) => string;
  sensitive?: boolean;
}

const RULES: Rule[] = [
  { kind: 'meta', re: /\b(mi meta es|quiero lograr|mi objetivo es|voy a intentar)\s+([^.!?\n]{3,90})/i, build: (m) => `Meta: ${m[2].trim()}` },
  { kind: 'proyecto', re: /\b(estoy (?:haciendo|creando|construyendo|programando)|mi proyecto (?:es|de))\s+([^.!?\n]{3,90})/i, build: (m) => `Proyecto: ${m[2].trim()}` },
  { kind: 'gusto', re: /\b(me (?:encanta|gusta|fascina|apasiona))\s+([^.!?\n]{2,70})/i, build: (m) => `Le gusta ${m[2].trim()}` },
  { kind: 'gusto', re: /\b(odio|no me gusta|detesto)\s+([^.!?\n]{2,70})/i, build: (m) => `No le gusta ${m[2].trim()}` },
  { kind: 'persona', re: /\b(mi (?:mamá|papá|hermano|hermana|amigo|amiga|novia|novio|pareja|profesor|profesora))\s+(?:se llama\s+)?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,20})/, build: (m) => `${m[1]} se llama ${m[2]}` },
  { kind: 'dato', re: /\b(tengo|estudio|trabajo en|vivo en)\s+([^.!?\n]{2,60})/i, build: (m) => `${m[1]} ${m[2].trim()}` },
  { kind: 'sensible', re: /\b(me da miedo|me da vergüenza|sufro de|tengo ansiedad|estoy deprimid[oa])\b([^.!?\n]{0,70})/i, build: (m) => `Algo sensible: ${m[1]}${m[2]}`.trim(), sensitive: true },
  { kind: 'momento', re: /\b(hoy (?:fue|ha sido)|ayer (?:fue|estuve))\s+([^.!?\n]{3,90})/i, build: (m) => `Momento: ${m[1]} ${m[2].trim()}` },
];

export function extractMemories(text: string, characterId: string): MemoryItem[] {
  const out: MemoryItem[] = [];
  const seen = new Set<string>();
  for (const rule of RULES) {
    const m = text.match(rule.re);
    if (!m) continue;
    const content = rule.build(m).replace(/\s+/g, ' ').trim();
    if (content.length < 6) continue;
    const key = content.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: newId(),
      kind: rule.kind,
      text: content,
      createdAt: Date.now(),
      sensitive: Boolean(rule.sensitive),
      source: 'auto',
      characterId,
    });
  }
  return out;
}

export function mergeMemories(existing: MemoryItem[], incoming: MemoryItem[]): MemoryItem[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-záéíóúñ0-9 ]/g, '').trim();
  const map = new Map(existing.map((m) => [norm(m.text), m]));
  for (const m of incoming) {
    const k = norm(m.text);
    if (!map.has(k)) map.set(k, m);
  }
  return Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 300);
}

export function recall(memories: MemoryItem[], query: string, limit = 3): MemoryItem[] {
  const words = query
    .toLowerCase()
    .replace(/[^a-záéíóúñ0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3);
  if (!words.length) return [];
  const scored = memories
    .filter((m) => !m.sensitive)
    .map((m) => {
      const t = m.text.toLowerCase();
      const score = words.reduce((acc, w) => acc + (t.includes(w) ? 1 : 0), 0);
      return { m, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.m);
}

export function memoryLine(m: MemoryItem): string {
  return m.text;
}

export function groupByKind(memories: MemoryItem[]): Record<string, MemoryItem[]> {
  return memories.reduce<Record<string, MemoryItem[]>>((acc, m) => {
    acc[m.kind] = acc[m.kind] ?? [];
    acc[m.kind].push(m);
    return acc;
  }, {});
}

export const KIND_LABELS: Record<MemoryItem['kind'], string> = {
  gusto: 'Gustos',
  meta: 'Metas',
  persona: 'Personas',
  proyecto: 'Proyectos',
  momento: 'Momentos',
  sensible: 'Sensible',
  dato: 'Datos',
};
