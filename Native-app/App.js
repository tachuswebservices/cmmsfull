import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { LogBox, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { clearTranslateCache } from './src/utils/translateCache';

// Import contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider, ThemeContext } from './src/contexts/ThemeContext';
import { LanguageProvider } from './src/contexts/LanguageContext';

// Import navigation
import AppNavigator from './src/navigation/AppNavigator';


// Ignore specific warnings
LogBox.ignoreLogs([
  'Asyncstorage has been extracted from react-native',
  'Setting a timer for a long period of time',
]);

// Keep the splash screen visible while we initialize the app
SplashScreen.preventAutoHideAsync();

// Show notifications in foreground (so OTP banner appears during development)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const App = () => {
  const [appIsReady, setAppIsReady] = useState(false);

  // Load fonts
  let [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
  });

  // Initialize app
  useEffect(() => {
    async function prepare() {
      try {
        // Artificial delay for splash screen
        await new Promise(resolve => setTimeout(resolve, 1000));
        // Clear translation cache once on app start (temporary request)
        await clearTranslateCache();
        // Request notification permissions and set Android channel (for OTP alerts)
        const perm = await Notifications.getPermissionsAsync();
        let status = perm.status;
        if (status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
          });
        }
      } catch (e) {
        console.warn('Error initializing app:', e);
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  // Hide splash screen when app is ready
  useEffect(() => {
    if (appIsReady && fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            <AppWithTheme />
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
};

// Component that uses theme context
const AppWithTheme = () => {
  const { theme, isDarkMode } = React.useContext(ThemeContext);

  // Start from React Navigation's default themes to preserve required keys like fonts.regular
  const baseNavTheme = isDarkMode ? NavigationDarkTheme : NavigationDefaultTheme;
  const mergedNavTheme = {
    ...baseNavTheme,
    dark: isDarkMode,
    // Ensure fonts exist for components that read theme.fonts.regular/bold
    fonts: {
      ...(baseNavTheme.fonts || {}),
      regular: theme.fonts?.regular,
      medium: theme.fonts?.regular,
      bold: theme.fonts?.bold,
      heavy: theme.fonts?.bold,
    },
    colors: {
      ...baseNavTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      notification: theme.primary,
    },
  };

  return (
    <NavigationContainer theme={mergedNavTheme}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
};

export default App;
