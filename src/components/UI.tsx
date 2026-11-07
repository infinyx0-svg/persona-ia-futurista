import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { glow, palette, radius, shadow, spacing, ThemeName } from '../theme';
import { AuroraBackground } from './AuroraBackground';
import { useApp } from '../state/AppContext';
import { PerfMode } from '../types';

/**
 * Contenedor de pantalla. Dibuja el fondo futurista animado y coloca el
 * contenido sobre superficies de cristal para mantener el contraste.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  style,
  theme,
  perfMode,
  dim,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: ViewStyle;
  theme?: ThemeName;
  perfMode?: PerfMode;
  dim?: boolean;
}) {
  // El tema y el modo de rendimiento salen de Ajustes; si la pantalla está
  // fuera del provider (no ocurre hoy) se usan los valores por defecto.
  let settingsTheme: ThemeName = 'noche';
  let settingsPerf: PerfMode = 'equilibrado';
  try {
    const { data } = useApp();
    settingsTheme = data.settings.theme;
    settingsPerf = data.settings.perfMode;
  } catch {
    /* fuera del provider */
  }

  const inner = (
    <View style={[{ padding: padded ? spacing(5) : 0, flexGrow: 1 }, style]}>{children}</View>
  );

  return (
    <View style={styles.fill}>
      <AuroraBackground theme={theme ?? settingsTheme} perfMode={perfMode ?? settingsPerf} dim={dim} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingBottom: spacing(10) }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </View>
  );
}

export function Title({ children, size = 30 }: { children: React.ReactNode; size?: number }) {
  return <Text style={[styles.title, { fontSize: size }]}>{children}</Text>;
}

export function Sub({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return <Text style={[styles.sub, center && { textAlign: 'center' }]}>{children}</Text>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Card({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.card, style]}>
      {/* filo luminoso superior: da el aire de cristal iluminado */}
      <LinearGradient
        colors={['rgba(76,141,255,0.55)', 'rgba(168,85,247,0.35)', 'rgba(34,211,238,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardEdge}
      />
      {children}
    </View>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
        {content}
      </Pressable>
    );
  }
  return content;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'soft';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
}) {
  const isPrimary = variant === 'primary';
  const bg =
    variant === 'primary'
      ? undefined
      : variant === 'danger'
      ? 'rgba(251,113,133,0.14)'
      : variant === 'soft'
      ? 'rgba(76,141,255,0.16)'
      : 'rgba(13,20,38,0.55)';
  const border =
    variant === 'ghost'
      ? 'rgba(120,160,255,0.28)'
      : variant === 'danger'
      ? 'rgba(251,113,133,0.45)'
      : variant === 'soft'
      ? 'rgba(76,141,255,0.35)'
      : 'transparent';
  const textColor =
    variant === 'danger' ? palette.danger : variant === 'ghost' ? palette.textDim : palette.text;

  const body = (
    <View
      style={[
        styles.btn,
        small && { paddingVertical: spacing(2.5), paddingHorizontal: spacing(4) },
        { backgroundColor: bg, borderColor: border, borderWidth: border === 'transparent' ? 0 : 1 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.btnText, { color: textColor }, small && { fontSize: 13 }]}>{title}</Text>
      )}
    </View>
  );

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
    >
      {isPrimary ? (
        <LinearGradient
          colors={['#3B7BFF', '#7C4DFF', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.btn,
            small && { paddingVertical: spacing(2.5), paddingHorizontal: spacing(4) },
            disabled && { opacity: 0.45 },
            glow('#4C8DFF', 16),
            style,
          ]}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.btnText, small && { fontSize: 13 }]}>{title}</Text>}
        </LinearGradient>
      ) : (
        body
      )}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label?: string }) {
  return (
    <View style={{ marginBottom: spacing(4) }}>
      {label ? <Label>{label}</Label> : null}
      <TextInput placeholderTextColor={palette.textFaint} style={styles.input} {...props} />
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  const c = color ?? palette.accent;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: c, borderColor: c },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[styles.chipText, active && { color: '#05070F', fontWeight: '800' }]}>{label}</Text>
    </Pressable>
  );
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: 'rgba(120,160,255,0.16)', marginVertical: spacing(4) }} />;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>{children}</View>;
}

export function Badge({ text, color = palette.accent2 }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22`, borderColor: `${color}66` }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={{ paddingVertical: spacing(8), alignItems: 'center' }}>
      <Text style={{ color: palette.textFaint, textAlign: 'center', fontSize: 14 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: palette.bg },
  title: { color: palette.text, fontWeight: '800', letterSpacing: -0.6, marginBottom: spacing(2) },
  sub: { color: palette.textDim, fontSize: 15, lineHeight: 22, marginBottom: spacing(4) },
  label: {
    color: palette.textFaint,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: spacing(2),
    fontWeight: '800',
  },
  card: {
    backgroundColor: palette.glass,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.glassBorder,
    padding: spacing(4),
    marginBottom: spacing(3),
    overflow: 'hidden',
    ...shadow,
  },
  cardEdge: { position: 'absolute', top: 0, left: 0, right: 0, height: 1.5 },
  btn: {
    borderRadius: radius.pill,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(6),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },
  btnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  input: {
    backgroundColor: 'rgba(5,7,15,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
    borderRadius: radius.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3.5),
    color: palette.text,
    fontSize: 15,
  },
  chip: {
    paddingHorizontal: spacing(3.5),
    paddingVertical: spacing(2),
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.22)',
    backgroundColor: 'rgba(13,20,38,0.7)',
    marginRight: spacing(2),
    marginBottom: spacing(2),
  },
  chipText: { color: palette.textDim, fontSize: 13 },
  badge: {
    paddingHorizontal: spacing(2.5),
    paddingVertical: spacing(1),
    borderRadius: radius.pill,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
});
