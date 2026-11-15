import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar3D, { type Avatar3DHandle } from '../components/Avatar3D';
import { C, GRAD, R } from '../theme';
import type { Emotion, Message, PersonaState, Settings } from '../types';
import { EMOTION_EMOJI, EMOTION_LABEL } from '../types';
import { generateReply, fallbackAction } from '../engine/llm';
import {
  bondFor,
  evolveTraits,
  evolveTrust,
  extractFacts,
  mergeFacts,
  pickEmotion,
  stageFor,
} from '../engine/personality';
import { speak, stop as stopVoice } from '../engine/voice';

interface Props {
  persona: PersonaState;
  settings: Settings;
  messages: Message[];
  emotion: Emotion;
  onUpdate: (p: PersonaState, m: Message[]) => void;
  onEmotion: (e: Emotion) => void;
  onBack: () => void;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export default function PersonaMode({
  persona,
  settings,
  messages,
  emotion,
  onUpdate,
  onEmotion,
  onBack,
}: Props) {
  const avatarRef = useRef<Avatar3DHandle>(null);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // el ultimo mensaje de la persona es el que se muestra como subtitulo
  const lastPersonaMsg = [...messages].reverse().find((m) => m.role === 'persona');
  const [caption, setCaption] = useState<string>(lastPersonaMsg?.text ?? '');
  const [action, setAction] = useState<string>(lastPersonaMsg?.action ?? '');

  useEffect(() => {
    if (lastPersonaMsg) {
      setCaption(lastPersonaMsg.text);
      setAction(lastPersonaMsg.action ?? '');
    }
  }, [lastPersonaMsg?.id]);

  useEffect(() => {
    avatarRef.current?.setEmotion(emotion);
  }, [emotion]);

  useEffect(() => {
    avatarRef.current?.setSpeaking(speaking);
  }, [speaking]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;
    setInput('');
    setError('');

    const userMsg: Message = { id: uid(), role: 'user', text, ts: Date.now() };
    const withUser = [...messages, userMsg];
    onUpdate(persona, withUser);
    setTyping(true);
    onEmotion('pensativa');

    try {
      const reply = await generateReply(persona, settings, messages, text);

      const traits = evolveTraits(persona.traits, text, persona.turns);
      const trust = evolveTrust(persona, text);
      const turns = persona.turns + 1;
      const stage = stageFor(trust, turns);
      const facts = mergeFacts(persona.facts, extractFacts(text));
      const emo = pickEmotion(reply.emotion, traits, text);

      const nextPersona: PersonaState = {
        ...persona,
        traits,
        trust,
        turns,
        stage,
        facts,
        bond: bondFor(stage, traits),
      };

      const personaMsg: Message = {
        id: uid(),
        role: 'persona',
        text: reply.text,
        ts: Date.now(),
        emotion: emo,
        action: reply.action || fallbackAction(emo),
      };

      onUpdate(nextPersona, [...withUser, personaMsg]);
      onEmotion(emo);
      setCaption(reply.text);
      setAction(personaMsg.action ?? '');

      if (settings.autoSpeak) {
        speak(reply.text, settings, {
          onStart: () => setSpeaking(true),
          onEnd: () => setSpeaking(false),
          onError: () => setSpeaking(false),
        });
      }
    } catch (e: any) {
      setError(String(e?.message ?? e).slice(0, 160));
      onEmotion('neutral');
    } finally {
      setTyping(false);
    }
  }, [input, typing, messages, persona, settings, onUpdate, onEmotion]);

  return (
    <View style={styles.root}>
      {/* fondo con degradado futurista */}
      <LinearGradient colors={GRAD.aurora} style={StyleSheet.absoluteFill} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* barra superior */}
      <View style={styles.topBar}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View style={styles.topCenter}>
          <Text style={styles.topName}>{persona.name}</Text>
          <Text style={styles.topStage}>
            {EMOTION_EMOJI[emotion]} {EMOTION_LABEL[emotion]}
          </Text>
        </View>
        <Pressable
          onPress={() => {
            const z = zoom > 0.5 ? 0 : 1;
            setZoom(z);
            avatarRef.current?.zoom(z);
          }}
          style={styles.zoomBtn}
        >
          <Text style={styles.zoomText}>{zoom > 0.5 ? '1x' : '2x'}</Text>
        </Pressable>
      </View>

      {/* personaje 3D */}
      <View style={styles.stage}>
        <Avatar3D
          ref={avatarRef}
          emotion={emotion}
          speaking={speaking}
          zoom={zoom}
          onError={(m) => setError(m.slice(0, 160))}
        />
      </View>

      {/* subtitulo con lo que dice */}
      <View style={styles.captionWrap} pointerEvents="none">
        {!!action && <Text style={styles.actionText}>* {action} *</Text>}
        {!!caption && (
          <View style={styles.captionBubble}>
            <Text style={styles.captionText} numberOfLines={4}>
              {caption}
            </Text>
          </View>
        )}
        {typing && (
          <View style={styles.thinkingRow}>
            <ActivityIndicator size="small" color={C.violetSoft} />
            <Text style={styles.thinkingText}>pensando…</Text>
          </View>
        )}
      </View>

      {!!error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
        </View>
      )}

      {/* entrada */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={`Habla con ${persona.name}…`}
            placeholderTextColor={C.textFaint}
            multiline
            maxLength={1200}
          />
          <Pressable
            onPress={send}
            disabled={!input.trim() || typing}
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || typing) && styles.sendBtnOff,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  glowTop: {
    position: 'absolute',
    top: -140,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(139,92,246,0.22)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -120,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(34,211,238,0.12)',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(26,23,48,0.8)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: C.text, fontSize: 26, lineHeight: 30, marginTop: -3 },
  topCenter: { flex: 1, alignItems: 'center' },
  topName: { color: C.text, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  topStage: { color: C.violetSoft, fontSize: 11.5, marginTop: 2 },
  zoomBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(26,23,48,0.8)',
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: { color: C.cyanSoft, fontSize: 12, fontWeight: '700' },

  stage: { flex: 1, marginTop: -10 },

  captionWrap: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    minHeight: 70,
    justifyContent: 'flex-end',
  },
  actionText: {
    color: C.cyanSoft,
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: 6,
    textAlign: 'center',
    opacity: 0.85,
  },
  captionBubble: {
    backgroundColor: 'rgba(18,16,31,0.86)',
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  captionText: { color: C.text, fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  thinkingText: { color: C.textDim, fontSize: 12 },

  errorBar: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  errorText: { color: C.red, fontSize: 11.5 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 14,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 110,
    backgroundColor: 'rgba(18,16,31,0.9)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: C.panel2 },
  sendIcon: { color: '#fff', fontSize: 17, marginLeft: 2 },
});
