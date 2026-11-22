import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { theme } from '../shared/theme';
import { CharacterConfig } from '../shared/persona';
import { CHAR_KEY, loadJson, saveJson, setServerUrl } from '../lib/llm';

export default function OnboardingScreen() {
  const [nombre, setNombre] = useState('');
  const [edad, setEdad] = useState('');
  const [genero, setGenero] = useState<'chica' | 'chico'>('chica');
  const [server, setServer] = useState('');
  const [hasChar, setHasChar] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await loadJson<CharacterConfig>(CHAR_KEY);
      setHasChar(!!c);
    })();
  }, []);

  const start = useCallback(async () => {
    const n = nombre.trim();
    const e = parseInt(edad, 10);
    if (!n || !e || e < 18) return;
    if (server.trim()) await setServerUrl(server.trim());
    const c: CharacterConfig = { nombre: n, edad: e, genero };
    await saveJson(CHAR_KEY, c);
    router.replace('/chat');
  }, [nombre, edad, genero, server]);

  const continueChat = useCallback(async () => {
    if (server.trim()) await setServerUrl(server.trim());
    router.replace('/chat');
  }, [server]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.card}>
        <Text style={styles.title}>Crea tu personaje</Text>
        <Text style={styles.hint}>Serán dos desconocidos. Ella o él te irá conociendo con el tiempo.</Text>

        <Text style={styles.label}>Nombre</Text>
        <TextInput style={styles.input} value={nombre} onChangeText={setNombre} placeholder="¿Cómo se llama?" placeholderTextColor={theme.textMuted} />

        <Text style={styles.label}>Edad (18+)</Text>
        <TextInput style={styles.input} value={edad} onChangeText={setEdad} keyboardType="number-pad" placeholder="Ej. 24" placeholderTextColor={theme.textMuted} />

        <Text style={styles.label}>Presentación</Text>
        <View style={styles.row}>
          {(['chica', 'chico'] as const).map((g) => (
            <Pressable key={g} style={[styles.chip, genero === g && styles.chipOn]} onPress={() => setGenero(g)}>
              <Text style={[styles.chipText, genero === g && styles.chipTextOn]}>{g === 'chica' ? 'Chica' : 'Chico'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>URL del servidor (cerebro de la IA)</Text>
        <TextInput style={styles.input} value={server} onChangeText={setServer} autoCapitalize="none" placeholder="https://xxxx.supabase.co" placeholderTextColor={theme.textMuted} />

        <Pressable style={[styles.cta, !nombre.trim() && styles.ctaOff]} onPress={start}>
          <Text style={styles.ctaText}>Empezar</Text>
        </Pressable>
        {hasChar && (
          <Pressable onPress={continueChat}>
            <Text style={styles.link}>Continuar conversando</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.bg },
  card: { flex: 1, padding: theme.spacing.l, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: theme.text, marginBottom: 8 },
  hint: { color: theme.textMuted, marginBottom: theme.spacing.xl, lineHeight: 20 },
  label: { color: theme.text, fontWeight: '600', marginBottom: 6, marginTop: theme.spacing.m },
  input: {
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    borderRadius: theme.radius,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.text,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: theme.radius,
    backgroundColor: theme.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.border,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: theme.accentSoft, borderColor: theme.accent },
  chipText: { color: theme.text, fontSize: 15 },
  chipTextOn: { color: theme.accent, fontWeight: '600' },
  cta: { backgroundColor: theme.accent, borderRadius: theme.radius, paddingVertical: 15, alignItems: 'center', marginTop: theme.spacing.xl },
  ctaOff: { opacity: 0.4 },
  ctaText: { color: theme.userText, fontWeight: '700', fontSize: 16 },
  link: { color: theme.accent, textAlign: 'center', marginTop: theme.spacing.l, fontWeight: '600' },
});
