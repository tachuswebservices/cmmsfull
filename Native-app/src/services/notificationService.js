import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const STORAGE_KEY = 'factory_app_notifications';

// Dummy notifications for UI and offline usage
const DEFAULT_NOTIFICATIONS = [
  {
    id: 1,
    title: 'New Work Order',
    message: 'WO-1001 assigned to you for Conveyor A1.',
    type: 'work_order',
    priority: 'high',
    referenceId: 1001,
    read: false,
    timestamp: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'Announcement',
    message: 'Safety drill scheduled at 3 PM today.',
    type: 'announcement',
    priority: 'medium',
    read: false,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    title: 'Breakdown Reported',
    message: 'Unexpected vibration detected on Press B2.',
    type: 'breakdown',
    priority: 'high',
    read: true,
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
];

const loadNotifications = async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
    return DEFAULT_NOTIFICATIONS;
  } catch (e) {
    console.warn('Failed to load notifications, using defaults', e?.message || e);
    return DEFAULT_NOTIFICATIONS;
  }
};

const saveNotifications = async (items) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn('Failed to save notifications', e?.message || e);
  }
};

export const getNotifications = async () => {
  const items = await loadNotifications();
  // Sort latest first
  return [...items].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const markNotificationAsRead = async (id) => {
  const items = await loadNotifications();
  const next = items.map(n => (n.id === id ? { ...n, read: true } : n));
  await saveNotifications(next);
};

export const markAllNotificationsAsRead = async () => {
  const items = await loadNotifications();
  const next = items.map(n => ({ ...n, read: true }));
  await saveNotifications(next);
};

/**
 * Schedule a local notification
 * @param {Object} notification - Notification data
 * @returns {Promise} - Notification ID
 */
export const scheduleLocalNotification = async (notification) => {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
      },
      trigger: notification.trigger || null,
    });

    return id;
  } catch (error) {
    console.error('Error scheduling local notification:', error);
    throw error;
  }
};

/**
 * Cancel all scheduled notifications
 * @returns {Promise} - Void
 */
export const cancelAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling all notifications:', error);
    throw error;
  }
};

// Configure Android notification channel and request permissions
export const ensureNotificationPermissions = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
      sound: 'default',
    });
  }
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted || settings.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
  if (!granted) {
    const req = await Notifications.requestPermissionsAsync();
    granted = req.granted || req.ios?.status === Notifications.IosAuthorizationStatus.AUTHORIZED;
  }
  return granted;
};

// Get Expo push token
export const getExpoPushToken = async () => {
  const ok = await ensureNotificationPermissions();
  if (!ok) return null;
  // Determine EAS projectId
  // Prefer Constants.easConfig.projectId (available in EAS builds and Expo Go SDK 49+)
  // Fallback to expoConfig.extra.eas.projectId for local/dev where available
  const projectId =
    (Constants?.easConfig?.projectId) ||
    (Constants?.expoConfig?.extra?.eas?.projectId) ||
    null;
  if (!projectId) {
    console.warn(
      'No EAS projectId found. Push token retrieval may fail in Expo Go. Ensure project is linked and projectId is available.'
    );
  }
  const response = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return response.data;
};
