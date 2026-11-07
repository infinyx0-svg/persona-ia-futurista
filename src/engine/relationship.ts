import { Character, RelationshipState, RelationshipStage } from '../types';

export const STAGE_LABELS: Record<RelationshipStage, string> = {
  desconocidos: 'Desconocidos',
  conocidos: 'Conocidos',
  amistad: 'Amistad',
  cercania: 'Cercanía',
  pareja: 'Pareja',
  distanciados: 'Distanciados',
  ruptura: 'Ruptura',
};

export const STAGE_ORDER: RelationshipStage[] = [
  'desconocidos',
  'conocidos',
  'amistad',
  'cercania',
  'pareja',
];

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

export function applyDelta(
  rel: RelationshipState,
  delta: { trust: number; affection: number; tension: number; romantic: number },
  note: string,
): RelationshipState {
  const trust = clamp(rel.trust + delta.trust);
  const affection = clamp(rel.affection + delta.affection);
  const tension = clamp(rel.tension + delta.tension);
  const romanticInterest = clamp(rel.romanticInterest + delta.romantic);

  // La etapa avanza por umbrales y NUNCA retrocede sola: una relación no
  // "desconoce" a alguien con quien ya habló. Solo la tensión alta o una
  // ruptura pueden hacerla bajar.
  let stage = rel.stage;
  if (stage !== 'ruptura') {
    if (tension > 75) {
      stage = 'distanciados';
    } else if (rel.partnerConfirmed) {
      stage = 'pareja';
    } else {
      const reached: RelationshipStage =
        trust > 70 && affection > 65 && romanticInterest > 55
          ? 'cercania'
          : trust > 45 && affection > 40
          ? 'amistad'
          : trust > 18
          ? 'conocidos'
          : 'desconocidos';
      const currentIdx = STAGE_ORDER.indexOf(stage);
      const reachedIdx = STAGE_ORDER.indexOf(reached);
      if (reachedIdx > currentIdx) stage = reached;
      else if (stage === 'distanciados' && tension < 35) stage = 'conocidos';
    }
  }

  const history = [...rel.history, { at: Date.now(), text: note, delta: delta.trust + delta.affection - delta.tension }].slice(-60);

  return { ...rel, trust, affection, tension, romanticInterest, stage, history };
}

export function canBecomePartner(rel: RelationshipState): boolean {
  return rel.trust >= 55 && rel.affection >= 50 && rel.romanticInterest >= 45 && rel.tension < 40;
}

export function confirmPartner(rel: RelationshipState): RelationshipState {
  return {
    ...rel,
    stage: 'pareja',
    partnerConfirmed: true,
    history: [...rel.history, { at: Date.now(), text: 'Acordaron ser pareja', delta: 10 }].slice(-60),
  };
}

export function breakUp(rel: RelationshipState, reason: string): RelationshipState {
  return {
    ...rel,
    stage: 'ruptura',
    partnerConfirmed: false,
    romanticInterest: Math.max(0, rel.romanticInterest - 40),
    affection: Math.max(0, rel.affection - 30),
    tension: Math.min(100, rel.tension + 20),
    history: [...rel.history, { at: Date.now(), text: `Ruptura: ${reason}`, delta: -40 }].slice(-60),
  };
}

export function repairAttempt(rel: RelationshipState, sincere: boolean): RelationshipState {
  if (!sincere) {
    return applyDelta(rel, { trust: -2, affection: -1, tension: 4, romantic: 0 }, 'Intento de reparación poco sincero');
  }
  return applyDelta(rel, { trust: 4, affection: 2, tension: -14, romantic: 0 }, 'Disculpa sincera');
}

export function stageProgress(rel: RelationshipState): number {
  const idx = STAGE_ORDER.indexOf(rel.stage);
  if (idx < 0) return 0;
  return (idx / (STAGE_ORDER.length - 1)) * 100;
}

export function relationshipSummary(rel: RelationshipState, character: Character): string {
  const parts: string[] = [];
  parts.push(`${character.name} y tú son ${STAGE_LABELS[rel.stage].toLowerCase()}.`);
  if (rel.trust > 70) parts.push('Confía bastante en ti.');
  else if (rel.trust > 40) parts.push('Está empezando a confiar en ti.');
  else parts.push('Todavía te está midiendo.');
  if (rel.tension > 50) parts.push('Hay tensión pendiente entre ustedes.');
  if (rel.romanticInterest > 50) parts.push('Hay algo romántico en el aire, aunque no lo diga siempre.');
  return parts.join(' ');
}
