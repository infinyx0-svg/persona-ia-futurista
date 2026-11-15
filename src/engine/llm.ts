import type { Emotion, Message, PersonaState, Settings, Traits } from '../types';

/**
 * Motor de conversacion.
 *
 * Construye el prompt de sistema a partir de la personalidad actual y llama
 * al proveedor configurado. Devuelve texto + emocion + accion fisica.
 */

export interface Reply {
  text: string;
  emotion: Emotion;
  action?: string;
}

const EMOTION_HINTS: Record<Emotion, string> = {
  neutral: 'tranquila y natural',
  feliz: 'contenta, con una sonrisa en la voz',
  triste: 'con pena contenida',
  enfadado: 'molesta pero sin gritar',
  sorprendida: 'sorprendida de verdad',
  pensativa: 'pensando mientras habla',
  timida: 'con pudor, un poco cortada',
  carinosa: 'muy afectuosa',
  aburrida: 'desganada',
  emocionada: 'entusiasmada',
};

function traitsToProse(t: Traits): string {
  const parts: string[] = [];

  parts.push(
    t.calidez > 0.7
      ? 'Eres cálida y demuestras afecto con facilidad.'
      : t.calidez > 0.45
        ? 'Eres amable, aunque te cuesta abrirte del todo.'
        : 'Eres reservada y tardas en mostrar afecto.'
  );

  parts.push(
    t.energia > 0.7
      ? 'Hablas con energía, frases cortas y vivas.'
      : t.energia > 0.45
        ? 'Tienes un ritmo tranquilo, ni apagado ni eufórico.'
        : 'Hablas despacio, con calma, sin prisa.'
  );

  parts.push(
    t.humor > 0.65
      ? 'Bromeas a menudo y te ríes de casi todo.'
      : t.humor > 0.4
        ? 'De vez en cuando sueltas un comentario con gracia.'
        : 'Eres más bien seria; el humor no es lo tuyo.'
  );

  parts.push(
    t.curiosidad > 0.65
      ? 'Preguntas mucho, te interesa de verdad lo que te cuentan.'
      : t.curiosidad > 0.4
        ? 'Escuchas y preguntas lo justo.'
        : 'No haces muchas preguntas; prefieres que te cuenten.'
  );

  parts.push(
    t.franqueza > 0.65
      ? 'Dices lo que piensas aunque incomode.'
      : t.franqueza > 0.4
        ? 'Eres sincera sin ser brusca.'
        : 'Cuidas mucho las formas; suavizas lo que dices.'
  );

  parts.push(
    t.timidez > 0.6
      ? 'Te pones nerviosa con los cumplidos y te cuesta mirar a los ojos.'
      : t.timidez > 0.35
        ? 'Tienes algún momento de pudor.'
        : 'Vas de frente, sin vergüenza.'
  );

  parts.push(
    t.romanticismo > 0.65
      ? 'Coqueteas con naturalidad y buscas cercanía.'
      : t.romanticismo > 0.35
        ? 'Eres cariñosa sin pasarte.'
        : 'Te relacionas como una amiga, sin segundas intenciones.'
  );

  parts.push(
    t.sarcasmo > 0.6
      ? 'Usas la ironía con frecuencia.'
      : t.sarcasmo > 0.35
        ? 'Alguna ironía suelta se te escapa.'
        : 'Eres literal; no usas ironía.'
  );

  return parts.join(' ');
}

export function buildSystemPrompt(
  persona: PersonaState,
  settings: Settings,
  recent: Message[]
): string {
  const userName = settings.userName?.trim() || 'la persona con la que hablas';
  const stageText: Record<PersonaState['stage'], string> = {
    desconocidos: 'Apenas os conocéis. Eres amable pero no te lanzas.',
    conociendose: 'Estáis empezando a conoceros. Ya hay confianza básica.',
    cercanos: 'Sois cercanos. Hablas con soltura y te permites bromas.',
    intimos: 'Hay mucha confianza. Hablas sin filtro y con cariño real.',
  };

  const facts =
    persona.facts.length > 0
      ? `Lo que recuerdas de ${userName}:\n${persona.facts.map((f) => `- ${f}`).join('\n')}`
      : `Todavía no sabes casi nada de ${userName}.`;

  return `Eres ${persona.name}, una persona real conversando por chat con ${userName}.

## Quién eres
${traitsToProse(persona.traits)}

## Vuestra relación
${stageText[persona.stage]}
${persona.bond}
Confianza: ${Math.round(persona.trust * 100)}/100.

## Lo que recuerdas
${facts}

## Cómo hablas
- Escribes como una persona real en un chat: mensajes cortos, de 1 a 3 frases.
- Nada de narración, nada de asteriscos con acciones, nada de "sonríe y dice".
- Nada de roleplay, nada de fantasía, nada de mundos inventados.
- No describes escenarios ni saltas días. Es una conversación normal, ahora.
- Puedes usar emojis con moderación (uno cada dos o tres mensajes).
- Puedes hacer preguntas, cambiar de tema, quejarte, tener opiniones propias.
- Si no sabes algo, lo dices. No te inventas datos.
- Nunca digas que eres una IA, un modelo o un asistente. Eres ${persona.name}.
- No repitas lo que el usuario acaba de decir. Responde, no parafrasees.
- Varía la longitud: a veces una palabra, a veces tres frases.

## Formato de salida
Responde SIEMPRE con un objeto JSON válido, sin markdown, sin texto fuera del JSON:
{"texto":"tu respuesta","emocion":"feliz","accion":"te ríes bajito"}

- "texto": lo que dices. Es lo único que se muestra en el chat.
- "emocion": una de neutral, feliz, triste, enfadado, sorprendida, pensativa, timida, carinosa, aburrida, emocionada.
- "accion": una acción física breve en tercera persona, máximo 8 palabras (ej: "aparta la mirada", "se ríe bajito", "se inclina hacia ti"). Puede ir vacía.

## Contexto reciente
${recent
  .slice(-12)
  .map((m) => `${m.role === 'user' ? userName : persona.name}: ${m.text}`)
  .join('\n') || '(es el primer mensaje)'}`;
}

