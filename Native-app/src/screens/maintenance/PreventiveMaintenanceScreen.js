import React, { useEffect, useMemo, useRef, useState, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Animated, Easing, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useFocusEffect } from '@react-navigation/native';

// Contexts
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import { SUPPORTED_PM_LANGS, USE_DIRECT_GOOGLE_TRANSLATE, GOOGLE_TRANSLATE_API_KEY } from '../../config/cloud';
import { listPreventiveTasks, completePreventiveTask } from '../../services/preventiveService';
import * as Location from 'expo-location';
import { translateText } from '../../services/translateService';

// Simple content hash for caching translations
const pmHash = (obj) => {
  try {
    const s = JSON.stringify(obj);
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return String(h);
  } catch {
    return '0';
  }
};
const PM_TRANSLATION_CACHE_PREFIX = 'pm_translations_v2_';

const STEPS = [
  {
    title: 'Clean the machine',
    description: 'Wipe down the entire machine and worktable with a clean cloth. Remove cutting oil and metal chips.'
  },
  {
    title: 'Check oil and lubrication levels',
    description: 'Verify the pressure and level of lubricants. Perform manual greasing if required.'
  },
  {
    title: 'Coolant level check',
    description: 'Check the coolant tank level and cleanliness. Monitor coolant quality.'
  },
  {
    title: 'Power supply and voltage check',
    description: 'Check the output of the voltage stabilizer. Inspect electrical connections and switches.'
  },
  {
    title: 'Air filter and fan inspection',
    description: 'Clean or replace air filters. Check cooling fans for proper operation.'
  },
  {
    title: 'Signal and warning lights check',
    description: 'Ensure all indicator lights are functioning properly.'
  },
  {
    title: 'Machine running condition inspection',
    description: 'Listen for unusual noises, vibrations, or overheating during operation.'
  },
  {
    title: 'Tool inspection',
    description: 'Clean tools and tool magazine and ensure they are securely installed.'
  },
  {
    title: 'Safety equipment check',
    description: 'Test emergency stop buttons and safety guards.'
  },
  {
    title: 'Pipe and oil leak check',
    description: 'Inspect pipelines and units for any leaks.'
  },
  {
    title: 'Keep the machine surroundings clean',
    description: 'Maintain a clutter-free area around the machine.'
  },
];

