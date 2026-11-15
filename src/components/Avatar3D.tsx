import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
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
  /** 0 = plano medio, 1 = primer plano */
  zoom?: number;
  onReady?: () => void;
  onError?: (msg: string) => void;
  style?: any;
}

const CHUNK = 400_000; // caracteres base64 por mensaje

/**
 * Visor 3D del personaje VRM.
 *
 * El VRM se lee del bundle, se convierte a base64 y se envia al WebView por
 * trozos (un solo mensaje de 8 MB bloquea el puente de React Native).
 */
const Avatar3D = forwardRef<Avatar3DHandle, Props>(function Avatar3D(
  { emotion = 'neutral', speaking = false, zoom = 0, onReady, onError, style },
  ref
) {
  const webRef = useRef<WebView>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errMsg, setErrMsg] = useState('');
  const bootedRef = useRef(false);
  const sentRef = useRef(false);
  const pendingEmotion = useRef<Emotion>(emotion);
  const pendingSpeaking = useRef(speaking);

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`${js}; true;`);
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
      setLevel: (v: number) => {
        inject(`window.PersonaViewer && window.PersonaViewer.setLevel(${v})`);
      },
      look: (x: number, y: number) => {
        inject(`window.PersonaViewer && window.PersonaViewer.look(${x}, ${y})`);
      },
      zoom: (z: number) => {
        inject(`window.PersonaViewer && window.PersonaViewer.zoom(${z})`);
      },
    }),
    [inject]
  );

  // enviar el VRM cuando el visor avisa de que esta listo
  const sendVRM = useCallback(async () => {
    if (sentRef.current) return;
    sentRef.current = true;
    try {
      const asset = Asset.fromModule(require('../../assets/vrm/avatar_opt.vrm'));
      await asset.downloadAsync();
      const uri = asset.localUri || asset.uri;

      const b64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const total = Math.ceil(b64.length / CHUNK);
      for (let i = 0; i < total; i++) {
        const part = b64.slice(i * CHUNK, (i + 1) * CHUNK);
        inject(
          `window.PersonaViewer && window.PersonaViewer.chunk(${i}, ${total}, ${JSON.stringify(part)})`
        );
        // ceder el hilo entre trozos
        await new Promise((r) => setTimeout(r, 12));
      }
    } catch (e: any) {
      const m = String(e?.message ?? e);
      setErrMsg(m);
      setStatus('error');
      onError?.(m);
    }
  }, [inject, onError]);

  const onMessage = useCallback(
    (ev: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.nativeEvent.data);
      } catch {
        return;
      }
      if (msg.type === 'booted') {
        bootedRef.current = true;
        sendVRM();
      } else if (msg.type === 'ready') {
        setStatus('ready');
        onReady?.();
        // aplicar estado pendiente
        inject(
          `window.PersonaViewer.setEmotion(${JSON.stringify(pendingEmotion.current)});` +
            `window.PersonaViewer.setSpeaking(${pendingSpeaking.current});` +
            `window.PersonaViewer.zoom(${zoom});`
        );
      } else if (msg.type === 'error') {
        setErrMsg(String(msg.message ?? 'error'));
        setStatus('error');
        onError?.(String(msg.message ?? 'error'));
      }
    },
    [inject, onReady, onError, sendVRM, zoom]
  );

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

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        source={{ html: VIEWER_HTML }}
        originWhitelist={['*']}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        androidLayerType="hardware"
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        overScrollMode="never"
        style={styles.web}
        containerStyle={styles.web}
      />
      {status !== 'ready' && (
        <View style={styles.overlay} pointerEvents="none">
          {status === 'loading' ? (
            <>
              <ActivityIndicator color="#8B5CF6" size="large" />
              <Text style={styles.loadingText}>Cargando personaje 3D…</Text>
            </>
          ) : (
            <Text style={styles.errorText}>No se pudo cargar el personaje{'\n'}{errMsg}</Text>
          )}
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: 'transparent' },
  web: { flex: 1, backgroundColor: 'transparent' },
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
