import { Platform } from 'react-native';

/**
 * Paleta futurista (estilo Google Material You nocturno): base azul-noche muy
 * oscura, luces LED azul eléctrico / púrpura / cian y superficies de cristal.
 *
 * Regla de contraste: todo texto se apoya en una superficie con al menos 0.72
 * de opacidad sobre el fondo animado, así el brillo de las luces nunca reduce
 * la legibilidad. Los pares texto/fondo cumplen AA (>= 4.5:1) para cuerpo.
 */
export const palette = {
  // fondo
  bg: '#05070F',
  bgAlt: '#080C1A',
  surface: '#0D1426',
  surfaceAlt: '#131C33',
  border: '#22304F',
  borderGlow: 'rgba(96,165,250,0.35)',

  // texto
  text: '#F2F6FF',
  textDim: '#C3CFE8',
  textFaint: '#A6B4D2',

  // acentos LED
  accent: '#4C8DFF', // azul eléctrico
  accentSoft: '#9CC2FF',
  accent2: '#A855F7', // púrpura
  accent3: '#22D3EE', // cian
  accent4: '#E879F9', // magenta

  warn: '#FBBF24',
  danger: '#FB7185',

  // burbujas
  bubbleUser: '#3B6FE0',
  bubbleUserText: '#FFFFFF',
  bubbleChar: '#141D33',
  bubbleCharText: '#EAF1FF',
  action: '#A9B8D8',

  // cristal
  glass: 'rgba(13,20,38,0.78)',
  glassStrong: 'rgba(9,14,28,0.92)',
  glassBorder: 'rgba(120,160,255,0.18)',
  scrim: 'rgba(5,7,15,0.55)',
};

/** Colores de las luces LED del fondo animado. */
export const led = {
  blue: '#2E6BFF',
  purple: '#8B5CF6',
  cyan: '#22D3EE',
  magenta: '#C026D3',
  indigo: '#4F46E5',
};

export const themes = {
  noche: {
    bg: '#05070F',
    bgAlt: '#080C1A',
    surface: '#0D1426',
    surfaceAlt: '#131C33',
    border: '#22304F',
    accent: '#4C8DFF',
    accent2: '#A855F7',
    gradient: ['#05070F', '#0A1024', '#120A2A'] as const,
    leds: [led.blue, led.purple, led.cyan, led.magenta] as const,
  },
  aurora: {
    bg: '#040B12',
    bgAlt: '#061420',
    surface: '#0A1B2A',
    surfaceAlt: '#0F2637',
    border: '#1B3A50',
    accent: '#22D3EE',
    accent2: '#4C8DFF',
    gradient: ['#040B12', '#061A28', '#0A1030'] as const,
    leds: [led.cyan, led.blue, led.purple, led.indigo] as const,
  },
  sakura: {
    bg: '#0B0614',
    bgAlt: '#140A22',
    surface: '#1A0F2C',
    surfaceAlt: '#241539',
    border: '#3A2456',
    accent: '#E879F9',
    accent2: '#8B5CF6',
    gradient: ['#0B0614', '#170A28', '#0A0A24'] as const,
    leds: [led.magenta, led.purple, led.blue, led.cyan] as const,
  },
};

export type ThemeName = keyof typeof themes;

export const radius = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 };

export const spacing = (n: number) => n * 4;

export const font = {
  h1: 30,
  h2: 23,
  h3: 18,
  body: 15,
  small: 13,
  tiny: 11,
};

export const shadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  android: { elevation: 6 },
  default: {},
}) as object;

/** Resplandor suave para elementos activos (botones, píldoras). */
export const glow = (color: string, radiusPx = 18) =>
  Platform.select({
    ios: {
      shadowColor: color,
      shadowOpacity: 0.55,
      shadowRadius: radiusPx,
      shadowOffset: { width: 0, height: 0 },
    },
    android: { elevation: 8 },
    default: {},
  }) as object;
