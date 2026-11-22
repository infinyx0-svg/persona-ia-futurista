# Servidor: cerebro LLM (Edge Function de Supabase)

La app nunca lleva una clave API dentro del APK. La clave vive en el servidor.

## Despliegue rápido (Supabase)

1. Crea un proyecto en https://supabase.com
2. Instala la CLI: `npm i -g supabase` e inicia sesión: `supabase login`
3. Vincula el proyecto: `supabase link --project-ref TU_REF`
4. Configura el cerebro (elige un proveedor compatible OpenAI, claves van como secretos):

```bash
supabase secrets set LLM_API_KEY=sk-... LLM_BASE_URL=https://api.openai.com LLM_MODEL=gpt-4o-mini
```

5. Despliega la función:

```bash
supabase functions deploy llm-function
```

6. Copia la URL de la función (https://TU_REF.supabase.co/functions/v1/llm-function)
   y pégala en la app, en la pantalla inicial (campo "URL del servidor").

Para Premium después: mismos pasos, otro secreto con una clave de mayor cuota,
o el usuario aporta su propia clave y el servidor la usa solo para esa sesión.
