import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';

const PhoneLoginScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { requestOtp } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [isSwitchingToPin, setIsSwitchingToPin] = useState(false);

  const onContinue = async () => {
    const trimmed = phone.replace(/\D/g, '');
    if (trimmed.length < 10) {
      Alert.alert(t('invalidNumber') || 'Invalid number', t('enterValidMobileNumber') || 'Please enter a valid mobile number');
      return;
    }
    const result = await requestOtp(countryCode, trimmed);
    if (result?.route === 'pin') {
      // Do not navigate directly; AppNavigator will switch to PinUnlock when hasPin=true
      setIsSwitchingToPin(true);
      return;
    } else if (result?.route === 'otp') {
      navigation.navigate('OtpVerify');
    }
  };

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.background }]}> 
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1, justifyContent: 'flex-start', paddingTop: 12, paddingBottom: insets.bottom }}
      >
        {/* Language selector removed: app is locked to English */}
        <View style={styles.header}>
          <View style={[styles.logoContainer, { backgroundColor: theme.primaryLight, marginBottom: 24 }]}> 
            <Ionicons name="construct" size={48} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text, marginBottom: 8 }]}>{t('welcome') || 'Welcome'}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary, marginBottom: 32 }]}>{t('loginOrSignUp') || 'Log in or sign up'}</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputRow, { borderColor: theme.border, backgroundColor: theme.card, marginBottom: 16 }]}> 
            <TextInput
              style={[styles.codeInput, { color: theme.text }]}
              value={countryCode}
              onChangeText={setCountryCode}
              keyboardType="phone-pad"
              maxLength={4}
            />
            <TextInput
              style={[styles.phoneInput, { color: theme.text }]}
              placeholder={t('enterMobileNumber') || 'Enter Mobile Number'}
              placeholderTextColor={theme.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: theme.primary }]}
            onPress={onContinue}
          >
            <Text style={styles.continueText}>{t('continue') || 'Continue'}</Text>
          </TouchableOpacity>

          {isSwitchingToPin && (
            <View style={styles.switchingWrap}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.switchingText, { color: theme.textSecondary }]}>Opening PIN unlock…</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-start', paddingHorizontal: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14 },
  form: { width: '100%' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  codeInput: {
    width: 60,
    padding: 12,
    fontSize: 16,
  },
  phoneInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  continueButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default PhoneLoginScreen;
