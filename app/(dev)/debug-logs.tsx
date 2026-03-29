import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Share,
  Platform,
  RefreshControl,
  SafeAreaView
} from 'react-native';
import { Stack } from 'expo-router';
import logManager, { LogEntry } from '../../utils/LogManager';
import * as Clipboard from 'expo-clipboard';
import fsManager from '../../utils/FSManager';

// Import EcentricPayment safely
// let EcentricPayment: any;
// try {
//   EcentricPayment = require('../../utils/EcentricPayment').default;
// } catch (err) {
//   console.warn('Failed to import EcentricPayment:', err);
// }

// Filter type
type LogFilter = 'all' | 'info' | 'warn' | 'error' | 'debug' | 'ecentric';

interface DebugLogsScreenProps {
  shouldUseStack?: boolean;
}

const SafeRender = ({ children }: { children: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>
          Something went wrong with the Debug Logs screen.
        </Text>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={() => setHasError(false)}
        >
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  try {
    return <>{children}</>;
  } catch (error) {
    console.error('Caught error in SafeRender:', error);
    setHasError(true);
    return null;
  }
};

export default function DebugLogsScreen({ shouldUseStack = false }: DebugLogsScreenProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load logs
  const loadLogs = () => {
    try {
      let filteredLogs = logManager.getLogs();
      
      // Apply filter
      if (filter === 'info') {
        filteredLogs = filteredLogs.filter(log => log.level === 'info');
      } else if (filter === 'warn') {
        filteredLogs = filteredLogs.filter(log => log.level === 'warn');
      } else if (filter === 'error') {
        filteredLogs = filteredLogs.filter(log => log.level === 'error');
      } else if (filter === 'debug') {
        filteredLogs = filteredLogs.filter(log => log.level === 'debug');
      } else if (filter === 'ecentric') {
        filteredLogs = filteredLogs.filter(log => log.tag.toLowerCase().includes('ecentric'));
      }
      
      // Apply search
      if (searchText) {
        const search = searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(log => 
          log.message.toLowerCase().includes(search) || 
          log.tag.toLowerCase().includes(search) ||
          (log.data && JSON.stringify(log.data).toLowerCase().includes(search))
        );
      }
      
      setLogs(filteredLogs);
      setError(null);
    } catch (err) {
      console.error('Error loading logs:', err);
      setError('Failed to load logs. Please try again.');
    }
  };

  // Load logs on mount and when filter changes
  useEffect(() => {
    try {
      loadLogs();
    } catch (err) {
      console.error('Error in useEffect loading logs:', err);
      setError('Failed to load logs. Please try again.');
    }
  }, [filter, searchText]);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    loadLogs();
    setRefreshing(false);
  };

  // Clear logs
  const clearLogs = () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            await logManager.clearLogs();
            loadLogs();
          }
        },
      ]
    );
  };

  // Share logs
  const shareLogs = async () => {
    try {
      const logsText = logManager.exportLogs();
      await Share.share({
        message: logsText,
        title: 'Debug Logs'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share logs');
    }
  };

  // Copy logs to clipboard
  const copyLogs = async () => {
    const logsText = logManager.exportLogs();
    await Clipboard.setStringAsync(logsText);
    Alert.alert('Success', 'Logs copied to clipboard');
  };

  // Save logs to a file
  const saveLogsToFile = async () => {
    try {
      const logsText = logManager.exportLogs();
      const filePath = await fsManager.exportLogsToFile(logsText);
      
      if (filePath) {
        Alert.alert('Success', `Logs saved to file: ${filePath}`);
      } else {
        Alert.alert('Error', 'Failed to save logs to file');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save logs to file');
      console.error('Error saving logs to file:', error);
    }
  };

  // Generate test Ecentric logs
  const generateEcentricLogs = () => {
    try {
      // Generate a few sample logs to show Ecentric payment flow
      logManager.info('EcentricPayment', 'Starting payment process');
      logManager.debug('EcentricPayment', 'Payment details', {
        amount: '100.00',
        reference: 'TEST-REF-' + Date.now(),
        transactionId: 'TXN-' + Date.now(),
        currencyCode: 'ZAR',
        receiptRequired: true,
        showTransactionStatusScreen: true
      });
      
      // Add some example auth logs
      logManager.info('EcentricPayment', 'Checking authentication status');
      logManager.debug('EcentricPayment', 'Auth credentials', {
        accessKeyLength: 32,
        secretKeyLength: 64,
        merchantID: '********'
      });
      
      // Add example error
      setTimeout(() => {
        try {
          logManager.error('EcentricPayment', 'Failed to connect to payment terminal', {
            error: 'Connection timeout after 15 seconds',
            deviceStatus: 'DISCONNECTED',
            lastConnected: new Date(Date.now() - 86400000).toISOString()
          });
        } catch (err) {
          console.error('Error generating delayed error log:', err);
        }
      }, 500);
      
      // Add success log after a delay
      setTimeout(() => {
        try {
          logManager.info('EcentricPayment', 'Payment response received', {
            responseCode: '00',
            responseMessage: 'Approved',
            authCode: 'A12345',
            transactionId: 'TXN-' + Date.now(),
            maskedPan: '411111******1111',
            cardType: 'VISA',
            amount: '100.00',
            currencyCode: 'ZAR'
          });
          
          // Refresh logs
          loadLogs();
        } catch (err) {
          console.error('Error generating delayed success log:', err);
        }
      }, 1000);
      
      Alert.alert('Success', 'Generated sample Ecentric payment logs');
      
      // Immediately refresh logs to show the first entries
      loadLogs();
    } catch (err) {
      console.error('Error generating Ecentric logs:', err);
      Alert.alert('Error', 'Failed to generate sample logs');
    }
  };

  // Render a single log entry
  const renderLogEntry = (log: LogEntry, index: number) => {
    const date = new Date(log.timestamp);
    const formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    
    let levelColor = '#333';
    if (log.level === 'info') levelColor = '#0066cc';
    if (log.level === 'warn') levelColor = '#ff9900';
    if (log.level === 'error') levelColor = '#cc0000';
    if (log.level === 'debug') levelColor = '#669900';
    
    return (
      <View key={`log-${index}-${log.timestamp}`} style={styles.logEntry}>
        <Text style={styles.logTime}>{formattedTime}</Text>
        <View style={styles.logHeader}>
          <Text style={[styles.logLevel, { color: levelColor }]}>
            {log.level.toUpperCase()}
          </Text>
          <Text style={styles.logTag}>[{log.tag}]</Text>
        </View>
        <Text style={styles.logMessage}>{log.message}</Text>
        {log.data && (
          <View style={styles.logData}>
            <Text style={styles.logDataText}>
              {JSON.stringify(log.data, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const screenContent = (
    <>
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadLogs()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search logs..."
          value={searchText}
          onChangeText={setSearchText}
        />
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScrollView}>
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]} 
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterButtonText, filter === 'all' && styles.activeFilterText]}>
              All
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'info' && styles.activeFilter]} 
            onPress={() => setFilter('info')}
          >
            <Text style={[styles.filterButtonText, filter === 'info' && styles.activeFilterText]}>
              Info
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'warn' && styles.activeFilter]} 
            onPress={() => setFilter('warn')}
          >
            <Text style={[styles.filterButtonText, filter === 'warn' && styles.activeFilterText]}>
              Warning
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'error' && styles.activeFilter]} 
            onPress={() => setFilter('error')}
          >
            <Text style={[styles.filterButtonText, filter === 'error' && styles.activeFilterText]}>
              Error
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'debug' && styles.activeFilter]} 
            onPress={() => setFilter('debug')}
          >
            <Text style={[styles.filterButtonText, filter === 'debug' && styles.activeFilterText]}>
              Debug
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterButton, filter === 'ecentric' && styles.activeFilter]} 
            onPress={() => setFilter('ecentric')}
          >
            <Text style={[styles.filterButtonText, filter === 'ecentric' && styles.activeFilterText]}>
              Ecentric
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={clearLogs}>
          <Text style={styles.actionButtonText}>Clear</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={copyLogs}>
          <Text style={styles.actionButtonText}>Copy</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={shareLogs}>
          <Text style={styles.actionButtonText}>Share</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={saveLogsToFile}>
          <Text style={styles.actionButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        style={styles.logsList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {logs.length > 0 ? (
          logs.map((log, index) => renderLogEntry(log, index))
        ) : (
          <Text style={styles.emptyText}>No logs found</Text>
        )}
      </ScrollView>
      
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {logs.length} {logs.length === 1 ? 'log' : 'logs'} displayed
        </Text>
        
        <View style={styles.statusBarButtons}>
          <TouchableOpacity onPress={generateEcentricLogs}>
            <Text style={styles.testLogButton}>Generate Ecentric Logs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => logManager.info('Test', 'This is a test log')}>
            <Text style={styles.testLogButton}>Add Test Log</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
  
  // Return the content wrapped in the appropriate container based on context
  return shouldUseStack ? (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Debug Logs' }} />
      <SafeRender>{screenContent}</SafeRender>
    </SafeAreaView>
  ) : (
    <SafeAreaView style={styles.container}>
      <SafeRender>{screenContent}</SafeRender>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  filterContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  filterScrollView: {
    flexDirection: 'row',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: '#0066cc',
  },
  filterButtonText: {
    color: '#333',
  },
  activeFilterText: {
    color: '#fff',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0066cc',
    marginRight: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  logsList: {
    flex: 1,
  },
  logEntry: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  logTime: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  logHeader: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'center',
  },
  logLevel: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  logTag: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  logMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  logData: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  logDataText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  emptyText: {
    padding: 20,
    textAlign: 'center',
    color: '#666',
  },
  statusBar: {
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    color: '#666',
    fontSize: 12,
  },
  testLogButton: {
    color: '#0066cc',
    fontSize: 12,
  },
  statusBarButtons: {
    flexDirection: 'row',
    gap: 16
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  errorText: {
    color: '#cc0000',
    fontSize: 14,
    marginBottom: 10,
  },
  retryButton: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#0066cc',
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 