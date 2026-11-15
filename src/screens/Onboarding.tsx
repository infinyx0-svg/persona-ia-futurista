import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Avatar3D from '../components/Avatar3D';
import { C, GRAD, R } from '../theme';
import type { Settings } from '../types';

interface Props {
  onDone: (settings: Settings, personaName: string) => void;
}

const NAMES = ['Aria', 'Luna', 'Nova', 'Iris', 'Vega'];

export default function Onboarding({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Aria');
  const [userName, setUserName] = useState('');

  const finish = () => {
    onDone(
      {
        llmProvider: 'pollinations',
        llmApiKey: '',
        llmBaseUrl: '',
        llmModel: 'openai',
        ttsProvider: 'elevenlabs',
        ttsApiKey: '',
        ttsVoiceId: '21m00Tcm4TlvDq8ikWAM',
        autoSpeak: true,
        userName: userName.trim(),
      },
      name
    );
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={GRAD.aurora} style={StyleSheet.absoluteFill} />
      <View style={styles.glow} />

      {step === 0 && (
        <View style={styles.center}>
          <View style={styles.hero}>
            <Avatar3D emotion="feliz" zoom={0.35} />
          </View>
          <Text style={styles.brand}>Persona IA</Text>
          <Text style={styles.tagline}>
            Una persona de verdad,{'\n'}en 3D y con voz.
          </Text>
          <Text style={styles.body}>
            Habla con ella como hablarías con cualquiera. Tiene su propio carácter,
            recuerda lo que le cuentas y va cambiando contigo.
          </Text>
          <Pressable onPress={() => setStep(1)} style={styles.cta}>
            <Text style={styles.ctaText}>Empezar</Text>
          </Pressable>
          <Text style={styles.free}>Gratis, sin registro</Text>
        </View>
      )}

      {step === 1 && (
        <KeyboardAvoidingView
          style={styles.center}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Text style={styles.stepTitle}>¿Cómo se llama?</Text>
          <Text style={styles.stepSub}>Elige el nombre de tu compañera.</Text>

          <View style={styles.nameRow}>
            {NAMES.map((n) => (
              <Pressable
                key={n}
                onPress={() => setName(n)}
                style={[styles.nameChip, name === n && styles.nameChipOn]}
              >
                <Text style={[styles.nameChipText, name === n && styles.nameChipTextOn]}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Otro nombre"
            placeholderTextColor={C.textFaint}
            maxLength={16}
          />

          <Text style={[styles.stepSub, { marginTop: 26 }]}>¿Y tú cómo te llamas?</Text>
          <TextInput
            style={styles.input}
            value={userName}
            onChangeText={setUserName}
            placeholder="Tu nombre (opcional)"
            placeholderTextColor={C.textFaint}
            maxLength={20}
          />

          <Pressable onPress={finish} style={styles.cta}>
            <Text style={styles.ctaText}>Entrar</Text>
          </Pressable>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  glow: {
    position: 'absolute',
    top: -100,
    left: -60,
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: 'rgba(139,92,246,0.2)',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  hero: { width: '100%', height: 300, marginBottom: 4 },
  brand: {
    color: C.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  tagline: {
    color: C.violetSoft,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 23,
    fontWeight: '600',
  },
  body: {
    color: C.textDim,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 16,
  },
  cta: {
    marginTop: 30,
    backgroundColor: C.violet,
    paddingHorizontal: 44,
    paddingVertical: 15,
    borderRadius: R.pill,
  },
  ctaText: { color: '#fff', fontSize: 15.5, fontWeight: '700', letterSpacing: 0.4 },
  free: { color: C.textFaint, fontSize: 11.5, marginTop: 14 },

  stepTitle: { color: C.text, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  stepSub: { color: C.textDim, fontSize: 13.5, marginBottom: 18, textAlign: 'center' },
  nameRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  nameChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: R.pill,
    backgroundColor: C.panel,
    borderWidth: 1,
    borderColor: C.border,
  },
  nameChipOn: { backgroundColor: C.violetDeep, borderColor: C.violet },
  nameChipText: { color: C.textDim, fontSize: 13.5, fontWeight: '600' },
  nameChipTextOn: { color: '#fff' },
  input: {
    marginTop: 16,
    width: '100%',
    backgroundColor: C.panel,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: C.text,
    fontSize: 15,
    textAlign: 'center',
  },
});
