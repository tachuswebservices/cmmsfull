import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { API_URL, API_ENDPOINTS } from '../constants/api';
import { getNetworkStatus } from '../utils/networkUtils';
import { USE_DIRECT_GOOGLE_STT, GOOGLE_SPEECH_API_KEY } from '../config/cloud';
import { translateText } from './translateService';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Allow AuthContext to inject Authorization header
export const setBreakdownsAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Submit breakdown report
 * @param {Object} reportData - Report data including description, problem type, urgency, etc.
 * @param {Object} mediaFiles - Media files (audio, photos, videos)
 * @returns {Promise} - Response with created report or error
 */
export const submitBreakdownReport = async (reportData, mediaFiles = {}) => {
  try {
    const isOnline = await getNetworkStatus();

    // If offline, short-circuit with a dummy mocked response
    if (!isOnline) {
      return {
        id: `DUMMY-${Date.now()}`,
        status: 'submitted-offline',
        dummy: true,
        message: 'Dummy submission (offline). Data not sent to server.',
        reportData,
        mediaSummary: {
          hasAudio: !!mediaFiles.audio,
          photoCount: mediaFiles.photos?.length || 0,
          videoCount: mediaFiles.videos?.length || 0,
        },
      };
    }

    const formData = new FormData();

    // Add text data
    Object.keys(reportData).forEach(key => {
      formData.append(key, reportData[key]);
    });

    // Add audio file if exists
    if (mediaFiles.audio) {
      const audioInfo = await FileSystem.getInfoAsync(mediaFiles.audio.uri);
      const lowerUri = (mediaFiles.audio.uri || '').toLowerCase();
      let mime = 'audio/m4a';
      let filename = 'recording.m4a';
      if (lowerUri.endsWith('.3gp')) {
        mime = 'audio/3gpp';
        filename = 'recording.3gp';
      } else if (lowerUri.endsWith('.wav')) {
        mime = 'audio/wav';
        filename = 'recording.wav';
      }

      formData.append('audio', {
        uri: mediaFiles.audio.uri,
        type: mime,
        name: filename,
        size: audioInfo.size,
      });
    }

    // Add photos if any (backend expects field name 'photos')
    if (mediaFiles.photos && mediaFiles.photos.length > 0) {
      mediaFiles.photos.forEach((photo, index) => {
        formData.append('photos', {
          uri: photo.uri,
          type: 'image/jpeg',
          name: `breakdown_photo_${index}.jpg`,
        });
      });
    }

    // Add videos if any (backend expects field name 'videos')
    if (mediaFiles.videos && mediaFiles.videos.length > 0) {
      mediaFiles.videos.forEach((video, index) => {
        formData.append('videos', {
          uri: video.uri,
          type: 'video/mp4',
          name: `breakdown_video_${index}.mp4`,
        });
      });
    }

    const response = await api.post(
      API_ENDPOINTS.BREAKDOWN_REPORTS,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for large uploads
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error submitting breakdown report:', error);
    throw error;
  }
};

/**
 * Transcribe audio recording
 * @param {string} audioUri - URI of the audio file
 * @param {string} sourceLanguage - Source language code (e.g., 'hi' for Hindi, 'auto' for auto-detect)
 * @param {boolean} translate - Whether to translate to English. Default false.
 * @returns {Promise} - Response with transcription or error
 */
export const transcribeAudio = async (audioUri, sourceLanguage = 'auto', translate = false, targetLanguage = 'en') => {
  try {
    const isOnline = await getNetworkStatus();
    if (!isOnline) {
      throw new Error('Internet connection required for transcription');
    }

    // Direct Google Speech-to-Text path (v1) if enabled and key present
    if (USE_DIRECT_GOOGLE_STT && GOOGLE_SPEECH_API_KEY) {
      // Read audio as base64
      const base64Content = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const url = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_SPEECH_API_KEY}`;
      // Map source language (short code) to Google STT locale
      const sttMap = {
        auto: 'en-IN',
        en: 'en-US',
        'en-IN': 'en-IN',
        hi: 'hi-IN',
        ta: 'ta-IN',
        kn: 'kn-IN',
        mr: 'mr-IN',
        te: 'te-IN',
        bn: 'bn-IN',
        gu: 'gu-IN',
        ml: 'ml-IN',
        pa: 'pa-IN',
        or: 'or-IN',
        ur: 'ur-IN',
      };
      const primaryLocale = sttMap[sourceLanguage] || 'en-IN';
      const allLocales = [
        'en-IN', 'en-US',
        'hi-IN', 'ta-IN', 'kn-IN', 'mr-IN', 'te-IN', 'bn-IN', 'gu-IN', 'ml-IN', 'pa-IN', 'or-IN', 'ur-IN'
      ];
      const alternativeLanguageCodes = allLocales.filter((lc) => lc !== primaryLocale);

      // Prepare multiple config attempts for robustness, especially on Android .3gp
      const lowerUri = (audioUri || '').toLowerCase();
      const baseConfig = {
        languageCode: primaryLocale,
        alternativeLanguageCodes,
        enableAutomaticPunctuation: true,
      };

      // Build a list of candidate configs to try in order
      const configsToTry = [];
      if (lowerUri.endsWith('.3gp')) {
        // 1) AMR_WB @16k (expected when we request AMR_WB)
        configsToTry.push({ encoding: 'AMR_WB', sampleRateHertz: 16000 });
        // 2) Auto-detect (omit encoding & sample rate)
        configsToTry.push({});
        // 3) AMR @8k (fallback if device produced AMR-NB)
        configsToTry.push({ encoding: 'AMR', sampleRateHertz: 8000 });
      } else if (lowerUri.endsWith('.wav') || lowerUri.endsWith('.caf')) {
        // Let Google auto-detect WAV/CAF
        configsToTry.push({});
      } else {
        // Unknown container: try auto-detect then AMR/AMR_WB as last resorts
        configsToTry.push({});
        configsToTry.push({ encoding: 'AMR_WB', sampleRateHertz: 16000 });
        configsToTry.push({ encoding: 'AMR', sampleRateHertz: 8000 });
      }

      // For debugging: file size can hint if recording is empty/corrupt
      let fileSize = undefined;
      try {
        const info = await FileSystem.getInfoAsync(audioUri);
        fileSize = info?.size;
      } catch {}

      let text = '';
      let lastResponseEmpty = false;
      const configsSummary = [];
      for (let i = 0; i < configsToTry.length; i++) {
        const c = configsToTry[i];
        const config = { ...baseConfig };
        if (c.encoding) config.encoding = c.encoding;
        if (typeof c.sampleRateHertz === 'number') config.sampleRateHertz = c.sampleRateHertz;
        configsSummary.push({ encoding: config.encoding || 'auto', sampleRateHertz: config.sampleRateHertz || 'auto' });

        const payload = {
          config,
          audio: { content: base64Content },
        };

        try {
          const { data } = await axios.post(url, payload, { timeout: 45000 });
          const pieces = (data?.results || [])
            .map(r => r.alternatives?.[0]?.transcript)
            .filter(Boolean);
          text = (pieces.join(' ') || '').trim();
          if (text) {
            break; // success
          }
          lastResponseEmpty = true;
        } catch (err) {
          // On request error, try next config
          lastResponseEmpty = false;
          if (i === configsToTry.length - 1) {
            // Re-throw on final attempt
            throw err;
          }
        }
      }

      if (!text) {
        console.log('STT: Empty results. Debug info:', {
          primaryLocale,
          alternativeLanguageCodes,
          uri: audioUri,
          fileSize,
          configsTried: configsSummary,
          lastResponseEmpty,
        });
      }

      if (translate && text) {
        text = await translateText(text, targetLanguage);
      }

      return { text };
    }

    // Fallback to backend endpoint
    const audioInfo = await FileSystem.getInfoAsync(audioUri);

    const formData = new FormData();
    const lowerUri = (audioUri || '').toLowerCase();
    let mime = 'audio/m4a';
    let filename = 'recording.m4a';
    if (lowerUri.endsWith('.3gp')) {
      mime = 'audio/3gpp';
      filename = 'recording.3gp';
    } else if (lowerUri.endsWith('.wav')) {
      mime = 'audio/wav';
      filename = 'recording.wav';
    }
    formData.append('audio', {
      uri: audioUri,
      type: mime,
      name: filename,
      size: audioInfo.size,
    });

    formData.append('sourceLanguage', sourceLanguage);
    if (translate) {
      formData.append('targetLanguage', targetLanguage);
    }

    const response = await api.post(
      API_ENDPOINTS.TRANSCRIBE_AUDIO,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds
      }
    );

    const data = response?.data ?? {};
    if (typeof data === 'string') {
      return { text: data };
    }
    if (data?.text) return { text: data.text };
    if (data?.transcription) return { text: data.transcription };
    if (data?.translatedText) return { text: data.translatedText };
    if (data?.data?.text) return { text: data.data.text };
    return data;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

/**
 * Start recording audio
 * @returns {Promise} - Recording object
 */
export const startRecording = async () => {
  try {
    // Request permissions
    const { status } = await Audio.requestPermissionsAsync();

    if (status !== 'granted') {
      throw new Error('Permission to access microphone was denied');
    }

    // Set audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
    });

    // Create recording
    const recording = new Audio.Recording();

    // Prepare recording
    await recording.prepareToRecordAsync({
      android: {
        // Use AMR_WB @ 16kHz mono in 3GP for Google STT compatibility
        extension: '.3gp',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_THREE_GPP,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AMR_WB,
        sampleRate: 16000,
        numberOfChannels: 1,
      },
      ios: {
        // Use Linear PCM (WAV) @ 16kHz mono for Google STT compatibility
        extension: '.wav',
        outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_LINEARPCM,
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MEDIUM,
        sampleRate: 16000,
        numberOfChannels: 1,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    });

    // Start recording
    await recording.startAsync();

    return recording;
  } catch (error) {
    console.error('Error starting recording:', error);
    throw error;
  }
};

/**
 * Stop recording audio
 * @param {Object} recording - Recording object from startRecording
 * @returns {Promise} - URI of the recorded file
 */
export const stopRecording = async (recording) => {
  try {
    // Stop recording
    await recording.stopAndUnloadAsync();

    // Reset audio mode
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    // Get recording URI
    const uri = recording.getURI();

    return uri;
  } catch (error) {
    console.error('Error stopping recording:', error);
    throw error;
  }
};
