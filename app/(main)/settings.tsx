import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  // Navigate to other settings pages
  const goToPage = (page: string) => {
    router.push(page);
  };

  // Show under development alert
  const showUnderDevelopment = () => {
    Alert.alert('Under Development', 'This feature is not yet available.');
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Settings' }} />

      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="person-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Profile</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="shield-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Security</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="notifications-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Payments Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payments</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="card-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Payment Methods</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="receipt-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Transaction History</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>

      {/* App Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Settings</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="language-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Language</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="color-palette-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Appearance</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
      
      {/* Developer Options Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Developer Options</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => router.push('/(dev)/ecentric-payment')}>
          <Ionicons name="card-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Ecentric Payment Test</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
      
      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="information-circle-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>About App</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="help-circle-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="document-text-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Terms of Service</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => showUnderDevelopment()}>
          <Ionicons name="lock-closed-outline" size={22} color="#333" style={styles.itemIcon} />
          <Text style={styles.itemText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </TouchableOpacity>
      </View>
      
      {/* App Version */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    color: '#333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  toggle: {
    marginLeft: 'auto',
  },
  versionContainer: {
    alignItems: 'center',
    padding: 24,
  },
  versionText: {
    color: '#999',
    fontSize: 12,
  },
}); 