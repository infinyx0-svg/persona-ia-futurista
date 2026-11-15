import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GRAD, R } from '../theme';
import type { Emotion, Message, PersonaState, Settings } from '../types';
import { EMOTION_EMOJI } from '../types';
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
  onUpdate: (p: PersonaState, m: Message[]) => void;
  onEmotion: (e: Emotion) => void;
  onSpeaking: (on: boolean) => void;
  onOpenPersona: () => void;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function timeLabel(ts: number) {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export default function PhoneMode({
  persona,
  settings,
  messages,
  onUpdate,
  onEmotion,
  onSpeaking,
  onOpenPersona,
}: Props) {
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  const scrollDown = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => {
    scrollDown();
  }, [messages.length, scrollDown]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || typing) return;

    setInput('');
    setError('');

    const userMsg: Message = { id: uid(), role: 'user', text, ts: Date.now() };
    const withUser = [...messages, userMsg];
    onUpdate(persona, withUser);
    scrollDown();

    setTyping(true);
    onEmotion('pensativa');

    try {
      const reply = await generateReply(persona, settings, messages, text);

      // evolucion de la personalidad
      const traits = evolveTraits(persona.traits, text, persona.turns);
      const trust = evolveTrust(persona, text);
      const turns = persona.turns + 1;
      const stage = stageFor(trust, turns);
      const facts = mergeFacts(persona.facts, extractFacts(text));
      const emotion = pickEmotion(reply.emotion, traits, text);

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
        emotion,
        action: reply.action || fallbackAction(emotion),
      };

      const all = [...withUser, personaMsg];
      onUpdate(nextPersona, all);
      onEmotion(emotion);
      scrollDown();

      // voz automatica despues de mostrar el texto
      if (settings.autoSpeak) {
        speak(reply.text, settings, {
          onStart: () => onSpeaking(true),
          onEnd: () => onSpeaking(false),
          onError: () => onSpeaking(false),
        });
      }
    } catch (e: any) {
      setError(String(e?.message ?? e).slice(0, 160));
      onEmotion('neutral');
    } finally {
      setTyping(false);
    }
  }, [input, typing, messages, persona, settings, onUpdate, onEmotion, onSpeaking, scrollDown]);

  const renderItem = ({ item }: { item: Message }) => {
    const mine = item.role === 'user';
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowThem]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleThem]}>
          <Text style={[styles.msgText, mine && styles.msgTextMine]}>{item.text}</Text>
          <View style={styles.metaRow}>
            <Text style={[styles.time, mine && styles.timeMine]}>{timeLabel(item.ts)}</Text>
            {mine && <Text style={styles.tick}>✓✓</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* cabecera tipo WhatsApp */}
      <View style={styles.header}>
        <Pressable onPress={onOpenPersona} style={styles.avatarBtn}>
          <LinearGradient colors={GRAD.violet} style={styles.avatar}>
            <Text style={styles.avatarLetter}>{persona.name.charAt(0)}</Text>
          </LinearGradient>
          <View style={styles.onlineDot} />
        </Pressable>

        <View style={styles.headerText}>
          <Text style={styles.headerName}>{persona.name}</Text>
          <Text style={styles.headerStatus}>
            {typing ? 'escribiendo…' : 'en línea'}
          </Text>
        </View>

        <Pressable onPress={onOpenPersona} style={styles.headerAction}>
          <Text style={styles.headerActionText}>3D</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={scrollDown}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Empieza la conversación</Text>
            <Text style={styles.emptyText}>
              {persona.name} está esperando. Escríbele algo y verás cómo va tomando
              confianza contigo.
            </Text>
          </View>
        }
        ListFooterComponent={
          typing ? (
            <View style={[styles.row, styles.rowThem]}>
              <View style={[styles.bubble, styles.bubbleThem, styles.typingBubble]}>
                <ActivityIndicator size="small" color={C.violetSoft} />
                <Text style={styles.typingText}>{persona.name} está escribiendo…</Text>
              </View>
            </View>
          ) : null
        }
      />

      {!!error && (
        <View style={styles.errorBar}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
        </View>
      )}

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe un mensaje"
          placeholderTextColor={C.textFaint}
          multiline
          maxLength={1200}
          onSubmitEditing={send}
          blurOnSubmit={false}
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
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 54,
    paddingBottom: 12,
    backgroundColor: C.panel,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
    gap: 12,
  },
  avatarBtn: { position: 'relative' },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: C.green,
    borderWidth: 2,
    borderColor: C.panel,
  },
  headerText: { flex: 1 },
  headerName: { color: C.text, fontSize: 16, fontWeight: '700' },
  headerStatus: { color: C.violetSoft, fontSize: 11.5, marginTop: 1 },
  headerAction: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: R.pill,
    backgroundColor: C.panel2,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerActionText: { color: C.cyanSoft, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  list: { paddingHorizontal: 12, paddingVertical: 16, flexGrow: 1 },

  row: { flexDirection: 'row', marginBottom: 8 },
  rowMine: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },

  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
  },
  bubbleMine: {
    backgroundColor: C.bubbleMe,
    borderBottomRightRadius: 5,
  },
  bubbleThem: {
    backgroundColor: C.bubbleThem,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: C.borderSoft,
  },
  msgText: { color: C.text, fontSize: 15, lineHeight: 21 },
  msgTextMine: { color: '#F5F3FF' },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 3,
  },
  time: { color: C.textFaint, fontSize: 10 },
  timeMine: { color: 'rgba(255,255,255,0.6)' },
  tick: { color: C.cyanSoft, fontSize: 10 },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { color: C.textDim, fontSize: 12.5 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, paddingTop: 80 },
  emptyTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 8 },
  emptyText: { color: C.textDim, fontSize: 13.5, textAlign: 'center', lineHeight: 20 },

  errorBar: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(248,113,113,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorText: { color: C.red, fontSize: 11.5 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 26 : 12,
    backgroundColor: C.panel,
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    backgroundColor: C.panel2,
    borderRadius: 21,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    color: C.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: C.border,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.violet,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnOff: { backgroundColor: C.panel2 },
  sendIcon: { color: '#fff', fontSize: 17, marginLeft: 2 },
});
