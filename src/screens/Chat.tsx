import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { useApp } from '../state/AppContext';
import { palette, radius, spacing } from '../theme';
import { ChatMessage } from '../types';
import { EMOTION_LABELS, emotionColor } from '../engine/emotion';
import { WEATHER_EMOJI, WEATHER_LABEL } from '../engine/world';
import { STAGE_LABELS } from '../engine/relationship';
import { AnimeAvatar } from '../components/AnimeAvatar';
import { AuroraBackground } from '../components/AuroraBackground';
import { currentOutfit } from '../engine/wardrobe';

const STICKERS = ['💜', '😊', '😴', '🔥', '🥺', '😂', '🌙', '☕', '🎧', '✨'];

export function ChatScreen() {
  const { data, sendMessage, sendSticker, typing, messagesFor, setTab, streamingText, llmError, llmActive, retryLast } = useApp();
  const primary = data.primary;
  const [text, setText] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const messages = primary ? messagesFor(primary.id) : [];

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
    }
  }, [messages.length, typing]);

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  if (!primary) return null;

  const speak = (m: ChatMessage) => {
    if (speakingId === m.id) {
      Speech.stop();
      setSpeakingId(null);
      return;
    }
    Speech.stop();
    setSpeakingId(m.id);
    Speech.speak(m.text, {
      language: 'es-ES',
      rate: data.settings.voiceRate,
      pitch: data.settings.voice === 'anime' ? 1.35 : data.settings.voice === 'madura' ? 0.85 : 1.05,
      onDone: () => setSpeakingId(null),
      onStopped: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    });
  };

  const submit = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    if (data.settings.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await sendMessage(t);
  };

  const outfit = currentOutfit(data.wardrobe);

  return (
    <View style={styles.fill}>
      <AuroraBackground theme={data.settings.theme} perfMode={data.settings.perfMode} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => setTab('persona')} style={styles.avatarBtn}>
          <AnimeAvatar character={primary} emotion={data.emotion.key} outfit={outfit} size={44} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerName}>{primary.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.dot, { backgroundColor: emotionColor(data.emotion.key) }]} />
            <Text style={styles.headerSub}>
              {typing ? 'escribiendo…' : EMOTION_LABELS[data.emotion.key].toLowerCase()}
              {' · '}
              {STAGE_LABELS[data.relationship.stage].toLowerCase()}
              {llmActive ? ' · IA' : ''}
            </Text>
          </View>
        </View>
        <View style={styles.weatherPill}>
          <Text style={styles.weatherText}>
            {data.world ? `${WEATHER_EMOJI[data.world.weather]} ${WEATHER_LABEL[data.world.weather]}` : '—'}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: spacing(4), paddingBottom: spacing(6) }}
          renderItem={({ item }) => <Bubble message={item} onSpeak={() => speak(item)} speaking={speakingId === item.id} />}
          ListFooterComponent={
            streamingText ? (
              <View style={{ alignItems: 'flex-start', marginBottom: spacing(2.5) }}>
                <View style={[styles.bubble, styles.bubbleTheirs]}>
                  <Text style={styles.bubbleText}>
                    {streamingText}
                    <Text style={styles.streamCaret}> ▮</Text>
                  </Text>
                </View>
              </View>
            ) : typing ? (
              <View style={styles.typingWrap}>
                <View style={styles.typingBubble}>
                  <Text style={styles.typingDots}>• • •</Text>
                </View>
              </View>
            ) : null
          }
        />

        {llmError ? (
          <View style={styles.errorBar}>
            <Text style={styles.errorText}>{llmError}</Text>
            <Pressable onPress={retryLast} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {showStickers ? (
          <View style={styles.stickerBar}>
            {STICKERS.map((s) => (
              <Pressable
                key={s}
                onPress={async () => {
                  setShowStickers(false);
                  await sendSticker(s);
                }}
                style={styles.stickerBtn}
              >
                <Text style={{ fontSize: 24 }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.inputBar}>
          <Pressable onPress={() => setShowStickers((v) => !v)} style={styles.iconBtn}>
            <Text style={{ fontSize: 20 }}>{showStickers ? '⌨️' : '😊'}</Text>
          </Pressable>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Escríbele a ${primary.name}…`}
            placeholderTextColor={palette.textFaint}
            style={styles.input}
            multiline
            maxLength={1200}
            onSubmitEditing={submit}
            blurOnSubmit={false}
          />
          <Pressable onPress={submit} style={[styles.sendBtn, !text.trim() && { opacity: 0.4 }]}>
            <Text style={styles.sendIcon}>↑</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({
  message,
  onSpeak,
  speaking,
}: {
  message: ChatMessage;
  onSpeak: () => void;
  speaking: boolean;
}) {
  if (message.from === 'system') {
    return (
      <View style={{ alignItems: 'center', marginVertical: spacing(3) }}>
        <Text style={styles.systemText}>{message.text}</Text>
      </View>
    );
  }

  const mine = message.from === 'user';

  if (message.kind === 'sticker') {
    return (
      <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: spacing(2) }}>
        <Text style={{ fontSize: 44 }}>{message.text}</Text>
      </View>
    );
  }

  return (
    <View style={{ alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: spacing(2.5) }}>
      <Pressable
        onLongPress={onSpeak}
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleTheirs,
          speaking && { borderColor: palette.accent3, borderWidth: 1 },
        ]}
      >
        {message.actions.length > 0 ? (
          <Text style={styles.actionText}>{message.actions.join(' · ')}</Text>
        ) : null}
        <Text style={[styles.bubbleText, mine && { color: '#fff' }]}>{message.text}</Text>
      </Pressable>
      <Text style={styles.timeText}>
        {new Date(message.at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
        {!mine ? '  ·  mantén para oír' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(4),
    paddingTop: Platform.OS === 'ios' ? spacing(14) : spacing(10),
    paddingBottom: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120,160,255,0.16)',
    backgroundColor: 'rgba(6,9,20,0.86)',
  },
  avatarBtn: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', marginRight: spacing(3), backgroundColor: palette.surface },
  headerName: { color: palette.text, fontWeight: '700', fontSize: 16 },
  headerSub: { color: palette.textFaint, fontSize: 11.5, marginLeft: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  weatherPill: {
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(76,141,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
  },
  weatherText: { color: palette.textDim, fontSize: 11 },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2.8),
    borderRadius: radius.lg,
  },
  bubbleMine: { backgroundColor: palette.bubbleUser, borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: 'rgba(20,29,51,0.94)',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.20)',
  },
  bubbleText: { color: palette.bubbleCharText, fontSize: 15, lineHeight: 22 },
  actionText: {
    color: palette.action,
    fontSize: 12.5,
    fontStyle: 'italic',
    marginBottom: spacing(1.5),
    lineHeight: 18,
  },
  timeText: { color: palette.textFaint, fontSize: 10, marginTop: 3, marginHorizontal: 4 },
  systemText: { color: palette.textFaint, fontSize: 11.5, fontStyle: 'italic' },
  typingWrap: { alignItems: 'flex-start', marginBottom: spacing(2) },
  typingBubble: {
    backgroundColor: palette.bubbleChar,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2.5),
    borderRadius: radius.lg,
    borderBottomLeftRadius: 6,
  },
  typingDots: { color: palette.textDim, fontSize: 14, letterSpacing: 2 },
  streamCaret: { color: palette.accent3 },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing(3),
    marginBottom: spacing(2),
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2.5),
    borderRadius: radius.md,
    backgroundColor: 'rgba(251,113,133,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(251,113,133,0.45)',
  },
  errorText: { flex: 1, color: palette.danger, fontSize: 12.5, lineHeight: 18, marginRight: spacing(2) },
  retryBtn: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: palette.danger,
  },
  retryText: { color: '#05070F', fontSize: 12, fontWeight: '800' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing(3),
    paddingTop: spacing(2.5),
    paddingBottom: Platform.OS === 'ios' ? spacing(8) : spacing(3),
    borderTopWidth: 1,
    borderTopColor: 'rgba(120,160,255,0.16)',
    backgroundColor: 'rgba(6,9,20,0.94)',
  },
  iconBtn: { padding: spacing(2.5), marginBottom: 2 },
  input: {
    flex: 1,
    backgroundColor: 'rgba(13,20,38,0.92)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing(4),
    paddingTop: spacing(3),
    paddingBottom: spacing(3),
    color: palette.text,
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing(2),
    marginBottom: 1,
  },
  sendIcon: { color: '#05070F', fontSize: 20, fontWeight: '900' },
  stickerBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(2),
    backgroundColor: 'rgba(9,14,28,0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(120,160,255,0.16)',
  },
  stickerBtn: { padding: spacing(2) },
});
