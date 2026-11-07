import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppProvider, useApp } from './src/state/AppContext';
import { WelcomeScreen, SignUpScreen, LoginScreen } from './src/screens/Auth';
import { OnboardingScreen } from './src/screens/Onboarding';
import { ChatScreen } from './src/screens/Chat';
import { PersonaScreen } from './src/screens/Persona';
import { MenteScreen } from './src/screens/Mente';
import { ArmarioScreen } from './src/screens/Armario';
import { SecundariosScreen } from './src/screens/Secundarios';
import { AjustesScreen } from './src/screens/Ajustes';
import { AuroraBackground } from './src/components/AuroraBackground';
import { glow, palette, spacing } from './src/theme';
import { Tab } from './src/state/AppContext';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'chat', label: 'Teléfono', icon: '💬' },
  { key: 'persona', label: 'En persona', icon: '🎙️' },
  { key: 'mente', label: 'Mente', icon: '🧠' },
  { key: 'gente', label: 'Gente', icon: '👥' },
  { key: 'armario', label: 'Armario', icon: '👗' },
  { key: 'ajustes', label: 'Ajustes', icon: '⚙️' },
];

function TabBar() {
  const { tab, setTab, data } = useApp();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, spacing(2)) }]}>
      <LinearGradient
        colors={['rgba(76,141,255,0.55)', 'rgba(168,85,247,0.45)', 'rgba(34,211,238,0.25)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.tabEdge}
      />
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tabItem}>
            {active ? (
              <LinearGradient
                colors={['rgba(76,141,255,0.28)', 'rgba(168,85,247,0.18)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tabActive}
              />
            ) : null}
            <Text style={{ fontSize: 19, opacity: active ? 1 : 0.55 }}>{t.icon}</Text>
            <Text style={[styles.tabLabel, active && { color: palette.accentSoft }]}>{t.label}</Text>
            {active ? <View style={styles.tabDot} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function MainShell() {
  const { tab, data } = useApp();
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ flex: 1 }}>
        {tab === 'chat' ? <ChatScreen /> : null}
        {tab === 'persona' ? <PersonaScreen /> : null}
        {tab === 'mente' ? <MenteScreen /> : null}
        {tab === 'gente' ? <SecundariosScreen /> : null}
        {tab === 'armario' ? <ArmarioScreen /> : null}
        {tab === 'ajustes' ? <AjustesScreen /> : null}
      </View>
      <TabBar />
    </View>
  );
}

function BootScreen() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  return (
    <View style={styles.boot}>
      <AuroraBackground theme="noche" perfMode="completo" />
      <Animated.View style={[styles.bootOrb, { transform: [{ scale }], opacity }]}>
        <LinearGradient
          colors={['#3B7BFF', '#7C4DFF', '#22D3EE']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <Text style={styles.bootText}>PERSONA IA</Text>
      <ActivityIndicator color={palette.accentSoft} style={{ marginTop: spacing(6) }} />
    </View>
  );
}

function Router() {
  const { ready, route } = useApp();

  if (!ready) return <BootScreen />;

  if (route === 'welcome') return <WelcomeScreen />;
  if (route === 'signup') return <SignUpScreen />;
  if (route === 'login') return <LoginScreen />;
  if (route === 'onboarding') return <OnboardingScreen />;
  return <MainShell />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppProvider>
        <Router />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  boot: { flex: 1, backgroundColor: palette.bg, alignItems: 'center', justifyContent: 'center' },
  bootOrb: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: 'hidden',
    ...glow('#4C8DFF', 30),
  },
  bootText: {
    color: palette.text,
    marginTop: spacing(6),
    fontSize: 15,
    letterSpacing: 6,
    fontWeight: '800',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(6,9,20,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(120,160,255,0.16)',
    paddingTop: spacing(2),
  },
  tabEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing(1.5),
    marginHorizontal: 2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  tabActive: { ...StyleSheet.absoluteFillObject, borderRadius: 14 },
  tabLabel: { color: palette.textFaint, fontSize: 9, marginTop: 2, fontWeight: '700' },
  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.accent3,
    marginTop: 3,
  },
});
