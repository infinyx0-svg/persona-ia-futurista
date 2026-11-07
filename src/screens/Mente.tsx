import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Badge, Button, Card, Chip, Divider, Empty, Label, Row, Screen, Sub, Title } from '../components/UI';
import { palette, radius, spacing } from '../theme';
import { KIND_LABELS, groupByKind } from '../engine/memory';
import { STAGE_LABELS, canBecomePartner, relationshipSummary, stageProgress } from '../engine/relationship';
import { ALL_TRAITS, INTENSITY_LABELS, TRAIT_LABELS, traitSummary } from '../engine/personality';
import { EMOTION_LABELS, emotionColor } from '../engine/emotion';
import { MemoryItem } from '../types';

type TabKey = 'memoria' | 'ella' | 'relacion' | 'bienestar';

export function MenteScreen() {
  const {
    data,
    addMemory,
    updateMemory,
    deleteMemory,
    becomePartner,
    endRelationship,
    updateSettings,
  } = useApp();
  const [tab, setTab] = useState<TabKey>('memoria');
  const [newMem, setNewMem] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const primary = data.primary;
  if (!primary) return null;

  const grouped = groupByKind(data.memories);

  return (
    <Screen>
      <View style={{ marginTop: spacing(8) }}>
        <Title size={26}>Mente</Title>
        <Sub>Lo que ella recuerda, cómo es, y en qué punto está la relación.</Sub>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing(4) }}>
          {(
            [
              ['memoria', 'Memoria'],
              ['ella', 'Ella'],
              ['relacion', 'Relación'],
              ['bienestar', 'Bienestar'],
            ] as [TabKey, string][]
          ).map(([k, label]) => (
            <Chip key={k} label={label} active={tab === k} onPress={() => setTab(k)} />
          ))}
        </ScrollView>

        {tab === 'memoria' ? (
          <>
            <Card>
              <Label>Agregar un recuerdo</Label>
              <TextInput
                value={newMem}
                onChangeText={setNewMem}
                placeholder="Ej. Mi meta es correr 10 km"
                placeholderTextColor={palette.textFaint}
                style={styles.input}
                multiline
              />
              <Row style={{ marginTop: spacing(3) }}>
                <Button
                  title="Guardar"
                  small
                  onPress={async () => {
                    if (!newMem.trim()) return;
                    await addMemory(newMem.trim(), 'dato');
                    setNewMem('');
                  }}
                />
              </Row>
            </Card>

            {data.memories.length === 0 ? (
              <Empty text="Todavía no hay recuerdos. Se guardan solos cuando le cuentas cosas importantes, o puedes añadirlos aquí." />
            ) : (
              Object.entries(grouped).map(([kind, items]) => (
                <View key={kind} style={{ marginBottom: spacing(4) }}>
                  <Label>{KIND_LABELS[kind as MemoryItem['kind']] ?? kind}</Label>
                  {items.map((m) => (
                    <Card key={m.id}>
                      {editing === m.id ? (
                        <>
                          <TextInput
                            value={editText}
                            onChangeText={setEditText}
                            style={styles.input}
                            multiline
                          />
                          <Row style={{ marginTop: spacing(2) }}>
                            <Button
                              title="Guardar"
                              small
                              onPress={async () => {
                                await updateMemory(m.id, editText);
                                setEditing(null);
                              }}
                            />
                            <View style={{ width: spacing(2) }} />
                            <Button title="Cancelar" small variant="ghost" onPress={() => setEditing(null)} />
                          </Row>
                        </>
                      ) : (
                        <>
                          <Text style={styles.memText}>{m.text}</Text>
                          <Row style={{ marginTop: spacing(2) }}>
                            {m.sensitive ? <Badge text="sensible" color={palette.warn} /> : null}
                            <View style={{ flex: 1 }} />
                            <Pressable
                              onPress={() => {
                                setEditing(m.id);
                                setEditText(m.text);
                              }}
                            >
                              <Text style={styles.link}>Editar</Text>
                            </Pressable>
                            <Pressable
                              onPress={() =>
                                Alert.alert('Borrar recuerdo', '¿Eliminar este recuerdo?', [
                                  { text: 'Cancelar', style: 'cancel' },
                                  { text: 'Borrar', style: 'destructive', onPress: () => deleteMemory(m.id) },
                                ])
                              }
                              style={{ marginLeft: spacing(4) }}
                            >
                              <Text style={[styles.link, { color: palette.danger }]}>Borrar</Text>
                            </Pressable>
                          </Row>
                        </>
                      )}
                    </Card>
                  ))}
                </View>
              ))
            )}
          </>
        ) : null}

        {tab === 'ella' ? (
          <>
            <Card>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing(2) }}>
                <Text style={styles.name}>{primary.name}</Text>
                <Badge text={`${primary.age} años`} />
              </Row>
              <Text style={styles.body}>{primary.bio}</Text>
              <Divider />
              <Label>Intereses visibles</Label>
              <Row style={{ flexWrap: 'wrap', marginBottom: spacing(3) }}>
                {primary.interests.map((i) => (
                  <Chip key={i} label={i} />
                ))}
              </Row>
              <Label>Estado emocional</Label>
              <Row style={{ marginBottom: spacing(2) }}>
                <View style={[styles.dot, { backgroundColor: emotionColor(data.emotion.key) }]} />
                <Text style={styles.body}>
                  {EMOTION_LABELS[data.emotion.key]} · {data.emotion.cause}
                </Text>
              </Row>
              <Text style={styles.faint}>
                Las emociones no se muestran con barras: se notan en cómo escribe, en su voz y en su
                cara.
              </Text>
            </Card>

            <Card>
              <Label>Personalidad (bloqueada)</Label>
              <Text style={styles.body}>{traitSummary(primary.traits)}</Text>
              <Divider />
              {ALL_TRAITS.filter((t) => (primary.traits[t] ?? 0) > 0).map((t) => (
                <Row key={t} style={{ justifyContent: 'space-between', paddingVertical: spacing(1.5) }}>
                  <Text style={styles.body}>{TRAIT_LABELS[t]}</Text>
                  <Text style={styles.faint}>{INTENSITY_LABELS[primary.traits[t]]}</Text>
                </Row>
              ))}
              <Divider />
              <Button
                title="Cambiar su personalidad"
                variant="danger"
                small
                onPress={() =>
                  Alert.alert(
                    'Esto reinicia la experiencia',
                    'Su personalidad queda bloqueada después de crearla. Cambiarla reinicia recuerdos, relación y todo lo vivido. ¿Quieres empezar de nuevo?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Entiendo, reiniciar',
                        style: 'destructive',
                        onPress: () => Alert.alert('Usa Ajustes', 'Ve a Ajustes → Reiniciar mundo para empezar de cero con una nueva compañera.'),
                      },
                    ],
                  )
                }
              />
            </Card>

            <Card>
              <Label>Familia</Label>
              {primary.family.map((f) => (
                <Row key={f.id} style={{ justifyContent: 'space-between', paddingVertical: spacing(1.5) }}>
                  <View>
                    <Text style={styles.body}>{f.name}</Text>
                    <Text style={styles.faint}>{f.personality}</Text>
                  </View>
                  <Badge
                    text={f.attitude > 30 ? 'cordial' : f.attitude < -20 ? 'reticente' : 'cautelosa'}
                    color={f.attitude > 30 ? palette.accent3 : f.attitude < -20 ? palette.danger : palette.warn}
                  />
                </Row>
              ))}
              <Text style={[styles.faint, { marginTop: spacing(2) }]}>
                La familia aparece cuando tiene sentido. No todo el tiempo.
              </Text>
            </Card>
          </>
        ) : null}

        {tab === 'relacion' ? (
          <>
            <Card>
              <Row style={{ justifyContent: 'space-between', marginBottom: spacing(3) }}>
                <Text style={styles.name}>{STAGE_LABELS[data.relationship.stage]}</Text>
                <Badge text={`${Math.round(stageProgress(data.relationship))}%`} />
              </Row>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${stageProgress(data.relationship)}%` }]} />
              </View>
              <Text style={[styles.body, { marginTop: spacing(3) }]}>
                {relationshipSummary(data.relationship, primary)}
              </Text>
            </Card>

            <Card>
              <Label>Confianza</Label>
              <Meter value={data.relationship.trust} color={palette.accent3} />
              <Label>Afecto</Label>
              <Meter value={data.relationship.affection} color={palette.accent} />
              <Label>Tensión</Label>
              <Meter value={data.relationship.tension} color={palette.danger} />
              <Label>Interés romántico</Label>
              <Meter value={data.relationship.romanticInterest} color={palette.accent2} />
            </Card>

            {data.relationship.stage !== 'pareja' && canBecomePartner(data.relationship) ? (
              <Card>
                <Text style={styles.body}>
                  Hay algo entre ustedes. Convertirse en pareja requiere que ambos lo digan claro.
                </Text>
                <Button
                  title="Proponerle ser pareja"
                  onPress={() =>
                    Alert.alert('¿Estás seguro?', 'Le vas a proponer formalizar la relación.', [
                      { text: 'Todavía no', style: 'cancel' },
                      { text: 'Sí, proponerlo', onPress: () => becomePartner() },
                    ])
                  }
                />
              </Card>
            ) : null}

            {data.relationship.stage === 'pareja' ? (
              <Card>
                <Badge text="Pareja" color={palette.accent} />
                <Text style={[styles.body, { marginTop: spacing(2) }]}>
                  Ambos lo confirmaron. Eso no significa que no pueda haber conflictos: significa que
                  hay algo que cuidar.
                </Text>
              </Card>
            ) : null}

            <Card>
              <Label>Historial</Label>
              {data.relationship.history.length === 0 ? (
                <Text style={styles.faint}>Todavía no hay momentos registrados.</Text>
              ) : (
                [...data.relationship.history]
                  .reverse()
                  .slice(0, 12)
                  .map((h, i) => (
                    <Row key={`${h.at}_${i}`} style={{ justifyContent: 'space-between', paddingVertical: spacing(1.5) }}>
                      <Text style={[styles.body, { flex: 1 }]} numberOfLines={2}>
                        {h.text}
                      </Text>
                      <Text style={[styles.faint, { color: h.delta >= 0 ? palette.accent3 : palette.danger }]}>
                        {h.delta >= 0 ? '+' : ''}
                        {h.delta}
                      </Text>
                    </Row>
                  ))
              )}
            </Card>

            <Card>
              <Label>Terminar la relación</Label>
              <Text style={styles.faint}>
                Si hay daño real, ella puede tomar distancia o terminar. No está obligada a perdonar.
              </Text>
              <Button
                title="Terminar la relación"
                variant="danger"
                small
                onPress={() =>
                  Alert.alert(
                    'Terminar la relación',
                    'Esto cambia la relación de forma permanente. Los recuerdos generales permanecen.',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Terminar',
                        style: 'destructive',
                        onPress: () => endRelationship('Decisión del usuario'),
                      },
                    ],
                  )
                }
              />
            </Card>
          </>
        ) : null}

        {tab === 'bienestar' ? (
          <>
            <Card>
              <Text style={styles.name}>La IA fortalece tu vida</Text>
              <Text style={[styles.body, { marginTop: spacing(2) }]}>
                No intenta convertirse en tu vida. No sustituye a tu familia, tus amistades, tu
                psicólogo ni los servicios de emergencia.
              </Text>
            </Card>

            <Card>
              <Label>Nivel de razonamiento</Label>
              <Row style={{ flexWrap: 'wrap' }}>
                {(['basico', 'normal', 'avanzado', 'experto'] as const).map((r) => (
                  <Chip
                    key={r}
                    label={r}
                    active={data.settings.reasoning === r}
                    onPress={() => updateSettings({ reasoning: r })}
                  />
                ))}
              </Row>
              <Text style={styles.faint}>
                No es un IQ real: cambia cuánto detalle da al explicar y cuánto se extiende.
              </Text>
            </Card>

            <Card>
              <Label>Recordatorios de bienestar</Label>
              {[
                'Comer algo hoy',
                'Tomar agua',
                'Dormir a una hora razonable',
                'Moverte un poco',
                'Hablar con alguien de confianza',
              ].map((r) => (
                <Row key={r} style={{ paddingVertical: spacing(1.5) }}>
                  <Text style={{ color: palette.accent3, marginRight: spacing(2) }}>•</Text>
                  <Text style={styles.body}>{r}</Text>
                </Row>
              ))}
            </Card>

            <Card>
              <Label>Si estás en crisis</Label>
              <Text style={styles.body}>
                Habla con una persona real de confianza ahora. Si estás en peligro inmediato, llama a
                los servicios de emergencia de tu país. En Latinoamérica puedes buscar la línea de
                prevención del suicidio local; en España, el 024.
              </Text>
            </Card>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Meter({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.meterTrack}>
      <View style={[styles.meterFill, { width: `${Math.max(2, value)}%`, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'rgba(5,7,15,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    color: palette.text,
    fontSize: 14.5,
    minHeight: 44,
  },
  memText: { color: palette.text, fontSize: 14.5, lineHeight: 21 },
  name: { color: palette.text, fontSize: 18, fontWeight: '800' },
  body: { color: palette.textDim, fontSize: 14, lineHeight: 21 },
  faint: { color: palette.textFaint, fontSize: 12, lineHeight: 18 },
  link: { color: palette.accent2, fontSize: 12.5, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing(2) },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(120,160,255,0.20)',
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: palette.accent },
  meterTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(120,160,255,0.20)',
    overflow: 'hidden',
    marginBottom: spacing(3),
  },
  meterFill: { height: 6, borderRadius: 3 },
});
