import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
// Safe area handled by reusable Screen component
import Screen from '../../components/Screen';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Import contexts
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';

// Import services
import { getNetworkStatus } from '../../utils/networkUtils';

// Import components

const QRScannerScreen = ({ navigation, route }) => {
  // Context hooks
  const { theme, isDarkMode } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);

  // State hooks
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  // Simplified: no location or machine modal

  // Camera ref
  const cameraRef = useRef(null);

  // Request camera permission only
  useEffect(() => {
    (async () => {
      // Check network status
      const status = await getNetworkStatus();
      setIsOnline(!!status);

      // Request camera permission
      const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
      if (cameraStatus !== 'granted') {
        Alert.alert(t('error'), t('cameraPermissionDenied'));
      }

      // Allow scanning if camera is granted (don't block on location)
      setHasPermission(cameraStatus === 'granted');
    })();
  }, []);
 
  // Ensure scanner is not auto-opened when screen is focused again
  useFocusEffect(
    useCallback(() => {
      // On focus: show Start Scanning button by default
      setScanning(false);
      setScanned(false);
      setLoading(false);

      // On blur: make sure camera is unmounted
      return () => {
        setScanning(false);
      };
    }, [])
  );

  // If navigated here with a popup message (e.g., out-of-radius), show it once and clear
  useEffect(() => {
    const msg = route?.params?.popupMessage;
    if (msg) {
      Alert.alert('Notice', String(msg));
      // Clear the param so it does not re-alert on re-render/focus
      navigation.setParams && navigation.setParams({ popupMessage: undefined });
    }
  }, [route?.params?.popupMessage]);

  // Handle QR code scan
  const handleBarCodeScanned = async ({ type, data }) => {
    try {
      // Log scanned QR details for debugging/analytics
      console.log('QR scanned', { type, data, time: new Date().toISOString() });
      setScanned(true);
      setScanning(false);
      setLoading(true);

      // Directly proceed to Preventive Maintenance flow after any scan
      navigation.navigate('PreventiveMaintenance', { qrRaw: data });
    } catch (error) {
      console.error('Error handling scan:', error);
      Alert.alert(t('error'), 'Unable to proceed.');
    } finally {
      setLoading(false);
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setScanned(false);
    setScanning(true);
  };

  // Start scanning
  const startScanning = () => {
    setScanning(true);
    setScanned(false);
  };

  // Render camera permission view
  if (hasPermission === null) {
    return (
      <Screen style={[styles.container, { backgroundColor: theme.background }]} avoidKeyboard={false}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.permissionText, { color: theme.text }]}>
            {t('requestingPermissions')}
          </Text>
        </View>
      </Screen>
    );
  }

  // Render permission denied view
  if (hasPermission === false) {
    return (
      <Screen style={[styles.container, { backgroundColor: theme.background }]} avoidKeyboard={false}>
        <View style={styles.permissionContainer}>
          <Ionicons name="warning-outline" size={64} color={theme.error} />
          <Text style={[styles.permissionText, { color: theme.text }]}>
            {t('cameraPermissionDenied')}
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              if (navigation && typeof navigation.goBack === 'function') {
                navigation.goBack();
              } else {
                Alert.alert(t('goBack'));
              }
            }}
          >
            <Text style={styles.permissionButtonText}>{t('goBack')}</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]} avoidKeyboard={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('qrScanner')}</Text>
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.error} />
            <Text style={[styles.offlineText, { color: theme.error }]}>{t('offline')}</Text>
          </View>
        )}
      </View>

      {/* No location status for simplified flow */}

      {/* Camera View */}
      {scanning && !scanned && !loading && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ['qr'],
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame}>
                <View style={[styles.cornerTL, { borderColor: theme.primary }]} />
                <View style={[styles.cornerTR, { borderColor: theme.primary }]} />
                <View style={[styles.cornerBL, { borderColor: theme.primary }]} />
                <View style={[styles.cornerBR, { borderColor: theme.primary }]} />
              </View>
              <Text style={styles.scannerText}>{t('scanQRCode')}</Text>
            </View>
          </CameraView>
        </View>
      )}

      {/* Loading View */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            {t('processingQRCode')}
          </Text>
        </View>
      )}

      {/* Start Scanning Button */}
      {!scanning && !loading && (
        <View style={styles.startScanContainer}>
          <TouchableOpacity
            style={[styles.startScanButton, { backgroundColor: theme.primary }]}
            onPress={startScanning}
          >
            <Ionicons name="qr-code-outline" size={32} color="#fff" />
            <Text style={styles.startScanButtonText}>{t('startScanning')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* No modal in simplified flow */}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  locationStatusText: {
    marginLeft: 8,
    fontSize: 14,
  },
  cameraContainer: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
    margin: 16,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scannerText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  startScanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  startScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
  },
  startScanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  locationVerificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  locationVerificationText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  machineDetailsContainer: {
    maxHeight: 400,
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default QRScannerScreen;