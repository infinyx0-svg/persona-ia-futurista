# Persona IA

Compañera conversacional con **personaje 3D real (VRM)** y **voz realista**. Sin sprites, sin avatares 2D, sin narrador.

Versión **2.0.0** · Paquete `com.personaia.app` · Android 8.0+

---

## Qué es

Una app de conversación con una persona virtual que:

- **Se ve en 3D** sobre un modelo VRM real, con respiración, parpadeo, movimiento sutil de cabeza y **10 expresiones** que se mezclan con transiciones suaves.
- **Habla con voz realista** (ElevenLabs u OpenAI TTS) que se reproduce automáticamente después de cada respuesta.
- **Conversa como una persona**, en presente: sin días que saltar, sin menús de opciones, sin narración, sin RPG.
- **Cambia su personalidad** según cómo hablas con ella: 8 rasgos que evolucionan turno a turno.
- Tiene **dos modos**: celular (interfaz tipo WhatsApp) y persona (pantalla 3D a pantalla completa).
- **Entra gratis**, sin cuenta.

---

## Los dos modos

| Modo | Qué es |
|---|---|
| **Celular** | La pantalla imita un móvil con interfaz tipo WhatsApp: cabecera con el avatar 3D, burbujas de chat, campo de escritura. Es la conversación del día a día. |
| **En persona** | Pantalla 3D a pantalla completa. El personaje aparece grande, con su emoción visible, la acción que acompaña a lo que dice, y un campo para hablarle. |

Se cambia con la barra inferior, sin perder la conversación.

---

## El personaje 3D

- Modelo **VRM** cargado con `three.js` + `@pixiv/three-vrm` dentro de un `WebView` (Android) o `iframe` (web).
- **Expresiones**: feliz, triste, enfadada, sorprendida, pensativa, tímida, cariñosa, aburrida, emocionada y neutral. Se aplican como pesos que **interpolan** hacia el objetivo: nunca hay un salto seco.
- **Respiración**: ciclo senoidal sobre pecho y hombros.
- **Parpadeo**: aleatorio cada 2–6 s, con doble parpadeo ocasional.
- **Cabeza**: balanceo lento, mirada que sigue al usuario y micro-giros al hablar.
- **Boca**: visemas `aa/ih/ou/ee/oh` movidos por el nivel de audio mientras habla.
- **Pose de reposo**: los brazos bajan de la T-pose del VRM a una postura natural.

### Poner tu propio personaje (VRoid Studio)

