import { Character, Outfit, WardrobeState } from '../types';
import { has } from './personality';

const BASE_OUTFITS: Omit<Outfit, 'id'>[] = [
  { name: 'Casa, cómoda', top: '#4C8DFF', bottom: '#1B2438', hair: 'suelto', accessory: 'ninguno', vibe: 'casa', owned: true, proposedBy: 'sistema' },
  { name: 'Estudio', top: '#E2E8F5', bottom: '#2A3550', hair: 'coleta', accessory: 'auriculares', vibe: 'estudio', owned: true, proposedBy: 'sistema' },
  { name: 'Salida casual', top: '#A855F7', bottom: '#0D1426', hair: 'suelto', accessory: 'collar', vibe: 'salida', owned: true, proposedBy: 'sistema' },
  { name: 'Deporte', top: '#22D3EE', bottom: '#131C33', hair: 'coleta alta', accessory: 'muñequeras', vibe: 'deporte', owned: true, proposedBy: 'sistema' },
  { name: 'Abrigo de invierno', top: '#4A6FD4', bottom: '#1B2438', hair: 'suelto', accessory: 'bufanda', vibe: 'frio', owned: true, proposedBy: 'sistema' },
];

export function initialWardrobe(): WardrobeState {
  const outfits: Outfit[] = BASE_OUTFITS.map((o, i) => ({ ...o, id: `out_${i}` }));
  return { outfits, currentOutfitId: outfits[0].id, pendingProposalId: null, lastChangeAt: Date.now() };
}

export function currentOutfit(w: WardrobeState): Outfit | null {
  return w.outfits.find((o) => o.id === w.currentOutfitId) ?? w.outfits[0] ?? null;
}

export function outfitForContext(character: Character, partOfDay: string, weather: string): Outfit | null {
  const w = initialWardrobe();
  if (weather === 'frio' || weather === 'lluvia') return w.outfits.find((o) => o.vibe === 'frio') ?? null;
  if (partOfDay === 'mañana') return w.outfits.find((o) => o.vibe === 'estudio') ?? null;
  if (partOfDay === 'noche') return w.outfits.find((o) => o.vibe === 'casa') ?? null;
  return w.outfits.find((o) => o.vibe === 'salida') ?? null;
}

export interface OutfitDecision {
  accepted: boolean;
  reply: string;
  outfit?: Outfit;
}

export function evaluateProposal(character: Character, outfit: Outfit, weather: string, partOfDay: string): OutfitDecision {
  const t = character.traits;
  const tooRevealing = outfit.vibe === 'salida' && character.age < 18;
  if (tooRevealing) {
    return { accepted: false, reply: 'Eso no. No me siento cómoda con algo así, y menos para salir.' };
  }
  if (weather === 'frio' && outfit.vibe === 'deporte') {
    return { accepted: false, reply: 'Hace frío. Me pondría algo encima, si no te molesta.' };
  }
  if (has(t, 'timida', 2) && outfit.vibe === 'salida') {
    return { accepted: true, reply: 'Me gusta… aunque me da un poco de vergüenza. Me lo pruebo.' };
  }
  if (has(t, 'fria', 2)) {
    return { accepted: true, reply: 'Está bien. Me lo pongo, pero no prometo que me quede.' };
  }
  if (has(t, 'coqueta', 2)) {
    return { accepted: true, reply: '¿Te gusta cómo me queda? Porque a mí sí.' };
  }
  return { accepted: true, reply: 'Me gusta. Me lo pongo ahora.' };
}

export function proposeOutfit(character: Character, weather: string, partOfDay: string): Outfit {
  const w = initialWardrobe();
  const base = outfitForContext(character, partOfDay, weather) ?? w.outfits[0];
  return { ...base, id: `prop_${Date.now().toString(36)}`, proposedBy: 'ella' };
}

export function addOutfit(w: WardrobeState, outfit: Omit<Outfit, 'id'>): WardrobeState {
  const item: Outfit = { ...outfit, id: `out_${Date.now().toString(36)}` };
  return { ...w, outfits: [...w.outfits, item] };
}

export function wearOutfit(w: WardrobeState, id: string): WardrobeState {
  return { ...w, currentOutfitId: id, lastChangeAt: Date.now(), pendingProposalId: null };
}

export function removeOutfit(w: WardrobeState, id: string): WardrobeState {
  const outfits = w.outfits.filter((o) => o.id !== id);
  return {
    ...w,
    outfits,
    currentOutfitId: w.currentOutfitId === id ? outfits[0]?.id ?? '' : w.currentOutfitId,
  };
}

export const VIBE_LABELS: Record<Outfit['vibe'], string> = {
  casual: 'Casual',
  estudio: 'Estudio',
  deporte: 'Deporte',
  salida: 'Salida',
  casa: 'Casa',
  frio: 'Frío',
};