const PreventiveMaintenanceScreen = ({ navigation, route }) => {
  const { theme } = useContext(ThemeContext);
  const { t, locale, changeLanguage } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const pointsPerStep = 10;
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedLang, setSelectedLang] = useState('en');
  const [translatedMap, setTranslatedMap] = useState({}); // { [index]: { title, description } }
  const PM_SELECTED_LANG_KEY = 'pm_selected_lang';
  const APP_LANGUAGE_KEY = 'factory_app_language';
  const SPEECH_LANGUAGE_KEY = 'preferred_speech_language';
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  // Backend PM task integration
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  // Hold-to-complete progress state
  const holdProgress = useRef(new Animated.Value(0)).current; // 0..1
  const [completeBtnWidth, setCompleteBtnWidth] = useState(0);
  // Per-task translation
  const [translatedTask, setTranslatedTask] = useState(null);
  const [isTranslatingTask, setIsTranslatingTask] = useState(false);
  const preferredAppliedRef = useRef(false); // also set true after any manual selection
  const supportedCodes = useMemo(() => new Set(SUPPORTED_PM_LANGS.map(l => l.code)), []);

  // Toast state for attractive points popup
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslate = useRef(new Animated.Value(30)).current;

  const totalSteps = STEPS.length;
  const step = STEPS[currentStep];

  // Slider removed; using a simple button instead

  

  // Load preferred language (from global AsyncStorage) and apply once
  useEffect(() => {
    (async () => {
      try {
        // Priority: factory_app_language -> preferred_speech_language
        const appPref = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
        const speechPref = await AsyncStorage.getItem(SPEECH_LANGUAGE_KEY);
        let pref = appPref || speechPref;
        if (pref && typeof pref === 'string') {
          // clamp to supported codes
          if (!supportedCodes.has(pref)) pref = 'en';
          preferredAppliedRef.current = true;
          setSelectedLang(pref);
          return;
        }
      } catch {}
      // If no stored preferred, fall back to context locale once
      if (locale && typeof locale === 'string') {
        setSelectedLang(locale);
      }
    })();
  // run only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep PM selectedLang in sync if locale changes later and no explicit preferred was applied
  useEffect(() => {
    if (!preferredAppliedRef.current && locale && typeof locale === 'string' && selectedLang !== locale) {
      const clamped = supportedCodes.has(locale) ? locale : 'en';
      setSelectedLang(clamped);
    }
  }, [locale]);

  // Translate currently selected task (title + description) when language changes
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Clear when no task or when user chooses English
      if (!selectedTask || !selectedTask?.title || selectedLang === 'en') {
        setTranslatedTask(null);
        return;
      }
      try {
        setIsTranslatingTask(true);
        const titleT = await translateText(selectedTask.title, selectedLang, 'en');
        const descT = selectedTask.description
          ? await translateText(selectedTask.description, selectedLang, 'en')
          : '';
        if (cancelled) return;
        setTranslatedTask({ title: titleT, description: descT, lang: selectedLang });
      } catch {}
      finally {
        if (!cancelled) setIsTranslatingTask(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [selectedTask?.id, selectedLang]);

  
  // Slider gesture removed

  // Load saved language
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PM_SELECTED_LANG_KEY);
        // Apply PM local saved language only if user hasn't a global preferred
        if (saved && !preferredAppliedRef.current) {
          const clamped = supportedCodes.has(saved) ? saved : 'en';
          setSelectedLang(clamped);
        }
      } catch {}
    })();
  }, []);

  // When screen comes into focus, apply latest preferred language
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        try {
          const appPref = await AsyncStorage.getItem(APP_LANGUAGE_KEY);
          const speechPref = await AsyncStorage.getItem(SPEECH_LANGUAGE_KEY);
          let pref = appPref || speechPref;
          if (pref && !supportedCodes.has(pref)) pref = 'en';
          if (active && pref && typeof pref === 'string' && selectedLang !== pref) {
            preferredAppliedRef.current = true;
            setSelectedLang(pref);
          }
        } catch {}
      })();
      return () => { active = false; };
    }, [selectedLang])
  );

  // Load preventive task from backend (optionally filter by scanned assetId)
  useEffect(() => {
    let cancelled = false;
    const fetchTask = async () => {
      try {
        setLoadingTask(true);
        let assetId = undefined;
        const raw = route?.params?.qrRaw;
        console.log('Raw:', raw);
        // Override: always treat scanned QR data as the assetId for backend filtering
        if (raw != null) {
          assetId = String(raw);
        }
        // Build query params with user identity and device location
        let latitude = undefined;
        let longitude = undefined;
        let accuracy = undefined;
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            latitude = pos?.coords?.latitude;
            longitude = pos?.coords?.longitude;
            accuracy = pos?.coords?.accuracy;
          } else {
            console.warn('Location permission not granted');
          }
        } catch (locErr) {
          console.warn('Location fetch failed:', locErr?.message || locErr);
        }

        const params = {
          ...(assetId ? { assetId } : {}),
          ...(raw ? { assetIdRaw: String(raw) } : {}),
          ...(raw ? { qrData: String(raw) } : {}),
          ...(user?.sub ? { userId: user.sub } : user?.id ? { userId: user.id } : {}),
          ...(user?.phone ? { userPhone: user.phone } : user?.mobile ? { userPhone: user.mobile } : {}),
          ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
          ...(accuracy != null ? { accuracy } : {}),
        };

        const items = await listPreventiveTasks(params);
        if (!cancelled && Array.isArray(items)) {
          setTasks(items);
          if (items.length > 0) {
            // Prefer the earliest pending task; fallback to earliest by nextDue (null nextDue last)
            const toTime = (v) => (v ? new Date(v).getTime() : Number.MAX_SAFE_INTEGER);
            const byDue = [...items].sort((a, b) => toTime(a.nextDue) - toTime(b.nextDue));
            const firstPending = byDue.find(it => it.status !== 'COMPLETED');
            setSelectedTask(firstPending || byDue[0]);
          } else {
            setSelectedTask(null);
          }
          // Count completed using server-provided status
          const done = items.filter(it => (it.status === 'COMPLETED')).length;
          setCompletedCount(done);
        }
      } catch (e) {
        console.warn('Failed to load preventive tasks:', e?.message || e);
        const status = e?.response?.status;
        const serverMsg = e?.response?.data?.message;
        if (status === 403) {
          const msg = serverMsg || 'You are not in asset location';
          // Navigate to nested tab 'Scanner' via parent stack 'Main'
          navigation.navigate('Main', {
            screen: 'Scanner',
            params: { popupMessage: msg },
          });
          return;
        } else {
          Alert.alert('Error', serverMsg || (e?.message || 'Failed to load preventive tasks'));
        }
      } finally {
        if (!cancelled) setLoadingTask(false);
      }
    };
    fetchTask();
    return () => { cancelled = true; };
  }, [route?.params?.qrRaw]);

  // Translate all steps when language changes (skip for English) with caching
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (selectedLang === 'en') {
        setTranslatedMap({});
        AsyncStorage.setItem(PM_SELECTED_LANG_KEY, selectedLang).catch(() => {});
        return;
      }

      const cacheKey = PM_TRANSLATION_CACHE_PREFIX + selectedLang;
      const contentHash = pmHash(STEPS);

      // Try cache first
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.contentHash === contentHash && parsed?.map) {
            if (!cancelled) setTranslatedMap(parsed.map);
            AsyncStorage.setItem(PM_SELECTED_LANG_KEY, selectedLang).catch(() => {});
            return; // Cache hit
          }
        }
      } catch {}

      // Cache miss -> translate now
      setIsTranslating(true);
      const out = {};
      for (let i = 0; i < STEPS.length; i++) {
        const s = STEPS[i];
        const title = await translateText(s.title, selectedLang, 'en');
        const description = await translateText(s.description, selectedLang, 'en');
        if (cancelled) return;
        out[i] = { title, description };
      }
      if (!cancelled) {
        setTranslatedMap(out);
        AsyncStorage.setItem(cacheKey, JSON.stringify({ contentHash, map: out })).catch(() => {});
      }
      setIsTranslating(false);
      AsyncStorage.setItem(PM_SELECTED_LANG_KEY, selectedLang).catch(() => {});
    };
    run();
    return () => { cancelled = true; };
  }, [selectedLang]);

  // Toggle inline language picker
  const toggleLangPicker = () => setShowLangPicker(prev => !prev);

  // Safe translation helper to avoid showing missing key markers
  const tSafe = (key, fallback) => {
    try {
      const val = t && t(key);
      if (!val) return fallback;
      const s = String(val);
      if (s.toLowerCase().includes('missing') || s.toLowerCase().includes('translation')) return fallback;
      return s;
    } catch {
      return fallback;
    }
  };

  const showPointsToast = (points, total) => {
    setToastMessage(`You won ${points} points! Total: ${total}`);
    Animated.parallel([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
      Animated.timing(toastTranslate, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
    ]).start(() => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
          Animated.timing(toastTranslate, { toValue: 30, duration: 200, useNativeDriver: true, easing: Easing.in(Easing.ease) }),
        ]).start();
      }, 1200);
    });
  };

  // Hold-to-complete helpers (3s)
  const startHoldProgress = () => {
    if (isProcessing || !selectedTask?.id) return;
    holdProgress.setValue(0);
    Animated.timing(holdProgress, { toValue: 1, duration: 3000, useNativeDriver: false }).start();
  };
  const cancelHoldProgress = () => {
    holdProgress.stopAnimation(() => {
      holdProgress.setValue(0);
    });
  };
  useEffect(() => {
    if (isProcessing) cancelHoldProgress();
  }, [isProcessing]);

  
  const handleCompleteStep = async () => {
    console.log('[PM] Completing task id=', selectedTask.id);
    // Repurpose slider to mark selected task as completed
    if (isProcessing || !selectedTask?.id) return;
    setIsProcessing(true);
    try {
      console.log('[PM] Completing task id=', selectedTask.id);
      const updated = await completePreventiveTask(selectedTask.id);
      // Build new tasks list from current tasks
      const updatedId = String(updated?.id || selectedTask.id);
      const newTasks = Array.isArray(tasks)
        ? tasks.map(it => (String(it.id) === updatedId) ? { ...it, status: 'COMPLETED', lastCompleted: updated?.lastCompleted || new Date() } : it)
        : tasks;
      setTasks(newTasks);
      // Recompute counts
      const done = (newTasks || []).filter(it => it.status === 'COMPLETED').length;
      setCompletedCount(done);
      // Select next pending by nextDue
      const toTime = (v) => (v ? new Date(v).getTime() : Number.MAX_SAFE_INTEGER);
      const byDue = (newTasks || []).slice().sort((a, b) => toTime(a.nextDue) - toTime(b.nextDue));
      const nextPending = byDue.find(it => it.status !== 'COMPLETED' && String(it.id) !== updatedId);
      if (nextPending) {
        console.log('[PM] Advancing to next task id=', nextPending.id);
        setSelectedTask(nextPending);
      } else {
        setSelectedTask({ ...(updated || selectedTask), status: 'COMPLETED' });
        Alert.alert('All done', 'All preventive tasks are completed.');
      }
      // No slider to reset
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || e?.message || 'Failed to complete');
    } finally {
      setIsProcessing(false);
    }
  };

  const openIssueModal = () => {
    // Redirect to Breakdown screen via Stack so we can return back here after submit
    const aid = selectedTask?.assetId || selectedTask?.asset?.id || null;
    navigation.navigate('BreakdownReport', { from: 'PreventiveMaintenance', assetId: aid });
  };

  // Slider removed: using a simple button now

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Preventive Tasks</Text>
        <TouchableOpacity
          onPress={toggleLangPicker}
          style={[styles.langPill, { borderColor: theme.border, backgroundColor: theme.card }]}
        >
          <Text style={[styles.langPillText, { color: theme.text }]}>
            {(SUPPORTED_PM_LANGS.find(l => l.code === selectedLang)?.label) || selectedLang?.toUpperCase()}
          </Text>
          {selectedLang !== 'en' && isTranslating && (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 6 }} />
          )}
        </TouchableOpacity>
        {/* points badge removed as per request */}
      </View>

      {/* Inline Language Picker (appears below header) */}
      {showLangPicker && (
        <View style={[styles.inlinePickerWrap, { borderColor: theme.border, backgroundColor: theme.card }]}> 
          <Picker
            selectedValue={selectedLang}
            onValueChange={async (val) => {
              preferredAppliedRef.current = true; // Manual choice from user
              const clamped = supportedCodes.has(val) ? val : 'en';
              setSelectedLang(clamped);
              // persist immediately for stability
              try {
                await AsyncStorage.setItem(PM_SELECTED_LANG_KEY, clamped);
                await AsyncStorage.setItem(APP_LANGUAGE_KEY, clamped);
              } catch {}
              // update app's preferred language context
              try { changeLanguage && changeLanguage(clamped); } catch {}
              setShowLangPicker(false);
            }}
            mode="dropdown"
            style={{ color: theme.text }}
            dropdownIconColor={theme.text}
          >
            {SUPPORTED_PM_LANGS.map(l => (
              <Picker.Item key={l.code} label={l.label} value={l.code} />
            ))}
          </Picker>
        </View>
      )}

      {/* Translation status (shows if lang != en and key/flag missing) */}
      {selectedLang !== 'en' && (!USE_DIRECT_GOOGLE_TRANSLATE || !GOOGLE_TRANSLATE_API_KEY) && (
        <View style={[styles.statusBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="warning" size={14} color={theme.error} />
          <Text style={[styles.statusText, { color: theme.textSecondary }]}>Translation disabled (API key missing)</Text>
        </View>
      )}

      {Array.isArray(tasks) && tasks.length > 0 ? (
        <>
          {/* Top progress bar */}
          <View style={styles.progressContainer}>
            <Text style={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
              Completed {completedCount}/{tasks.length} ({tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}%)
            </Text>
            <View style={[styles.progressBar, { backgroundColor: theme.border }]}> 
              <View style={[styles.progressFill, { backgroundColor: theme.primary, width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }]} />
            </View>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}>
            {/* Details section for the selected task only */
            }
            {selectedTask && (
              <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                <Text style={[styles.stepTitle, { color: theme.text }]}>{selectedTask.title}</Text>
                {selectedTask.description ? (
                  <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>{selectedTask.description}</Text>
                ) : null}
                {selectedTask.nextDue && (
                  <Text style={{ color: theme.textSecondary, marginTop: 6 }}>Next due: {new Date(selectedTask.nextDue).toLocaleDateString()}</Text>
                )}
                {selectedTask.lastCompleted && (
                  <Text style={{ color: theme.textSecondary, marginTop: 4 }}>Last completed: {new Date(selectedTask.lastCompleted).toLocaleDateString()}</Text>
                )}
              </View>
            )}

            {/* Translated card under original when applicable */}
            {selectedTask && selectedLang !== 'en' && (
              <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="language" size={16} color={theme.primary} />
                  <Text style={[styles.stepTitle, { color: theme.text, marginLeft: 6, fontSize: 16 }]}>Translated</Text>
                  <Text style={{ marginLeft: 6, color: theme.textSecondary, fontSize: 12 }}>({selectedLang?.toUpperCase()})</Text>
                </View>
                {isTranslatingTask ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={{ marginLeft: 8, color: theme.textSecondary }}>Translating...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={[styles.stepTitle, { color: theme.text }]}>{translatedTask?.title || selectedTask.title}</Text>
                    {(translatedTask?.description || selectedTask.description) ? (
                      <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                        {translatedTask?.description || selectedTask.description}
                      </Text>
                    ) : null}
                  </>
                )}
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Bar: complete + report */}
          {selectedTask && selectedTask.status !== 'COMPLETED' && (
            <View
              style={[
                styles.bottomBar,
                { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: insets.bottom + 5 }
              ]}
            >
              <TouchableOpacity
                style={[styles.completeBtn, { backgroundColor: isProcessing ? '#999' : theme.primary }]}
                disabled={isProcessing || !selectedTask?.id}
                onLongPress={handleCompleteStep}
                delayLongPress={3000}
                onPressIn={startHoldProgress}
                onPressOut={cancelHoldProgress}
                onLayout={(e) => setCompleteBtnWidth(e.nativeEvent.layout.width)}
                activeOpacity={0.8}
              >
                {/* Progress fill overlay */}
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: holdProgress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(0, completeBtnWidth)] }),
                    backgroundColor: 'rgba(255,255,255,0.38)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.6)',
                    borderRadius: 22,
                  }}
                />
                <Ionicons name="checkmark-done" size={20} color="#fff" />
                <Text style={styles.completeBtnText}>{tSafe('complete', 'Hold 3s to Complete')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.reportBtn, { backgroundColor: theme.error }]}
                onPress={openIssueModal}
              >
                <Ionicons name="alert-circle-outline" size={20} color="#fff" />
                <Text style={styles.reportBtnText}>{(t && t('issue')) || 'Report'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      ) : (
        !loadingTask && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
            <Text style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: 12 }}>
              No preventive task available.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Scanner')} style={[styles.startScanButton, { backgroundColor: theme.primary }]}> 
              <Ionicons name="qr-code-outline" size={20} color="#fff" />
              <Text style={[styles.startScanButtonText, { marginLeft: 8 }]}>Go to Scanner</Text>
            </TouchableOpacity>
          </View>
        )
      )}

      {/* Points Toast */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.toast,
          { backgroundColor: theme.primary, opacity: toastOpacity, transform: [{ translateY: toastTranslate }] }
        ]}
      >
        <Ionicons name="star" size={18} color="#fff" />
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  progressContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  progressBar: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 6 },
  card: { margin: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  stepTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  stepDesc: { fontSize: 15, lineHeight: 22 },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  pointsText: { marginLeft: 4, fontWeight: '700' },
  langPill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, marginHorizontal: 8 },
  langPillText: { fontWeight: '700', fontSize: 12 },
  statusBar: { marginHorizontal: 16, marginTop: 8, padding: 8, borderRadius: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12 },
  issuesTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  issueItem: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  issueText: { marginLeft: 8 },
  bottomBar: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 12, flexDirection: 'row', alignItems: 'center' },
  reportBtn: { marginLeft: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  reportBtnText: { color: '#fff', fontWeight: '700', marginLeft: 6 },
  inlinePickerWrap: { marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderRadius: 8, overflow: 'hidden' },
  toast: { position: 'absolute', bottom: 72, left: 16, right: 16, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' },
  toastText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  completeBtn: { flex: 1, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginRight: 8 },
  completeBtnText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
  testBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6 },
  testBtnText: { fontWeight: '600' },
});

export default PreventiveMaintenanceScreen;
