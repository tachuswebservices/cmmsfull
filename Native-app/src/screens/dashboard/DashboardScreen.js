import React, { useState, useEffect, useContext, useCallback } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Import contexts
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';
import { AuthContext } from '../../contexts/AuthContext';

// Import services
import { getWorkOrders } from '../../services/workOrderService';
import { getNetworkStatus } from '../../utils/networkUtils';

// Import components
import WorkOrderCard from '../../components/WorkOrderCard';
import StatsCard from '../../components/StatsCard';
import Screen from '../../components/Screen';

const DashboardScreen = ({ navigation }) => {
  // Context hooks
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);
  const { user, isAuthenticated, token } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  // State hooks
  const [workOrders, setWorkOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
  });
  const [activeFilter, setActiveFilter] = useState('all'); // all, today, upcoming
  const [priorityFilter, setPriorityFilter] = useState('all'); // all, high, medium, low
  const [isOnline, setIsOnline] = useState(true);

  // Fetch work orders
  const fetchWorkOrders = async () => {
    try {
      // Guard: only attempt when authenticated
      if (!isAuthenticated || !token) {
        setWorkOrders([]);
        setFilteredOrders([]);
        setStats({ total: 0, pending: 0, inProgress: 0, completed: 0 });
        return;
      }
      setLoading(true);
      const networkStatus = await getNetworkStatus();
      setIsOnline(networkStatus);

      const response = await getWorkOrders();
      setWorkOrders(response);
      calculateStats(response);
      applyFilters(response, activeFilter, priorityFilter);
    } catch (error) {
      console.error('Error fetching work orders:', error);
      Alert.alert(t('error'), t('errorFetchingWorkOrders'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate stats
  const calculateStats = (orders) => {
    const stats = {
      total: orders.length,
      pending: orders.filter((order) => order.status === 'pending').length,
      inProgress: orders.filter((order) => order.status === 'in_progress').length,
      completed: orders.filter((order) => order.status === 'completed').length,
    };
    setStats(stats);
  };

  // Apply filters
  const applyFilters = (orders, statusFilter, priorityFilter) => {
    let filtered = [...orders];

    // Apply status filter
    if (statusFilter === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.scheduledDate);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() === today.getTime();
      });
    } else if (statusFilter === 'upcoming') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter((order) => {
        const orderDate = new Date(order.scheduledDate);
        orderDate.setHours(0, 0, 0, 0);
        return orderDate.getTime() > today.getTime();
      });
    }

    // Apply priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((order) => order.priority.toLowerCase() === priorityFilter);
    }

    setFilteredOrders(filtered);
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWorkOrders();
  };

  // Handle filter change
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    applyFilters(workOrders, filter, priorityFilter);
  };

  // Handle priority filter change
  const handlePriorityFilterChange = (priority) => {
    setPriorityFilter(priority);
    applyFilters(workOrders, activeFilter, priority);
  };

  // Navigate to work order details
  const navigateToWorkOrderDetails = (workOrder) => {
    navigation.navigate('WorkOrderDetails', { workOrderId: workOrder.id });
  };

  // Fetch work orders on mount and when screen is focused
  useEffect(() => {
    fetchWorkOrders();
  }, [isAuthenticated, token]);

  useFocusEffect(
    useCallback(() => {
      fetchWorkOrders();
    }, [isAuthenticated, token])
  );

  // Render work order item
  const renderWorkOrderItem = ({ item }) => (
    <WorkOrderCard workOrder={item} onPress={() => navigateToWorkOrderDetails(item)} />
  );

  // Render empty list
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={50} color={theme.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        {t('noWorkOrdersFound')}
      </Text>
    </View>
  );

  return (
    <Screen style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{t('dashboard')}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {t('welcome')}, {user?.name || t('operator')}
          </Text>
        </View>
        {!isOnline && (
          <View style={styles.offlineIndicator}>
            <Ionicons name="cloud-offline-outline" size={16} color={theme.error} />
            <Text style={[styles.offlineText, { color: theme.error }]}>{t('offline')}</Text>
          </View>
        )}
      </View>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <StatsCard
          title={t('total')}
          value={stats.total}
          icon="clipboard-outline"
          color="#6200ee"
          theme={theme}
        />
        <StatsCard
          title={t('pending')}
          value={stats.pending}
          icon="time-outline"
          color="#ff9800"
          theme={theme}
        />
        <StatsCard
          title={t('inProgress')}
          value={stats.inProgress}
          icon="play-outline"
          color="#2196f3"
          theme={theme}
        />
        <StatsCard
          title={t('completed')}
          value={stats.completed}
          icon="checkmark-circle-outline"
          color="#4caf50"
          theme={theme}
        />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Status Filters */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'all' && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => handleFilterChange('all')}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'all' ? '#fff' : theme.text },
              ]}
            >
              {t('all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'today' && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => handleFilterChange('today')}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'today' ? '#fff' : theme.text },
              ]}
            >
              {t('today')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              activeFilter === 'upcoming' && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => handleFilterChange('upcoming')}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === 'upcoming' ? '#fff' : theme.text },
              ]}
            >
              {t('upcoming')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Priority Filters */}
        <View style={styles.filterGroup}>
          <TouchableOpacity
            style={[
              styles.priorityButton,
              priorityFilter === 'all' && {
                backgroundColor: theme.primary,
                borderColor: theme.primary,
              },
            ]}
            onPress={() => handlePriorityFilterChange('all')}
          >
            <Text
              style={[
                styles.filterText,
                { color: priorityFilter === 'all' ? '#fff' : theme.text },
              ]}
            >
              {t('allPriorities')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.priorityButton,
              priorityFilter === 'high' && {
                backgroundColor: '#f44336',
                borderColor: '#f44336',
              },
            ]}
            onPress={() => handlePriorityFilterChange('high')}
          >
            <Text
              style={[
                styles.filterText,
                { color: priorityFilter === 'high' ? '#fff' : '#f44336' },
              ]}
            >
              {t('high')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.priorityButton,
              priorityFilter === 'medium' && {
                backgroundColor: '#ff9800',
                borderColor: '#ff9800',
              },
            ]}
            onPress={() => handlePriorityFilterChange('medium')}
          >
            <Text
              style={[
                styles.filterText,
                { color: priorityFilter === 'medium' ? '#fff' : '#ff9800' },
              ]}
            >
              {t('medium')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.priorityButton,
              priorityFilter === 'low' && {
                backgroundColor: '#4caf50',
                borderColor: '#4caf50',
              },
            ]}
            onPress={() => handlePriorityFilterChange('low')}
          >
            <Text
              style={[
                styles.filterText,
                { color: priorityFilter === 'low' ? '#fff' : '#4caf50' },
              ]}
            >
              {t('low')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Work Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderWorkOrderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[styles.listContainer, { paddingBottom: 16 + insets.bottom }]}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
        />
      )}
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
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 16,
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
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterGroup: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  priorityButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
  },
});

export default DashboardScreen;