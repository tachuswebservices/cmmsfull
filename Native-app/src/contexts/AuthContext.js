import React, { createContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { Alert, Platform } from 'react-native';
import { scheduleLocalNotification, getExpoPushToken } from '../services/notificationService';

import { login as apiLogin, setAuthToken, requestPhoneOtp, verifyPhoneOtp, setUserPin, hasPinByContact, loginWithPin, registerPushToken, unregisterPushToken, getUserProfile } from '../services/authService';
import { setWorkOrdersAuthToken } from '../services/workOrderService';
import { setBreakdownsAuthToken } from '../services/breakdownService';
import { setPreventiveAuthToken } from '../services/preventiveService';

export const AuthContext = createContext();

const TOKEN_KEY = 'factory_app_token';
const REFRESH_TOKEN_KEY = 'factory_app_refresh_token';
const PIN_KEY = 'factory_app_pin';
const REMEMBER_ME_KEY = 'factory_app_remember_me';
const LAST_ACTIVE_KEY = 'factory_app_last_active';
const LAST_CONTACT_KEY = 'factory_app_last_contact';
const FORCE_OTP_NEXT_KEY = 'factory_app_force_otp_next';
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
const PUSH_TOKEN_KEY = 'factory_app_push_token';

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [hasPendingPreventive, setHasPendingPreventive] = useState(false);
  // Phone OTP flow state
  const [pendingPhone, setPendingPhone] = useState(null); // { countryCode, phone }
  const [pendingOtp, setPendingOtp] = useState(null); // kept for backward compatibility, not used with backend
  const [pendingTempToken, setPendingTempToken] = useState(null); // temp token from backend after OTP when PIN not set
  // PIN lock state
  const [hasPin, setHasPin] = useState(false);
  // Force OTP for next login (used when user taps "Forgot PIN")
  const [forceOtpNext, setForceOtpNext] = useState(false);

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Check if remember me is enabled
        const rememberMeValue = await AsyncStorage.getItem(REMEMBER_ME_KEY);
        const shouldRemember = rememberMeValue === 'true';
        setRememberMe(shouldRemember);

        // Check if a PIN is set
        const storedPin = await SecureStore.getItemAsync(PIN_KEY);
        const pinPresent = !!storedPin;
        setHasPin(pinPresent);

        // If PIN is set, require unlock on app open
        if (pinPresent) {
          // Load last contact to support PIN unlock after cold start
          try {
            const lastContact = await AsyncStorage.getItem(LAST_CONTACT_KEY);
            if (lastContact) {
              // Store minimally in pendingPhone for unlockWithPin
              setPendingPhone({ countryCode: '', phone: lastContact.replace(/^\+/, '') });
            }
          } catch {}
          setLoading(false);
          return;
        }

        // Check if we should force OTP next (PIN recovery mode)
        try {
          const forceFlag = await AsyncStorage.getItem(FORCE_OTP_NEXT_KEY);
          setForceOtpNext(forceFlag === 'true');
        } catch {}

        // Get token from secure storage (only when no PIN lock)
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);

        if (storedToken) {
          // Only accept likely JWT tokens
          const isLikelyJwt = typeof storedToken === 'string' && storedToken.split('.').length === 3;
          if (isLikelyJwt) {
            try {
              // Check token expiration
              const decodedToken = jwtDecode(storedToken);
              const currentTime = Date.now() / 1000;

              if (decodedToken.exp > currentTime) {
                // Check for inactivity timeout if not using remember me
                if (!shouldRemember) {
                  const lastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
                  if (lastActive) {
                    const inactiveTime = Date.now() - parseInt(lastActive);
                    if (inactiveTime > INACTIVITY_TIMEOUT) {
                      // Logout due to inactivity
                      logout();
                      setLoading(false);
                      return;
                    }
                  }
                }

                // Valid token, set authenticated and wire axios auth headers
                setToken(storedToken);
                setAuthToken(storedToken);
                setWorkOrdersAuthToken(storedToken);
                setUser(decodedToken);
                setIsAuthenticated(true);
                updateLastActive();
                // Wire other service clients
                setBreakdownsAuthToken(storedToken);
                setPreventiveAuthToken(storedToken);
                // After wiring tokens, compute pending preventive tasks
                try {
                  const svc = await import('../services/preventiveService');
                  const items = await svc.listMyPreventiveTasks();
                  setHasPendingPreventive(Array.isArray(items) && items.some(it => (it.status || '').toString().toUpperCase() !== 'COMPLETED'));
                } catch {}
                // Merge server profile (adds phone/department/etc)
                try {
                  const profile = await getUserProfile(storedToken);
                  setUser((prev) => ({ ...(prev || {}), ...(profile || {}) }));
                } catch (e) {
                  console.warn('Failed to load profile on init:', e?.message || e);
                }
              } else {
                // Token expired, clear it
                await SecureStore.deleteItemAsync(TOKEN_KEY);
              }
            } catch (e) {
              // Invalid token format; clear and continue unauthenticated
              await SecureStore.deleteItemAsync(TOKEN_KEY);
              console.warn('Invalid JWT token found in secure storage. Clearing token.');
            }
          } else {
            // Non-JWT tokens are not accepted; clear
            await SecureStore.deleteItemAsync(TOKEN_KEY);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Update last active timestamp
  const updateLastActive = async () => {
    try {
      await AsyncStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
    } catch (error) {
      console.error('Error updating last active time:', error);
    }
  };

  // Reset PIN and force re-verification flow
  const resetPin = async () => {
    try {
      // Best-effort unregister push token
      try {
        const lastPush = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (lastPush) {
          await unregisterPushToken(lastPush);
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        }
      } catch {}
      await SecureStore.deleteItemAsync(PIN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await AsyncStorage.removeItem(LAST_CONTACT_KEY);
      await AsyncStorage.setItem(FORCE_OTP_NEXT_KEY, 'true');
      setForceOtpNext(true);
      setHasPin(false);
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setPendingPhone(null);
      setPendingOtp(null);
      return true;
    } catch (e) {
      console.error('resetPin error:', e);
      return false;
    }
  };

  // Login using server-side PIN (requires contact from pendingPhone)
  const unlockWithPin = async (pin) => {
    try {
      // Prefer persisted E.164 contact to avoid formatting mismatches
      const last = await AsyncStorage.getItem(LAST_CONTACT_KEY);
      let contact = last || (pendingPhone ? `${pendingPhone.countryCode || ''}${pendingPhone.phone}` : null);
      if (!contact) {
        Alert.alert('Error', 'No phone number found');
        return false;
      }
      const res = await loginWithPin(contact, String(pin));
      const accessToken = res?.accessToken;
      const refreshToken = res?.refreshToken;
      if (!accessToken) return false;
      await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
      if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
      // Optionally store PIN locally for UX (not used for auth validation)
      await SecureStore.setItemAsync(PIN_KEY, String(pin));
      const decoded = jwtDecode(accessToken);
      setToken(accessToken);
      setAuthToken(accessToken);
      setWorkOrdersAuthToken(accessToken);
      setBreakdownsAuthToken(accessToken);
      setPreventiveAuthToken(accessToken);
      // Update pending preventive flag after unlock
      try {
        const svc = await import('../services/preventiveService');
        const items = await svc.listMyPreventiveTasks();
        setHasPendingPreventive(Array.isArray(items) && items.some(it => (it.status || '').toString().toUpperCase() !== 'COMPLETED'));
      } catch {}
      setUser(decoded);
      setIsAuthenticated(true);
      setHasPin(true);
      updateLastActive();
      // Merge server profile after unlock
      try {
        const profile = await getUserProfile(accessToken);
        setUser((prev) => ({ ...(prev || {}), ...(profile || {}) }));
      } catch (e) {
        console.warn('Failed to load profile (PIN):', e?.message || e);
      }
      // Register device for push notifications
      try {
        const expToken = await getExpoPushToken();
        if (expToken) {
          await registerPushToken(expToken, Platform.OS);
          await AsyncStorage.setItem(PUSH_TOKEN_KEY, expToken);
        }
      } catch (e) {
        console.warn('Push register (PIN) failed:', e?.message || e);
      }
      return true;
    } catch (e) {
      console.error('unlockWithPin error:', e);
      return false;
    }
  };

  // ===== Phone OTP + PIN Flow (defined in component scope) =====
  const requestOtp = async (countryCode, phone) => {
    try {
      const contact = `${countryCode || ''}${phone}`;
      // Remember contact for PIN login
      setPendingPhone({ countryCode, phone });
      await AsyncStorage.setItem(LAST_CONTACT_KEY, contact);
      // If user is in PIN recovery mode, bypass hasPin check and force OTP
      if (!forceOtpNext) {
        const pinStatus = await hasPinByContact(contact);
        if (pinStatus?.hasPin) {
          // Skip OTP, go to PIN unlock flow
          setHasPin(true);
          return { route: 'pin' };
        }
      }
      await requestPhoneOtp(countryCode, phone);
      // Clear force flag once OTP is requested
      if (forceOtpNext) {
        setForceOtpNext(false);
        try { await AsyncStorage.removeItem(FORCE_OTP_NEXT_KEY); } catch {}
      }
      return { route: 'otp' };
    } catch (e) {
      console.error('requestOtp error:', e);
      Alert.alert('OTP Failed', e.message || 'Could not start login');
      return { route: null };
    }
  };

  const verifyOtp = async (code) => {
    try {
      if (!pendingPhone?.phone) {
        Alert.alert('Error', 'No phone session found');
        return { pinSet: false, success: false };
      }
      const res = await verifyPhoneOtp(pendingPhone.phone, String(code), pendingPhone.countryCode);
      // If backend returns access token, user already has PIN set -> complete login
      if (res?.accessToken) {
        const accessToken = res.accessToken;
        const refreshToken = res.refreshToken;
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        const decoded = jwtDecode(accessToken);
        setToken(accessToken);
        setAuthToken(accessToken);
        setWorkOrdersAuthToken(accessToken);
        setBreakdownsAuthToken(accessToken);
        setPreventiveAuthToken(accessToken);
        // Update pending preventive flag after login
        try {
          const svc = await import('../services/preventiveService');
          const items = await svc.listMyPreventiveTasks();
          setHasPendingPreventive(Array.isArray(items) && items.some(it => (it.status || '').toString().toUpperCase() !== 'COMPLETED'));
        } catch {}
        setUser(decoded);
        updateLastActive();
        setPendingOtp(null);
        setPendingTempToken(null);
        // Force Set PIN screen next by marking hasPin as false and keeping unauthenticated
        setHasPin(false);
        // Merge server profile so we have full info even before PIN set
        try {
          const profile = await getUserProfile(accessToken);
          setUser((prev) => ({ ...(prev || {}), ...(profile || {}) }));
        } catch (e) {
          console.warn('Failed to load profile (OTP):', e?.message || e);
        }
        return { pinSet: false, success: true };
      }
      // No tokens returned means verification failed for LOGIN flow
      return { pinSet: false, success: false };
    } catch (e) {
      console.error('verifyOtp error:', e);
      Alert.alert('Verification Failed', e.message || 'Invalid OTP');
      return { pinSet: false, success: false };
    }
  };

  // Set PIN via backend and store locally for UX
  const setPin = async (pin) => {
    try {
      await setUserPin(String(pin));
      await SecureStore.setItemAsync(PIN_KEY, String(pin));
      setHasPin(true);
      // Now that PIN is set, finalize authentication using the existing token
      if (token) {
        setIsAuthenticated(true);
        updateLastActive();
        // Register device for push notifications
        try {
          const expToken = await getExpoPushToken();
          if (expToken) {
            await registerPushToken(expToken, Platform.OS);
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, expToken);
          }
        } catch (e) {
          console.warn('Push register (SetPin) failed:', e?.message || e);
        }
      }
      return true;
    } catch (e) {
      console.error('setPin error:', e);
      return false;
    }
  };

  // Login function
  const login = async (username, password, remember = false) => {
    try {
      setLoading(true);
      // Dev-only login bypass removed; always use backend

      // Treat username as email for backend compatibility
      const response = await apiLogin(username, password);
      
      // Backend returns accessToken and optionally refreshToken
      const accessToken = response?.accessToken;
      const refreshToken = response?.refreshToken;
      if (accessToken) {
        await SecureStore.setItemAsync(TOKEN_KEY, accessToken);
        if (refreshToken) await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);

        await AsyncStorage.setItem(REMEMBER_ME_KEY, remember.toString());
        setRememberMe(remember);

        const decoded = jwtDecode(accessToken);
        setToken(accessToken);
        setAuthToken(accessToken);
        setWorkOrdersAuthToken(accessToken);
        setUser(decoded);
        setIsAuthenticated(true);
        updateLastActive();
        // Merge server profile (adds phone/department/etc)
        try {
          const profile = await getUserProfile(accessToken);
          setUser((prev) => ({ ...(prev || {}), ...(profile || {}) }));
        } catch (e) {
          console.warn('Failed to load profile (login):', e?.message || e);
        }
        // Register device for push notifications
        try {
          const expToken = await getExpoPushToken();
          if (expToken) {
            await registerPushToken(expToken, Platform.OS);
            await AsyncStorage.setItem(PUSH_TOKEN_KEY, expToken);
          }
        } catch (e) {
          console.warn('Push register (login) failed:', e?.message || e);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Failed', error.message || 'Please check your credentials and try again');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Best-effort unregister push token on logout
      try {
        const lastPush = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (lastPush) {
          await unregisterPushToken(lastPush);
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        }
      } catch {}
      // Clear token
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      
      // Clear state
      setToken(null);
      setAuthToken(null);
      setWorkOrdersAuthToken(null);
      setBreakdownsAuthToken(null);
      setPreventiveAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);
      
      // Keep remember me preference
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Change user: fully clear PIN + auth so we land on phone login screen
  const changeUser = async () => {
    try {
      // Best-effort unregister push token
      try {
        const lastPush = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (lastPush) {
          await unregisterPushToken(lastPush);
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
        }
      } catch {}

      // Clear secure items and identifiers
      await SecureStore.deleteItemAsync(PIN_KEY);
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      try { await AsyncStorage.removeItem(LAST_CONTACT_KEY); } catch {}
      // Ensure we DO NOT force OTP next; allow backend hasPin check to route to PIN
      try { await AsyncStorage.removeItem(FORCE_OTP_NEXT_KEY); } catch {}

      // Reset axios clients
      setAuthToken(null);
      setWorkOrdersAuthToken(null);
      setBreakdownsAuthToken(null);
      setPreventiveAuthToken(null);

      // Reset state to force phone login flow
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      setPendingPhone(null);
      setPendingOtp(null);
      setPendingTempToken(null);
      setHasPin(false);
      setForceOtpNext(false);
      return true;
    } catch (e) {
      console.error('changeUser error:', e);
      return false;
    }
  };

  // Check if session is active and update last active time
  const checkSession = async () => {
    if (!isAuthenticated || rememberMe) return true;
    
    try {
      const lastActive = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      if (lastActive) {
        const inactiveTime = Date.now() - parseInt(lastActive);
        if (inactiveTime > INACTIVITY_TIMEOUT) {
          // Session expired, logout
          logout();
          Alert.alert('Session Expired', 'Your session has expired due to inactivity');
          return false;
        }
        // Update last active time
        updateLastActive();
      }
      return true;
    } catch (error) {
      console.error('Session check error:', error);
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        token,
        rememberMe,
        hasPendingPreventive,
        login,
        logout,
        changeUser,
        checkSession,
        updateLastActive,
        // Phone OTP + PIN flow
        pendingPhone,
        hasPin,
        requestOtp,
        verifyOtp,
        setPin,
        unlockWithPin,
        resetPin
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};