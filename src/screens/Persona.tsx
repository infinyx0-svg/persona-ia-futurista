import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useApp } from '../state/AppContext';
import { palette, radius, spacing } from '../theme';
import { AnimeAvatar } from '../components/AnimeAvatar';
import { AuroraBackground } from '../components/AuroraBackground';
import { EMOTION_LABELS, emotionColor, timeContext } from '../engine/emotion';
import { currentOutfit } from '../engine/wardrobe';
import { routineFor } from '../engine/emotion';

export function PersonaScreen() {
  const { data, sendMessage, typing, setTab } = useApp();
  const primary = data.primary;
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [subtitles, setSubtitles] = useState(data.settings.subtitles);
  const [privateText, setPrivateText] = useState('');
  const [showPrivate, setShowPrivate] = useState(false);
  const [lastLine, setLastLine] = useState<string>('');
  const pulse = useRef(new Animated.Value(0)).current;

  const messages = data.messages.filter((m) => m.characterId === primary?.id);
  const lastCharMsg = [...messages].reverse().find((m) => m.from === 'character');

  useEffect(() => {
    if (lastCharMsg) setLastLine(lastCharMsg.text);
  }, [lastCharMsg?.id]);

  useEffect(() => {
    if (!listening) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [listening, pulse]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!primary) return null;

  const outfit = currentOutfit(data.wardrobe);
  const ctx = timeContext(data.world?.weather ?? 'nublado');

  const speakLast = () => {
    if (!lastLine) return;
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    Speech.speak(lastLine, {
      language: 'es-ES',
      rate: data.settings.voiceRate,
      pitch: data.settings.voice === 'anime' ? 1.35 : data.settings.voice === 'madura' ? 0.85 : 1.05,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  const toggleMic = () => {
    if (listening) {
      setListening(false);
      return;
    }
    setListening(true);
    if (data.settings.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Micrófono activo',
      Platform.OS === 'web'
        ? 'En el navegador el reconocimiento de voz del sistema no está disponible en esta versión. Usa el modo privado para escribir.'
        : 'El reconocimiento de voz continuo necesita un build de desarrollo con expo-speech-recognition (no funciona en Expo Go). Mientras tanto, usa el modo privado para escribir: ella responderá igual, y lo que escribas no se muestra en pantalla si lo cierras.',
      [{ text: 'Entendido', onPress: () => setListening(false) }],
    );
  };

  const sendPrivate = async () => {
    const t = privateText.trim();
    if (!t) return;
    setPrivateText('');
    setShowPrivate(false);
    await sendMessage(t);
  };

  return (
    <View style={styles.fill}>
      <AuroraBackground theme={data.settings.theme} perfMode={data.settings.perfMode} dim />

      <View style={styles.topBar}>
        <Pressable onPress={() => setTab('chat')}>
          <Text style={styles.back}>← Teléfono</Text>
        </Pressable>
        <View style={styles.modePill}>
          <Text style={styles.modeText}>EN PERSONA</Text>
        </View>
        <Pressable onPress={() => setSubtitles((v) => !v)}>
          <Text style={[styles.back, { color: subtitles ? palette.accent3 : palette.textFaint }]}>
            {subtitles ? 'CC on' : 'CC off'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.stage}>
        <AnimeAvatar
          character={primary}
          emotion={data.emotion.key}
          outfit={outfit}
          size={300}
          speaking={speaking}
        />
      </View>

      <View style={styles.infoBlock}>
        <Text style={styles.name}>{primary.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <View style={[styles.dot, { backgroundColor: emotionColor(data.emotion.key) }]} />
          <Text style={styles.state}>
            {EMOTION_LABELS[data.emotion.key].toLowerCase()} · {routineFor(primary, ctx)}
          </Text>
        </View>
      </View>

      {subtitles && lastLine ? (
        <View style={styles.subtitleBox}>
          <Text style={styles.subtitleText}>{lastLine}</Text>
        </View>
      ) : null}

      {typing ? (
        <View style={styles.subtitleBox}>
          <Text style={[styles.subtitleText, { color: palette.textFaint }]}>…</Text>
        </View>
      ) : null}

      {showPrivate ? (
        <View style={styles.privateBox}>
          <TextInput
            value={privateText}
            onChangeText={setPrivateText}
            placeholder="Escribe en privado…"
            placeholderTextColor={palette.textFaint}
            style={styles.privateInput}
            autoFocus
            multiline
          />
          <Pressable onPress={sendPrivate} style={styles.privateSend}>
            <Text style={{ color: '#05070F', fontWeight: '900', fontSize: 16 }}>↑</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.controls}>
        <Pressable onPress={() => setShowPrivate((v) => !v)} style={styles.sideBtn}>
          <Text style={{ fontSize: 20 }}>⌨️</Text>
          <Text style={styles.sideLabel}>Privado</Text>
        </Pressable>

        <Pressable onPress={toggleMic} style={styles.micWrap}>
          <Animated.View
            style={[
              styles.micRing,
              {
                opacity: listening ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }) : 0.12,
                transform: [{ scale: listening ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) : 1 }],
              },
            ]}
          />
          <View style={[styles.mic, listening && { backgroundColor: palette.danger }]}>
            <Text style={{ fontSize: 26 }}>{listening ? '⏹' : '🎙️'}</Text>
          </View>
        </Pressable>

        <Pressable onPress={speakLast} style={styles.sideBtn}>
          <Text style={{ fontSize: 20 }}>{speaking ? '⏸️' : '🔊'}</Text>
          <Text style={styles.sideLabel}>{speaking ? 'Parar' : 'Oír'}</Text>
        </Pressable>
      </View>

      <Text style={styles.hint}>
        {listening
          ? 'Micrófono activo. Ella te escucha.'
          : 'Toca el micrófono para hablar. Al salir de En persona, el micrófono se apaga.'}
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickRow} contentContainerStyle={{ paddingHorizontal: spacing(4) }}>
        {['¿Cómo estás?', 'Cuéntame algo de tu día', 'Tengo un examen', 'Me siento cansado'].map((q) => (
          <Pressable key={q} onPress={() => sendMessage(q)} style={styles.quickChip}>
            <Text style={styles.quickText}>{q}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: palette.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(4),
    paddingTop: Platform.OS === 'ios' ? spacing(14) : spacing(10),
  },
  back: { color: palette.textDim, fontSize: 13 },
  modePill: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(34,211,238,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(34,211,238,0.38)',
  },
  modeText: { color: palette.accent3, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  infoBlock: { alignItems: 'center', marginBottom: spacing(3) },
  name: { color: palette.text, fontSize: 24, fontWeight: '800', marginBottom: spacing(1) },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  state: { color: palette.textDim, fontSize: 12.5 },
  subtitleBox: {
    marginHorizontal: spacing(6),
    marginBottom: spacing(3),
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
    borderRadius: radius.md,
    backgroundColor: 'rgba(6,9,20,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.20)',
  },
  subtitleText: { color: palette.text, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  privateBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginHorizontal: spacing(4),
    marginBottom: spacing(3),
    backgroundColor: 'rgba(13,20,38,0.94)',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
    padding: spacing(2),
  },
  privateInput: { flex: 1, color: palette.text, fontSize: 14.5, paddingHorizontal: spacing(2), maxHeight: 90 },
  privateSend: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.accent3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing(8),
    marginBottom: spacing(3),
  },
  sideBtn: { alignItems: 'center', width: 70 },
  sideLabel: { color: palette.textFaint, fontSize: 10.5, marginTop: 4 },
  micWrap: { alignItems: 'center', justifyContent: 'center', width: 96, height: 96 },
  micRing: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: palette.accent,
  },
  mic: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.accent2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    color: palette.textFaint,
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: spacing(8),
    marginBottom: spacing(3),
    lineHeight: 16,
  },
  quickRow: { marginBottom: Platform.OS === 'ios' ? spacing(8) : spacing(4) },
  quickChip: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(13,20,38,0.88)',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
    marginRight: spacing(2),
  },
  quickText: { color: palette.textDim, fontSize: 12.5 },
});
