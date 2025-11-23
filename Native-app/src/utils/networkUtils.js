import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_ONLINE_KEY = 'factory_app_last_online';

/**
 * Get current network status
 * @returns {Promise<boolean>} - True if online, false if offline
 */
export const getNetworkStatus = async () => {
  try {
    const netInfo = await NetInfo.fetch();
    const isConnected = netInfo.isConnected && netInfo.isInternetReachable;
    
    // If connected, update last online timestamp
    if (isConnected) {
      await updateLastOnlineTime();
    }
    
    return isConnected;
  } catch (error) {
    console.error('Error checking network status:', error);
    return false;
  }
};

/**
 * Update last online timestamp
 * @returns {Promise<void>}
 */
export const updateLastOnlineTime = async () => {
  try {
    const timestamp = new Date().toISOString();
    await AsyncStorage.setItem(LAST_ONLINE_KEY, timestamp);
  } catch (error) {
    console.error('Error updating last online time:', error);
  }
};

/**
 * Get last online timestamp
 * @returns {Promise<string|null>} - ISO timestamp string or null
 */
export const getLastOnlineTime = async () => {
  try {
    return await AsyncStorage.getItem(LAST_ONLINE_KEY);
  } catch (error) {
    console.error('Error getting last online time:', error);
    return null;
  }
};

/**
 * Subscribe to network status changes
 * @param {Function} callback - Function to call when network status changes
 * @returns {Function} - Unsubscribe function
 */
export const subscribeToNetworkChanges = (callback) => {
  return NetInfo.addEventListener(state => {
    const isConnected = state.isConnected && state.isInternetReachable;
    
    // Update last online time if connected
    if (isConnected) {
      updateLastOnlineTime();
    }
    
    // Call callback with network status
    callback(isConnected);
  });
};

/**
 * Get formatted time since last online
 * @returns {Promise<string>} - Formatted time string
 */
export const getTimeSinceLastOnline = async () => {
  try {
    const lastOnlineTime = await getLastOnlineTime();
    
    if (!lastOnlineTime) {
      return 'Unknown';
    }
    
    const lastOnline = new Date(lastOnlineTime);
    const now = new Date();
    const diffMs = now - lastOnline;
    
    // Convert to appropriate time unit
    if (diffMs < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diffMs < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diffMs / 60000);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diffMs < 86400000) { // Less than 1 day
      const hours = Math.floor(diffMs / 3600000);
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else { // More than 1 day
      const days = Math.floor(diffMs / 86400000);
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
  } catch (error) {
    console.error('Error calculating time since last online:', error);
    return 'Unknown';
  }
};