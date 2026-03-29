import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import api from "@/api/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getApiConfig } from "../../config/appConfig";

export default function ApiDebugScreen() {
  const [apiUrl, setApiUrl] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<"success" | "error" | null>(
    null
  );

  useEffect(() => {
    loadCurrentValues();
  }, []);

  const loadCurrentValues = async () => {
    try {
      setLoading(true);
      const config = getApiConfig();
      setApiUrl(config.url || "");

      const authHeader = api.defaults.headers.common["Authorization"];
      setHasToken(
        typeof authHeader === "string" && authHeader.startsWith("Bearer ")
      );
    } catch (error) {
      console.error("Error loading values:", error);
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      setTestResult(null);
      setTestStatus(null);

      const response = await api.get("/health");

      setTestResult(
        `Connection successful! Status: ${response.status}\n\nResponse: ${JSON.stringify(response.data, null, 2)}`
      );
      setTestStatus("success");
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;
      setTestResult(
        `Connection failed! Status: ${status || "Unknown"}\nError: ${error.message}${data ? `\n\nResponse: ${JSON.stringify(data, null, 2)}` : ""}`
      );
      setTestStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const clearTokens = async () => {
    try {
      setLoading(true);
      await SecureStore.deleteItemAsync("auth_token");
      await AsyncStorage.removeItem("api_token");
      delete api.defaults.headers.common["Authorization"];
      setHasToken(false);
      setTestResult("All tokens cleared.");
      setTestStatus("success");
    } catch (error) {
      console.error("Error clearing tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`p-4`}>
        <GeistText style={[tw`text-gray-800 mb-4`, typography.h2]}>
          API Debug
        </GeistText>

        <View style={tw`bg-white p-4 rounded-xl mb-4`}>
          <GeistText style={[tw`text-gray-700 mb-2`, typography.bodyBold]}>
            API URL
          </GeistText>
          <GeistText style={[tw`text-gray-500 mb-4`, typography.body]}>
            {apiUrl || "Not configured"}
          </GeistText>

          <GeistText style={[tw`text-gray-700 mb-2`, typography.bodyBold]}>
            JWT Token Status
          </GeistText>
          <View style={tw`flex-row items-center mb-4`}>
            <MaterialCommunityIcons
              name={hasToken ? "check-circle" : "close-circle"}
              size={20}
              color={hasToken ? "#22c55e" : "#ef4444"}
            />
            <GeistText
              style={[
                tw`ml-2 ${hasToken ? "text-green-600" : "text-red-500"}`,
                typography.body,
              ]}
            >
              {hasToken ? "Bearer token present" : "No token set"}
            </GeistText>
          </View>
        </View>

        <View style={tw`flex-row space-x-2 mb-6`}>
          <TouchableOpacity
            style={tw`flex-1 bg-green-600 rounded-xl py-3 items-center`}
            onPress={testConnection}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={tw`flex-row items-center`}>
                <MaterialCommunityIcons name="api" size={20} color="#fff" />
                <GeistText style={[tw`text-white ml-2`, typography.bodyBold]}>
                  Test Connection
                </GeistText>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`flex-1 bg-red-600 rounded-xl py-3 items-center`}
            onPress={clearTokens}
            disabled={loading}
          >
            <GeistText style={[tw`text-white`, typography.bodyBold]}>
              Clear Tokens
            </GeistText>
          </TouchableOpacity>
        </View>

        {testResult && (
          <View
            style={[
              tw`p-4 rounded-xl mb-4`,
              testStatus === "success" ? tw`bg-green-50` : tw`bg-red-50`,
            ]}
          >
            <GeistText
              style={[
                testStatus === "success"
                  ? tw`text-green-700`
                  : tw`text-red-700`,
                typography.body,
              ]}
            >
              {testResult}
            </GeistText>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
