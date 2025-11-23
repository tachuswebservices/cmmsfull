import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Checkbox } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';

// Import contexts
import { AuthContext } from '../../contexts/AuthContext';
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';

// Import network utils
import { getNetworkStatus } from '../../utils/networkUtils';

const LoginScreen = () => {
  // Context hooks
  const { login, loading } = useContext(AuthContext);
  const { theme, isDarkMode } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);

  // Styles
  const styles = getStyles(theme);

  // State hooks
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Check network status on mount
  useEffect(() => {
    const checkNetwork = async () => {
      const online = await getNetworkStatus();
      setIsOnline(online);
    };

    checkNetwork();
  }, []);

  // Handle login
  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert(t('error'), t('invalidCredentials'));
      return;
    }

    if (!isOnline) {
      Alert.alert(t('error'), t('noInternetConnection'));
      return;
    }

    try {
      const success = await login(username, password, rememberMe);
      
      if (!success) {
        Alert.alert(t('loginFailed'), t('invalidCredentials'));
      }
    } catch (error) {
      Alert.alert(t('error'), error.message);
    }
  };

  // Language toggle removed: app is locked to English

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={[styles.appName, { color: theme.text }]}>
              Factory Operator App
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={[styles.loginTitle, { color: theme.text }]}>
              {t('login')}
            </Text>

            {/* Username Input */}
            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="person-outline" size={20} color={theme.text} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder={t('username')}
                placeholderTextColor={isDarkMode ? '#888' : '#999'}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={[styles.inputContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.text} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder={t('password')}
                placeholderTextColor={isDarkMode ? '#888' : '#999'}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={theme.text}
                />
              </TouchableOpacity>
            </View>

            {/* Remember Me Checkbox */}
            <View style={styles.rememberContainer}>
              <Checkbox
                status={rememberMe ? 'checked' : 'unchecked'}
                onPress={() => setRememberMe(!rememberMe)}
                color={theme.primary}
              />
              <Text style={[styles.rememberText, { color: theme.text }]}>
                {t('rememberMe')}
              </Text>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.primary }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>{t('login')}</Text>
              )}
            </TouchableOpacity>

            {/* Offline Warning */}
            {!isOnline && (
              <View style={styles.offlineContainer}>
                <Ionicons name="cloud-offline-outline" size={20} color={theme.error} />
                <Text style={[styles.offlineText, { color: theme.error }]}>
                  {t('noInternetConnection')}
                </Text>
              </View>
            )}
          </View>

          {/* Language toggle removed */}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  appName: {
    fontSize: 24,
    fontFamily: theme.fonts?.bold,
    marginTop: 10,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  loginTitle: {
    fontSize: 28,
    fontFamily: theme.fonts?.bold,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 15,
    height: 55,
  },
  inputIcon: {
    marginHorizontal: 10,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  eyeIcon: {
    padding: 10,
  },
  rememberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rememberText: {
    fontSize: 16,
    marginLeft: 5,
    fontFamily: theme.fonts?.regular,
  },
  loginButton: {
    height: 55,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: theme.fonts?.bold,
  },
  offlineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  offlineText: {
    marginLeft: 5,
    fontSize: 14,
    fontFamily: theme.fonts?.regular,
  },
  languageToggle: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 10,
    borderRadius: 5,
  },
  languageText: {
    fontSize: 16,
    fontFamily: theme.fonts?.bold,
  },
});

export default LoginScreen;
