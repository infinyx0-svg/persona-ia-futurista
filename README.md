# Persona IA

App móvil de compañía IA construida con **Expo + React Native + TypeScript**.
Android primero, misma base de código para iOS y web.
Diseño futurista con luces LED animadas y superficies de cristal.

> Principio central del producto: *la IA fortalece la vida del usuario; no intenta convertirse en su vida.*

---

## 1. Requisitos

| Herramienta | Versión |
|---|---|
| Node.js | 20 o superior |
| npm | 10 o superior |
| Android | 8.0+ (API 26) con **Expo Go** instalado |
| Cuenta Supabase | opcional (ver §4) |
| API key de OpenAI o Gemini | opcional (ver §5) |

---

## 2. Instalación y ejecución

```bash
cd persona-ia
npm install
npx expo start
```

Se abre un QR en la terminal.

### Probar en Android (recomendado)

1. Instala **Expo Go** desde Google Play en el teléfono.
2. Conecta el teléfono y la computadora a la **misma red Wi-Fi**.
3. Ejecuta `npx expo start`.
4. Escanea el QR con la app **Expo Go** (Android) o con la cámara (iOS).
5. La app carga en el dispositivo. Los cambios en el código se recargan en caliente.

Si la red bloquea la conexión local, usa el túnel:

```bash
npx expo start --tunnel
```

### Probar en el navegador (verificación rápida)

```bash
npx expo start --web
```

### Generar un APK instalable (Android)

```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

Al terminar, EAS entrega un enlace de descarga del `.apk`. Instálalo en el teléfono
(requiere permitir "instalar apps de origen desconocido").

Alternativa local, sin cuenta EAS:

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# APK en android/app/build/outputs/apk/release/app-release.apk
```

> Para compilar localmente necesitas **JDK 17** y **Android SDK** (Android Studio).
> El sandbox donde se generó este proyecto no los tiene, por eso la verificación
> aquí fue: `tsc` sin errores + Metro empaquetando + recorrido funcional en navegador.

---

## 3. Verificación realizada

| Comprobación | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errores |
| Metro / `expo start --web` | ✅ bundle generado (3.8 MB, HTTP 200) |
| Registro de usuario | ✅ crea cuenta y persiste sesión |
| Onboarding completo (4 pasos + encuentro) | ✅ |
| Chat con respuestas contextuales | ✅ |
| Pantallas En persona / Mente / Armario / Ajustes | ✅ renderizan |
| Persistencia tras recargar | ✅ AsyncStorage |
| Motor LLM: streaming SSE | ✅ verificado con servidor simulado |
| Motor LLM: parser de acciones y emoción | ✅ verificado |
| Motor LLM: error + reintento | ✅ verificado |
| Fallback al motor local sin API key | ✅ verificado |
| Rediseño futurista: fondo LED animado | ✅ renderiza en web |
| Contraste de texto sobre el fondo | ✅ AA (velo + superficies de cristal) |

---

## 4. Autenticación

La app funciona en **dos modos**, sin cambiar código:

### Modo local (por defecto, sin configuración)
Si no hay credenciales de Supabase, la app usa un almacén local con contraseña
hasheada (FNV-1a + salt) en AsyncStorage. Sirve para probar todo el flujo sin
depender de internet. **No es para producción**: el hash no es criptográfico.

