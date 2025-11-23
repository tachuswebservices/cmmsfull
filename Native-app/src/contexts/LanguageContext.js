import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';

// Import translations (English base)
import { en } from '../localization/translations';

export const LanguageContext = createContext();

const LANGUAGE_KEY = 'factory_app_language';

// Initialize i18n with only English translations; other locales will fallback to English
const i18n = new I18n({ en });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  // Load saved language preference (if any) on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
        const next = (saved && typeof saved === 'string') ? saved : 'en';
        setLocale(next);
        i18n.locale = next;
      } catch (error) {
        console.error('Error loading language preference:', error);
        setLocale('en');
        i18n.locale = 'en';
      }
    })();
  }, []);

  // Change language function (accepts newLocale)
  const changeLanguage = async (newLocale = 'en') => {
    try {
      setLocale(newLocale);
      i18n.locale = newLocale;
      await AsyncStorage.setItem(LANGUAGE_KEY, newLocale);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
  };

  // Translate function
  const t = (key, options = {}) => i18n.t(key, options);

  return (
    <LanguageContext.Provider
      value={{
        locale,
        // Backward compatibility aliases
        language: locale,
        setLanguage: changeLanguage,
        changeLanguage,
        t,
        isEnglish: locale === 'en',
        isHindi: locale === 'hi',
        translations: i18n.translations[locale] || en,
        isTamil: locale === 'ta',
        isKannada: locale === 'kn',
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};
