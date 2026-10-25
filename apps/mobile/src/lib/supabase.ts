import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

import { hasMobileAuthConfiguration } from '@/lib/auth-rules';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const CHUNK_SIZE = 1800;

const nativeSecureStorage = {
  async getItem(storageKey: string) {
    const manifest = await SecureStore.getItemAsync(storageKey);
    if (!manifest) return null;
    try {
      const parsed = JSON.parse(manifest) as { chunks?: number };
      if (!Number.isInteger(parsed.chunks) || !parsed.chunks || parsed.chunks < 1) return null;
      const chunks = await Promise.all(
        Array.from({ length: parsed.chunks }, (_, index) => SecureStore.getItemAsync(`${storageKey}.${index}`)),
      );
      return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join('') : null;
    } catch {
      return null;
    }
  },
  async setItem(storageKey: string, value: string) {
    await nativeSecureStorage.removeItem(storageKey);
    const chunks = Array.from({ length: Math.ceil(value.length / CHUNK_SIZE) }, (_, index) =>
      value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${storageKey}.${index}`, chunk)));
    await SecureStore.setItemAsync(storageKey, JSON.stringify({ chunks: chunks.length }));
  },
  async removeItem(storageKey: string) {
    const manifest = await SecureStore.getItemAsync(storageKey);
    if (manifest) {
      try {
        const parsed = JSON.parse(manifest) as { chunks?: number };
        if (Number.isInteger(parsed.chunks) && parsed.chunks && parsed.chunks > 0) {
          await Promise.all(Array.from({ length: parsed.chunks }, (_, index) => SecureStore.deleteItemAsync(`${storageKey}.${index}`)));
        }
      } catch {
        // A malformed local manifest has no authority; remove it below.
      }
    }
    await SecureStore.deleteItemAsync(storageKey);
  },
};

let client: SupabaseClient | null = null;

export function isAuthConfigured(): boolean {
  return hasMobileAuthConfiguration(url, key);
}

export function getSupabase(): SupabaseClient {
  if (!isAuthConfigured() || !url || !key) throw new Error('The mobile account service is not configured.');
  if (!client) {
    client = createClient(url, key, {
      auth: {
        storage: Platform.OS === 'web' ? AsyncStorage : nativeSecureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}
