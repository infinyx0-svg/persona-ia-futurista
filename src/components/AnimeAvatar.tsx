import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, ImageSourcePropType, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Character, EmotionKey, Outfit, TraitKey } from '../types';
import { emotionColor } from '../engine/emotion';

/**
 * Avatar 3D estilo VTuber.
 *
 * Sustituye al antiguo avatar vectorial (SVG) por un render 3D de anime con
 * animación sutil, manteniendo EXACTAMENTE la misma firma pública
 * (`character, emotion, outfit, size, speaking, intensity`) para que ninguna
 * pantalla que lo usa tenga que cambiar.
 *
 * Animación (todo en el hilo nativo, sin re-renders de React):
 *  - respiración: escala + desplazamiento vertical lentos (2.4 s)
 *  - balanceo de cabeza: rotación y vaivén laterales muy suaves (5.2 s)
 *  - parpadeo: se cambia a la variante con los ojos cerrados ~130 ms cada
 *    2.8-5.2 s (único cambio de estado, y es infrecuente)
 *  - habla: pulso rápido de escala mientras `speaking` es true
 *  - emoción: halo y tinte de color según la emoción actual
 *  - ropa: velo inferior teñido con el color de la prenda puesta
 *
 * Rendimiento: solo se animan `transform` y `opacity` con `useNativeDriver`,
 * así que no hay repintado de React por fotograma. Las imágenes son JPEG de
 * ~40 KB, ya recortadas a 512x512.
 */

type AvatarSet = { open: ImageSourcePropType; blink: ImageSourcePropType };

/** Mapa estático de assets: `require` necesita rutas literales. */
const AVATARS: Record<string, AvatarSet> = {
  dulce: {
    open: require('../../assets/vtuber/dulce.jpg'),
    blink: require('../../assets/vtuber/dulce_blink.jpg'),
  },
  chispa: {
    open: require('../../assets/vtuber/chispa.jpg'),
    blink: require('../../assets/vtuber/chispa_blink.jpg'),
  },
  serena: {
    open: require('../../assets/vtuber/serena.jpg'),
    blink: require('../../assets/vtuber/serena_blink.jpg'),
  },
  filo: {
    open: require('../../assets/vtuber/filo.jpg'),
    blink: require('../../assets/vtuber/filo_blink.jpg'),
  },
  musa: {
    open: require('../../assets/vtuber/musa.jpg'),
    blink: require('../../assets/vtuber/musa_blink.jpg'),
  },
};

export const AVATAR_IDS = Object.keys(AVATARS);

/**
 * Arquetipos visuales. Cada personaje se asigna al arquetipo que mejor encaja
 * con sus rasgos (y su intensidad), de forma determinista: el mismo personaje
 * siempre recibe el mismo avatar, aunque se recargue la app.
 */
const ARCHETYPES: { id: string; weights: Partial<Record<TraitKey, number>> }[] = [
  {
    id: 'dulce',
    weights: { afectuosa: 1, empatica: 0.9, timida: 0.8, tranquila: 0.5, protectora: 0.4 },
  },
  {
    id: 'chispa',
    weights: { energetica: 1, bromista: 0.9, competitiva: 0.7, coqueta: 0.4, curiosa: 0.3 },
  },
  {
    id: 'serena',
    weights: { tranquila: 1, seria: 0.8, empatica: 0.6, curiosa: 0.4, fria: 0.3 },
  },
  {
    id: 'filo',
    weights: { sarcastica: 1, fria: 0.9, competitiva: 0.6, seria: 0.4, dramatica: 0.2 },
  },
  {
    id: 'musa',
    weights: { creativa: 1, dramatica: 0.8, coqueta: 0.6, curiosa: 0.5, afectuosa: 0.3 },
  },
];

/**
 * Elige el arquetipo visual de un personaje a partir de sus rasgos.
 * Empate -> se resuelve con `avatarSeed`, que es estable por personaje.
 */
