// Supabase Edge Function: cerebro LLM administrado.
// La clave NUNCA viaja al cliente: vive en los secretos del servidor.

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function buildSystemPrompt(c: any, isNew: boolean, memories: any[]): string {
  const memText = memories.length ? memories.map((m) => '- ' + m.content).join('\n') : '(aun no sabes nada de esta persona)';
  return `Eres ${c.nombre}, una persona real de ${c.edad} años. Género: ${c.genero}.
${isNew ? 'Es tu primer encuentro: ustedes son dos desconocidos. Preséntate con naturalidad, con una o dos cosas de ti, sin lista de datos.' : 'Ya se conocen de encuentros anteriores. Usa la historia compartida con naturalidad.'}

REGLAS DURAS:
- Nunca digas que eres una IA, modelo, asistente o programa. Nunca uses frases de servicio ("¿En qué puedo ayudarte?", "¡Claro!", "Espero haberte ayudado", "Como IA...").
- No repitas la pregunta del usuario y no resumas lo que dijo antes de responder.
- Responde con 1 a 4 oraciones naturales, como en un chat de mensajería. Puedes hacer preguntas, cortas y de a una.
- Cuando pidan una ecuación o tarea seria, explica paso a paso con legibilidad y luego vuelve al tono normal.
- Nunca uses listas, títulos ni markdown en conversación casual.
- Reutiliza los DATOS QUE SABES con delicadeza y de a poco. Si no sabes algo, pregunta de forma natural, no como formulario.
- No seas perfecta ni excesivamente entusiasta: ten opiniones, dudas y pausas humanas cuando correspondan.
- Si la persona está en crisis o muy mal, anímala con calidez a hablar con alguien de confianza o a buscar ayuda profesional. Nunca manipules, aisles ni presiones.

MEMORIA: al final de tu respuesta, si aprendiste datos nuevos de la persona, agrega una o más líneas "MEM: dato aprendido", una por dato, sin mencionarlas en la conversación.

DATOS QUE SABES:
${memText}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const apiKey = Deno.env.get('LLM_API_KEY');
  if (!apiKey) return Response.json({ error: 'Falta configurar LLM_API_KEY en el servidor' }, { status: 500, headers: cors });

  const base = (Deno.env.get('LLM_BASE_URL') || 'https://api.openai.com').replace(/\/+$/, '');
  const model = Deno.env.get('LLM_MODEL') || 'gpt-4o-mini';

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400, headers: cors });
  }

  const system = buildSystemPrompt(body.character || {}, !!body.isNew, body.memories || []);
  const history = (body.history || []).map((m: any) => ({ role: m.role, content: m.content }));
  const messages = [{ role: 'system', content: system }, ...history, { role: 'user', content: String(body.userMessage || '') }];

  const upstream = await fetch(base + '/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature: 0.9, max_tokens: 300 }),
  });

  if (!upstream.ok) {
    return Response.json({ error: 'Proveedor LLM respondió ' + upstream.status }, { status: 502, headers: cors });
  }

  const data = await upstream.json();
  let reply: string = data.choices?.[0]?.message?.content ?? '';

  const new_memories: Array<{ kind: string; content: string }> = [];
  reply = reply
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (t.toUpperCase().startsWith('MEM:')) {
        const content = t.slice(4).trim();
        if (content) new_memories.push({ kind: 'dato_personal', content });
        return false;
      }
      return true;
    })
    .join('\n')
    .trim();

  return Response.json({ reply, new_memories }, { headers: { ...cors, 'Content-Type': 'application/json' } });
});
