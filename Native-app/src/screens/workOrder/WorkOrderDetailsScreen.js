import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Import contexts
import { ThemeContext } from '../../contexts/ThemeContext';
import { LanguageContext } from '../../contexts/LanguageContext';

// Import services
import {
  getWorkOrderById,
  startWorkOrder,
  pauseWorkOrder,
  completeWorkOrder,
} from '../../services/workOrderService';
import { getNetworkStatus } from '../../utils/networkUtils';

// Import components

const WorkOrderDetailsScreen = ({ route, navigation }) => {
  // Get work order ID from route params
  const { workOrderId } = route.params;

  // Context hooks
  const { theme } = useContext(ThemeContext);
  const { t } = useContext(LanguageContext);

  // State hooks
  const [workOrder, setWorkOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Fetch work order details
  const fetchWorkOrderDetails = async () => {
    try {
      setLoading(true);
      const networkStatus = await getNetworkStatus();
      setIsOnline(networkStatus);

      const response = await getWorkOrderById(workOrderId);
      setWorkOrder(response);
    } catch (error) {
      console.error('Error fetching work order details:', error);
      Alert.alert(t('error'), t('errorFetchingWorkOrderDetails'));
    } finally {
      setLoading(false);
    }
  };

  // Handle work order actions
  const handleWorkOrderAction = async (action) => {
    if (!isOnline) {
      Alert.alert(t('offlineMode'), t('actionSavedOffline'));
    }

    try {
      setActionLoading(true);
      let response;

      switch (action) {
        case 'start':
          response = await startWorkOrder(workOrderId);
          break;
        case 'pause':
          response = await pauseWorkOrder(workOrderId);
          break;
        case 'complete':
          response = await completeWorkOrder(workOrderId);
          break;
        default:
          break;
      }

      if (response) {
        // Action endpoints return partial data; refetch full details to show all fields
        await fetchWorkOrderDetails();
        Alert.alert(t('success'), t('workOrderUpdated'));
      }
    } catch (error) {
      console.error(`Error ${action} work order:`, error);
      if (action === 'complete') {
        Alert.alert(
          t('error'),
          t('completionBlockedReportBreakdown'),
          [
            {
              text: t('later'),
              style: 'cancel',
            },
            {
              text: t('reportNow'),
              onPress: () =>
                navigation.navigate('BreakdownReport', {
                  from: 'WorkOrderDetails',
                  workOrderId,
                  assetId: (workOrder && (workOrder.assetId || (workOrder.asset && workOrder.asset.id))) || null,
                }),
            },
          ]
        );
      } else {
        Alert.alert(t('error'), t(`error${action.charAt(0).toUpperCase() + action.slice(1)}WorkOrder`));
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Helpers for attachments
  const getAttachmentUrl = (att) => {
    if (!att) return null;
    if (typeof att === 'string') return att;
    return att.url || att.uri || null;
  };

  const isImage = (att) => {
    if (!att) return false;
    const mime = typeof att === 'string' ? '' : (att.mimeType || '');
    const kind = typeof att === 'string' ? '' : (att.kind || '');
    if (mime.startsWith('image/') || kind === 'photo' || kind === 'image') return true;
    const url = getAttachmentUrl(att) || '';
    const lower = url.toLowerCase();
    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
  };

  const isVideo = (att) => {
    if (!att) return false;
    const mime = typeof att === 'string' ? '' : (att.mimeType || '');
    const kind = typeof att === 'string' ? '' : (att.kind || '');
    if (mime.startsWith('video/') || kind === 'video') return true;
    const url = getAttachmentUrl(att) || '';
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.m4v') || lower.endsWith('.webm') || lower.endsWith('.avi');
  };

  const openAttachment = (url) => {
    if (!url) return;
    try {
      Linking.openURL(url);
    } catch (e) {
      Alert.alert(t('error'), t('errorOpeningLink') || 'Failed to open link');
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#ff9800'; // Orange (Not Started)
      case 'in_progress':
        return '#2196f3'; // Blue
      case 'completed_request':
        return '#9c27b0'; // Purple
      case 'completed':
        return '#4caf50'; // Green
      default:
        return '#757575'; // Grey
    }
  };

  // Get translated status
  const getTranslatedStatus = (status) => {
    switch (status) {
      case 'pending':
        return t('notStarted');
      case 'in_progress':
        return t('inProgress');
      case 'completed_request':
        return t('completedRequest');
      case 'completed':
        return t('completed');
      default:
        return status;
    }
  };

  // Fetch work order details on mount
  useEffect(() => {
    fetchWorkOrderDetails();
  }, [workOrderId]);

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Render work order details
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {workOrder?.title}
          </Text>
          {!isOnline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="cloud-offline-outline" size={16} color={theme.error} />
              <Text style={[styles.offlineText, { color: theme.error }]}>{t('offline')}</Text>
            </View>
          )}
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(workOrder?.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {getTranslatedStatus(workOrder?.status)}
            </Text>
          </View>
        </View>

        {/* Simplified Work Order Details */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('workOrderDetails')}
          </Text>

          {/* Subject */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('subject')}:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{workOrder?.title || '-'}</Text>
          </View>

          {/* Description */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('description')}:</Text>
            <Text style={[styles.descriptionText, { color: theme.text }]}>
              {workOrder?.description || '-'}
            </Text>
          </View>

          {/* Attachments */}
          {Array.isArray(workOrder?.attachments) && workOrder.attachments.length > 0 ? (
            <View style={{ marginTop: 8, marginBottom: 8 }}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('attachments')}:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {workOrder.attachments.map((att, idx) => {
                  const url = getAttachmentUrl(att);
                  const isImg = isImage(att);
                  const isVid = isVideo(att);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={styles.attachmentItem}
                      onPress={() => openAttachment(url)}
                    >
                      {isImg && url ? (
                        <Image source={{ uri: url }} style={styles.attachmentImage} />
                      ) : (
                        <View style={styles.attachmentIconPlaceholder}>
                          <Ionicons name={isVid ? 'play-circle' : 'document'} size={20} color={theme.textSecondary} />
                        </View>
                      )}
                      <Text style={[styles.attachmentLabel, { color: theme.primary }]}>
                        {isImg ? (t('view') || 'View') : isVid ? (t('play') || 'Play') : (t('download') || 'Download')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {/* Due Date */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('dueDate')}:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {workOrder?.dueDate || workOrder?.scheduledDate ? formatDate(workOrder?.dueDate || workOrder?.scheduledDate) : '-'}
            </Text>
          </View>

          {/* Assigned To */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('assignedTo') || 'Assigned To'}:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{workOrder?.assignedToName || '-'}</Text>
          </View>

          {/* (User ID hidden as requested) */}

          {/* Asset */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('asset') || 'Asset'}:</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{workOrder?.assetName || workOrder?.machineName || '-'}</Text>
          </View>

          {/* (Asset ID hidden as requested) */}

          {/* Priority */}
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('priority')}:</Text>
            <Text style={[styles.infoValue, { color: theme.text, fontWeight: 'bold' }]}>
              {workOrder?.priority ? t(workOrder.priority.toLowerCase()) : '-'}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {workOrder?.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#2196f3' }]}
              onPress={() => handleWorkOrderAction('start')}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('startWork')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {workOrder?.status === 'in_progress' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#ff9800' }]}
                onPress={() => handleWorkOrderAction('pause')}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="pause" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>{t('pauseWork')}</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4caf50' }]}
                onPress={() => handleWorkOrderAction('complete')}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>{t('completeWork')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {workOrder?.status !== 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#f44336' }]}
              onPress={() =>
                navigation.navigate('BreakdownReport', {
                  from: 'WorkOrderDetails',
                  workOrderId,
                  assetId: (workOrder && (workOrder.assetId || (workOrder.asset && workOrder.asset.id))) || null,
                })
              }
              disabled={actionLoading}
            >
              <Ionicons name="warning" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('reportIssue')}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  offlineText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusContainer: {
    marginBottom: 16,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  descriptionContainer: {
    marginTop: 8,
  },
  descriptionText: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  emptyText: {
    fontStyle: 'italic',
    fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 10,
    flex: 1,
    marginHorizontal: 4,
    minWidth: '45%',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
});

export default WorkOrderDetailsScreen;