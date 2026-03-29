import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, ScrollView, Switch } from "react-native";
import { Text as GeistText } from "@/components/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { Stack } from "expo-router";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import networkManager from "@/utils/networkManager";

export default function OfflineTestScreen() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [showDebugIndicator, setShowDebugIndicator] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    // Get initial state
    setIsOnline(networkManager.getIsOnline());
    networkManager.getPendingSyncCount().then(setPendingSyncCount);
    networkManager.getLastSyncTime().then(setLastSyncTime);

    // Subscribe to network changes
    const unsubscribe = networkManager.addListener((online: boolean) => {
      setIsOnline(online);
    });

    // Update sync count periodically
    const interval = setInterval(async () => {
      const count = await networkManager.getPendingSyncCount();
      setPendingSyncCount(count);
      const syncTime = await networkManager.getLastSyncTime();
      setLastSyncTime(syncTime);
    }, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const addTestSyncItem = async () => {
    try {
      await networkManager.makeRequest("/test-endpoint", "POST", {
        test: "data",
      });
    } catch (error) {
      console.log("Expected error for offline test:", error);
    }
  };

  const triggerSync = async () => {
    const result = await networkManager.syncOfflineData();
    console.log("Sync result:", result);
  };

  const clearSyncQueue = async () => {
    try {
      await networkManager.clearSyncQueue();
      setPendingSyncCount(0);
    } catch (error) {
      console.error("Error clearing sync queue:", error);
    }
  };

  const formatTime = (timestamp: number | null) => {
    if (!timestamp) return "Never";
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      <Stack.Screen options={{ title: "Offline Indicator Test" }} />

      {/* Debug Offline Indicator */}
      <OfflineIndicator showWhenOnline={showDebugIndicator} />

      <ScrollView style={tw`flex-1 p-4`}>
        <View style={tw`bg-white rounded-xl p-4 mb-4 border border-gray-100`}>
          <GeistText style={[tw`text-gray-900 mb-2`, typography.bodyBold]}>
            Network Status
          </GeistText>

          <View style={tw`flex-row items-center mb-2`}>
            <MaterialCommunityIcons
              name={isOnline ? "wifi" : "wifi-off"}
              size={20}
              color={isOnline ? "#10b981" : "#ef4444"}
            />
            <GeistText style={[tw`ml-2`, typography.body]}>
              {isOnline ? "Online" : "Offline"}
            </GeistText>
          </View>

          <View style={tw`flex-row items-center mb-2`}>
            <MaterialCommunityIcons name="sync" size={20} color="#6b7280" />
            <GeistText style={[tw`ml-2`, typography.body]}>
              Pending sync items: {pendingSyncCount}
            </GeistText>
          </View>

          <View style={tw`flex-row items-center`}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color="#6b7280"
            />
            <GeistText style={[tw`ml-2`, typography.body]}>
              Last sync: {formatTime(lastSyncTime)}
            </GeistText>
          </View>
        </View>

        <View style={tw`bg-white rounded-xl p-4 mb-4 border border-gray-100`}>
          <GeistText style={[tw`text-gray-900 mb-2`, typography.bodyBold]}>
            Debug Controls
          </GeistText>

          <View style={tw`flex-row items-center justify-between mb-4`}>
            <GeistText style={[tw`text-gray-700`, typography.body]}>
              Show indicator when online
            </GeistText>
            <Switch
              value={showDebugIndicator}
              onValueChange={setShowDebugIndicator}
              trackColor={{ false: "#d1d5db", true: "#3b82f6" }}
              thumbColor={showDebugIndicator ? "#ffffff" : "#ffffff"}
            />
          </View>

          <TouchableOpacity
            style={tw`bg-blue-500 rounded-lg p-3 mb-2`}
            onPress={addTestSyncItem}
          >
            <GeistText
              style={[tw`text-white text-center`, typography.bodyBold]}
            >
              Add Test Sync Item
            </GeistText>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-green-500 rounded-lg p-3 mb-2`}
            onPress={triggerSync}
          >
            <GeistText
              style={[tw`text-white text-center`, typography.bodyBold]}
            >
              Trigger Sync
            </GeistText>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-red-500 rounded-lg p-3`}
            onPress={clearSyncQueue}
          >
            <GeistText
              style={[tw`text-white text-center`, typography.bodyBold]}
            >
              Clear Sync Queue
            </GeistText>
          </TouchableOpacity>
        </View>

        <View style={tw`bg-white rounded-xl p-4 mb-4 border border-gray-100`}>
          <GeistText style={[tw`text-gray-900 mb-2`, typography.bodyBold]}>
            How to Test
          </GeistText>

          <GeistText style={[tw`text-gray-700 mb-2`, typography.body]}>
            1. Enable "Show indicator when online" to see the indicator
          </GeistText>

          <GeistText style={[tw`text-gray-700 mb-2`, typography.body]}>
            2. Turn off WiFi/mobile data to test offline state
          </GeistText>

          <GeistText style={[tw`text-gray-700 mb-2`, typography.body]}>
            3. Add test sync items to see pending count
          </GeistText>

          <GeistText style={[tw`text-gray-700`, typography.body]}>
            4. Turn internet back on to see sync process
          </GeistText>
        </View>
      </ScrollView>
    </View>
  );
}
