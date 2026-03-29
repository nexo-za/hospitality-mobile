import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Text } from "@/components/Text";
import { Screen } from "@/components/Screen";
import { Stack } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import AuthLoggerUtil from "@/api/utils/authLogger";

export default function AuthLogsScreen() {
  const [logs, setLogs] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLogs = async () => {
    try {
      setIsLoading(true);
      const authLogs = await AuthLoggerUtil.viewAuthLogs();
      setLogs(authLogs);
    } catch (error) {
      console.error("Failed to load auth logs:", error);
      Alert.alert("Error", "Failed to load authentication logs");
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const handleShare = async () => {
    try {
      const success = await AuthLoggerUtil.shareAuthLogs();
      if (!success) {
        Alert.alert("Info", "Sharing was cancelled");
      }
    } catch (error) {
      console.error("Failed to share logs:", error);
      Alert.alert("Error", "Failed to share logs");
    }
  };

  const handleExport = async () => {
    try {
      const filePath = await AuthLoggerUtil.exportLogsToFile();
      if (filePath) {
        Alert.alert("Success", `Logs exported to file: ${filePath}`, [
          { text: "OK" },
        ]);
      } else {
        Alert.alert("Error", "Failed to export logs to file");
      }
    } catch (error) {
      console.error("Failed to export logs:", error);
      Alert.alert("Error", "Failed to export logs to file");
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Auth Logs",
          headerRight: () => (
            <View style={tw`flex-row`}>
              <TouchableOpacity style={tw`p-2 mr-2`} onPress={handleShare}>
                <MaterialCommunityIcons
                  name="share-variant"
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
              <TouchableOpacity style={tw`p-2`} onPress={handleExport}>
                <MaterialCommunityIcons
                  name="file-export"
                  size={24}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {isLoading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1 p-4`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#0ea5e9"]}
            />
          }
        >
          <View style={tw`bg-gray-100 rounded-lg p-4 mb-4`}>
            <Text style={[tw`text-gray-700`, typography.bodyBold]}>
              Authentication Logs
            </Text>
            <Text style={[tw`text-gray-500 text-sm mt-1`, typography.body]}>
              These logs are especially useful for debugging authentication
              issues in production builds. Pull down to refresh. Use the share
              button to send logs to the development team.
            </Text>
          </View>

          {logs ? (
            <View style={tw`bg-white rounded-lg p-4 border border-gray-200`}>
              <Text
                style={[tw`font-mono text-xs leading-5`, { color: "#1e293b" }]}
              >
                {logs}
              </Text>
            </View>
          ) : (
            <View
              style={tw`bg-white rounded-lg p-4 border border-gray-200 items-center justify-center py-8`}
            >
              <MaterialCommunityIcons
                name="file-document-outline"
                size={48}
                color="#94a3b8"
              />
              <Text style={[tw`text-gray-500 mt-2`, typography.body]}>
                No authentication logs found
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