### Modo Supabase Auth (recomendado para producción, gratis)
1. Crea un proyecto en [supabase.com](https://supabase.com) (plan gratuito).
2. En **Authentication → Providers**, deja habilitado *Email*.
3. Copia `Project URL` y `anon public key` desde **Settings → API**.
4. Crea un archivo `.env` en la raíz del proyecto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://tuproyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

5. Reinicia con `npx expo start -c`.

También puedes ponerlas en `app.json → expo.extra.supabaseUrl` y
`supabaseAnonKey`. La app detecta las credenciales y cambia de modo sola; el
modo activo se muestra en la pantalla de bienvenida y en Ajustes.

> Si Supabase exige confirmación por correo, el registro devuelve un aviso
> pidiendo confirmar el email antes de iniciar sesión.

---

## 5. Motor de diálogo: local o LLM real

La app tiene **dos motores de diálogo intercambiables** y elige uno solo, sin
cambiar código:

| | Motor local (por defecto) | Motor LLM (opcional) |
|---|---|---|
| Cuándo se usa | No hay API key configurada | Hay API key configurada |
| Respuestas | Reglas de intención + personalidad + emoción + memoria | Modelo real (OpenAI o Gemini) |
| Internet | No hace falta | Necesario |
| Costo | 0 | Según el proveedor (ver abajo) |

Ambos devuelven exactamente la misma estructura (`GeneratedReply`), así que la
**personalidad, las emociones, la memoria y las etapas de relación se comportan
igual** en los dos modos. El punto de integración es `generateReply()` en
`src/engine/dialogue.ts`; la ruta LLM vive en `src/engine/llm.ts`.

### 5.1 Configurar la API key

**Nunca se escribe en el código.** Hay dos formas:

**Opción A — desde la app (recomendado para el usuario final)**
1. Abre **Ajustes → Motor de diálogo (LLM)**.
2. Elige el proveedor: **OpenAI** o **Google Gemini**.
3. Pega tu **API key** (se guarda solo en este dispositivo, en AsyncStorage).
4. Ajusta el **modelo** si quieres (por defecto `gpt-4o-mini` o `gemini-2.0-flash`).
5. Pulsa **Probar conexión** para confirmar que funciona.

**Opción B — por variable de entorno (recomendado para desarrollo)**
Crea un `.env` en la raíz del proyecto:

```env
# OpenAI
EXPO_PUBLIC_OPENAI_API_KEY=sk-...
EXPO_PUBLIC_LLM_PROVIDER=openai
EXPO_PUBLIC_LLM_MODEL=gpt-4o-mini

# o Google Gemini
EXPO_PUBLIC_GEMINI_API_KEY=AIza...
EXPO_PUBLIC_LLM_PROVIDER=gemini
EXPO_PUBLIC_LLM_MODEL=gemini-2.0-flash
```

Reinicia con `npx expo start -c`. También puedes usar `app.json → expo.extra`
(`openaiApiKey`, `geminiApiKey`, `llmProvider`, `llmModel`, `llmBaseUrl`).

> La prioridad es: **Ajustes de la app → variable de entorno → valor por defecto**.
> Si no hay key en ninguno de los dos sitios, la app usa el motor local y sigue
> funcionando con normalidad (offline y gratis).

### 5.2 Qué inyecta el prompt del sistema

El prompt se construye en `buildSystemPrompt()` (`src/engine/llm.ts`) e incluye:

- **Perfil de la compañera**: nombre, edad, ocupación, biografía.
- **Personalidad**: los 17 rasgos con su intensidad (ausente/baja/media/alta),
  intereses visibles y ocultos, y su familia.
- **Estado emocional actual**: emoción, intensidad y el motivo.
- **Contexto de tiempo**: momento del día, clima y qué está haciendo según su rutina.
- **Relación**: etapa, confianza, afecto, tensión e interés romántico, con reglas
  explícitas de comportamiento según la etapa (no trata como pareja a un desconocido).
- **Recuerdos relevantes**: los que coinciden con el mensaje + los más recientes.
- **Reglas de seguridad**: ante crisis, derivar a una persona real y a emergencias.
- **Formato de salida**: diálogo en primera persona, acciones entre asteriscos y
  una etiqueta final `[[emocion: X]]`.

### 5.3 Formato de salida y reacción de la cara, la voz y la ropa

El modelo responde con texto y, opcionalmente, acciones entre asteriscos
(`*sonríe de lado*`). El parser `parseLlmOutput()`:

- **Quita los asteriscos** y guarda las acciones aparte, para que se muestren en
  cursiva suave, igual que en el motor local.
- **Lee la etiqueta `[[emocion: X]]`** y la usa para actualizar la emoción, de modo
  que el avatar (cara), la voz y la ropa reaccionan igual que con el motor local.

### 5.4 Streaming, errores y reintento

- La respuesta llega **en streaming** (SSE) y se muestra en la burbuja mientras se
  escribe, con un cursor parpadeante.
- Si el proveedor falla, la app **reintenta automáticamente** una vez (con espera
  creciente) y, si vuelve a fallar, muestra un **aviso claro** con un botón
  **Reintentar** en el chat. Nunca inventa una respuesta.
- Los errores se traducen a mensajes entendibles: key inválida, sin permiso, modelo
  inexistente, límite de peticiones, fallo del servicio o sin conexión.

### 5.5 Coste aproximado por conversación

Supuestos: prompt de sistema ≈ 600 tokens, historial de 14 turnos ≈ 560 tokens,
respuesta ≈ 80 tokens. Es decir, **≈ 1.200 tokens de entrada y ≈ 80 de salida por
mensaje**.

| Modelo | Precio (entrada / salida) | Coste por mensaje | Conversación de ~20 mensajes |
|---|---|---|---|
| `gpt-4o-mini` | 0,15 / 0,60 USD por 1M tokens | ≈ 0,00023 USD | **≈ 0,005 USD** (medio centavo) |
| `gemini-2.0-flash` | plan gratuito; de pago ≈ 0,10 / 0,40 USD por 1M | ≈ 0,00015 USD | **≈ 0,003 USD** |

En la práctica: **una conversación de 20 mensajes cuesta menos de 0,01 USD** con
`gpt-4o-mini`, y con Gemini Flash el plan gratuito suele cubrir el uso normal. El
coste real depende de la longitud de los mensajes y del historial enviado.

---

## 6. Qué se implementó (mapa con la especificación)

### §1 Concepto — sin RPG
Sin niveles, misiones, estadísticas ni botones para saltar días. El tiempo es
real (`Date.now()`), la relación avanza por conversaciones.
→ `src/engine/emotion.ts` (`timeContext`, `routineFor`), `src/state/AppContext.tsx`

### §2 Compañera principal
Configuración mínima (nombre, edad, presentación, estilo anime, rasgos). La
personalidad queda **bloqueada** al crearla; intentar cambiarla muestra
advertencia de reinicio. Intereses visibles (1–2) y ocultos que se descubren.
→ `src/engine/personality.ts` (`PRESETS`, `buildCharacter`, `buildBio`),
`src/screens/Onboarding.tsx`, `src/screens/Mente.tsx` (pestaña *Ella*)

### §3 Personalidad y emociones
17 rasgos con intensidad ausente/baja/media/alta. Emociones **sin barras**: se
expresan en texto, voz, cara, ropa y disposición. Cambios graduales con causa.
→ `src/engine/personality.ts`, `src/engine/emotion.ts` (`nextEmotion`, `EMOTION_FACE`)

### §4 Edad y contexto
La edad ajusta ocupación, rutinas, familia y límites. Contenido romántico
apropiado a la edad; sin contenido sexual con menores (bloqueado en armario y
en el motor de romance).
→ `src/engine/personality.ts` (`occupationForAge`, `buildFamily`),
`src/engine/wardrobe.ts` (`evaluateProposal`)

### §5 Primer encuentro
Perfil mínimo → 3 lugares coherentes según edad/estudios/trabajo/ciudad, con
explicación. El saludo inicial depende de la personalidad (extrovertida se
acerca, tímida espera, curiosa pregunta, seria solo saluda).
→ `src/engine/world.ts` (`suggestPlaces`), `src/engine/dialogue.ts`
(`firstMeetingOpening`), `src/screens/Onboarding.tsx`

### §6 Mundo, tiempo y lugar
Hora, día, clima y rutinas flexibles. País/ciudad manuales o ciudad ficticia.
No se pide ubicación del teléfono.
→ `src/engine/world.ts`, `src/engine/emotion.ts`

### §7 Familia
Estructura variable (mamá, papá, ambos, tutor, hermanos), personalidad y
actitud propia hacia el usuario, contacto activable/desactivable.
→ `src/engine/personality.ts` (`buildFamily`), `src/screens/Ajustes.tsx`

### §8 Relaciones y consecuencias
Confianza, afecto, tensión e interés romántico. La etapa **nunca retrocede
sola**; solo la tensión alta o una ruptura la bajan. Ser pareja exige
confirmación explícita. Ruptura permanente disponible.
→ `src/engine/relationship.ts`, `src/screens/Mente.tsx` (pestaña *Relación*)

### §9 Personajes secundarios
Ella propone, el usuario aprueba antes de guardar. Chat propio, memoria
independiente, apariciones espontáneas configurables.
→ `src/engine/secondary.ts`, `src/screens/Secundarios.tsx`

### §10 Avatar anime y ropa
Avatar 2D por capas en SVG con respiración, parpadeo, boca al hablar, cejas,
rubor y mirada según emoción. Armario inicial de 5 conjuntos, propuestas de
ella, aceptar/rechazar, prendas nuevas manuales.
→ `src/components/AnimeAvatar.tsx`, `src/engine/wardrobe.ts`,
`src/screens/Armario.tsx`

### §11 Modo Teléfono
Chat con burbujas propias, acciones en cursiva suave **sin asteriscos**,
stickers, hora, estado emocional, clima, TTS al mantener pulsado.
→ `src/screens/Chat.tsx`

### §12 Modo En persona
Avatar grande animado, conversación por voz (TTS), subtítulos opcionales,
micrófono con indicador visible, modo privado para escribir sin mostrar.
→ `src/screens/Persona.tsx`

### §13 Voz y almacenamiento
5 voces (anime, natural, energética, tranquila, madura), velocidad ajustable,
modo ligero (no guarda audio) / completo.
→ `src/screens/Ajustes.tsx`, `expo-speech`

### §14 Memoria
Extracción automática por reglas (metas, gustos, personas, proyectos,
momentos, datos sensibles), recall por palabras clave, panel para revisar,
editar y borrar.
→ `src/engine/memory.ts`, `src/screens/Mente.tsx` (pestaña *Memoria*)

### §15 Inteligencia y ayuda
Niveles básico/normal/avanzado/experto. Resolución de ecuaciones con parser
propio (sin `eval`), normalización de expresiones dañadas tipo `$(1_+-1)`,
pasos explicados y reconocimiento de límites.
→ `src/engine/math.ts`

### §16 Bienestar y seguridad
Detección de crisis con respuesta empática + derivación a persona real y
recursos. Sin culpa, amenazas ni aislamiento. Recordatorios de autocuidado.
→ `src/engine/dialogue.ts` (`CRISIS_WORDS`, rama `crisis`),
`src/screens/Mente.tsx` (pestaña *Bienestar*)

### §17 Diagnóstico del dispositivo
Plataforma, versión, modelo, memoria, batería, audio. Recomienda modo
completo/equilibrado/ligero y el usuario puede cambiarlo.
→ `src/lib/device.ts`, `src/screens/Ajustes.tsx`

### §18 Multimedia y fases
Stickers y TTS implementados. Momentos/Clips/Media quedan como fase futura
(no se construyeron para no gastar recursos antes de validar el diseño).

### §19 Principios de diseño
Rediseño futurista: base azul-noche con luces LED animadas (azul eléctrico,
púrpura, cian y magenta) y superficies de cristal. Tres paletas (noche, aurora,
sakura), tipografía legible, contraste AA garantizado por un velo sobre el fondo
animado, y animaciones que solo mueven `transform`/`opacity` (hilo nativo, sin
re-renders) para no gastar batería.

---

## 7. Estructura del proyecto

```
persona-ia/
├── App.tsx                     # Router + barra de pestañas
├── index.ts                    # Entry point
├── app.json                    # Config Expo (Android/iOS/web)
├── src/
│   ├── types.ts                # Modelo de datos completo
│   ├── theme.ts                # Paletas, radios, sombras
│   ├── components/
│   │   ├── UI.tsx              # Screen, Card, Button, Field, Chip…
│   │   ├── AuroraBackground.tsx # Fondo futurista: luces LED animadas
│   │   └── AnimeAvatar.tsx     # Avatar SVG animado por emoción
│   ├── engine/
│   │   ├── personality.ts      # Rasgos, presets, familia, creación
│   │   ├── emotion.ts          # Emociones, rutinas, hora/clima
│   │   ├── memory.ts           # Extracción y recall de recuerdos
│   │   ├── dialogue.ts         # Intención, sentimiento, respuestas (motor local)
│   │   ├── llm.ts              # Motor LLM: prompt, streaming, parser, errores
│   │   ├── relationship.ts     # Etapas, deltas, pareja, ruptura
│   │   ├── wardrobe.ts         # Armario y evaluación de propuestas
│   │   ├── world.ts            # Lugares, clima, mundo
│   │   ├── secondary.ts        # Personajes secundarios
│   │   └── math.ts             # Parser y normalizador matemático
│   ├── lib/
│   │   ├── storage.ts          # AsyncStorage + usuarios locales
│   │   ├── auth.ts             # Supabase Auth con fallback local
│   │   └── device.ts           # Diagnóstico del dispositivo
│   ├── state/
│   │   └── AppContext.tsx      # Estado global y acciones
│   └── screens/
│       ├── Auth.tsx            # Bienvenida, registro, login
│       ├── Onboarding.tsx      # 4 pasos + primer encuentro
│       ├── Chat.tsx            # Modo Teléfono
│       ├── Persona.tsx         # Modo En persona
│       ├── Mente.tsx           # Memoria, ella, relación, bienestar
│       ├── Armario.tsx         # Ropa y propuestas
│       ├── Secundarios.tsx     # Personajes y chats
│       └── Ajustes.tsx         # Diagnóstico, voz, modos, LLM, reinicio
```

---

## 8. Notas técnicas y límites conocidos

- **Dos motores de diálogo.** El local (reglas) es determinista, offline y gratis;
  el LLM (OpenAI/Gemini) da respuestas más naturales. Se elige solo según haya o no
  API key. La firma `ReplyContext → GeneratedReply` es común a ambos.
- **La API key nunca está en el código.** Se configura en Ajustes o por variable de
  entorno. En Ajustes se guarda en AsyncStorage del dispositivo; para producción
  conviene un backend que la custodie y firme las peticiones.
- **Reconocimiento de voz continuo** requiere un *development build* con
  `expo-speech-recognition`; en Expo Go el micrófono muestra un aviso y el modo
  privado de escritura cubre el caso de uso.
- **Avatar 2D por capas**, no Live2D/3D (fase futura según §10).
- **Persistencia local por usuario** en AsyncStorage. Para sincronizar entre
  dispositivos, añade tablas en Supabase y guarda `AppData` como JSON por `user_id`.
- **Modo local de auth** es para desarrollo; producción debe usar Supabase.

---

## 9. Comandos útiles

```bash
npm run typecheck     # tsc --noEmit
npm run android       # expo start --android
npm run web           # expo start --web
npx expo start -c     # limpiar caché de Metro
```

---

## 10. Rediseño futurista (v3)

La versión 3 cambia la piel de la app por una estética futurista **sin tocar la
lógica**: la personalidad, la memoria, las emociones y las etapas de relación
siguen exactamente igual.

### 10.1 Fondo de luces LED animadas

`src/components/AuroraBackground.tsx` dibuja una base azul-noche con haces de luz
(azul eléctrico, púrpura, cian y magenta) y orbes que se desplazan muy despacio.

- **Rendimiento:** solo se animan `transform` y `opacity`, así que todo corre en
  el hilo nativo (`useNativeDriver`) y **no provoca re-renders de React**.
- **Batería:** los bucles duran 14–26 s con easing suave; al pasar la app a
  segundo plano se detienen todas las animaciones (`AppState`).
- **Modo de rendimiento:** `ligero` deja el fondo estático, `equilibrado` usa 3
  haces y `completo` añade orbes y un haz extra. Se elige en Ajustes o con el
  diagnóstico del dispositivo.

### 10.2 Superficies de cristal y contraste

Las tarjetas usan superficies translúcidas (`palette.glass`) con un filo luminoso
superior, y el fondo lleva un **velo de contraste** que garantiza que el texto se
lea aunque las luces pasen por detrás. Los pares texto/fondo cumplen AA (≥ 4.5:1)
para cuerpo de texto.

### 10.3 Paleta y temas

`src/theme.ts` define la paleta futurista y tres temas que cambian el degradado y
el color de las luces:

| Tema | Acento | Luces |
|---|---|---|
| `noche` | azul eléctrico `#4C8DFF` | azul, púrpura, cian, magenta |
| `aurora` | cian `#22D3EE` | cian, azul, púrpura, índigo |
| `sakura` | magenta `#E879F9` | magenta, púrpura, azul, cian |

### 10.4 Dónde se aplica

El fondo se integra en el contenedor `Screen` (todas las pantallas), en el
arranque (`BootScreen`), en la barra de pestañas y en las pantallas que antes
tenían su propio degradado (Chat, En persona, Auth).
