import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { AuthUser } from '../types';
import {
  LocalUserRecord,
  clearSession,
  hashPassword,
  makeSalt,
  readLocalUsers,
  readSession,
  saveSession,
  writeLocalUsers,
} from './storage';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

const SUPABASE_URL = (extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
const SUPABASE_ANON = (extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON);

let client: SupabaseClient | null = null;
export function getSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        storage: AsyncStorage as never,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

export interface AuthResult {
  user: AuthUser | null;
  error: string | null;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validate(email: string, password: string): string | null {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email))) {
    return 'Escribe un correo valido.';
  }
  if (password.length < 6) return 'La contrasena debe tener al menos 6 caracteres.';
  return null;
}

// ---------------- Supabase ----------------
async function sbSignUp(email: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: 'Supabase no esta configurado.' };
  const { data, error } = await sb.auth.signUp({ email: normalizeEmail(email), password });
  if (error) return { user: null, error: translate(error.message) };
  if (!data.user) return { user: null, error: 'No se pudo crear la cuenta.' };
  if (!data.session) {
    return {
      user: null,
      error: 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesion.',
    };
  }
  return { user: { id: data.user.id, email: data.user.email ?? email, provider: 'supabase' }, error: null };
}

async function sbSignIn(email: string, password: string): Promise<AuthResult> {
  const sb = getSupabase();
  if (!sb) return { user: null, error: 'Supabase no esta configurado.' };
  const { data, error } = await sb.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });
  if (error) return { user: null, error: translate(error.message) };
  if (!data.user) return { user: null, error: 'Credenciales incorrectas.' };
  return { user: { id: data.user.id, email: data.user.email ?? email, provider: 'supabase' }, error: null };
}

function translate(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'Correo o contrasena incorrectos.';
  if (m.includes('already registered') || m.includes('already exists'))
    return 'Ese correo ya tiene una cuenta. Inicia sesion.';
  if (m.includes('email not confirmed')) return 'Confirma tu correo antes de iniciar sesion.';
  if (m.includes('password')) return 'La contrasena no cumple los requisitos minimos.';
  if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento.';
  if (m.includes('network') || m.includes('fetch')) return 'Sin conexion con el servidor.';
  return msg;
}

// ---------------- Local ----------------
async function localSignUp(email: string, password: string): Promise<AuthResult> {
  const users = await readLocalUsers();
  const mail = normalizeEmail(email);
  if (users.some((u) => u.email === mail)) {
    return { user: null, error: 'Ese correo ya tiene una cuenta. Inicia sesion.' };
  }
  const salt = makeSalt();
  const record: LocalUserRecord = {
    id: `local_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    email: mail,
    salt,
    hash: hashPassword(password, salt),
    createdAt: Date.now(),
  };
  await writeLocalUsers([...users, record]);
  const user: AuthUser = { id: record.id, email: record.email, provider: 'local' };
  await saveSession(user);
  return { user, error: null };
}

async function localSignIn(email: string, password: string): Promise<AuthResult> {
  const users = await readLocalUsers();
  const mail = normalizeEmail(email);
  const found = users.find((u) => u.email === mail);
  if (!found) return { user: null, error: 'No existe una cuenta con ese correo.' };
  if (found.hash !== hashPassword(password, found.salt)) {
    return { user: null, error: 'Correo o contrasena incorrectos.' };
  }
  const user: AuthUser = { id: found.id, email: found.email, provider: 'local' };
  await saveSession(user);
  return { user, error: null };
}

// ---------------- API publica ----------------
export async function signUp(email: string, password: string): Promise<AuthResult> {
  const invalid = validate(email, password);
  if (invalid) return { user: null, error: invalid };
  if (supabaseEnabled) {
    const res = await sbSignUp(email, password);
    if (res.user) await saveSession(res.user);
    return res;
  }
  return localSignUp(email, password);
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const invalid = validate(email, password);
  if (invalid) return { user: null, error: invalid };
  if (supabaseEnabled) {
    const res = await sbSignIn(email, password);
    if (res.user) await saveSession(res.user);
    return res;
  }
  return localSignIn(email, password);
}

export async function restoreSession(): Promise<AuthUser | null> {
  if (supabaseEnabled) {
    const sb = getSupabase();
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session?.user) {
        return {
          id: data.session.user.id,
          email: data.session.user.email ?? '',
          provider: 'supabase',
        };
      }
    }
  }
  return readSession<AuthUser>();
}

export async function signOut(): Promise<void> {
  if (supabaseEnabled) {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
  }
  await clearSession();
}

export const authModeLabel = supabaseEnabled ? 'Supabase Auth' : 'Modo local (sin servidor)';
