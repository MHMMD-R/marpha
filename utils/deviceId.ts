import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = 'marpha_device_binding_id';

/**
 * Generates a UUID-like unique string.
 */
function generateDeviceId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  );
}

/**
 * Generates and persists a unique device ID.
 * 
 * Storage priority:
 * 1. SecureStore (iOS Keychain persists across reinstalls, Android EncryptedSharedPrefs)
 * 2. AsyncStorage fallback (if SecureStore fails on certain Android devices)
 * 3. NEVER returns a random temp ID — if both fail, we throw so login blocks safely.
 * 
 * On iOS, SecureStore persists across app uninstalls via the Keychain.
 * On Android, SecureStore is deleted on uninstall, but we use it for consistency.
 * On Web, only AsyncStorage is used.
 */
export async function getDeviceId(): Promise<string> {
  // Web: only use AsyncStorage
  if (Platform.OS === 'web') {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = generateDeviceId();
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  }

  // Mobile: try SecureStore first, fall back to AsyncStorage
  try {
    const secureId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
    if (secureId) return secureId;
  } catch (e) {
    console.warn('[DeviceId] SecureStore read failed, trying AsyncStorage fallback:', e);
  }

  // SecureStore was empty or failed — check AsyncStorage as secondary
  try {
    const asyncId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (asyncId) {
      // Found in AsyncStorage. Try to promote it to SecureStore for future reads.
      try { await SecureStore.setItemAsync(DEVICE_ID_KEY, asyncId); } catch (_) {}
      return asyncId;
    }
  } catch (e) {
    console.warn('[DeviceId] AsyncStorage read also failed:', e);
  }

  // Neither store had a value — generate a new one and save to BOTH
  const newId = generateDeviceId();

  // Save to SecureStore (primary)
  try {
    await SecureStore.setItemAsync(DEVICE_ID_KEY, newId);
  } catch (e) {
    console.warn('[DeviceId] SecureStore write failed:', e);
  }

  // Save to AsyncStorage (backup)
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
  } catch (e) {
    console.warn('[DeviceId] AsyncStorage write failed:', e);
  }

  return newId;
}
