/**
 * Firebase Configuration for Remote Cloud Database
 * 
 * You can configure Firebase by either:
 * 1. Pasting your config in STATIC_FIREBASE_CONFIG below, OR
 * 2. Using the in-app "Cloud Database Settings" button in the navigation header.
 */

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

const STORAGE_KEY_FB_CONFIG = 'family_app_firebase_custom_config_v1';

// Paste your Firebase config object here if you prefer hardcoding it:
export const STATIC_FIREBASE_CONFIG: FirebaseAppConfig | null = null;

export function getActiveFirebaseConfig(): FirebaseAppConfig | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_FB_CONFIG);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.projectId && parsed.apiKey && parsed.apiKey !== 'AIzaSy...') {
        return parsed;
      }
    }
  } catch {}

  if (STATIC_FIREBASE_CONFIG && STATIC_FIREBASE_CONFIG.projectId && STATIC_FIREBASE_CONFIG.apiKey !== 'AIzaSy...') {
    return STATIC_FIREBASE_CONFIG;
  }

  return null;
}

export function saveActiveFirebaseConfig(config: FirebaseAppConfig | null): void {
  try {
    if (!config) {
      localStorage.removeItem(STORAGE_KEY_FB_CONFIG);
    } else {
      localStorage.setItem(STORAGE_KEY_FB_CONFIG, JSON.stringify(config));
    }
  } catch (err) {
    console.error('Failed to save Firebase config in localStorage:', err);
  }
}
