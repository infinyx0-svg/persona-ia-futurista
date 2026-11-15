import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { VIEWER_HTML } from './viewerHtml';
import type { Emotion } from '../types';

export interface Avatar3DHandle {
  setEmotion: (e: Emotion) => void;
  setSpeaking: (on: boolean) => void;
  setLevel: (v: number) => void;
  look: (x: number, y: number) => void;
  zoom: (z: number) => void;
}

interface Props {
  emotion?: Emotion;
  speaking?: boolean;
  zoom?: number;
  compact?: boolean;
  onReady?: () => void;
  onError?: (msg: string) => void;
  style?: any;
}

/**
 * Version web del visor 3D: usa un <iframe> con el mismo bundle que el WebView
 * de Android. Sirve para previsualizar la app en el navegador y para capturas.
 */
const Avatar3D = forwardRef<Avatar3DHandle, Props>(function Avatar3D(
  { emotion = 'neutral', speaking = false, zoom = 0, compact = false, onReady, onError, style },
  ref
) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const sentRef = useRef(false);
  const pendingEmotion = useRef<Emotion>(emotion);
  const pendingSpeaking = useRef(speaking);

  const inject = useCallback((js: string) => {
    const w = frameRef.current?.contentWindow as any;
    if (w) {
      try {
        w.eval(js);
      } catch {
        /* noop */
      }
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      setEmotion: (e: Emotion) => {
        pendingEmotion.current = e;
        inject(`window.PersonaViewer && window.PersonaViewer.setEmotion(${JSON.stringify(e)})`);
      },
      setSpeaking: (on: boolean) => {
        pendingSpeaking.current = on;
        inject(`window.PersonaViewer && window.PersonaViewer.setSpeaking(${on})`);
      },
      setLevel: (v: number) => inject(`window.PersonaViewer && window.PersonaViewer.setLevel(${v})`),
      look: (x: number, y: number) =>
        inject(`window.PersonaViewer && window.PersonaViewer.look(${x}, ${y})`),
      zoom: (z: number) => inject(`window.PersonaViewer && window.PersonaViewer.zoom(${z})`),
    }),
    [inject]
  );

  const sendVRM = useCallback(async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    try {
      const res = await fetch('/assets/vrm/avatar_opt.vrm');
      if (!res.ok) throw new Error(`No se pudo leer el VRM (${res.status})`);
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(i, i + chunk)) as unknown as number[]
        );
      }
      const b64 = btoa(binary);
      const CHUNK = 400_000;
      const total = Math.ceil(b64.length / CHUNK);
      for (let i = 0; i < total; i++) {
        const part = b64.slice(i * CHUNK, (i + 1) * CHUNK);
        inject(
          `window.PersonaViewer && window.PersonaViewer.chunk(${i}, ${total}, ${JSON.stringify(part)})`
        );
        await new Promise((r) => setTimeout(r, 8));
      }
    } catch (e: any) {
      const m = String(e?.message ?? e);
      setErrMsg(m);
      setStatus('error');
      onError?.(m);
    }
  }, [inject, onError]);

  // escuchar los mensajes del iframe
  useEffect(() => {
    const handler = (ev: MessageEvent) => {
      if (ev.source !== frameRef.current?.contentWindow) return;
      let msg: any;
      try {
        msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
      } catch {
        return;
      }
      if (msg?.type === 'booted') {
        sendVRM();
      } else if (msg?.type === 'ready') {
        setStatus('ready');
        onReady?.();
        inject(
          `window.PersonaViewer.setEmotion(${JSON.stringify(pendingEmotion.current)});` +
            `window.PersonaViewer.setSpeaking(${pendingSpeaking.current});` +
            `window.PersonaViewer.zoom(${zoom});` +
            `window.PersonaViewer.compact(${compact});`
        );
      } else if (msg?.type === 'error') {
        setErrMsg(String(msg.message ?? 'error'));
        setStatus('error');
        onError?.(String(msg.message ?? 'error'));
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [inject, onReady, onError, sendVRM, zoom, compact]);

  useEffect(() => {
    if (status === 'ready') {
      inject(`window.PersonaViewer && window.PersonaViewer.setEmotion(${JSON.stringify(emotion)})`);
    }
  }, [emotion, status, inject]);

  useEffect(() => {
    if (status === 'ready') {
      inject(`window.PersonaViewer && window.PersonaViewer.setSpeaking(${speaking})`);
    }
  }, [speaking, status, inject]);

  useEffect(() => {
    if (status === 'ready') {
      inject(`window.PersonaViewer && window.PersonaViewer.zoom(${zoom})`);
    }
  }, [zoom, status, inject]);

  useEffect(() => {
    if (status === 'ready') {
      inject(`window.PersonaViewer && window.PersonaViewer.compact(${compact})`);
    }
  }, [compact, status, inject]);

  return (
    <View style={[styles.wrap, style]}>
      {/* @ts-ignore — iframe solo existe en web */}
      <iframe
        ref={frameRef as any}
        srcDoc={VIEWER_HTML}
        style={{
          border: 'none',
          width: '100%',
          height: '100%',
          background: 'transparent',
          display: 'block',
        }}
        title="personaje-3d"
      />
      {status !== 'ready' && (
        <View style={styles.overlay} pointerEvents="none">
          {status === 'loading' ? (
            <>
              <ActivityIndicator color="#8B5CF6" size="large" />
              <Text style={styles.loadingText}>Cargando personaje 3D…</Text>
            </>
          ) : (
            <Text style={styles.errorText}>
              No se pudo cargar el personaje{'\n'}
              {errMsg}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'transparent' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#A78BFA', fontSize: 13, letterSpacing: 0.4 },
  errorText: { color: '#F87171', fontSize: 12, textAlign: 'center', paddingHorizontal: 24 },
});

export default Avatar3D;
