import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../state/AppContext';
import { Badge, Button, Card, Chip, Field, Label, Row, Screen, Sub, Title } from '../components/UI';
import { palette, radius, spacing } from '../theme';
import {
  ALL_TRAITS,
  ANIME_STYLES,
  EYE_COLORS,
  HAIR_COLORS,
  INTENSITY_LABELS,
  PRESETS,
  SKIN_TONES,
  TRAIT_DESCRIPTIONS,
  TRAIT_LABELS,
  emptyTraits,
} from '../engine/personality';
import { AnimeAvatar } from '../components/AnimeAvatar';
import { AnimeStyle, Gender, Intensity, TraitKey, Traits } from '../types';
import { WEATHER_EMOJI, WEATHER_LABEL } from '../engine/world';

type Step = 'profile' | 'companion' | 'traits' | 'look' | 'meeting';

export function OnboardingScreen() {
  const { data, saveUserProfile, createCompanion, placeOptions, choosePlace } = useApp();
  const [step, setStep] = useState<Step>(data.user ? (data.primary ? 'meeting' : 'companion') : 'profile');

  // perfil
  const [name, setName] = useState(data.user?.name ?? '');
  const [age, setAge] = useState(String(data.user?.age ?? 20));
  const [pronouns, setPronouns] = useState(data.user?.pronouns ?? 'él');
  const [occupation, setOccupation] = useState(data.user?.occupation ?? '');
  const [country, setCountry] = useState(data.user?.country ?? '');
  const [city, setCity] = useState(data.user?.city ?? '');
  const [fictional, setFictional] = useState(data.user?.useFictionalCity ?? true);

  // compañera
  const [cName, setCName] = useState('');
  const [cAge, setCAge] = useState('19');
  const [cGender, setCGender] = useState<Gender>('femenino');
  const [cPronouns, setCPronouns] = useState('ella');
  const [style, setStyle] = useState<AnimeStyle>('tierno');
  const [presetId, setPresetId] = useState<string>('dulce');
  const [traits, setTraits] = useState<Traits>(() => {
    const base = emptyTraits();
    const p = PRESETS[0];
    Object.entries(p.traits).forEach(([k, v]) => {
      base[k as TraitKey] = v as Intensity;
    });
    return base;
  });
  const [hair, setHair] = useState(HAIR_COLORS[3]);
  const [eye, setEye] = useState(EYE_COLORS[0]);
  const [skin, setSkin] = useState(SKIN_TONES[0]);

  const places = useMemo(() => placeOptions(), [placeOptions, data.user]);

  const previewCharacter = useMemo(
    () => ({
      id: 'preview',
      name: cName || 'Aiko',
      age: Number(cAge) || 19,
      gender: cGender,
      pronouns: cPronouns,
      animeStyle: style,
      traits,
      locked: false,
      interests: [],
      hiddenInterests: [],
      family: [],
      isPrimary: true,
      avatarSeed: 1,
      hairColor: hair,
      eyeColor: eye,
      skinTone: skin,
      voice: 'natural' as const,
      createdAt: Date.now(),
      bio: '',
      occupation: '',
    }),
    [cName, cAge, cGender, cPronouns, style, traits, hair, eye, skin],
  );

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    const base = emptyTraits();
    Object.entries(p.traits).forEach(([k, v]) => {
      base[k as TraitKey] = v as Intensity;
    });
    setTraits(base);
  };

  const cycleTrait = (k: TraitKey) => {
    setTraits((prev) => ({ ...prev, [k]: (((prev[k] ?? 0) + 1) % 4) as Intensity }));
  };

  // ---------- PASO 1: perfil ----------
  if (step === 'profile') {
    return (
      <Screen>
        <View style={{ marginTop: spacing(8) }}>
          <Badge text="Paso 1 de 4" />
          <Title size={28}>Sobre ti</Title>
          <Sub>
            Solo lo básico. Ella no recibe toda tu información de golpe: te irá conociendo.
          </Sub>

          <Field label="¿Cómo te llamas?" value={name} onChangeText={setName} placeholder="Tu nombre" />
          <Field
            label="Edad"
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="20"
          />
          <Label>Pronombres</Label>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing(4) }}>
            {['él', 'ella', 'elle'].map((p) => (
              <Chip key={p} label={p} active={pronouns === p} onPress={() => setPronouns(p)} />
            ))}
          </Row>
          <Field
            label="¿Estudias o trabajas? (opcional)"
            value={occupation}
            onChangeText={setOccupation}
            placeholder="Ej. estudiante de ingeniería"
          />
          <Field label="País (opcional)" value={country} onChangeText={setCountry} placeholder="Ej. Bolivia" />
          <Field label="Ciudad (opcional)" value={city} onChangeText={setCity} placeholder="Ej. La Paz" />

          <Pressable onPress={() => setFictional(!fictional)} style={styles.toggleRow}>
            <View style={[styles.check, fictional && styles.checkOn]}>{fictional ? <Text style={styles.checkMark}>✓</Text> : null}</View>
            <Text style={styles.toggleText}>
              Usar una ciudad ficticia inspirada en mi contexto (no comparto mi ubicación)
            </Text>
          </Pressable>

          <Button
            title="Continuar"
            onPress={async () => {
              if (!name.trim()) {
                Alert.alert('Falta tu nombre', 'Escribe cómo quieres que te llame.');
                return;
              }
              const n = Number(age);
              if (!n || n < 13 || n > 99) {
                Alert.alert('Edad no válida', 'Escribe una edad entre 13 y 99.');
                return;
              }
              await saveUserProfile({
                name: name.trim(),
                age: n,
                pronouns,
                occupation: occupation.trim(),
                country: country.trim(),
                city: city.trim(),
                useFictionalCity: fictional,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC',
              });
              setStep('companion');
            }}
          />
        </View>
      </Screen>
    );
  }

  // ---------- PASO 2: compañera ----------
  if (step === 'companion') {
    return (
      <Screen>
        <View style={{ marginTop: spacing(8) }}>
          <Badge text="Paso 2 de 4" />
          <Title size={28}>Conocerás a alguien</Title>
          <Sub>
            Elige lo básico. Su personalidad, sus gustos y su historia se descubren con el tiempo, no
            se diseñan como un catálogo.
          </Sub>

          <Field label="Nombre" value={cName} onChangeText={setCName} placeholder="Ej. Aiko" />
          <Field label="Edad" value={cAge} onChangeText={setCAge} keyboardType="number-pad" placeholder="19" />

          <Label>Presentación</Label>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing(4) }}>
            {(['femenino', 'masculino', 'no_binario'] as Gender[]).map((g) => (
              <Chip
                key={g}
                label={g === 'no_binario' ? 'no binaria' : g}
                active={cGender === g}
                onPress={() => {
                  setCGender(g);
                  setCPronouns(g === 'masculino' ? 'él' : g === 'femenino' ? 'ella' : 'elle');
                }}
              />
            ))}
          </Row>

          <Label>Estilo anime</Label>
          {ANIME_STYLES.map((s) => (
            <Card
              key={s.id}
              onPress={() => setStyle(s.id)}
              style={style === s.id ? { borderColor: palette.accent, borderWidth: 2 } : undefined}
            >
              <Text style={styles.cardTitle}>{s.name}</Text>
              <Text style={styles.cardBody}>{s.desc}</Text>
            </Card>
          ))}

          <Button
            title="Siguiente: su forma de ser"
            onPress={() => {
              const n = Number(cAge);
              if (!cName.trim()) {
                Alert.alert('Falta su nombre', 'Ella también necesita un nombre.');
                return;
              }
              if (!n || n < 14 || n > 60) {
                Alert.alert('Edad no válida', 'Elige una edad entre 14 y 60.');
                return;
              }
              setStep('traits');
            }}
          />
        </View>
      </Screen>
    );
  }

  // ---------- PASO 3: rasgos ----------
  if (step === 'traits') {
    return (
      <Screen>
        <View style={{ marginTop: spacing(8) }}>
          <Badge text="Paso 3 de 4" />
          <Title size={28}>Su forma de ser</Title>
          <Sub>
            Elige un punto de partida y ajusta. Después de crearla, su personalidad queda bloqueada:
            cambiarla reinicia recuerdos y relación.
          </Sub>

          <Label>Punto de partida</Label>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing(4) }}>
            {PRESETS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => applyPreset(p.id)}
                style={[styles.preset, presetId === p.id && { borderColor: palette.accent, backgroundColor: 'rgba(76,141,255,0.14)' }]}
              >
                <Text style={styles.presetName}>{p.name}</Text>
                <Text style={styles.presetBlurb}>{p.blurb}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Label>Rasgos e intensidad (toca para cambiar)</Label>
          {ALL_TRAITS.map((k) => (
            <Pressable key={k} onPress={() => cycleTrait(k)} style={styles.traitRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.traitName}>{TRAIT_LABELS[k]}</Text>
                <Text style={styles.traitDesc}>{TRAIT_DESCRIPTIONS[k]}</Text>
              </View>
              <View style={styles.traitPill}>
                <Text style={[styles.traitPillText, { color: traits[k] ? palette.accent : palette.textFaint }]}>
                  {INTENSITY_LABELS[traits[k] ?? 0]}
                </Text>
              </View>
            </Pressable>
          ))}

          <Button title="Siguiente: su apariencia" onPress={() => setStep('look')} />
        </View>
      </Screen>
    );
  }

  // ---------- PASO 4: apariencia ----------
  if (step === 'look') {
    return (
      <Screen>
        <View style={{ marginTop: spacing(8) }}>
          <Badge text="Paso 4 de 4" />
          <Title size={28}>Su apariencia</Title>
          <Sub>Puedes ajustar colores ahora. La ropa y los accesorios se cambian después, sin perder nada.</Sub>

          <View style={{ alignItems: 'center', marginBottom: spacing(4) }}>
            <AnimeAvatar character={previewCharacter} emotion="curiosa" size={220} />
          </View>

          <Label>Cabello</Label>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing(4) }}>
            {HAIR_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setHair(c)}
                style={[styles.swatch, { backgroundColor: c }, hair === c && styles.swatchOn]}
              />
            ))}
          </Row>

          <Label>Ojos</Label>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing(4) }}>
            {EYE_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => setEye(c)}
                style={[styles.swatch, { backgroundColor: c }, eye === c && styles.swatchOn]}
              />
            ))}
          </Row>

          <Label>Piel</Label>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing(6) }}>
            {SKIN_TONES.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSkin(c)}
                style={[styles.swatch, { backgroundColor: c }, skin === c && styles.swatchOn]}
              />
            ))}
          </Row>

          <Button
            title="Crearla"
            onPress={async () => {
              await createCompanion({
                name: cName,
                age: Number(cAge),
                gender: cGender,
                pronouns: cPronouns,
                animeStyle: style,
                traits,
                presetId,
                hairColor: hair,
                eyeColor: eye,
                skinTone: skin,
              });
              setStep('meeting');
            }}
          />
        </View>
      </Screen>
    );
  }

  // ---------- Encuentro ----------
  return (
    <Screen>
      <View style={{ marginTop: spacing(8) }}>
        <Badge text="El primer encuentro" />
        <Title size={28}>¿Dónde se ven?</Title>
        <Sub>
          Tres lugares coherentes con tu edad, tus estudios o trabajo y tu ciudad. Elige uno: el
          inicio dependerá de cómo es ella.
        </Sub>

        {places.map((p) => (
          <Card key={p.id} onPress={() => choosePlace(p)}>
            <Row style={{ marginBottom: spacing(2) }}>
              <Text style={{ fontSize: 22, marginRight: spacing(2) }}>{p.emoji}</Text>
              <Text style={styles.cardTitle}>{p.name}</Text>
            </Row>
            <Text style={styles.cardBody}>{p.description}</Text>
          </Card>
        ))}

        {data.world ? (
          <Card>
            <Text style={styles.cardBody}>
              {WEATHER_EMOJI[data.world.weather]} {WEATHER_LABEL[data.world.weather]} · {data.world.placeName}
            </Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { color: palette.text, fontWeight: '700', fontSize: 15, marginBottom: spacing(1) },
  cardBody: { color: palette.textDim, fontSize: 13.5, lineHeight: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing(5) },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.border,
    marginRight: spacing(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: palette.accent, borderColor: palette.accent },
  checkMark: { color: '#05070F', fontWeight: '900', fontSize: 13 },
  toggleText: { color: palette.textDim, fontSize: 13, flex: 1, lineHeight: 19 },
  preset: {
    width: 190,
    padding: spacing(3.5),
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: 'rgba(13,20,38,0.72)',
    marginRight: spacing(3),
  },
  presetName: { color: palette.text, fontWeight: '700', fontSize: 14, marginBottom: spacing(1) },
  presetBlurb: { color: palette.textFaint, fontSize: 12, lineHeight: 17 },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120,160,255,0.16)',
  },
  traitName: { color: palette.text, fontSize: 14.5, fontWeight: '600' },
  traitDesc: { color: palette.textFaint, fontSize: 11.5, marginTop: 2, lineHeight: 16 },
  traitPill: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(1.5),
    borderRadius: radius.pill,
    backgroundColor: 'rgba(76,141,255,0.14)',
    minWidth: 70,
    alignItems: 'center',
  },
  traitPillText: { fontSize: 11.5, fontWeight: '700' },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing(3),
    marginBottom: spacing(2),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: { borderColor: palette.text },
});
