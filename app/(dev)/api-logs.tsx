import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Text as GeistText } from "@/components/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import ApiLogger, { ApiLogEntry } from "@/api/utils/logger";

const REQUEST_COLOR = "#22c55e"; // Green
const RESPONSE_COLOR = "#0ea5e9"; // Blue
const ERROR_COLOR = "#ef4444"; // Red
const CACHE_COLOR = "#f59e0b"; // Yellow

export default function ApiLogsScreen() {
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = () => {
    const logger = ApiLogger.getInstance();
    let filteredLogs = logger.getLogs();
    
    if (filter) {
      filteredLogs = filteredLogs.filter((log) => 
        log.endpoint.toLowerCase().includes(filter.toLowerCase()) ||
        (log.service && log.service.toLowerCase().includes(filter.toLowerCase()))
      );
    }
    
    setLogs(filteredLogs);
    setLoading(false);
    setRefreshing(false);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const clearLogs = () => {
    ApiLogger.getInstance().clearLogs();
    setLogs([]);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "REQUEST":
        return REQUEST_COLOR;
      case "RESPONSE":
        return RESPONSE_COLOR;
      case "ERROR":
        return ERROR_COLOR;
      case "CACHE":
        return CACHE_COLOR;
      default:
        return "#6b7280"; // Gray
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const renderLogItem = (log: ApiLogEntry, index: number) => {
    const color = getTypeColor(log.type);
    
    return (
      <View 
        key={index} 
        style={[
          tw`p-3 border-b border-gray-100`,
          index % 2 === 0 ? tw`bg-white` : tw`bg-gray-50`
        ]}
      >
        <View style={tw`flex-row justify-between items-center`}>
          <View style={tw`flex-row items-center`}>
            <View style={[styles.dot, { backgroundColor: color }]} />
            <GeistText style={[tw`font-bold text-gray-900`, typography.bodyMedium]}>
              {log.method} {log.endpoint}
            </GeistText>
          </View>
          <GeistText style={[tw`text-gray-500 text-xs`, typography.body]}>
            {formatTime(log.timestamp)}
          </GeistText>
        </View>
        
        {log.service && (
          <GeistText style={[tw`text-gray-600 text-xs mt-1 ml-4`, typography.body]}>
            Service: {log.service}
          </GeistText>
        )}
        
        {log.status && (
          <GeistText 
            style={[
              tw`text-xs mt-1 ml-4`,
              log.status >= 400 ? tw`text-red-600` : tw`text-green-600`,
              typography.body
            ]}
          >
            Status: {log.status}
          </GeistText>
        )}
        
        {(log.params || log.data) && (
          <TouchableOpacity
            style={tw`mt-2 ml-4 p-2 bg-gray-100 rounded-md`}
            onPress={() => {
              console.log("Log details:", log.params || log.data);
            }}
          >
            <GeistText
              style={[tw`text-gray-600 text-xs`, typography.body]}
              numberOfLines={2}
            >
              {JSON.stringify(log.params || log.data).substring(0, 100)}
              {JSON.stringify(log.params || log.data).length > 100 ? "..." : ""}
            </GeistText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`p-4 bg-white border-b border-gray-100`}>
        <View style={tw`flex-row justify-between items-center`}>
          <GeistText style={[tw`text-gray-900`, typography.h1]}>API Logs</GeistText>
          <TouchableOpacity
            style={tw`bg-red-600 px-4 py-2 rounded-xl`}
            onPress={clearLogs}
          >
            <GeistText style={[tw`text-white`, typography.bodyMedium]}>
              Clear Logs
            </GeistText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filters */}
      <View style={tw`flex-row justify-around p-2 bg-white border-b border-gray-100`}>
        <TouchableOpacity
          style={[
            tw`px-3 py-1 rounded-full`,
            !filter ? tw`bg-gray-800` : tw`bg-gray-200`
          ]}
          onPress={() => {
            setFilter(null);
            setLoading(true);
            setTimeout(loadLogs, 100);
          }}
        >
          <GeistText
            style={[
              !filter ? tw`text-white` : tw`text-gray-600`,
              typography.bodyMedium
            ]}
          >
            All
          </GeistText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            tw`px-3 py-1 rounded-full`,
            filter === "customer" ? tw`bg-gray-800` : tw`bg-gray-200`
          ]}
          onPress={() => {
            setFilter("customer");
            setLoading(true);
            setTimeout(loadLogs, 100);
          }}
        >
          <GeistText
            style={[
              filter === "customer" ? tw`text-white` : tw`text-gray-600`,
              typography.bodyMedium
            ]}
          >
            Customers
          </GeistText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            tw`px-3 py-1 rounded-full`,
            filter === "product" ? tw`bg-gray-800` : tw`bg-gray-200`
          ]}
          onPress={() => {
            setFilter("product");
            setLoading(true);
            setTimeout(loadLogs, 100);
          }}
        >
          <GeistText
            style={[
              filter === "product" ? tw`text-white` : tw`text-gray-600`,
              typography.bodyMedium
            ]}
          >
            Products
          </GeistText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            tw`px-3 py-1 rounded-full`,
            filter === "sales" ? tw`bg-gray-800` : tw`bg-gray-200`
          ]}
          onPress={() => {
            setFilter("sales");
            setLoading(true);
            setTimeout(loadLogs, 100);
          }}
        >
          <GeistText
            style={[
              filter === "sales" ? tw`text-white` : tw`text-gray-600`,
              typography.bodyMedium
            ]}
          >
            Sales
          </GeistText>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      ) : logs.length === 0 ? (
        <View style={tw`flex-1 justify-center items-center p-4`}>
          <MaterialCommunityIcons name="text-box-outline" size={64} color="#9ca3af" />
          <GeistText style={[tw`text-gray-500 mt-4 text-center`, typography.body]}>
            No API logs found.{filter ? " Try removing filters." : ""}
          </GeistText>
        </View>
      ) : (
        <ScrollView
          style={tw`flex-1`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {logs.map(renderLogItem)}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
}); 