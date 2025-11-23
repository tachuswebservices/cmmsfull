import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'tr_cache_v1:';

// Simple djb2 hash to avoid storing very long keys
const hashString = (str) => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i); // hash * 33 + c
    hash = hash & hash; // Convert to 32bit int
  }
  return (hash >>> 0).toString(36);
};

const keyFor = (lang, text) => `${PREFIX}${lang}:${hashString(text)}`;

export const getCachedTranslation = async (lang, text) => {
  try {
    const key = keyFor(lang, text);
    const val = await AsyncStorage.getItem(key);
    return val || null;
  } catch (e) {
    return null;
  }
};

export const setCachedTranslation = async (lang, text, translated) => {
  try {
    const key = keyFor(lang, text);
    await AsyncStorage.setItem(key, translated);
  } catch (e) {
    // ignore cache errors
  }
};

export const clearTranslateCache = async () => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = (keys || []).filter((k) => k.startsWith(PREFIX));
    if (ours.length > 0) {
      await AsyncStorage.multiRemove(ours);
    }
  } catch (e) {
    // ignore clear errors
  }
};

export default {
  getCachedTranslation,
  setCachedTranslation,
  clearTranslateCache,
};
