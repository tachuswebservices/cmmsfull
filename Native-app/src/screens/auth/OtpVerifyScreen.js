import React, { useContext, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';

const OtpVerifyScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { pendingPhone, verifyOtp, requestOtp } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    if (code.length < 6) {
      Alert.alert('Invalid code', 'Please enter 6-digit code');
      return;
    }
    setLoading(true);
    const result = await verifyOtp(code);
    setLoading(false);
    if (!result?.success) {
      Alert.alert('Incorrect code', 'Please try again');
      return;
    }
    // If PIN not set yet, take user to Set PIN screen
    if (result && result.success && !result.pinSet) {
      navigation.navigate('SetPin');
      return;
    }
    // Otherwise, AuthContext sets isAuthenticated and navigator should switch automatically
  };

  const onResend = async () => {
    if (!pendingPhone) return;
    await requestOtp(pendingPhone.countryCode, pendingPhone.phone);
  };

  const masked = pendingPhone ? `${pendingPhone.countryCode} ******${pendingPhone.phone?.slice(-4)}` : '';

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', paddingBottom: insets.bottom }}>
        <View style={[styles.headerRow, { position: 'absolute', top: 0, left: 0, right: 0 }]}> 
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>We just sent you an SMS</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Enter the security code we sent to {masked}</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.otpInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="______"
            placeholderTextColor={theme.textSecondary}
            maxLength={6}
          />

          <TouchableOpacity style={[styles.verifyButton, { backgroundColor: theme.primary }]} onPress={onVerify} disabled={loading}>
            <Text style={styles.verifyText}>{t('verify') || 'Verify'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendLink} onPress={onResend}>
            <Text style={{ color: theme.primary }}>{t('resendCode') || "Didn't receive a code?"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  headerRow: { padding: 16 },
  header: { paddingHorizontal: 16, alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  subtitle: { fontSize: 14 },
  form: { paddingHorizontal: 16 },
  otpInput: {
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifyButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resendLink: { alignItems: 'center', marginTop: 12 },
});

export default OtpVerifyScreen;