export function avatarIdFor(character: Character): string {
  const traits = character.traits ?? ({} as Character['traits']);
  let best = ARCHETYPES[0].id;
  let bestScore = -1;
  for (const arch of ARCHETYPES) {
    let score = 0;
    for (const [key, w] of Object.entries(arch.weights)) {
      score += ((traits[key as TraitKey] ?? 0) / 3) * (w as number);
    }
    // desempate estable y determinista
    score += ((character.avatarSeed ?? 0) % 1000) / 1_000_000;
    if (score > bestScore) {
      bestScore = score;
      best = arch.id;
    }
  }
  return best;
}

interface Props {
  character: Character;
  emotion: EmotionKey;
  outfit?: Outfit | null;
  size?: number;
  speaking?: boolean;
  intensity?: number;
}

export function AnimeAvatar({
  character,
  emotion,
  outfit,
  size = 260,
  speaking = false,
  intensity = 0.6,
}: Props) {
  const breathe = useRef(new Animated.Value(0)).current;
  const sway = useRef(new Animated.Value(0)).current;
  const talk = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);

  const avatarId = useMemo(() => avatarIdFor(character), [character]);
  const set = AVATARS[avatarId] ?? AVATARS.dulce;
  const tint = emotionColor(emotion);
  const amp = Math.max(0.35, Math.min(1.4, intensity));

  // --- respiración ---
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  // --- balanceo de cabeza ---
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(sway, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [sway]);

  // --- parpadeo ---
  useEffect(() => {
    let alive = true;
    let closeTimer: ReturnType<typeof setTimeout> | undefined;
    let nextTimer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (!alive) return;
      nextTimer = setTimeout(() => {
        if (!alive) return;
        setBlink(true);
        closeTimer = setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          schedule();
        }, 130);
      }, 2800 + Math.random() * 2400);
    };
    schedule();
    return () => {
      alive = false;
      if (nextTimer) clearTimeout(nextTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, []);

  // --- habla ---
  useEffect(() => {
    if (!speaking) {
      talk.stopAnimation();
      talk.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(talk, {
          toValue: 1,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(talk, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, talk]);

  const translateY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -3 * amp] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + 0.014 * amp] });
  const translateX = sway.interpolate({ inputRange: [0, 1], outputRange: [-2 * amp, 2 * amp] });
  const rotate = sway.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.2deg'] });
  const talkScale = talk.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + 0.03 * amp] });

  const top = outfit?.top ?? '#4C8DFF';

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      {/* halo de emoción */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.halo,
          {
            width: size * 0.94,
            height: size * 0.94,
            borderRadius: size * 0.47,
            backgroundColor: tint,
            opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.3] }),
            transform: [{ scale: breatheScale }],
          },
        ]}
      />

      <Animated.Image
        source={blink ? set.blink : set.open}
        resizeMode="contain"
        style={[
          styles.img,
          {
            transform: [
              { translateY },
              { translateX },
              { scale: breatheScale },
              { scale: talkScale },
              { rotate },
            ],
          },
        ]}
      />

      {/* tinte de emoción sobre el personaje */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.tint,
          {
            backgroundColor: tint,
            opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.11] }),
          },
        ]}
      />

      {/* velo de ropa: refleja el color de la prenda puesta */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(0,0,0,0)', `${top}55`, `${top}99`]}
        locations={[0, 0.55, 1]}
        style={styles.outfitVeil}
      />

      {/* accesorio activo */}
      {outfit?.accessory && outfit.accessory !== 'ninguno' ? (
        <View style={[styles.accDot, { borderColor: `${top}cc` }]} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute' },
  img: { width: '100%', height: '100%' },
  tint: { ...StyleSheet.absoluteFillObject, borderRadius: 999 },
  outfitVeil: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    bottom: '0%',
    height: '18%',
    borderRadius: 14,
  },
  accDot: {
    position: 'absolute',
    right: '14%',
    bottom: '8%',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    backgroundColor: 'rgba(5,7,15,0.6)',
  },
});
