import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Audio, Video } from 'expo-av';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// Import contexts
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';

// Import services
import {
  submitBreakdownReport,
  startRecording,
  stopRecording,
  transcribeAudio,
} from '../../services/breakdownService';
import { translateText } from '../../services/translateService';
import { USE_DIRECT_GOOGLE_STT, GOOGLE_SPEECH_API_KEY, USE_DIRECT_GOOGLE_TRANSLATE, GOOGLE_TRANSLATE_API_KEY } from '../../config/cloud';

// Import utils
import { getNetworkStatus } from '../../utils/networkUtils';
import { API_URL } from '../../constants/api';

const BreakdownReportScreen = ({ navigation, route }) => {
  // Context hooks
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { user, token } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  // State hooks
  const [problemType, setProblemType] = useState('');
  const [description, setDescription] = useState('');
  const [urgencyLevel, setUrgencyLevel] = useState('medium');
  const [images, setImages] = useState([]);
  const [videoUri, setVideoUri] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUri, setRecordingUri] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0); // ms
  const [audioPosition, setAudioPosition] = useState(0); // ms
  const [transcriptionText, setTranscriptionText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [speechSourceLang, setSpeechSourceLang] = useState('en');
  const [isTranslating, setIsTranslating] = useState(false);
  // Assets dropdown state
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');

  const PREFERRED_SPEECH_LANG_KEY = 'preferred_speech_language';

  // Helper to avoid showing raw i18n missing placeholders like [missing "en" ...]
  const safeT = (key, fallback) => {
    try {
      const v = t(key);
      if (!v) return fallback;
      const s = String(v);
      return s.toLowerCase().includes('[missing') ? fallback : s;
    } catch {
      return fallback;
    }
  };

  // Refs
  const recordingTimer = useRef(null);
  const recording = useRef(null);
  const soundRef = useRef(null);

  // Problem types
  const problemTypes = [
    { label: t('selectProblemType'), value: '' },
    { label: t('mechanical'), value: 'mechanical' },
    { label: t('electrical'), value: 'electrical' },
    { label: t('software'), value: 'software' },
    { label: t('hydraulic'), value: 'hydraulic' },
    { label: t('pneumatic'), value: 'pneumatic' },
    { label: t('structural'), value: 'structural' },
    { label: t('other'), value: 'other' },
  ];

  // Urgency levels
  const urgencyLevels = [
    { label: t('low'), value: 'low' },
    { label: t('medium'), value: 'medium' },
    { label: t('high'), value: 'high' },
    { label: t('critical'), value: 'critical' },
  ];

  // Check network status on mount
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const isConnected = await getNetworkStatus();
      setIsOnline(isConnected);
    };

    checkNetworkStatus();

    // If an assetId was provided via navigation, prefill selection immediately
    if (route?.params?.assetId) {
      try { setSelectedAssetId(String(route.params.assetId)); } catch {}
    }

    // Load assets list for dropdown
    (async () => {
      try {
        const res = await fetch(`${API_URL}/assets`, {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data?.items) ? data.items : [];
          setAssets(items);
          // If we navigated with a preselected assetId, keep it if it exists
          if (route?.params?.assetId) {
            const aid = String(route.params.assetId);
            const found = items.find((a) => String(a.id) === aid);
            if (found) setSelectedAssetId(aid);
          }
        } else {
          console.warn('Failed to load assets:', res.status);
        }
      } catch (e) {
        console.warn('Error loading assets:', e?.message || e);
      }
    })();

    // Clean up recording timer if it exists
    return () => {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
      if (recording.current) {
        stopRecordingAudio();
      }
      if (soundRef.current) {
        // best-effort unload without awaiting (cleanup cannot be async)
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, []);

  // Request permissions for camera and microphone
  useEffect(() => {
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: microphoneStatus } = await Audio.requestPermissionsAsync();

      if (cameraStatus !== 'granted' || microphoneStatus !== 'granted') {
        Alert.alert(
          t('permissionRequired'),
          t('cameraAndMicrophonePermissionRequired'),
          [{ text: t('ok') }]
        );
      }
    })();
  }, [t]);

  // Load preferred speech source language from storage
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(PREFERRED_SPEECH_LANG_KEY);
        if (saved) {
          setSpeechSourceLang(saved);
        }
      } catch (e) {
        console.error('Failed to load preferred speech language:', e);
      }
    })();
  }, []);

  // Refresh preferred speech language when screen gains focus
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      (async () => {
        try {
          const saved = await AsyncStorage.getItem(PREFERRED_SPEECH_LANG_KEY);
          if (isActive && saved) {
            setSpeechSourceLang(saved);
          }
        } catch (e) {
          console.error('Failed to refresh preferred speech language on focus:', e);
        }
      })();
      return () => {
        isActive = false;
      };
    }, [])
  );

  // Handle image picking from camera
  const handleTakePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImages([...images, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert(t('error'), t('failedToTakePhoto'));
    }
  };

  // Handle image picking from gallery
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking images:', error);
      Alert.alert(t('error'), t('failedToPickImages'));
    }
  };

  // Handle video recording
  const handleRecordVideo = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 60,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setVideoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert(t('error'), t('failedToRecordVideo'));
    }
  };

  // Handle audio recording start
  const handleStartRecording = async () => {
    try {
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingUri(null);
      setTranscriptionText('');

      // Start timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      // Start recording
      const recObj = await startRecording();
      recording.current = recObj;
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert(t('error'), t('failedToStartRecording'));
      setIsRecording(false);
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }
    }
  };

  // Handle audio recording stop
  const handleStopRecording = async () => {
    try {
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
      }

      setIsRecording(false);
      // Stop recording and save URI
      if (recording.current) {
        const uri = await stopRecording(recording.current);
        setRecordingUri(uri);
        recording.current = null;
        // Auto-transcribe and translate to English once recording stops
        await autoTranscribeAndTranslate(uri);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert(t('error'), t('failedToStopRecording'));
      setIsRecording(false);
    }
  };

  // Stop recording audio (for cleanup)
  const stopRecordingAudio = async () => {
    try {
      if (recording.current) {
        await stopRecording(recording.current);
        recording.current = null;
      }
    } catch (error) {
      console.error('Error stopping recording during cleanup:', error);
    }
  };

  // Remove image
  const removeImage = (index) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    setImages(newImages);
  };

  // Remove video
  const removeVideo = () => {
    setVideoUri(null);
  };

  // Format recording duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format millis to mm:ss for playback
  const formatMillis = (millis) => {
    const totalSeconds = Math.floor((millis || 0) / 1000);
    return formatDuration(totalSeconds);
  };

  // Load sound if needed
  const loadSoundIfNeeded = async () => {
    if (!recordingUri) return;
    if (soundRef.current) return;
    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: false },
        (status) => {
          if (!status.isLoaded) return;
          setAudioDuration(status.durationMillis ?? 0);
          setAudioPosition(status.positionMillis ?? 0);
          setIsPlaying(status.isPlaying || false);
          // Do not auto-reset on finish; leave at end. User can press play to listen again.
          if (status.didJustFinish) {
            // Stop state and show 00:00 in UI without seeking the sound position
            setIsPlaying(false);
            setAudioPosition(0);
          }
        }
      );
      soundRef.current = sound;
      const status = await sound.getStatusAsync();
      if (status.isLoaded) {
        setAudioDuration(status.durationMillis ?? 0);
        setAudioPosition(status.positionMillis ?? 0);
      }
    } catch (e) {
      console.error('Error loading sound:', e);
    }
  };

  const unloadSound = async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      setIsPlaying(false);
      setAudioDuration(0);
      setAudioPosition(0);
    } catch (e) {
      console.error('Error unloading sound:', e);
    }
  };

  const onPlayPausePress = async () => {
    try {
      await loadSoundIfNeeded();
      if (!soundRef.current) return;
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded && status.isPlaying) {
        await soundRef.current.pauseAsync();
      } else if (status.isLoaded) {
        // If ended, replay from start
        const nearEnd =
          typeof status.durationMillis === 'number' &&
          typeof status.positionMillis === 'number' &&
          status.positionMillis >= (status.durationMillis - 250);
        if (status.didJustFinish || nearEnd) {
          if (soundRef.current.replayAsync) {
            await soundRef.current.replayAsync();
          } else {
            await soundRef.current.setPositionAsync(0);
            await soundRef.current.playAsync();
          }
        } else {
          await soundRef.current.playAsync();
        }
      }
    } catch (e) {
      console.error('Error toggling playback:', e);
    }
  };

  const onReRecord = async () => {
    await unloadSound();
    setRecordingUri(null);
    setRecordingDuration(0);
    setTranscriptionText('');
    setTranslatedText('');
  };

  // Auto transcribe and translate pipeline
  const autoTranscribeAndTranslate = async (uri) => {
    try {
      if (!uri) return;
      if (USE_DIRECT_GOOGLE_STT && !GOOGLE_SPEECH_API_KEY) {
        Alert.alert('API key missing', 'Speech-to-Text API key is missing. Paste it in src/config/cloud.js');
        return;
      }
      setIsTranscribing(true);
      setIsTranslating(false);
      setTranscriptionText('');
      setTranslatedText('');
      // Transcribe using preferred source language
      const result = await transcribeAudio(uri, speechSourceLang, false, 'en');
      const text = (typeof result === 'string' ? result : (result?.text ?? '')).trim();
      setTranscriptionText(text);
      setIsTranscribing(false);

      // Translate to English and auto-fill description
      if (text) {
        if (USE_DIRECT_GOOGLE_TRANSLATE && !GOOGLE_TRANSLATE_API_KEY) {
          Alert.alert('API key missing', 'Translate API key is missing. Paste it in src/config/cloud.js');
          return;
        }
        setIsTranslating(true);
        const out = await translateText(text, 'en');
        const translated = (out || '').trim();
        setTranslatedText(translated);
        setDescription(translated);
      }
    } catch (e) {
      console.error('Auto STT/Translate error:', e);
      Alert.alert(t('error'), t('failedToTranscribe'));
    } finally {
      setIsTranscribing(false);
      setIsTranslating(false);
    }
  };

  // Manual translate removed; handled automatically

  

  // Validate form
  const validateForm = () => {
    if (!problemType) {
      Alert.alert(t('validationError'), t('selectProblemTypeRequired'));
      return false;
    }

    if (!description.trim()) {
      Alert.alert(t('validationError'), t('descriptionRequired'));
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const reportData = {
        userId: user.id,
        problemType,
        description,
        urgencyLevel,
        assetId: selectedAssetId || null,
        images,
        videoUri,
        audioUri: recordingUri,
        timestamp: new Date().toISOString(),
      };

      const mediaFiles = {
        audio: recordingUri ? { uri: recordingUri } : null,
        photos: images?.length ? images.map((uri) => ({ uri })) : [],
        videos: videoUri ? [{ uri: videoUri }] : [],
      };

      await submitBreakdownReport(reportData, mediaFiles);

      Alert.alert(
        t('success'),
        t('breakdownReportSubmitted'),
        [
          {
            text: t('ok'),
            onPress: () => {
              // Reset form and navigate back
              setProblemType('');
              setDescription('');
              setUrgencyLevel('medium');
              setImages([]);
              setVideoUri(null);
              setRecordingUri(null);
              if (route?.params?.from === 'WorkOrderDetails') {
                navigation.goBack();
              } else if (route?.params?.from === 'PreventiveMaintenance') {
                navigation.goBack();
              } else {
                navigation.navigate('Main');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting breakdown report:', error);
      Alert.alert(t('error'), t('failedToSubmitReport'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: 16 + insets.bottom }]}>
        <View style={styles.formContainer}>
          {/* Asset Selection */}
          <Text style={[styles.label, { color: theme.text }]}>{safeT('asset', 'Asset')}</Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Picker
              selectedValue={selectedAssetId}
              onValueChange={(value) => setSelectedAssetId(value)}
              style={[styles.picker, { color: theme.text }]}
              dropdownIconColor={theme.text}
            >
              <Picker.Item label={safeT('selectAsset', 'Select asset')} value="" />
              {assets.map((a) => (
                <Picker.Item key={a.id} label={a.name || a.id} value={a.id} />
              ))}
            </Picker>
          </View>
          {/* Problem Type */}
          <Text style={[styles.label, { color: theme.text }]}>{t('problemType')} *</Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Picker
              selectedValue={problemType}
              onValueChange={(value) => setProblemType(value)}
              style={[styles.picker, { color: theme.text }]}
              dropdownIconColor={theme.text}
            >
              {problemTypes.map((type) => (
                <Picker.Item key={type.value} label={type.label} value={type.value} />
              ))}
            </Picker>
          </View>

          {/* Voice Recording */}
          <Text style={[styles.label, { color: theme.text }]}>{t('voiceRecording')}</Text>
          <View style={[styles.recordingContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {isRecording ? (
              <View style={styles.recordingActiveContainer}>
                <View style={styles.recordingIndicator}>
                  <View style={[styles.recordingDot, { backgroundColor: theme.error }]} />
                  <Text style={[styles.recordingText, { color: theme.text }]}>
                    {t('recording')} {formatDuration(recordingDuration)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.recordingButton, { backgroundColor: theme.error }]}
                  onPress={handleStopRecording}
                >
                  <Ionicons name="stop" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : recordingUri ? (
              <View style={styles.playbackContainer}>
                <View style={styles.playbackRow}>
                  <TouchableOpacity
                    style={[styles.playbackButton, { backgroundColor: theme.primary }]}
                    onPress={onPlayPausePress}
                  >
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
                    <Text style={styles.playbackButtonText}>{isPlaying ? t('pause') : t('play')}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.playbackTimeText, { color: theme.text }]}>
                    {formatMillis(audioPosition)} / {formatMillis(audioDuration)}
                  </Text>
                </View>
                {/* Source language selection moved to Profile (Preferred language) */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[styles.smallButton, { backgroundColor: theme.error }]}
                    onPress={onReRecord}
                  >
                    <Ionicons name="refresh" size={18} color="#fff" />
                    <Text style={styles.smallButtonText}>{t('reRecord')}</Text>
                  </TouchableOpacity>
                  {isTranscribing || isTranslating ? (
                    <View style={[styles.smallButton, { backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center' }]}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={[styles.smallButtonText, { marginLeft: 6 }]}>{isTranscribing ? 'Transcribing...' : 'Translating...'}</Text>
                    </View>
                  ) : null}
                </View>
                {transcriptionText ? (
                  <View style={[styles.transcriptionBox, { borderColor: theme.border, backgroundColor: theme.card }]}> 
                    <Text style={{ color: theme.text }}>{transcriptionText}</Text>
                  </View>
                ) : null}
                {/* Translated text preview removed; description is auto-filled in English */}
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.startRecordingButton, { backgroundColor: theme.primary }]}
                onPress={handleStartRecording}
              >
                <Ionicons name="mic" size={24} color="#fff" />
                <Text style={styles.startRecordingText}>{t('startRecording')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Description */}
          <Text style={[styles.label, { color: theme.text }]}>{t('description')} *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            placeholder={t('enterDescription')}
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          {/* Urgency Level */}
          <Text style={[styles.label, { color: theme.text }]}>{t('urgencyLevel')}</Text>
          <View style={[styles.pickerContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Picker
              selectedValue={urgencyLevel}
              onValueChange={(value) => setUrgencyLevel(value)}
              style={[styles.picker, { color: theme.text }]}
              dropdownIconColor={theme.text}
            >
              {urgencyLevels.map((level) => (
                <Picker.Item key={level.value} label={level.label} value={level.value} />
              ))}
            </Picker>
          </View>

          {/* Media Attachments */}
          <Text style={[styles.label, { color: theme.text }]}>{t('attachments')}</Text>
          <View style={styles.mediaButtonsContainer}>
            <TouchableOpacity
              style={[styles.mediaButton, { backgroundColor: theme.primary }]}
              onPress={handleTakePhoto}
            >
              <Ionicons name="camera" size={20} color="#fff" />
              <Text style={styles.mediaButtonText}>{t('takePhoto')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaButton, { backgroundColor: theme.primary }]}
              onPress={handlePickImage}
            >
              <Ionicons name="images" size={20} color="#fff" />
              <Text style={styles.mediaButtonText}>{t('pickImages')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mediaButton, { backgroundColor: theme.primary }]}
              onPress={handleRecordVideo}
            >
              <Ionicons name="videocam" size={20} color="#fff" />
              <Text style={styles.mediaButtonText}>{t('recordVideo')}</Text>
            </TouchableOpacity>
          </View>

          {/* Image Previews */}
          {images.length > 0 && (
            <View style={styles.imagePreviewsContainer}>
              <Text style={[styles.previewLabel, { color: theme.text }]}>{t('images')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={[styles.removeButton, { backgroundColor: theme.error }]}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Video Preview */}
          {videoUri && (
            <View style={styles.videoPreviewContainer}>
              <Text style={[styles.previewLabel, { color: theme.text }]}>{t('video')}</Text>
              <TouchableOpacity style={styles.videoPreviewWrapper} onPress={() => setShowVideoModal(true)}>
                <Image source={{ uri: videoUri }} style={styles.videoPreview} />
                <View style={styles.videoOverlay}>
                  <Ionicons name="play-circle" size={40} color="#fff" />
                </View>
                <TouchableOpacity
                style={[styles.removeButton, { backgroundColor: theme.error }]}
                onPress={(e) => { e.stopPropagation?.(); removeVideo(); }}
              >
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
            <Modal visible={showVideoModal} transparent={false} animationType="fade" onRequestClose={() => setShowVideoModal(false)}>
              <View style={[styles.videoModalBackdrop, { flex: 1, backgroundColor: 'black' }]}>
                <View style={[styles.videoModalCard, { flex: 1 }]}>
                  <Video
                    source={{ uri: videoUri }}
                    style={{ flex: 1 }}
                    useNativeControls
                    resizeMode="cover"
                    shouldPlay
                  />
                  <TouchableOpacity style={[styles.videoCloseBtn, { position: 'absolute', top: 16, right: 16 }]} onPress={() => setShowVideoModal(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            </View>
          )}

          {/* Create Work Order option removed as per requirement */}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>{t('submitReport')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  recordingContainer: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  startRecordingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: '100%',
  },
  startRecordingText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  recordingActiveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
  },
  recordingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  transcribingText: {
    fontSize: 16,
    marginLeft: 8,
  },
  recordingCompleteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  recordingCompleteText: {
    fontSize: 16,
    marginLeft: 8,
  },
  playbackContainer: {
    width: '100%',
    gap: 12,
  },
  playbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  playbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  playbackButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  playbackTimeText: {
    fontSize: 14,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  smallButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 6,
  },
  transcriptionBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  copyButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  copyButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 6,
  },
  mediaButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  mediaButtonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
  imagePreviewsContainer: {
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  imagePreviewWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPreviewContainer: {
    marginBottom: 16,
  },
  videoPreviewWrapper: {
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
  // Work order checkbox styles removed
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  videoModalBackdrop: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  videoModalCard: { width: '100%', height: '100%', backgroundColor: '#000', borderRadius: 0, overflow: 'hidden' },
  videoPlayer: { width: '100%', height: '100%' },
  videoCloseBtn: { position: 'absolute', top: 8, right: 8, padding: 6 },
});

export default BreakdownReportScreen;
