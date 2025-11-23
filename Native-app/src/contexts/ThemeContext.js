import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

const THEME_PREFERENCE_KEY = 'factory_app_theme_preference';

// Define theme colors
export const lightTheme = {
  fonts: {
    regular: 'Inter_400Regular',
    bold: 'Inter_700Bold',
  },
  primary: '#007AFF',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  border: '#C7C7CC',
  notification: '#FF3B30',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#5AC8FA',
  pending: '#FF9500',  // Orange
  inProgress: '#007AFF', // Blue
  completed: '#34C759',  // Green
  highPriority: '#FF3B30', // Red
  mediumPriority: '#FF9500', // Orange
  lowPriority: '#34C759',  // Green
};

export const darkTheme = {
  fonts: {
    regular: 'Inter_400Regular',
    bold: 'Inter_700Bold',
  },
  primary: '#0A84FF',
  background: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  border: '#38383A',
  notification: '#FF453A',
  error: '#FF453A',
  success: '#30D158',
  warning: '#FF9F0A',
  info: '#64D2FF',
  pending: '#FF9F0A',  // Orange
  inProgress: '#0A84FF', // Blue
  completed: '#30D158',  // Green
  highPriority: '#FF453A', // Red
  mediumPriority: '#FF9F0A', // Orange
  lowPriority: '#30D158',  // Green
};

export const ThemeProvider = ({ children }) => {
  // Get device color scheme
  const deviceTheme = useColorScheme();
  
  // State for theme mode
  const [isDarkMode, setIsDarkMode] = useState(deviceTheme === 'dark');
  const [theme, setTheme] = useState(deviceTheme === 'dark' ? darkTheme : lightTheme);
  const [themePreference, setThemePreference] = useState('system'); // 'light', 'dark', or 'system'

  // Load saved theme preference
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
        if (savedPreference) {
          setThemePreference(savedPreference);
          
          if (savedPreference === 'system') {
            setIsDarkMode(deviceTheme === 'dark');
            setTheme(deviceTheme === 'dark' ? darkTheme : lightTheme);
          } else {
            const isDark = savedPreference === 'dark';
            setIsDarkMode(isDark);
            setTheme(isDark ? darkTheme : lightTheme);
          }
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      }
    };

    loadThemePreference();
  }, [deviceTheme]);

  // Update theme when device theme changes (if using system preference)
  useEffect(() => {
    if (themePreference === 'system') {
      setIsDarkMode(deviceTheme === 'dark');
      setTheme(deviceTheme === 'dark' ? darkTheme : lightTheme);
    }
  }, [deviceTheme, themePreference]);

  // Toggle theme function
  const toggleTheme = async () => {
    const newIsDarkMode = !isDarkMode;
    setIsDarkMode(newIsDarkMode);
    setTheme(newIsDarkMode ? darkTheme : lightTheme);
    setThemePreference(newIsDarkMode ? 'dark' : 'light');
    
    try {
      await AsyncStorage.setItem(THEME_PREFERENCE_KEY, newIsDarkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  // Set specific theme
  const setThemeMode = async (mode) => {
    try {
      if (mode === 'system') {
        const systemIsDark = deviceTheme === 'dark';
        setIsDarkMode(systemIsDark);
        setTheme(systemIsDark ? darkTheme : lightTheme);
        setThemePreference('system');
        await AsyncStorage.setItem(THEME_PREFERENCE_KEY, 'system');
      } else {
        const newIsDarkMode = mode === 'dark';
        setIsDarkMode(newIsDarkMode);
        setTheme(newIsDarkMode ? darkTheme : lightTheme);
        setThemePreference(mode);
        await AsyncStorage.setItem(THEME_PREFERENCE_KEY, mode);
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        theme,
        themePreference,
        toggleTheme,
        setThemeMode
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
