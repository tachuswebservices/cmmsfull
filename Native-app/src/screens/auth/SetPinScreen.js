import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';

const SetPinScreen = ({ navigation }) => {
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { setPin } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [pin, setPinValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const onSet = async () => {
    if (pin.length < 4) {
      Alert.alert('PIN too short', 'Enter at least 4 digits');
      return;
    }
    if (pin !== confirm) {
      Alert.alert('Pins do not match', 'Please re-enter');
      return;
    }
    setLoading(true);
    const ok = await setPin(pin);
    setLoading(false);
    if (!ok) {
      Alert.alert('Error', 'Failed to save PIN');
      return;
    }
    // No explicit navigation here; AuthContext.setPin marks isAuthenticated=true
    // AppNavigator will switch stacks and show Main automatically.
  };

  return (
    <SafeAreaView edges={['top','bottom']} style={[styles.container, { backgroundColor: theme.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'center', paddingBottom: insets.bottom }}>
        <View style={[styles.headerRow, { position: 'absolute', top: 0, left: 0, right: 0 }]}> 
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Set your PIN</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>You'll use this PIN to unlock the app</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.pinInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card }]}
            value={pin}
            onChangeText={(v) => setPinValue(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="PIN"
            placeholderTextColor={theme.textSecondary}
            maxLength={6}
            secureTextEntry
          />
          <TextInput
            style={[styles.pinInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card, marginTop: 12 }]}
            value={confirm}
            onChangeText={(v) => setConfirm(v.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="Confirm PIN"
            placeholderTextColor={theme.textSecondary}
            maxLength={6}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.setButton, { backgroundColor: theme.primary, opacity: pin && confirm && pin === confirm ? 1 : 0.7 }]}
            onPress={onSet}
            disabled={loading || !pin || !confirm || pin !== confirm}
          >
            <Text style={styles.setText}>{t('setPin') || 'Set PIN'}</Text>
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
  pinInput: {
    fontSize: 20,
    textAlign: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  setButton: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  setText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default SetPinScreen;
