import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { theme } from '../shared/theme';
import { CharacterConfig, ChatMessage, MemoryItem } from '../shared/persona';
import { MessageBubble } from '../components/MessageBubble';
import { ChatComposer } from '../components/ChatComposer';
import { CHAR_KEY, HISTORY_KEY, MEM_KEY, callLLM, loadJson, NoServerError, saveJson } from '../lib/llm';

export default function ChatScreen() {
  const [character, setCharacter] = useState<CharacterConfig | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const [c, h, m] = await Promise.all([
        loadJson<CharacterConfig>(CHAR_KEY),
        loadJson<ChatMessage[]>(HISTORY_KEY),
        loadJson<MemoryItem[]>(MEM_KEY),
      ]);
      if (!c) return;
      setCharacter(c);
      setHistory(h ?? []);
      setMemories(m ?? []);
    })();
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!character || !text.trim() || pending) return;
      const userMsg: ChatMessage = { role: 'user', content: text.trim(), createdAt: Date.now() };
      const next = [...history, userMsg];
      setHistory(next);
      await saveJson(HISTORY_KEY, next);
      setPending(true);
      setError(null);
      try {
        const res = await callLLM({
          character,
          isNew: history.length === 0,
          history: next.slice(-30),
          memories,
          userMessage: userMsg.content,
        });
        const reply: ChatMessage = { role: 'assistant', content: String(res.reply || '…').trim(), createdAt: Date.now() };
        const withReply = [...next, reply];
        setHistory(withReply);
        await saveJson(HISTORY_KEY, withReply);
        if (res.new_memories?.length) {
          const merged = [...memories, ...res.new_memories];
          setMemories(merged);
          await saveJson(MEM_KEY, merged);
        }
      } catch (e) {
        if (e instanceof NoServerError) setError('Falta configurar la URL del servidor en la pantalla inicial.');
        else setError('No pude conectar con el servidor. Reintenta en un momento.');
      } finally {
        setPending(false);
      }
    },
    [character, history, memories, pending],
  );

  if (!character) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Primero crea tu personaje en la pantalla inicial.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: character.nombre }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={history}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <MessageBubble msg={item} />}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListFooterComponent={pending ? <Text style={styles.typing}>escribiendo…</Text> : null}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <ChatComposer onSend={send} disabled={pending} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  flex: { flex: 1 },
  list: { paddingTop: theme.spacing.m, paddingBottom: theme.spacing.m },
  typing: { color: theme.textMuted, paddingHorizontal: theme.spacing.m, marginTop: 4, fontStyle: 'italic' },
  error: { color: theme.error, paddingHorizontal: theme.spacing.m, paddingVertical: 6, fontSize: 13 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.l },
  emptyText: { color: theme.textMuted, textAlign: 'center' },
});
