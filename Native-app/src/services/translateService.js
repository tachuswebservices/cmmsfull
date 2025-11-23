import axios from 'axios';
import { GOOGLE_TRANSLATE_API_KEY, USE_DIRECT_GOOGLE_TRANSLATE } from '../config/cloud';
import { getCachedTranslation, setCachedTranslation } from '../utils/translateCache';

/**
 * Translate plain text to a target language using Google Translate API v2.
 * Falls back to original text if disabled, missing key, or request fails.
 * Caches per (lang, text).
 *
 * @param {string} text
 * @param {string} targetLang e.g., 'hi', 'ta', 'kn', 'en'
 * @param {string} sourceLang e.g., 'en' (omit or 'auto' to auto-detect)
 * @returns {Promise<string>} translated text (or original on failure)
 */
export const translateText = async (text, targetLang = 'en', sourceLang = 'auto') => {
  try {
    const trimmed = (text || '').trim();
    if (!trimmed) return text;
    if (!USE_DIRECT_GOOGLE_TRANSLATE) return text;
    if (!GOOGLE_TRANSLATE_API_KEY) return text;

    // Cache is keyed by source->target to avoid mixing auto/en differences
    const cacheLangKey = `${sourceLang || 'auto'}:${targetLang}`;
    const cached = await getCachedTranslation(cacheLangKey, trimmed);
    if (cached) return cached;

    const url = `https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`;
    const payload = { q: trimmed, target: targetLang, format: 'text' };
    if (sourceLang && sourceLang !== 'auto') {
      payload.source = sourceLang;
    }

    const { data } = await axios.post(url, payload, { timeout: 12000 });
    const translated = data?.data?.translations?.[0]?.translatedText;
    if (translated) {
      await setCachedTranslation(cacheLangKey, trimmed, translated);
      return translated;
    }

    return text;
  } catch (e) {
    // Fail gracefully with minimal debug signal
    try {
      console.warn('translateText failed', { targetLang, sourceLang, len: (text || '').length });
    } catch {}
    return text;
  }
};

export default { translateText };
