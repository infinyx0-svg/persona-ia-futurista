import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Badge, Button, Card, Chip, Divider, Label, Row, Screen, Sub, Title } from '../components/UI';
import { palette, radius, spacing } from '../theme';
import { AnimeAvatar } from '../components/AnimeAvatar';
import { VIBE_LABELS, currentOutfit, evaluateProposal } from '../engine/wardrobe';
import { Outfit } from '../types';
import { timeContext } from '../engine/emotion';

const TOPS = ['#4C8DFF', '#A855F7', '#22D3EE', '#E2E8F5', '#3B6FE0', '#FBBF24', '#1B2438'];
const BOTTOMS = ['#1B2438', '#2A3550', '#0D1426', '#3B2E5C', '#4A3A2E'];
const HAIRS = ['suelto', 'coleta', 'coleta alta', 'trenza', 'moño'];
const ACCS = ['ninguno', 'auriculares', 'collar', 'bufanda', 'muñequeras', 'gafas'];

export function ArmarioScreen() {
  const { data, wear, addNewOutfit, remove, propose, acceptProposal, rejectProposal } = useApp();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [top, setTop] = useState(TOPS[0]);
  const [bottom, setBottom] = useState(BOTTOMS[0]);
  const [hair, setHair] = useState(HAIRS[0]);
  const [acc, setAcc] = useState(ACCS[0]);
  const [vibe, setVibe] = useState<Outfit['vibe']>('casual');

  const primary = data.primary;
  if (!primary) return null;

  const outfit = currentOutfit(data.wardrobe);
  const pending = data.wardrobe.outfits.find((o) => o.id === data.wardrobe.pendingProposalId);
  const ctx = timeContext(data.world?.weather ?? 'nublado');

  return (
    <Screen>
      <View style={{ marginTop: spacing(8) }}>
        <Title size={26}>Armario</Title>
        <Sub>
          Ella decide si se siente cómoda. Puedes proponer, pero también puede rechazar o cambiar
          algo.
        </Sub>

        <View style={{ alignItems: 'center', marginBottom: spacing(4) }}>
          <AnimeAvatar character={primary} emotion={data.emotion.key} outfit={outfit} size={230} />
          <Text style={styles.currentName}>{outfit?.name ?? 'Sin ropa asignada'}</Text>
          <Text style={styles.faint}>
            {outfit ? VIBE_LABELS[outfit.vibe] : '—'} · {hairLabel(outfit)}
          </Text>
        </View>

        {pending ? (
          <Card style={{ borderColor: palette.accent, borderWidth: 1.5 }}>
            <Badge text="Propuesta de ella" color={palette.accent} />
            <Text style={[styles.body, { marginTop: spacing(2) }]}>
              «{evaluateProposal(primary, pending, data.world?.weather ?? 'nublado', ctx.partOfDay).reply}»
            </Text>
            <Text style={styles.faint}>{pending.name}</Text>
            <Row style={{ marginTop: spacing(3) }}>
              <Button title="Me gusta, ponlo" small onPress={acceptProposal} />
              <View style={{ width: spacing(2) }} />
              <Button title="Mejor no" small variant="ghost" onPress={rejectProposal} />
            </Row>
          </Card>
        ) : null}

        <Button
          title="Pedirle que se cambie"
          variant="soft"
          onPress={async () => {
            const o = await propose();
            if (o) Alert.alert('Propuesta enviada', `Le propusiste: ${o.name}. Ella decidirá.`);
          }}
        />

        <Divider />
        <Label>Su armario ({data.wardrobe.outfits.length})</Label>

        {data.wardrobe.outfits.map((o) => (
          <Card key={o.id} style={o.id === data.wardrobe.currentOutfitId ? { borderColor: palette.accent3 } : undefined}>
            <Row style={{ justifyContent: 'space-between', marginBottom: spacing(2) }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.outfitName}>{o.name}</Text>
                <Text style={styles.faint}>
                  {VIBE_LABELS[o.vibe]} · {o.hair} · {o.accessory}
                </Text>
              </View>
              <Row>
                <View style={[styles.swatch, { backgroundColor: o.top }]} />
                <View style={[styles.swatch, { backgroundColor: o.bottom }]} />
              </Row>
            </Row>
            <Row>
              {o.id === data.wardrobe.currentOutfitId ? (
                <Badge text="Puesto ahora" color={palette.accent3} />
              ) : (
                <Button title="Poner" small variant="soft" onPress={() => wear(o.id)} />
              )}
              <View style={{ flex: 1 }} />
              <Pressable
                onPress={() =>
                  Alert.alert('Quitar prenda', `¿Sacar "${o.name}" del armario?`, [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Quitar', style: 'destructive', onPress: () => remove(o.id) },
                  ])
                }
              >
                <Text style={{ color: palette.danger, fontSize: 12.5 }}>Quitar</Text>
              </Pressable>
            </Row>
          </Card>
        ))}

        <Divider />
        <Button title={creating ? 'Cancelar' : 'Añadir ropa nueva'} variant="ghost" onPress={() => setCreating((v) => !v)} />

        {creating ? (
          <Card>
            <Label>Nombre de la prenda</Label>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej. Sudadera violeta"
              placeholderTextColor={palette.textFaint}
              style={styles.input}
            />
            <Label>Color superior</Label>
            <Row style={{ flexWrap: 'wrap', marginBottom: spacing(3) }}>
              {TOPS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setTop(c)}
                  style={[styles.swatchLg, { backgroundColor: c }, top === c && styles.swatchOn]}
                />
              ))}
            </Row>
            <Label>Color inferior</Label>
            <Row style={{ flexWrap: 'wrap', marginBottom: spacing(3) }}>
              {BOTTOMS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setBottom(c)}
                  style={[styles.swatchLg, { backgroundColor: c }, bottom === c && styles.swatchOn]}
                />
              ))}
            </Row>
            <Label>Peinado</Label>
            <Row style={{ flexWrap: 'wrap', marginBottom: spacing(3) }}>
              {HAIRS.map((h) => (
                <Chip key={h} label={h} active={hair === h} onPress={() => setHair(h)} />
              ))}
            </Row>
            <Label>Accesorio</Label>
            <Row style={{ flexWrap: 'wrap', marginBottom: spacing(3) }}>
              {ACCS.map((a) => (
                <Chip key={a} label={a} active={acc === a} onPress={() => setAcc(a)} />
              ))}
            </Row>
            <Label>Ocasión</Label>
            <Row style={{ flexWrap: 'wrap', marginBottom: spacing(3) }}>
              {(Object.keys(VIBE_LABELS) as Outfit['vibe'][]).map((v) => (
                <Chip key={v} label={VIBE_LABELS[v]} active={vibe === v} onPress={() => setVibe(v)} />
              ))}
            </Row>
            <Button
              title="Guardar en el armario"
              onPress={async () => {
                if (!name.trim()) {
                  Alert.alert('Falta el nombre', 'Ponle un nombre a la prenda.');
                  return;
                }
                await addNewOutfit({
                  name: name.trim(),
                  top,
                  bottom,
                  hair,
                  accessory: acc,
                  vibe,
                  owned: true,
                  proposedBy: 'usuario',
                });
                setName('');
                setCreating(false);
              }}
            />
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function hairLabel(o: Outfit | null): string {
  return o ? o.hair : '—';
}

const styles = StyleSheet.create({
  currentName: { color: palette.text, fontSize: 16, fontWeight: '700', marginTop: spacing(2) },
  faint: { color: palette.textFaint, fontSize: 12, lineHeight: 18 },
  body: { color: palette.textDim, fontSize: 14, lineHeight: 21 },
  outfitName: { color: palette.text, fontSize: 15, fontWeight: '600' },
  swatch: { width: 18, height: 18, borderRadius: 9, marginLeft: spacing(1.5), borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  swatchLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing(2.5),
    marginBottom: spacing(2),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: { borderColor: palette.text },
  input: {
    backgroundColor: 'rgba(5,7,15,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(3),
    color: palette.text,
    fontSize: 14.5,
    marginBottom: spacing(3),
  },
});
