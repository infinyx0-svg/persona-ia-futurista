import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { Character, EmotionKey, Outfit } from '../types';
import { EMOTION_FACE } from '../engine/emotion';

interface Props {
  character: Character;
  emotion: EmotionKey;
  outfit?: Outfit | null;
  size?: number;
  speaking?: boolean;
  intensity?: number;
}

export function AnimeAvatar({ character, emotion, outfit, size = 260, speaking = false, intensity = 0.6 }: Props) {
  const breathe = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);
  const [mouth, setMouth] = useState(0);
  const face = EMOTION_FACE[emotion] ?? EMOTION_FACE.tranquila;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (!alive) return;
      setBlink(true);
      setTimeout(() => alive && setBlink(false), 120);
      setTimeout(tick, 2600 + Math.random() * 3200);
    };
    const t = setTimeout(tick, 1500);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (!speaking) {
      setMouth(0);
      return;
    }
    const id = setInterval(() => setMouth(Math.random()), 110);
    return () => clearInterval(id);
  }, [speaking]);

  const translateY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] });

  const hair = character.hairColor;
  const eye = character.eyeColor;
  const skin = character.skinTone;
  const top = outfit?.top ?? '#4C8DFF';
  const bottom = outfit?.bottom ?? '#2B2233';

  const eyeOpen = blink ? 0.08 : Math.max(0.25, face.eye);
  const browY = 96 - face.brow * 5;
  const mouthOpen = speaking ? 2 + mouth * 5 : Math.max(0, face.mouth) * 2.5;
  const mouthCurve = face.mouth * 5;

  return (
    <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
      <View style={[styles.wrap, { width: size, height: size * 1.15 }]}>
        <Svg width={size} height={size * 1.15} viewBox="0 0 200 230">
          {/* halo */}
          <Circle cx="100" cy="105" r="86" fill="#A855F7" opacity={0.07} />
          <Circle cx="100" cy="105" r="70" fill="#4C8DFF" opacity={0.08} />

          {/* cuerpo / ropa */}
          <Path d="M52 230 C52 186 70 168 100 168 C130 168 148 186 148 230 Z" fill={top} />
          <Path d="M78 168 L100 196 L122 168 L122 230 L78 230 Z" fill={bottom} opacity={0.9} />
          <Path d="M52 230 C52 200 62 184 78 176 L86 230 Z" fill="#ffffff" opacity={0.08} />

          {/* cuello */}
          <Rect x="90" y="150" width="20" height="24" rx="8" fill={skin} />

          {/* pelo trasero */}
          <Path d="M46 108 C46 56 70 30 100 30 C130 30 154 56 154 108 L154 168 C154 176 146 180 140 174 L136 120 L64 120 L60 174 C54 180 46 176 46 168 Z" fill={hair} />

          {/* cara */}
          <Ellipse cx="100" cy="104" rx="46" ry="52" fill={skin} />
          {/* orejas */}
          <Ellipse cx="54" cy="108" rx="7" ry="11" fill={skin} />
          <Ellipse cx="146" cy="108" rx="7" ry="11" fill={skin} />

          {/* rubor */}
          {face.blush > 0.15 && (
            <G opacity={face.blush * 0.55}>
              <Ellipse cx="72" cy="122" rx="11" ry="6" fill="#A855F7" />
              <Ellipse cx="128" cy="122" rx="11" ry="6" fill="#A855F7" />
            </G>
          )}

          {/* cejas */}
          <Path
            d={`M70 ${browY} Q80 ${browY - 4 - face.brow * 3} 90 ${browY + 1}`}
            stroke={hair}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
          <Path
            d={`M110 ${browY + 1} Q120 ${browY - 4 - face.brow * 3} 130 ${browY}`}
            stroke={hair}
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* ojos */}
          <G>
            <Ellipse cx="80" cy="110" rx="11" ry={13 * eyeOpen} fill="#FFFFFF" />
            <Ellipse cx="120" cy="110" rx="11" ry={13 * eyeOpen} fill="#FFFFFF" />
            <Ellipse cx="80" cy="110" rx="8" ry={10 * eyeOpen} fill={eye} />
            <Ellipse cx="120" cy="110" rx="8" ry={10 * eyeOpen} fill={eye} />
            <Ellipse cx="80" cy="110" rx="4" ry={5 * eyeOpen} fill="#05070F" />
            <Ellipse cx="120" cy="110" rx="4" ry={5 * eyeOpen} fill="#05070F" />
            <Circle cx="83" cy="106" r={2.4 * eyeOpen} fill="#FFFFFF" opacity={0.95} />
            <Circle cx="123" cy="106" r={2.4 * eyeOpen} fill="#FFFFFF" opacity={0.95} />
            {/* párpado superior */}
            <Path d={`M69 ${110 - 13 * eyeOpen} Q80 ${104 - 13 * eyeOpen} 91 ${110 - 13 * eyeOpen}`} stroke="#2B2233" strokeWidth="2.4" fill="none" strokeLinecap="round" />
            <Path d={`M109 ${110 - 13 * eyeOpen} Q120 ${104 - 13 * eyeOpen} 131 ${110 - 13 * eyeOpen}`} stroke="#2B2233" strokeWidth="2.4" fill="none" strokeLinecap="round" />
          </G>

          {/* nariz */}
          <Path d="M100 118 L97 126 L102 126" stroke="#C99A7E" strokeWidth="1.6" fill="none" strokeLinecap="round" opacity={0.7} />

          {/* boca */}
          <Path
            d={`M90 ${136 + mouthCurve * 0.2} Q100 ${136 + mouthCurve + mouthOpen} 110 ${136 + mouthCurve * 0.2}`}
            stroke="#B5546B"
            strokeWidth="2.6"
            fill={mouthOpen > 2 ? '#B5546B' : 'none'}
            strokeLinecap="round"
          />

          {/* flequillo */}
          <Path d="M54 96 C58 56 76 34 100 34 C124 34 142 56 146 96 C138 78 128 70 118 74 C112 60 100 56 92 66 C84 58 70 66 66 82 C62 88 58 92 54 96 Z" fill={hair} />
          <Path d="M100 34 C112 40 120 52 122 66 C116 58 108 54 100 56 Z" fill="#ffffff" opacity={0.12} />

          {/* accesorio */}
          {outfit?.accessory === 'auriculares' && (
            <G>
              <Path d="M52 100 Q52 62 100 62 Q148 62 148 100" stroke="#22D3EE" strokeWidth="4" fill="none" />
              <Rect x="44" y="96" width="12" height="20" rx="6" fill="#22D3EE" />
              <Rect x="144" y="96" width="12" height="20" rx="6" fill="#22D3EE" />
            </G>
          )}
          {outfit?.accessory === 'collar' && <Circle cx="100" cy="176" r="4" fill="#FFD166" />}
          {outfit?.accessory === 'bufanda' && (
            <Path d="M74 164 Q100 178 126 164 L126 178 Q100 190 74 178 Z" fill="#A855F7" opacity={0.9} />
          )}
          {outfit?.accessory === 'muñequeras' && (
            <G>
              <Rect x="52" y="196" width="14" height="10" rx="4" fill="#E2E8F5" />
              <Rect x="134" y="196" width="14" height="10" rx="4" fill="#E2E8F5" />
            </G>
          )}
        </Svg>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
