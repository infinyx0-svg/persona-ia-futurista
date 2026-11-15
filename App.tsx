import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import PhoneMode from './src/screens/PhoneMode';
import PersonaMode from './src/screens/PersonaMode';
import SettingsScreen from './src/screens/SettingsScreen';
import Onboarding from './src/screens/Onboarding';

import { C, GRAD } from './src/theme';
import type { Emotion, Message, PersonaState, Settings } from './src/types';
import {
  isOnboarded,
  loadMessages,
  loadPersona,
  loadSettings,
  newPersona,
  resetAll,
  saveMessages,
  savePersona,
  saveSettings,
  setOnboarded,
} from './src/lib/storage';
import { stop as stopVoice } from './src/engine/voice';

type Tab = 'phone' | 'persona' | 'settings';

function Shell() {
  const insets = useSafeAreaInsets();
  const [booting, setBooting] = useState(true);
  const [onboarded, setOnb] = useState(false);
  const [tab, setTab] = useState<Tab>('phone');

  const [settings, setSettings] = useState<Settings | null>(null);
  const [persona, setPersona] = useState<PersonaState>(newPersona());
  const [messages, setMessages] = useState<Message[]>([]);
  const [emotion, setEmotion] = useState<Emotion>('neutral');
  const [speaking, setSpeaking] = useState(false);

  // ---------------------------------------------------------------- arranque
  useEffect(() => {
    (async () => {
      const [s, p, m, ob] = await Promise.all([
        loadSettings(),
        loadPersona(),
        loadMessages(),
        isOnboarded(),
      ]);
      setSettings(s);
      setPersona(p);
      setMessages(m);
      setOnb(ob);
      const last = [...m].reverse().find((x) => x.role === 'persona');
      if (last?.emotion) setEmotion(last.emotion);
      setBooting(false);
    })();
  }, []);

  // ---------------------------------------------------------------- acciones
  const update = useCallback((p: PersonaState, m: Message[]) => {
    setPersona(p);
    setMessages(m);
    savePersona(p);
    saveMessages(m);
  }, []);

  const saveS = useCallback((s: Settings) => {
    setSettings(s);
    saveSettings(s);
  }, []);

  const finishOnboarding = useCallback(
    async (s: Settings, name: string) => {
      const p = newPersona(name);
      setSettings(s);
      setPersona(p);
      setMessages([]);
      await Promise.all([saveSettings(s), savePersona(p), saveMessages([]), setOnboarded()]);
      setOnb(true);
      setTab('phone');
    },
    []
  );

  const doReset = useCallback(async () => {
    stopVoice();
    await resetAll();
    setSettings(null);
    setPersona(newPersona());
    setMessages([]);
    setEmotion('neutral');
    setOnb(false);
    setTab('phone');
  }, []);

  const switchTab = useCallback((t: Tab) => {
    if (t !== 'persona') stopVoice();
    setTab(t);
  }, []);

  // ---------------------------------------------------------------- render
  if (booting || !settings) {
    return (
      <View style={styles.boot}>
        <LinearGradient colors={GRAD.aurora} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={C.violet} size="large" />
        <Text style={styles.bootText}>Persona IA</Text>
      </View>
    );
  }

  if (!onboarded) {
    return <Onboarding onDone={finishOnboarding} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <View style={styles.body}>
        {tab === 'phone' && (
          <PhoneMode
            persona={persona}
            settings={settings}
            messages={messages}
            onUpdate={update}
            onEmotion={setEmotion}
            onSpeaking={setSpeaking}
            onOpenPersona={() => switchTab('persona')}
          />
        )}

        {tab === 'persona' && (
          <PersonaMode
            persona={persona}
            settings={settings}
            messages={messages}
            emotion={emotion}
            onUpdate={update}
            onEmotion={setEmotion}
            onBack={() => switchTab('phone')}
          />
        )}

        {tab === 'settings' && (
          <SettingsScreen
            settings={settings}
            persona={persona}
            onSave={saveS}
            onBack={() => switchTab('phone')}
            onReset={doReset}
          />
        )}
      </View>

      {/* barra inferior: solo en modo celular */}
      {tab === 'phone' && (
        <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Pressable onPress={() => switchTab('phone')} style={styles.tabItem}>
            <Text style={[styles.tabIcon, styles.tabOn]}>💬</Text>
            <Text style={[styles.tabLabel, styles.tabOn]}>Chat</Text>
          </Pressable>

          <Pressable onPress={() => switchTab('persona')} style={styles.tabItem}>
            <Text style={styles.tabIcon}>🧍</Text>
            <Text style={styles.tabLabel}>En persona</Text>
          </Pressable>

          <Pressable onPress={() => switchTab('settings')} style={styles.tabItem}>
            <Text style={styles.tabIcon}>⚙️</Text>
            <Text style={styles.tabLabel}>Ajustes</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Shell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1 },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: C.bg },
  bootText: { color: C.violetSoft, fontSize: 15, letterSpacing: 3, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: C.panel,
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 3 },
  tabIcon: { fontSize: 19, opacity: 0.5 },
  tabLabel: { color: C.textFaint, fontSize: 10.5, fontWeight: '600' },
  tabOn: { opacity: 1, color: C.violetSoft },
});