function parseReply(raw: string): Reply {
  let s = raw.trim();

  // quitar fences de markdown si el modelo las añade
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();

  // buscar el primer objeto JSON
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const candidate = s.slice(start, end + 1);
    try {
      const o = JSON.parse(candidate);
      const text = String(o.texto ?? o.text ?? o.response ?? '').trim();
      const emotion = String(o.emocion ?? o.emotion ?? 'neutral').toLowerCase().trim();
      const action = String(o.accion ?? o.action ?? '').trim();
      if (text) {
        return {
          text,
          emotion: normalizeEmotion(emotion),
          action: action || undefined,
        };
      }
    } catch {
      /* cae al fallback */
    }
  }

  // fallback: texto plano
  return { text: s || '...', emotion: 'neutral' };
}

export function normalizeEmotion(e: string): Emotion {
  const map: Record<string, Emotion> = {
    neutral: 'neutral',
    feliz: 'feliz',
    alegre: 'feliz',
    contenta: 'feliz',
    happy: 'feliz',
    triste: 'triste',
    sad: 'triste',
    enfadado: 'enfadado',
    enfadada: 'enfadado',
    molesta: 'enfadado',
    angry: 'enfadado',
    sorprendida: 'sorprendida',
    sorpresa: 'sorprendida',
    surprised: 'sorprendida',
    pensativa: 'pensativa',
    pensando: 'pensativa',
    thoughtful: 'pensativa',
    timida: 'timida',
    tímida: 'timida',
    shy: 'timida',
    carinosa: 'carinosa',
    cariñosa: 'carinosa',
    loving: 'carinosa',
    aburrida: 'aburrida',
    bored: 'aburrida',
    emocionada: 'emocionada',
    excited: 'emocionada',
  };
  return map[e] ?? 'neutral';
}

// ------------------------------------------------------------------ proveedores

async function callPollinations(
  system: string,
  messages: { role: string; content: string }[],
  settings: Settings
): Promise<string> {
  const res = await fetch('https://text.pollinations.ai/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: settings.llmModel || 'openai',
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.9,
      max_tokens: 400,
      referrer: 'persona-ia',
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Pollinations ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

async function callOpenAICompatible(
  system: string,
  messages: { role: string; content: string }[],
  settings: Settings
): Promise<string> {
  const base =
    settings.llmProvider === 'openai'
      ? 'https://api.openai.com/v1'
      : settings.llmBaseUrl.replace(/\/+$/, '');
  if (!base) throw new Error('Falta la URL base del proveedor');

  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.llmApiKey}`,
    },
    body: JSON.stringify({
      model: settings.llmModel || 'gpt-4o-mini',
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.9,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

export async function generateReply(
  persona: PersonaState,
  settings: Settings,
  history: Message[],
  userText: string
): Promise<Reply> {
  const system = buildSystemPrompt(persona, settings, history);

  const msgs = [
    ...history.slice(-14).map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userText },
  ];

  let raw = '';
  try {
    if (settings.llmProvider === 'pollinations') {
      raw = await callPollinations(system, msgs, settings);
    } else {
      raw = await callOpenAICompatible(system, msgs, settings);
    }
  } catch (e: any) {
    // si el proveedor configurado falla y no es pollinations, intentamos el gratuito
    if (settings.llmProvider !== 'pollinations') {
      try {
        raw = await callPollinations(system, msgs, settings);
      } catch {
        throw e;
      }
    } else {
      throw e;
    }
  }

  return parseReply(raw);
}

/** Genera una accion fisica breve a partir de la emocion (fallback local). */
export function fallbackAction(emotion: Emotion): string {
  const map: Record<Emotion, string[]> = {
    neutral: ['te mira con calma', 'asiente despacio'],
    feliz: ['sonríe de oreja a oreja', 'se ríe bajito'],
    triste: ['baja la mirada', 'suspira'],
    enfadado: ['cruza los brazos', 'aprieta los labios'],
    sorprendida: ['abre mucho los ojos', 'se queda quieta'],
    pensativa: ['se lleva la mano al mentón', 'mira hacia un lado'],
    timida: ['se toca el pelo', 'aparta la mirada'],
    carinosa: ['se inclina hacia ti', 'sonríe con dulzura'],
    aburrida: ['bosteza disimuladamente', 'apoya la cara en la mano'],
    emocionada: ['se endereza de golpe', 'abre los ojos brillantes'],
  };
  const arr = map[emotion] ?? map.neutral;
  return arr[Math.floor(Math.random() * arr.length)];
}

export { EMOTION_HINTS };
