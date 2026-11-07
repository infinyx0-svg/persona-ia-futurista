import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Badge, Button, Card, Chip, Divider, Label, Row, Screen, Sub, Title } from '../components/UI';
import { palette, spacing } from '../theme';
import { formatBytes } from '../lib/device';
import { ControlLevel, LlmProvider, PerfMode, ReasoningLevel, StorageMode, VoiceId } from '../types';
import { DEFAULT_MODELS, PROVIDER_LABELS } from '../engine/llm';

const VOICES: { id: VoiceId; label: string; desc: string }[] = [
  { id: 'anime', label: 'Anime', desc: 'Aguda y expresiva' },
  { id: 'natural', label: 'Natural', desc: 'Equilibrada' },
  { id: 'energetica', label: 'Energética', desc: 'Rápida y viva' },
  { id: 'tranquila', label: 'Tranquila', desc: 'Suave y lenta' },
  { id: 'madura', label: 'Madura', desc: 'Grave y serena' },
];

export function AjustesScreen() {
  const {
    data,
    updateSettings,
    runDiagnosis,
    applyRecommendedMode,
    resetWorld,
    resetAll,
    signOut,
    user,
    authMode,
    updateLlm,
    testLlm,
    llmActive,
    llmSource,
  } = useApp();
  const [checking, setChecking] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [testOk, setTestOk] = useState(false);
  const llm = data.settings.llm;
  const [keyDraft, setKeyDraft] = useState(llm.apiKey);
  const [modelDraft, setModelDraft] = useState(llm.model);
  const [baseDraft, setBaseDraft] = useState(llm.baseUrl);
  const report = data.deviceReport;

  const onTest = async () => {
    setTesting(true);
    setTestMsg(null);
    await updateLlm({ apiKey: keyDraft, model: modelDraft, baseUrl: baseDraft });
    const r = await testLlm();
    setTesting(false);
    setTestOk(r.ok);
    setTestMsg(r.message);
  };

  return (
    <Screen>
      <View style={{ marginTop: spacing(8) }}>
        <Title size={26}>Ajustes</Title>
        <Sub>Rendimiento, voz, privacidad y control de la experiencia.</Sub>

        <Card>
          <Label>Cuenta</Label>
          <Text style={styles.body}>{user?.email ?? '—'}</Text>
          <Text style={styles.faint}>{authMode}</Text>
          <Divider />
          <Button
            title="Cerrar sesión"
            variant="ghost"
            small
            onPress={() =>
              Alert.alert('Cerrar sesión', 'Tu mundo queda guardado en este dispositivo.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', onPress: () => signOut() },
              ])
            }
          />
        </Card>

        <Card>
          <Label>Motor de diálogo (LLM)</Label>
          <Text style={styles.faint}>
            Con una API key, {data.primary?.name ?? 'ella'} responde con un modelo real (OpenAI o
            Gemini). Sin key, la app usa el motor local: funciona offline y sin costo.
          </Text>
          <Row style={{ flexWrap: 'wrap', marginTop: spacing(2) }}>
            {(['openai', 'gemini'] as LlmProvider[]).map((p) => (
              <Chip
                key={p}
                label={PROVIDER_LABELS[p]}
                active={llm.provider === p}
                onPress={() => updateLlm({ provider: p })}
              />
            ))}
          </Row>
          <Label>API key</Label>
          <TextInput
            value={keyDraft}
            onChangeText={setKeyDraft}
            onBlur={() => updateLlm({ apiKey: keyDraft })}
            placeholder={llm.provider === 'gemini' ? 'AIza...' : 'sk-...'}
            placeholderTextColor={palette.textFaint}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Label>Modelo</Label>
          <TextInput
            value={modelDraft}
            onChangeText={setModelDraft}
            onBlur={() => updateLlm({ model: modelDraft })}
            placeholder={DEFAULT_MODELS[llm.provider]}
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Label>URL base (opcional)</Label>
          <TextInput
            value={baseDraft}
            onChangeText={setBaseDraft}
            onBlur={() => updateLlm({ baseUrl: baseDraft })}
            placeholder="por defecto del proveedor"
            placeholderTextColor={palette.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
          />
          <Row style={{ marginTop: spacing(2) }}>
            <Badge
              text={llmActive ? `activo (${llmSource})` : 'modo local'}
              color={llmActive ? palette.accent3 : palette.textFaint}
            />
          </Row>
          <Button title="Probar conexión" variant="soft" small loading={testing} onPress={onTest} />
          {testMsg ? (
            <Text style={[styles.faint, { color: testOk ? palette.accent3 : palette.danger }]}>
              {testMsg}
            </Text>
          ) : null}
          <Text style={[styles.faint, { marginTop: spacing(2) }]}>
            La key se guarda solo en este dispositivo. Coste aproximado: con gpt-4o-mini, una
            conversación de ~20 mensajes cuesta menos de 0,01 USD; con Gemini Flash, el plan gratuito
            suele cubrir el uso normal.
          </Text>
        </Card>

        <Card>
          <Label>Diagnóstico del dispositivo</Label>
          {report ? (
            <>
              <Row style={{ justifyContent: 'space-between', paddingVertical: spacing(1) }}>
                <Text style={styles.faint}>Plataforma</Text>
                <Text style={styles.body}>
                  {report.platform} {report.osVersion}
                </Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', paddingVertical: spacing(1) }}>
                <Text style={styles.faint}>Modelo</Text>
                <Text style={styles.body}>{report.model}</Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', paddingVertical: spacing(1) }}>
                <Text style={styles.faint}>Memoria</Text>
                <Text style={styles.body}>{formatBytes(report.totalMemory)}</Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', paddingVertical: spacing(1) }}>
                <Text style={styles.faint}>Batería</Text>
                <Text style={styles.body}>
                  {report.batteryLevel !== null ? `${report.batteryLevel}%` : '—'} · {report.batteryState}
                </Text>
              </Row>
              <Row style={{ justifyContent: 'space-between', paddingVertical: spacing(1) }}>
                <Text style={styles.faint}>Audio</Text>
                <Text style={styles.body}>{report.audioOk ? 'compatible' : 'revisar'}</Text>
              </Row>
              <Divider />
              <Badge
                text={`Recomendado: ${report.recommended}`}
                color={report.recommended === 'ligero' ? palette.warn : palette.accent3}
              />
              {report.notes.map((n) => (
                <Text key={n} style={[styles.faint, { marginTop: spacing(2) }]}>
                  • {n}
                </Text>
              ))}
              <Row style={{ marginTop: spacing(3) }}>
                <Button title="Aplicar recomendación" small onPress={applyRecommendedMode} />
              </Row>
            </>
          ) : (
            <Text style={styles.faint}>
              Revisa memoria, batería, audio y permisos para recomendarte un modo. No lee archivos
              privados.
            </Text>
          )}
          <Button
            title={report ? 'Volver a diagnosticar' : 'Diagnosticar mi dispositivo'}
            variant="soft"
            small
            loading={checking}
            onPress={async () => {
              setChecking(true);
              await runDiagnosis();
              setChecking(false);
            }}
          />
        </Card>

        <Card>
          <Label>Modo de rendimiento</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {(['completo', 'equilibrado', 'ligero'] as PerfMode[]).map((m) => (
              <Chip key={m} label={m} active={data.settings.perfMode === m} onPress={() => updateSettings({ perfMode: m })} />
            ))}
          </Row>
          <Text style={styles.faint}>
            Completo: más actividad de personajes. Ligero: menos procesos y menos batería.
          </Text>
        </Card>

        <Card>
          <Label>Almacenamiento de audio</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {(['ligero', 'completo'] as StorageMode[]).map((m) => (
              <Chip
                key={m}
                label={m === 'ligero' ? 'Ligero (no guarda audio)' : 'Completo (guarda audio)'}
                active={data.settings.storageMode === m}
                onPress={() => updateSettings({ storageMode: m })}
              />
            ))}
          </Row>
          <Text style={styles.faint}>
            En modo ligero el audio se procesa y se elimina. En completo puedes conservar audios y
            transcripciones.
          </Text>
        </Card>

        <Card>
          <Label>Voz</Label>
          {VOICES.map((v) => (
            <Pressable
              key={v.id}
              onPress={() => updateSettings({ voice: v.id })}
              style={[styles.voiceRow, data.settings.voice === v.id && { borderColor: palette.accent }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{v.label}</Text>
                <Text style={styles.faint}>{v.desc}</Text>
              </View>
              {data.settings.voice === v.id ? <Badge text="activa" color={palette.accent} /> : null}
            </Pressable>
          ))}
          <Label>Velocidad de voz</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {[0.8, 0.95, 1.1, 1.25].map((r) => (
              <Chip
                key={r}
                label={`${r}x`}
                active={Math.abs(data.settings.voiceRate - r) < 0.01}
                onPress={() => updateSettings({ voiceRate: r })}
              />
            ))}
          </Row>
        </Card>

        <Card>
          <Label>En persona</Label>
          <Toggle
            label="Mostrar subtítulos por defecto"
            value={data.settings.subtitles}
            onChange={(v) => updateSettings({ subtitles: v })}
          />
          <Toggle
            label="Vibración al enviar"
            value={data.settings.haptics}
            onChange={(v) => updateSettings({ haptics: v })}
          />
        </Card>

        <Card>
          <Label>Control de la historia</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {(['auto', 'equilibrado', 'estricto'] as ControlLevel[]).map((c) => (
              <Chip key={c} label={c} active={data.settings.control === c} onPress={() => updateSettings({ control: c })} />
            ))}
          </Row>
          <Text style={styles.faint}>
            Auto: los detalles pequeños se guardan solos. Estricto: los cambios importantes requieren
            tu aprobación.
          </Text>
          <Divider />
          <Toggle
            label="Permitir que su familia me escriba"
            value={data.settings.allowFamilyContact}
            onChange={(v) => updateSettings({ allowFamilyContact: v })}
          />
          <Toggle
            label="Permitir apariciones espontáneas de secundarios"
            value={data.settings.allowSecondarySpontaneous}
            onChange={(v) => updateSettings({ allowSecondarySpontaneous: v })}
          />
        </Card>

        <Card>
          <Label>Razonamiento</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {(['basico', 'normal', 'avanzado', 'experto'] as ReasoningLevel[]).map((r) => (
              <Chip key={r} label={r} active={data.settings.reasoning === r} onPress={() => updateSettings({ reasoning: r })} />
            ))}
          </Row>
        </Card>

        <Card>
          <Label>Tema</Label>
          <Row style={{ flexWrap: 'wrap' }}>
            {(['noche', 'aurora', 'sakura'] as const).map((t) => (
              <Chip key={t} label={t} active={data.settings.theme === t} onPress={() => updateSettings({ theme: t })} />
            ))}
          </Row>
        </Card>

        <Card style={{ borderColor: 'rgba(251,113,133,0.4)' }}>
          <Label>Zona de riesgo</Label>
          <Text style={styles.faint}>
            Reiniciar el mundo borra la relación, los recuerdos y los personajes. Tu cuenta se
            mantiene.
          </Text>
          <Button
            title="Reiniciar mundo"
            variant="danger"
            small
            onPress={() =>
              Alert.alert(
                'Reiniciar el mundo',
                'Se borran la relación, los recuerdos, el armario y los personajes secundarios. Esto no se puede deshacer.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Reiniciar', style: 'destructive', onPress: () => resetWorld() },
                ],
              )
            }
          />
          <Button
            title="Borrar todo y empezar de cero"
            variant="danger"
            small
            onPress={() =>
              Alert.alert(
                'Borrar todo',
                'Se borra absolutamente todo, incluido tu perfil. Tendrás que crear tu compañera otra vez.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Borrar todo', style: 'destructive', onPress: () => resetAll() },
                ],
              )
            }
          />
        </Card>

        <Text style={styles.footer}>
          Persona IA · v1.0.0{'\n'}
          La IA fortalece tu vida; no intenta convertirse en tu vida.
        </Text>
      </View>
    </Screen>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow}>
      <Text style={[styles.body, { flex: 1 }]}>{label}</Text>
      <View style={[styles.track, value && { backgroundColor: palette.accent }]}>
        <View style={[styles.knob, value && { alignSelf: 'flex-end' }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { color: palette.textDim, fontSize: 14, lineHeight: 21 },
  faint: { color: palette.textFaint, fontSize: 12, lineHeight: 18 },
  input: {
    backgroundColor: 'rgba(5,7,15,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
    borderRadius: 12,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    color: palette.text,
    fontSize: 14,
    marginBottom: spacing(3),
  },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2.5),
    paddingHorizontal: spacing(3),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: spacing(1),
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing(2.5) },
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(120,160,255,0.22)',
    padding: 3,
    justifyContent: 'center',
  },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  footer: { color: palette.textFaint, fontSize: 11, textAlign: 'center', marginTop: spacing(6), lineHeight: 17 },
});
