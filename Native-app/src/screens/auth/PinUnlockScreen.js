import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';

const PinUnlockScreen = () => {
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { unlockWithPin, resetPin, user, changeUser } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const onUnlock = async () => {
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'Enter at least 4 digits');
      return;
    }
    setLoading(true);
    const ok = await unlockWithPin(pin);
    setLoading(false);
    if (!ok) {
      Alert.alert('Wrong PIN', 'Please try again');
    }
    // On success, auth state switches and navigator shows Main
  };

  const onForgotPin = () => {
    Alert.alert(
      'Reset PIN?',
      'You will need to verify your phone number again to set a new PIN.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await resetPin();
            // Navigator will switch to PhoneLogin because hasPin becomes false
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', paddingBottom: insets.bottom }}>
        <View style={styles.centerContent}>
          {/* Welcome header with user name */}
          <Text style={[styles.welcome, { color: theme.textSecondary }]}>Welcome{user?.name ? `, ${user.name}` : ''}</Text>
          <View style={[styles.iconWrap, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="lock-closed" size={44} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Enter PIN</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Unlock your app</Text>

          <View style={styles.form}> 
            <TextInput
              style={[styles.pinInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
              value={pin}
              onChangeText={(v) => setPin(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="••••"
              placeholderTextColor={theme.textSecondary}
              maxLength={6}
              secureTextEntry
            />

            <TouchableOpacity style={[styles.unlockBtn, { backgroundColor: theme.primary }]} onPress={onUnlock} disabled={loading}>
              <Text style={styles.unlockText}>{t('verify') || 'Unlock'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotLink} onPress={onForgotPin}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Forgot PIN?</Text>
            </TouchableOpacity>

            {/* Change user action (centered) */}
            <TouchableOpacity style={styles.changeUserLink} onPress={changeUser}>
              <Text style={{ color: theme.primary, fontWeight: '600' }}>Enter Number</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContent: { alignItems: 'center', paddingHorizontal: 16 },
  iconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  form: { width: '100%' },
  pinInput: {
    fontSize: 24,
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  unlockBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  unlockText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  forgotLink: { alignItems: 'center', marginTop: 12 },
  changeUserLink: { alignItems: 'center', marginTop: 8, alignSelf: 'center' },
});

export default PinUnlockScreen;
