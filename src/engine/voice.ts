import * as FileSystem from 'expo-file-system/legacy';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import type { Settings } from '../types';

/**
 * Voz realista.
 *
 * ElevenLabs u OpenAI TTS devuelven MP3; lo guardamos en cache y lo
 * reproducimos con expo-audio. Si no hay clave configurada, cae a la voz
 * del sistema (expo-speech) para que la app nunca se quede muda.
 */

let player: AudioPlayer | null = null;
let currentUri: string | null = null;

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (e: string) => void;
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

async function fetchElevenLabs(text: string, settings: Settings): Promise<string> {
  const voice = settings.ttsVoiceId || '21m00Tcm4TlvDq8ikWAM';
  const res = await fetch(`${ELEVEN_BASE}/text-to-speech/${voice}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': settings.ttsApiKey,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.42,
        similarity_boost: 0.82,
        style: 0.35,
        use_speaker_boost: true,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`ElevenLabs ${res.status}: ${t.slice(0, 180)}`);
  }

  const buf = await res.arrayBuffer();
  const b64 = arrayBufferToBase64(buf);
  const path = `${FileSystem.cacheDirectory}tts_${hash(text)}.mp3`;
  await FileSystem.writeAsStringAsync(path, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

async function fetchOpenAITTS(text: string, settings: Settings): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.ttsApiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: settings.ttsVoiceId || 'nova',
      input: text,
      response_format: 'mp3',
      speed: 1.02,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`OpenAI TTS ${res.status}: ${t.slice(0, 180)}`);
  }

  const buf = await res.arrayBuffer();
  const b64 = arrayBufferToBase64(buf);
  const path = `${FileSystem.cacheDirectory}tts_${hash(text)}.mp3`;
  await FileSystem.writeAsStringAsync(path, b64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
    );
  }
  // @ts-ignore — btoa existe en Hermes
  return global.btoa ? global.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

/** Limpia el texto para que suene natural al leerlo. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[*_`#>]/g, '')
    .replace(/https?:\/\/\S+/g, 'enlace')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function speak(
  text: string,
  settings: Settings,
  opts: SpeakOptions = {}
): Promise<void> {
  const clean = cleanForSpeech(text);
  if (!clean) {
    opts.onEnd?.();
    return;
  }

  stop();

  const hasKey = !!settings.ttsApiKey?.trim();
  const provider = settings.ttsProvider;

  if (!hasKey || provider === 'device') {
    // voz del sistema como respaldo
    try {
      const Speech = require('expo-speech');
      opts.onStart?.();
      Speech.speak(clean, {
        language: 'es-ES',
        pitch: 1.06,
        rate: 0.98,
        onDone: () => opts.onEnd?.(),
        onStopped: () => opts.onEnd?.(),
        onError: () => opts.onEnd?.(),
      });
    } catch (e: any) {
      opts.onError?.(String(e?.message ?? e));
      opts.onEnd?.();
    }
    return;
  }

  try {
    const uri =
      provider === 'openai'
        ? await fetchOpenAITTS(clean, settings)
        : await fetchElevenLabs(clean, settings);

    currentUri = uri;
    player = createAudioPlayer({ uri });
    opts.onStart?.();

    const sub = player.addListener('playbackStatusUpdate', (status: any) => {
      if (status.didJustFinish) {
        sub?.remove?.();
        opts.onEnd?.();
      }
    });

    player.play();
  } catch (e: any) {
    opts.onError?.(String(e?.message ?? e));
    // respaldo: voz del sistema
    try {
      const Speech = require('expo-speech');
      Speech.speak(clean, {
        language: 'es-ES',
        pitch: 1.06,
        rate: 0.98,
        onDone: () => opts.onEnd?.(),
        onStopped: () => opts.onEnd?.(),
      });
    } catch {
      opts.onEnd?.();
    }
  }
}

export function stop(): void {
  try {
    if (player) {
      player.pause();
      player.remove();
      player = null;
    }
  } catch {
    /* noop */
  }
  try {
    const Speech = require('expo-speech');
    Speech.stop();
  } catch {
    /* noop */
  }
  currentUri = null;
}

export function isSpeaking(): boolean {
  return !!player;
}

/** Prueba rapida de la voz configurada. */
export async function testVoice(settings: Settings): Promise<string> {
  const sample = 'Hola, soy tu compañera. Así suena mi voz.';
  try {
    if (!settings.ttsApiKey?.trim()) {
      return 'Sin clave de API: se usará la voz del sistema.';
    }
    const uri =
      settings.ttsProvider === 'openai'
        ? await fetchOpenAITTS(sample, settings)
        : await fetchElevenLabs(sample, settings);
    return `Voz generada correctamente (${uri.split('/').pop()}).`;
  } catch (e: any) {
    return `Error: ${String(e?.message ?? e)}`;
  }
}
