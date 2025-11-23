import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Import contexts
import { LanguageContext } from '../contexts/LanguageContext';

// Import services
import {
  getMachineHistory,
  getMaintenanceLogs,
  getSpareParts,
  getMachineManual,
} from '../services/machineService';

const MachineDetails = ({ machine, isLocationValid, theme }) => {
  // Context hooks
  const { t } = useContext(LanguageContext);

  // State hooks
  const [activeTab, setActiveTab] = useState('info');
  const [history, setHistory] = useState(null);
  const [maintenanceLogs, setMaintenanceLogs] = useState(null);
  const [spareParts, setSpareParts] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch machine history
  const fetchMachineHistory = async () => {
    if (history) return;
    
    try {
      setLoading(true);
      const data = await getMachineHistory(machine.id);
      setHistory(data);
    } catch (error) {
      console.error('Error fetching machine history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch maintenance logs
  const fetchMaintenanceLogs = async () => {
    if (maintenanceLogs) return;
    
    try {
      setLoading(true);
      const data = await getMaintenanceLogs(machine.id);
      setMaintenanceLogs(data);
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch spare parts
  const fetchSpareParts = async () => {
    if (spareParts) return;
    
    try {
      setLoading(true);
      const data = await getSpareParts(machine.id);
      setSpareParts(data);
    } catch (error) {
      console.error('Error fetching spare parts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open machine manual
  const openMachineManual = async () => {
    try {
      setLoading(true);
      const manualUrl = await getMachineManual(machine.id);
      
      if (manualUrl) {
        const supported = await Linking.canOpenURL(manualUrl);
        
        if (supported) {
          await Linking.openURL(manualUrl);
        } else {
          console.error('Cannot open URL:', manualUrl);
        }
      }
    } catch (error) {
      console.error('Error opening machine manual:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    
    switch (tab) {
      case 'history':
        fetchMachineHistory();
        break;
      case 'maintenance':
        fetchMaintenanceLogs();
        break;
      case 'parts':
        fetchSpareParts();
        break;
      default:
        break;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Render machine info
  const renderMachineInfo = () => (
    <View style={styles.tabContent}>
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('machineName')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{machine.name}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('machineCode')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{machine.code}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('machineType')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{machine.type}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('manufacturer')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{machine.manufacturer}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('model')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{machine.model}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('serialNumber')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{machine.serialNumber}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('installationDate')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{formatDate(machine.installationDate)}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('location')}:</Text>
        <Text style={[styles.infoValue, { color: theme.text }]}>{machine.location}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>{t('status')}:</Text>
        <Text
          style={[
            styles.infoValue,
            {
              color:
                machine.status === 'operational'
                  ? theme.success
                  : machine.status === 'maintenance'
                  ? theme.warning
                  : theme.error,
              fontWeight: 'bold',
            },
          ]}
        >
          {t(machine.status)}
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.manualButton, { backgroundColor: theme.primary }]}
        onPress={openMachineManual}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="document-text-outline" size={20} color="#fff" />
            <Text style={styles.manualButtonText}>{t('viewManual')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // Render machine history
  const renderMachineHistory = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <ActivityIndicator color={theme.primary} size="large" style={styles.loader} />
      ) : history && history.length > 0 ? (
        history.map((item, index) => (
          <View
            key={index}
            style={[styles.historyItem, { borderBottomColor: theme.border }]}
          >
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.historyDate, { color: theme.textSecondary }]}>
                {formatDate(item.date)}
              </Text>
            </View>
            <Text style={[styles.historyDescription, { color: theme.textSecondary }]}>
              {item.description}
            </Text>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t('noHistoryAvailable')}
        </Text>
      )}
    </View>
  );

  // Render maintenance logs
  const renderMaintenanceLogs = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <ActivityIndicator color={theme.primary} size="large" style={styles.loader} />
      ) : maintenanceLogs && maintenanceLogs.length > 0 ? (
        maintenanceLogs.map((log, index) => (
          <View
            key={index}
            style={[styles.logItem, { borderBottomColor: theme.border }]}
          >
            <View style={styles.logHeader}>
              <Text style={[styles.logTitle, { color: theme.text }]}>{log.type}</Text>
              <Text style={[styles.logDate, { color: theme.textSecondary }]}>
                {formatDate(log.date)}
              </Text>
            </View>
            <Text style={[styles.logDescription, { color: theme.textSecondary }]}>
              {log.description}
            </Text>
            <View style={styles.logFooter}>
              <Text style={[styles.logTechnician, { color: theme.textSecondary }]}>
                {t('technician')}: {log.technician}
              </Text>
              <Text
                style={[
                  styles.logStatus,
                  {
                    color:
                      log.status === 'completed'
                        ? theme.success
                        : log.status === 'scheduled'
                        ? theme.warning
                        : theme.primary,
                  },
                ]}
              >
                {t(log.status)}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t('noMaintenanceLogsAvailable')}
        </Text>
      )}
    </View>
  );

  // Render spare parts
  const renderSpareParts = () => (
    <View style={styles.tabContent}>
      {loading ? (
        <ActivityIndicator color={theme.primary} size="large" style={styles.loader} />
      ) : spareParts && spareParts.length > 0 ? (
        spareParts.map((part, index) => (
          <View
            key={index}
            style={[styles.partItem, { borderBottomColor: theme.border }]}
          >
            <View style={styles.partHeader}>
              <Text style={[styles.partName, { color: theme.text }]}>{part.name}</Text>
              <View
                style={[
                  styles.partAvailability,
                  {
                    backgroundColor: part.inStock
                      ? 'rgba(76, 175, 80, 0.1)'
                      : 'rgba(244, 67, 54, 0.1)',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.partAvailabilityText,
                    { color: part.inStock ? theme.success : theme.error },
                  ]}
                >
                  {part.inStock ? t('inStock') : t('outOfStock')}
                </Text>
              </View>
            </View>
            <View style={styles.partDetails}>
              <Text style={[styles.partNumber, { color: theme.textSecondary }]}>
                {t('partNumber')}: {part.partNumber}
              </Text>
              <Text style={[styles.partQuantity, { color: theme.textSecondary }]}>
                {t('quantity')}: {part.quantity}
              </Text>
            </View>
          </View>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          {t('noSparePartsAvailable')}
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'info' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => handleTabChange('info')}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'info' ? theme.primary : theme.textSecondary },
            ]}
          >
            {t('info')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'history' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => handleTabChange('history')}
          disabled={!isLocationValid}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: !isLocationValid
                  ? theme.textDisabled
                  : activeTab === 'history'
                  ? theme.primary
                  : theme.textSecondary,
              },
            ]}
          >
            {t('history')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'maintenance' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => handleTabChange('maintenance')}
          disabled={!isLocationValid}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: !isLocationValid
                  ? theme.textDisabled
                  : activeTab === 'maintenance'
                  ? theme.primary
                  : theme.textSecondary,
              },
            ]}
          >
            {t('maintenance')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'parts' && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
          ]}
          onPress={() => handleTabChange('parts')}
          disabled={!isLocationValid}
        >
          <Text
            style={[
              styles.tabText,
              {
                color: !isLocationValid
                  ? theme.textDisabled
                  : activeTab === 'parts'
                  ? theme.primary
                  : theme.textSecondary,
              },
            ]}
          >
            {t('spareParts')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {!isLocationValid && activeTab !== 'info' ? (
        <View style={styles.locationWarningContainer}>
          <Ionicons name="location-outline" size={48} color={theme.error} />
          <Text style={[styles.locationWarningText, { color: theme.error }]}>
            {t('incorrectLocationWarning')}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.contentContainer}>
          {activeTab === 'info' && renderMachineInfo()}
          {activeTab === 'history' && renderMachineHistory()}
          {activeTab === 'maintenance' && renderMaintenanceLogs()}
          {activeTab === 'parts' && renderSpareParts()}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    paddingBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  manualButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  historyItem: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyDate: {
    fontSize: 12,
  },
  historyDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  logItem: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logDate: {
    fontSize: 12,
  },
  logDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logTechnician: {
    fontSize: 12,
  },
  logStatus: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  partItem: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
  },
  partHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  partName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  partAvailability: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  partAvailabilityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  partDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  partNumber: {
    fontSize: 14,
  },
  partQuantity: {
    fontSize: 14,
  },
  emptyText: {
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  loader: {
    marginTop: 20,
  },
  locationWarningContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationWarningText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
});

export default MachineDetails;