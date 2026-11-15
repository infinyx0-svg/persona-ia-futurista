import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { C, R } from '../theme';
import type { PersonaState, Settings, Traits } from '../types';
import { TRAIT_LABEL } from '../types';
import { testVoice } from '../engine/voice';

interface Props {
  settings: Settings;
  persona: PersonaState;
  onSave: (s: Settings) => void;
  onBack: () => void;
  onReset: () => void;
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secure,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  hint?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textFaint}
        secureTextEntry={secure}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable
          key={o.key}
          onPress={() => onChange(o.key)}
          style={[styles.segItem, value === o.key && styles.segItemOn]}
        >
          <Text style={[styles.segText, value === o.key && styles.segTextOn]}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function TraitBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.traitRow}>
      <Text style={styles.traitLabel}>{label}</Text>
      <View style={styles.traitTrack}>
        <View style={[styles.traitFill, { width: `${Math.round(value * 100)}%` }]} />
      </View>
      <Text style={styles.traitVal}>{Math.round(value * 100)}</Text>
    </View>
  );
}

export default function SettingsScreen({ settings, persona, onSave, onBack, onReset }: Props) {
  const [s, setS] = useState<Settings>(settings);
  const [voiceMsg, setVoiceMsg] = useState('');

  const patch = (p: Partial<Settings>) => setS((prev) => ({ ...prev, ...p }));

  const save = () => {
    onSave(s);
    Alert.alert('Guardado', 'Los ajustes se han guardado.');
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>Ajustes</Text>
        <Pressable onPress={save} style={styles.saveBtn}>
          <Text style={styles.saveText}>Guardar</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---------------------------------------------------- IA */}
        <Text style={styles.section}>Inteligencia artificial</Text>
        <View style={styles.card}>
          <Text style={styles.cardNote}>
            Por defecto usa un modelo gratuito, sin clave. Si quieres más calidad,
            pon tu clave de OpenAI o de cualquier API compatible.
          </Text>

          <Text style={styles.label}>Proveedor</Text>
          <Segmented
            options={[
              { key: 'pollinations', label: 'Gratis' },
              { key: 'openai', label: 'OpenAI' },
              { key: 'custom', label: 'Otro' },
            ]}
            value={s.llmProvider}
            onChange={(v) => patch({ llmProvider: v })}
          />

          {s.llmProvider !== 'pollinations' && (
            <>
              <Field
                label="Clave de API"
                value={s.llmApiKey}
                onChange={(v) => patch({ llmApiKey: v })}
                placeholder="sk-..."
                secure
              />
              <Field
                label="Modelo"
                value={s.llmModel}
                onChange={(v) => patch({ llmModel: v })}
                placeholder="gpt-4o-mini"
              />
              {s.llmProvider === 'custom' && (
                <Field
                  label="URL base"
                  value={s.llmBaseUrl}
                  onChange={(v) => patch({ llmBaseUrl: v })}
                  placeholder="https://api.ejemplo.com/v1"
                  hint="Debe ser compatible con /chat/completions"
                />
              )}
            </>
          )}
        </View>

        {/* ---------------------------------------------------- voz */}
        <Text style={styles.section}>Voz</Text>
        <View style={styles.card}>
          <Text style={styles.cardNote}>
            La voz se reproduce automáticamente después de cada respuesta. Sin clave
            se usa la voz del sistema, que suena más robótica.
          </Text>

          <Text style={styles.label}>Motor de voz</Text>
          <Segmented
            options={[
              { key: 'elevenlabs', label: 'ElevenLabs' },
              { key: 'openai', label: 'OpenAI' },
              { key: 'device', label: 'Sistema' },
            ]}
            value={s.ttsProvider}
            onChange={(v) => patch({ ttsProvider: v })}
          />

          {s.ttsProvider !== 'device' && (
            <>
              <Field
                label="Clave de API"
                value={s.ttsApiKey}
                onChange={(v) => patch({ ttsApiKey: v })}
                placeholder={s.ttsProvider === 'openai' ? 'sk-...' : 'xi-...'}
                secure
              />
              <Field
                label={s.ttsProvider === 'openai' ? 'Voz' : 'ID de voz'}
                value={s.ttsVoiceId}
                onChange={(v) => patch({ ttsVoiceId: v })}
                placeholder={s.ttsProvider === 'openai' ? 'nova' : '21m00Tcm4TlvDq8ikWAM'}
                hint={
                  s.ttsProvider === 'openai'
                    ? 'alloy, echo, fable, onyx, nova, shimmer'
                    : 'Cópialo de tu panel de ElevenLabs'
                }
              />
            </>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Hablar automáticamente</Text>
            <Switch
              value={s.autoSpeak}
              onValueChange={(v) => patch({ autoSpeak: v })}
              trackColor={{ false: C.panel2, true: C.violetDeep }}
              thumbColor={s.autoSpeak ? C.violetSoft : '#888'}
            />
          </View>

          <Pressable
            onPress={async () => {
              setVoiceMsg('Probando…');
              const r = await testVoice(s);
              setVoiceMsg(r);
            }}
            style={styles.testBtn}
          >
            <Text style={styles.testText}>Probar voz</Text>
          </Pressable>
          {!!voiceMsg && <Text style={styles.hint}>{voiceMsg}</Text>}
        </View>

        {/* ---------------------------------------------------- personalidad */}
        <Text style={styles.section}>Personalidad de {persona.name}</Text>
        <View style={styles.card}>
          <Text style={styles.cardNote}>
            Evoluciona sola con la conversación. Aquí ves cómo está ahora.
          </Text>
          {(Object.keys(persona.traits) as (keyof Traits)[]).map((k) => (
            <TraitBar key={k} label={TRAIT_LABEL[k]} value={persona.traits[k]} />
          ))}
          <View style={styles.divider} />
          <Text style={styles.bondText}>{persona.bond}</Text>
          <Text style={styles.hint}>
            Confianza {Math.round(persona.trust * 100)}% · {persona.turns} mensajes ·{' '}
            {persona.stage}
          </Text>
          {persona.facts.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>Lo que recuerda de ti</Text>
              {persona.facts.map((f, i) => (
                <Text key={i} style={styles.factText}>
                  · {f}
                </Text>
              ))}
            </>
          )}
        </View>

        {/* ---------------------------------------------------- personaje 3D */}
        <Text style={styles.section}>Personaje 3D</Text>
        <View style={styles.card}>
          <Text style={styles.cardNote}>
            La app incluye un avatar VRM de ejemplo. Cuando tengas tu personaje de
            VRoid Studio, sustituye el archivo en{' '}
            <Text style={styles.code}>assets/vrm/avatar_opt.vrm</Text> y recompila.
          </Text>
          <Text style={styles.hint}>
            Formato admitido: .vrm (VRM 0.x o 1.0). Debe incluir blendshapes de
            expresión (happy, sad, angry, surprised, blink) para que las emociones
            funcionen.
          </Text>
        </View>

        {/* ---------------------------------------------------- datos */}
        <Text style={styles.section}>Datos</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Borrar todo',
                'Se eliminarán la conversación, la personalidad y los ajustes. ¿Continuar?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Borrar', style: 'destructive', onPress: onReset },
                ]
              )
            }
            style={styles.dangerBtn}
          >
            <Text style={styles.dangerText}>Borrar conversación y empezar de cero</Text>
          </Pressable>
        </View>

        <Text style={styles.version}>Persona IA 2.0.0 · com.personaia.app</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.panel2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: C.text, fontSize: 24, lineHeight: 28, marginTop: -3 },
  title: { flex: 1, color: C.text, fontSize: 17, fontWeight: '700' },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    backgroundColor: C.violet,
  },
  saveText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },

  content: { padding: 16, paddingBottom: 60 },
  section: {
    color: C.violetSoft,
    fontSize: 11.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: C.panel,
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: C.borderSoft,
    padding: 14,
    gap: 10,
  },
  cardNote: { color: C.textDim, fontSize: 12, lineHeight: 18 },

  field: { gap: 6 },
  label: { color: C.text, fontSize: 12.5, fontWeight: '600' },
  input: {
    backgroundColor: C.panel2,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 13.5,
  },
  hint: { color: C.textFaint, fontSize: 11, lineHeight: 16 },

  seg: {
    flexDirection: 'row',
    backgroundColor: C.panel2,
    borderRadius: R.sm,
    padding: 3,
    gap: 3,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: 'center' },
  segItemOn: { backgroundColor: C.violetDeep },
  segText: { color: C.textDim, fontSize: 12, fontWeight: '600' },
  segTextOn: { color: '#fff' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  switchLabel: { color: C.text, fontSize: 13 },

  testBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: R.pill,
    borderWidth: 1,
    borderColor: C.violet,
  },
  testText: { color: C.violetSoft, fontSize: 12, fontWeight: '600' },

  traitRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  traitLabel: { color: C.textDim, fontSize: 11.5, width: 82 },
  traitTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.panel2,
    overflow: 'hidden',
  },
  traitFill: { height: 6, borderRadius: 3, backgroundColor: C.violet },
  traitVal: { color: C.textFaint, fontSize: 10.5, width: 26, textAlign: 'right' },

  divider: { height: 1, backgroundColor: C.borderSoft, marginVertical: 4 },
  bondText: { color: C.text, fontSize: 12.5, lineHeight: 18, fontStyle: 'italic' },
  factText: { color: C.textDim, fontSize: 12, lineHeight: 18 },
  code: { color: C.cyanSoft, fontSize: 11.5 },

  dangerBtn: {
    paddingVertical: 12,
    borderRadius: R.sm,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    alignItems: 'center',
  },
  dangerText: { color: C.red, fontSize: 12.5, fontWeight: '600' },

  version: {
    color: C.textFaint,
    fontSize: 10.5,
    textAlign: 'center',
    marginTop: 26,
  },
});
