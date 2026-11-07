import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Battery from 'expo-battery';
import { DeviceReport, PerfMode } from '../types';

export async function diagnoseDevice(): Promise<DeviceReport> {
  const notes: string[] = [];
  let batteryLevel: number | null = null;
  let batteryState = 'desconocido';

  try {
    const level = await Battery.getBatteryLevelAsync();
    batteryLevel = level >= 0 ? Math.round(level * 100) : null;
    const state = await Battery.getBatteryStateAsync();
    batteryState =
      state === Battery.BatteryState.CHARGING
        ? 'cargando'
        : state === Battery.BatteryState.FULL
        ? 'completa'
        : state === Battery.BatteryState.UNPLUGGED
        ? 'descargando'
        : 'desconocido';
  } catch {
    notes.push('No se pudo leer la bateria en este dispositivo.');
  }

  const totalMemory = Device.totalMemory ?? 0;
  const memGB = totalMemory / (1024 * 1024 * 1024);

  let recommended: PerfMode = 'equilibrado';
  if (memGB > 0 && memGB < 3) {
    recommended = 'ligero';
    notes.push('Memoria limitada: conviene el modo ligero.');
  } else if (memGB >= 6) {
    recommended = 'completo';
    notes.push('Buen margen de memoria: puedes usar el modo completo.');
  } else {
    notes.push('Equilibrio razonable entre rendimiento y funciones.');
  }

  if (batteryLevel !== null && batteryLevel < 20 && batteryState === 'descargando') {
    recommended = 'ligero';
    notes.push('Bateria baja: el modo ligero ahorra energia.');
  }

  if (Platform.OS === 'android') notes.push('Android detectado: voz del sistema disponible via expo-speech.');
  if (Platform.OS === 'ios') notes.push('iOS detectado: misma base de codigo, sin cambios.');
  if (Platform.OS === 'web') notes.push('Navegador: la voz depende del motor del navegador.');

  return {
    platform: Platform.OS,
    osVersion: String(Device.osVersion ?? Platform.Version ?? '-'),
    model: Device.modelName ?? 'Dispositivo desconocido',
    totalMemory,
    freeDisk: 0,
    batteryLevel,
    batteryState,
    audioOk: true,
    recommended,
    notes,
    checkedAt: Date.now(),
  };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '-';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
