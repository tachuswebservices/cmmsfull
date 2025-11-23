import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import Screen from '../../components/Screen';
// Removed API_URL; we don't fetch profile images

// Import contexts
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';

// Import utils
import { getNetworkStatus } from '../../utils/networkUtils';

// Import services (no profile image updates)
import { SUPPORTED_PM_LANGS } from '../../config/cloud';

const ProfileScreen = () => {
  // Context hooks
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { user, logout } = useContext(AuthContext);

  // State hooks
  const [isOnline, setIsOnline] = useState(true);
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [preferredLanguage, setPreferredLanguage] = useState('en');

  // Safe area handled by Screen component

  // Check network status and load profile data on mount
  useEffect(() => {
    const checkNetworkAndLoadData = async () => {
      // Check network status
      const status = await getNetworkStatus();
      setIsOnline(status.isConnected);

      // Offline data removed: no last sync or pending actions

      // Load preferred speech language
      try {
        const savedLang = await AsyncStorage.getItem('preferred_speech_language');
        if (savedLang) {
          setPreferredLanguage(savedLang);
        }
      } catch (error) {
        console.error('Error loading preferred language:', error);
      }
    };

    checkNetworkAndLoadData();
  }, []);

  // Removed image picking handler to disable DP change

  // Appearance controls removed

  // Language change removed: app is locked to English
  const handlePreferredLanguageChange = async (value) => {
    try {
      setPreferredLanguage(value);
      await AsyncStorage.setItem('preferred_speech_language', value);
      // No UI language change; this is used for STT on Breakdown screen
    } catch (e) {
      console.error('Failed to save preferred language:', e);
    }
  };

  // Handle logout
  const handleLogout = () => {
    Alert.alert(
      t('confirmLogout'),
      t('logoutConfirmationMessage'),
      [
        {
          text: t('cancel'),
          style: 'cancel',
        },
        {
          text: t('logout'),
          onPress: () => logout(),
          style: 'destructive',
        },
      ]
    );
  };

  // Offline data removed: no date formatting needed

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} withScroll>
      {/* Profile Header (DP change disabled) */}
      <View style={[styles.profileHeader, { backgroundColor: theme.primary }]}>
        <View style={styles.profileImageContainer}>
          <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.card }]}>
            <Ionicons name="person" size={40} color={theme.textSecondary} />
          </View>
        </View>
        <Text style={styles.profileName}>{user?.name || t('user')}</Text>
        <Text style={styles.profileRole}>{user?.role || t('operator')}</Text>
      </View>

      {/* Settings Sections */}
      <View style={styles.settingsContainer}>
        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('account')}</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="person-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('name')}</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              {user?.name || t('notAvailable')}
            </Text>
          </View>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="mail-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('email')}</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              {user?.email || t('notAvailable')}
            </Text>
          </View>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="call-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('phone')}</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              {user?.phone || t('notAvailable')}
            </Text>
          </View>
        </View>

        {/* Appearance Section removed */}

        {/* Preferences Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="language-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>Preferred language</Text>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={preferredLanguage}
                onValueChange={handlePreferredLanguageChange}
                style={{ width: 180, color: theme.text }}
                dropdownIconColor={theme.text}
              >
                {SUPPORTED_PM_LANGS.map((l) => (
                  <Picker.Item key={l.code} label={l.label} value={l.code} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Offline Data Section removed */}

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('about')}</Text>
          
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Ionicons name="information-circle-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('version')}</Text>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>{appVersion}</Text>
          </View>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="help-circle-outline" size={24} color={theme.primary} />
              <Text style={[styles.settingLabel, { color: theme.text }]}>{t('help')}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.error }]}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#fff" />
          <Text style={styles.logoutButtonText}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  profileHeader: {
    paddingTop: 30,
    paddingBottom: 20,
    alignItems: 'center',
  },
  profileImageContainer: {
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  settingsContainer: {
    padding: 16,
  },
  section: {
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabel: {
    fontSize: 16,
    marginLeft: 12,
  },
  settingValue: {
    fontSize: 14,
  },
  
  pickerWrapper: {
    minWidth: 180,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default ProfileScreen;