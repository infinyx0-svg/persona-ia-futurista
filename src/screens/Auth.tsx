import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../state/AppContext';
import { Button, Card, Field, Screen, Sub, Title } from '../components/UI';
import { glow, palette, radius, spacing } from '../theme';

export function WelcomeScreen() {
  const { go, authMode } = useApp();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: spacing(16) }}>
        <View style={styles.orb}>
          <LinearGradient
            colors={['#3B7BFF', '#7C4DFF', '#22D3EE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.orbInner}
          />
        </View>
        <Title size={38}>Persona IA</Title>
        <Sub>
          Una compañera con identidad propia, memoria y una vida que no gira solo alrededor de ti.
        </Sub>

        <Card style={{ marginTop: spacing(6) }}>
          <Text style={styles.cardTitle}>No es un juego</Text>
          <Text style={styles.cardBody}>
            Sin niveles, sin misiones, sin botones para saltar días. La relación avanza con
            conversaciones reales, y también puede romperse.
          </Text>
        </Card>

        <Button title="Crear mi cuenta" onPress={() => go('signup')} />
        <Button title="Ya tengo cuenta" variant="ghost" onPress={() => go('login')} />
        <Text style={styles.foot}>Autenticación: {authMode}</Text>
      </View>
    </Screen>
  );
}

export function SignUpScreen() {
  const { signUp, busy, error, clearError, go } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');

  const submit = async () => {
    clearError();
    if (pass !== pass2) {
      Alert.alert('Contraseñas distintas', 'Las dos contraseñas deben coincidir.');
      return;
    }
    await signUp(email, pass);
  };

  return (
    <Screen>
      <Pressable onPress={() => go('welcome')} style={{ marginTop: spacing(6), marginBottom: spacing(4) }}>
        <Text style={{ color: palette.textDim, fontSize: 15 }}>← Volver</Text>
      </Pressable>
      <Title size={28}>Crear cuenta</Title>
      <Sub>Tu cuenta guarda tu mundo, tus recuerdos y tu relación. Nada se comparte con nadie.</Sub>

      <Field
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field
        label="Contraseña"
        value={pass}
        onChangeText={setPass}
        placeholder="Mínimo 6 caracteres"
        secureTextEntry
      />
      <Field
        label="Repetir contraseña"
        value={pass2}
        onChangeText={setPass2}
        placeholder="Otra vez"
        secureTextEntry
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Crear cuenta" onPress={submit} loading={busy} />
      <Button title="Ya tengo cuenta" variant="ghost" onPress={() => go('login')} />
    </Screen>
  );
}

export function LoginScreen() {
  const { signIn, busy, error, clearError, go } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  return (
    <Screen>
      <Pressable onPress={() => go('welcome')} style={{ marginTop: spacing(6), marginBottom: spacing(4) }}>
        <Text style={{ color: palette.textDim, fontSize: 15 }}>← Volver</Text>
      </Pressable>
      <Title size={28}>Entrar</Title>
      <Sub>Tu compañera te espera donde la dejaste.</Sub>

      <Field
        label="Correo"
        value={email}
        onChangeText={setEmail}
        placeholder="tu@correo.com"
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Field label="Contraseña" value={pass} onChangeText={setPass} placeholder="Tu contraseña" secureTextEntry />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title="Entrar"
        onPress={async () => {
          clearError();
          await signIn(email, pass);
        }}
        loading={busy}
      />
      <Button title="Crear una cuenta nueva" variant="ghost" onPress={() => go('signup')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  orb: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    marginBottom: spacing(6),
    alignSelf: 'flex-start',
    ...glow('#4C8DFF', 26),
  },
  orbInner: { flex: 1 },
  cardTitle: { color: palette.text, fontWeight: '700', fontSize: 15, marginBottom: spacing(2) },
  cardBody: { color: palette.textDim, fontSize: 14, lineHeight: 21 },
  foot: { color: palette.textFaint, fontSize: 12, textAlign: 'center', marginTop: spacing(4) },
  error: {
    color: palette.danger,
    fontSize: 13,
    marginBottom: spacing(3),
    backgroundColor: 'rgba(251,113,133,0.12)',
    padding: spacing(3),
    borderRadius: radius.sm,
  },
});
