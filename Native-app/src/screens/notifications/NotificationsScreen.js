import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import contexts
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';
import Screen from '../../components/Screen';

// Import services
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../services/notificationService';

// Import utils
import { getNetworkStatus } from '../../utils/networkUtils';

const NotificationsScreen = ({ navigation }) => {
  // Context hooks
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { user } = useContext(AuthContext);

  // State hooks
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Safe area handled by Screen component

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      
      // Check network status
      const networkStatus = await getNetworkStatus();
      setIsOnline(!!networkStatus);
      // Load notifications from local storage (available online or offline)
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  // Mark notification as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      if (!isOnline) {
        Alert.alert(t('offlineMode'), t('cannotPerformActionOffline'));
        return;
      }
      
      await markNotificationAsRead(notificationId);
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      Alert.alert(t('error'), t('failedToMarkAsRead'));
    }
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = async () => {
    try {
      if (!isOnline) {
        Alert.alert(t('offlineMode'), t('cannotPerformActionOffline'));
        return;
      }
      
      await markAllNotificationsAsRead();
      
      // Update local state
      setNotifications(prevNotifications =>
        prevNotifications.map(notification => ({ ...notification, read: true }))
      );
      
      Alert.alert(t('success'), t('allNotificationsMarkedAsRead'));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      Alert.alert(t('error'), t('failedToMarkAllAsRead'));
    }
  };

  // Handle notification press
  const handleNotificationPress = (notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'work_order':
        navigation.navigate('WorkOrderDetails', { workOrderId: notification.referenceId });
        break;
      case 'breakdown':
        navigation.navigate('Breakdown');
        break;
      case 'announcement':
        // Just display the notification content
        Alert.alert(notification.title, notification.message);
        break;
      default:
        break;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return t('justNow');
    } else if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? t('minuteAgo') : t('minutesAgo')}`;
    } else if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? t('hourAgo') : t('hoursAgo')}`;
    } else if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? t('dayAgo') : t('daysAgo')}`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'work_order':
        return 'clipboard-outline';
      case 'breakdown':
        return 'alert-circle-outline';
      case 'announcement':
        return 'megaphone-outline';
      default:
        return 'notifications-outline';
    }
  };

  // Get notification color based on priority
  const getNotificationColor = (priority) => {
    switch (priority) {
      case 'high':
        return theme.error;
      case 'medium':
        return theme.warning;
      case 'low':
        return theme.success;
      default:
        return theme.primary;
    }
  };

  // Render notification item
  const renderNotificationItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: item.read ? theme.card : theme.primaryLight },
        { borderLeftColor: getNotificationColor(item.priority) },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.notificationIconContainer}>
        <Ionicons
          name={getNotificationIcon(item.type)}
          size={24}
          color={getNotificationColor(item.priority)}
        />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.notificationMessage, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
          {formatDate(item.timestamp)}
        </Text>
      </View>
      {!item.read && (
        <View style={[styles.unreadIndicator, { backgroundColor: theme.primary }]} />
      )}
    </TouchableOpacity>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        {isOnline ? t('noNotifications') : t('offlineNoNotifications')}
      </Text>
    </View>
  );

  // Check if there are unread notifications
  const hasUnreadNotifications = notifications.some(notification => !notification.read);

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header with Mark All as Read button */}
      {hasUnreadNotifications && (
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.markAllButton, { backgroundColor: theme.primary }]}
            onPress={handleMarkAllAsRead}
            disabled={!isOnline}
          >
            <Ionicons name="checkmark-done-outline" size={20} color="#fff" />
            <Text style={styles.markAllButtonText}>{t('markAllAsRead')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Notifications List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.primary]}
              tintColor={theme.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <View style={[styles.offlineIndicator, { backgroundColor: theme.error }, { bottom: 0 }]}>
          <Ionicons name="cloud-offline-outline" size={16} color="#fff" />
          <Text style={styles.offlineText}>{t('offlineMode')}</Text>
        </View>
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'flex-end',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  markAllButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 4,
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderLeftWidth: 4,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  notificationIconContainer: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  unreadIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: 8,
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  offlineText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
});

export default NotificationsScreen;