1. Crea el personaje en [VRoid Studio](https://vroid.com/studio) y expórtalo como `.vrm`.
2. Renómbralo a `avatar.vrm` y colócalo en `assets/vrm/avatar.vrm`.
3. Optimízalo (recomprimido de texturas, deja el archivo en ~6 MB):

```bash
pip install pillow
python3 tools/optimize_vrm.py assets/vrm/avatar.vrm assets/vrm/avatar_opt.vrm
```

4. Recompila. No hay que tocar nada más: el visor se adapta a cualquier VRM 0.x o 1.0.

Mientras no pongas el tuyo, la app usa **AvatarSample_A** del proyecto `vrm-samples` (licencia libre, de VRoid), que ya trae los blendshapes de expresión y visemas.

---

## La voz

Proveedores soportados, configurables en **Ajustes → Voz**:

| Proveedor | Clave | Voces |
|---|---|---|
| **ElevenLabs** (recomendado) | `xi-api-key` | cualquier voice ID de tu cuenta; por defecto `21m00Tcm4TlvDq8ikWAM` |
| **OpenAI TTS** | `sk-...` | `nova`, `shimmer`, `alloy`, `echo`, `fable`, `onyx` |
| **Voz del sistema** | — | respaldo automático si no hay clave |

La voz se reproduce **sola en cuanto llega el texto** de la respuesta, y mientras suena el personaje mueve la boca. Se puede silenciar por mensaje con el botón de altavoz.

---

## La conversación

**Sin historia, sin RPG.** Nada de "Día 3", nada de elegir opción A o B, nada de narrador. Es un chat en presente.

La personalidad **se define contigo**, no viene fijada. Ocho rasgos (`src/types.ts`):

```
calidez · energía · humor · curiosidad · franqueza · timidez · romanticismo · sarcasmo
```

Cada mensaje tuyo mueve esos rasgos un poco (`src/engine/personality.ts`): si escribes con cariño sube la calidez, si bromeas sube el humor, si eres seco sube la timidez y baja la energía. La tasa de cambio crece con el número de turnos, así que **cuanto más hablas, más se parece a ti la persona con la que hablas**.

Además lleva:

- **Memoria de hechos**: extrae nombre, edad, trabajo, ciudad, gustos, mascotas, cumpleaños de lo que cuentas.
- **Confianza** (0–100) y **etapa** de la relación: `desconocidos → conociéndose → cercanos → íntimos`.
- **Vínculo** en una frase, que se recalcula con la etapa.

Todo se guarda en `AsyncStorage` y sobrevive al cierre de la app.

### Proveedor de IA

| Proveedor | Clave | Modelo por defecto |
|---|---|---|
| **Pollinations** (gratis, por defecto) | no necesita | `openai` |
| **OpenAI** | `sk-...` | `gpt-4o-mini` |
| **Compatible** (Groq, OpenRouter, LM Studio…) | la del servicio | el que indiques |

Si configuras un proveedor de pago y falla en mitad de una conversación, la app **cae sola** al gratuito para que el chat no se rompa.

---

## Instalación en el teléfono

1. Descarga el APK desde **[Releases](https://github.com/infinyx0-svg/persona-ia-futurista/releases)**.
2. Toca el archivo `.apk`.
3. Activa **"Permitir instalar apps de esta fuente"**.
4. Confirma **Instalar**. Si Play Protect avisa, pulsa **"Instalar de todos modos"**.
5. Abre **Persona IA**.

Requiere **Android 8.0 (API 26)** o superior.

---

## Desarrollo

```bash
npm install
npm run build:viewer     # compila el visor 3D → src/components/viewerHtml.ts
npm run typecheck        # tsc --noEmit
npx expo start           # Metro
npx expo export --platform web   # versión web para previsualizar
```

El visor 3D es TypeScript puro (`viewer/src/main.ts`) que se empaqueta a un bundle IIFE y se inyecta como HTML en el WebView. **Hay que ejecutar `npm run build:viewer` cada vez que cambies algo del visor**; el archivo generado no se versiona.

### Estructura

```
App.tsx                     navegación entre los tres modos
viewer/src/main.ts          escena three.js + VRM: emociones, parpadeo, labios
src/components/Avatar3D.tsx visor en WebView (Android)
src/components/Avatar3D.web.tsx  visor en iframe (web)
src/engine/llm.ts           prompt de sistema y llamada al modelo
src/engine/personality.ts   evolución de rasgos, memoria, confianza
src/engine/voice.ts         ElevenLabs / OpenAI TTS + reproducción
src/screens/PhoneMode.tsx   modo celular (WhatsApp)
src/screens/PersonaMode.tsx modo persona (3D)
src/screens/SettingsScreen.tsx  claves, voz, rasgos, VRM
src/screens/Onboarding.tsx  entrada sin cuenta
tools/optimize_vrm.py       recomprime las texturas del VRM
```

---

## Compilar el APK

### GitHub Actions (lo que usa este repo)

`.github/workflows/build-apk.yml` compila y publica la Release sola:

- Se dispara a mano (**Actions → Build APK → Run workflow**) o al empujar un tag `v*`.
- Instala Java 17, el SDK de Android, descarga y optimiza el VRM, compila el visor, pasa `tsc`, hace `expo prebuild` y `gradlew assembleRelease`.
- Sube el APK como artefacto y lo adjunta a la Release `apk-latest`.

### Local

```bash
npx expo prebuild --clean -p android --no-install
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

### EAS Build (alternativa en la nube)

```bash
npm i -g eas-cli
export EXPO_TOKEN=<tu token>
eas build -p android --profile preview
```

---

## Privacidad

- Las claves de API se guardan **solo en el dispositivo** (`AsyncStorage`), nunca se envían a ningún servidor propio: la app habla directamente con el proveedor que configures.
- La conversación y la memoria también viven solo en el teléfono. Desinstalar la app lo borra todo (o **Ajustes → Empezar de cero**).

## Licencia

El código es tuyo. El VRM de reemplazo (`AvatarSample_A`) pertenece al proyecto [vrm-samples](https://github.com/madjin/vrm-samples) y se usa bajo su licencia; sustitúyelo por tu propio personaje para publicar.
