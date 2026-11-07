import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, AppState, Easing, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { led, themes, ThemeName } from '../theme';
import { PerfMode } from '../types';

/**
 * Fondo futurista: base azul-noche con luces LED azul/purpura/cian en
 * movimiento lento.
 *
 * Rendimiento y bateria:
 *  - Solo se animan `transform` y `opacity`, asi que todo corre en el hilo
 *    nativo (useNativeDriver) y no provoca re-renders de React.
 *  - Los bucles son largos (19-26 s) y con easing suave: el movimiento se
 *    percibe sin repintar la pantalla a 60 fps de contenido.
 *  - `perfMode` reduce la cantidad de luces: 'ligero' deja el fondo estatico,
 *    'equilibrado' usa 3 haces, 'completo' anade orbes y un haz extra.
 *  - Al pasar la app a segundo plano se detienen todas las animaciones.
 */

type Beam = {
  color: string;
  width: number;
  height: number;
  top: number;
  left: number;
  rotate: string;
  opacity: number;
  duration: number;
  delay: number;
  driftX: number;
  driftY: number;
  scaleTo: number;
};

const BEAMS: Beam[] = [
  {
    color: led.blue,
    width: 1.5,
    height: 0.55,
    top: -0.12,
    left: -0.35,
    rotate: '-24deg',
    opacity: 0.5,
    duration: 22000,
    delay: 0,
    driftX: 60,
    driftY: 40,
    scaleTo: 1.18,
  },
  {
    color: led.purple,
    width: 1.4,
    height: 0.5,
    top: 0.28,
    left: 0.05,
    rotate: '18deg',
    opacity: 0.45,
    duration: 26000,
    delay: 1200,
    driftX: -70,
    driftY: 55,
    scaleTo: 1.22,
  },
  {
    color: led.cyan,
    width: 1.2,
    height: 0.42,
    top: 0.62,
    left: -0.2,
    rotate: '-12deg',
    opacity: 0.32,
    duration: 19000,
    delay: 600,
    driftX: 80,
    driftY: -45,
    scaleTo: 1.15,
  },
  {
    color: led.magenta,
    width: 1.1,
    height: 0.38,
    top: 0.05,
    left: 0.35,
    rotate: '32deg',
    opacity: 0.26,
    duration: 24000,
    delay: 2000,
    driftX: -55,
    driftY: 60,
    scaleTo: 1.2,
  },
];

const ORBS = [
  { color: led.indigo, size: 0.9, top: 0.1, left: -0.25, opacity: 0.3, duration: 18000, drift: 40 },
  { color: led.purple, size: 0.75, top: 0.55, left: 0.5, opacity: 0.24, duration: 21000, drift: -50 },
];

function rgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function BeamLight({ beam, w, h, animate }: { beam: Beam; w: number; h: number; animate: boolean }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animate) {
      t.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: beam.duration,
          delay: beam.delay,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: beam.duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, beam.duration, beam.delay, t]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, beam.driftX] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, beam.driftY] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [1, beam.scaleTo] });
  const opacity = t.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [beam.opacity * 0.55, beam.opacity, beam.opacity * 0.6],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: beam.top * h,
        left: beam.left * w,
        width: beam.width * w,
        height: beam.height * h,
        opacity,
        transform: [{ translateX }, { translateY }, { scale }, { rotate: beam.rotate }],
      }}
    >
      <LinearGradient
        colors={[rgba(beam.color, 0), rgba(beam.color, 0.85), rgba(beam.color, 0)]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

function Orb({
  orb,
  w,
  h,
  animate,
}: {
  orb: (typeof ORBS)[number];
  w: number;
  h: number;
  animate: boolean;
}) {
  const t = useRef(new Animated.Value(0)).current;
  const size = orb.size * Math.min(w, h) * 1.6;

  useEffect(() => {
    if (!animate) {
      t.setValue(0.5);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, {
          toValue: 1,
          duration: orb.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(t, {
          toValue: 0,
          duration: orb.duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, orb.duration, t]);

  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, orb.drift] });
  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -orb.drift * 0.6] });
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: orb.top * h,
        left: orb.left * w,
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        opacity: orb.opacity,
        transform: [{ translateX }, { translateY }, { scale }],
      }}
    >
      <LinearGradient
        colors={[rgba(orb.color, 0.9), rgba(orb.color, 0.35), rgba(orb.color, 0)]}
        start={{ x: 0.5, y: 0.5 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

export function AuroraBackground({
  theme = 'noche',
  perfMode = 'equilibrado',
  dim = false,
}: {
  theme?: ThemeName;
  perfMode?: PerfMode;
  dim?: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const t = themes[theme] ?? themes.noche;
  const [active, setActive] = React.useState(true);

  // Detener animaciones en segundo plano: ahorra bateria de verdad.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => sub.remove();
  }, []);

  const animate = active && perfMode !== 'ligero';
  const beams = useMemo(() => {
    if (perfMode === 'ligero') return BEAMS.slice(0, 2);
    if (perfMode === 'equilibrado') return BEAMS.slice(0, 3);
    return BEAMS;
  }, [perfMode]);
  const orbs = perfMode === 'completo' ? ORBS : [];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={t.gradient as unknown as [string, string, ...string[]]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {beams.map((b, i) => (
        <BeamLight key={`b${i}`} beam={b} w={width} h={height} animate={animate} />
      ))}
      {orbs.map((o, i) => (
        <Orb key={`o${i}`} orb={o} w={width} h={height} animate={animate} />
      ))}

      {/* Velo de contraste: garantiza legibilidad del texto sobre las luces. */}
      <LinearGradient
        colors={['rgba(5,7,15,0.55)', 'rgba(5,7,15,0.30)', 'rgba(5,7,15,0.62)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {dim ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,7,15,0.35)' }]} /> : null}
    </View>
  );
}
