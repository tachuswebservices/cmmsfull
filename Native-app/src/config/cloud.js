// Google Cloud configuration (client-side)
// Paste your keys below. For production, prefer server-side proxy to hide keys.

export const USE_DIRECT_GOOGLE_TRANSLATE = true; // Set false to use a backend proxy instead
export const USE_DIRECT_GOOGLE_STT = true; // Set false to use a backend proxy instead

// Cloud Translation API (v2) key
export const GOOGLE_TRANSLATE_API_KEY = 'AIzaSyCf-mNmuXwLXaVmD3oP9WrawdAzrawenIw';

// Speech-to-Text API (v1) key and region (region used only for v2; we call v1 here)
export const GOOGLE_SPEECH_API_KEY = 'AIzaSyCnQHyCSv5ypMVAGtYZV2fr0XMExj0iN6I';
export const GOOGLE_SPEECH_REGION = 'us-central1';

// Supported languages for PM steps translation selector
export const SUPPORTED_PM_LANGS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'kn', label: 'Kannada' },
];
