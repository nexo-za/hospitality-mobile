import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Modal,
  TextInput,
  RefreshControl,
  SafeAreaView,
  FlatList,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import DebugStaffSessions from "@/components/staff/DebugStaffSessions";
import PinModal from "@/components/PinModal";
import logManager, { LogEntry } from "@/utils/LogManager";
import * as Clipboard from "expo-clipboard";
import fsManager from "@/utils/FSManager";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

// New inline modal component for debug logs
const DebugLogsModal = ({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      loadLogs();
    }
  }, [visible, filter, searchText]);

  const loadLogs = () => {
    try {
      let filteredLogs = logManager.getLogs();

      // Apply filter
      if (filter !== "all") {
        if (filter === "ecentric") {
          filteredLogs = filteredLogs.filter((log) =>
            log.tag.toLowerCase().includes("ecentric")
          );
        } else {
          filteredLogs = filteredLogs.filter((log) => log.level === filter);
        }
      }

      // Apply search
      if (searchText) {
        const search = searchText.toLowerCase();
        filteredLogs = filteredLogs.filter(
          (log) =>
            log.message.toLowerCase().includes(search) ||
            log.tag.toLowerCase().includes(search) ||
            (log.data &&
              JSON.stringify(log.data).toLowerCase().includes(search))
        );
      }

      setLogs(filteredLogs);
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs();
    setRefreshing(false);
  };

  const clearLogs = () => {
    Alert.alert("Clear Logs", "Are you sure you want to clear all logs?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await logManager.clearLogs();
          loadLogs();
        },
      },
    ]);
  };

  const renderLogItem = ({
    item,
    index,
  }: {
    item: LogEntry;
    index: number;
  }) => {
    const date = new Date(item.timestamp);
    const formattedTime = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

    let levelColor = "#333";
    if (item.level === "info") levelColor = "#0066cc";
    if (item.level === "warn") levelColor = "#ff9900";
    if (item.level === "error") levelColor = "#cc0000";
    if (item.level === "debug") levelColor = "#669900";

    return (
      <View
        style={{
          padding: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#eee",
          backgroundColor: "#fff",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: "#666",
            marginBottom: 4,
          }}
        >
          {formattedTime}
        </Text>
        <View
          style={{
            flexDirection: "row",
            marginBottom: 4,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontWeight: "bold",
              marginRight: 8,
              color: levelColor,
            }}
          >
            {item.level.toUpperCase()}
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: "#333",
              fontWeight: "500",
            }}
          >
            [{item.tag}]
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            color: "#333",
            marginBottom: 4,
          }}
        >
          {item.message}
        </Text>
        {item.data && (
          <View
            style={{
              padding: 8,
              backgroundColor: "#f5f5f5",
              borderRadius: 4,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              }}
            >
              {JSON.stringify(item.data, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#f8f8f8" }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#ddd",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>Debug Logs</Text>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View
          style={{
            padding: 10,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#ddd",
          }}
        >
          <TextInput
            style={{
              backgroundColor: "#f0f0f0",
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              marginBottom: 10,
            }}
            placeholder="Search logs..."
            value={searchText}
            onChangeText={setSearchText}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {["all", "info", "warn", "error", "debug", "ecentric"].map(
              (filterType) => (
                <TouchableOpacity
                  key={filterType}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 16,
                    marginRight: 8,
                    backgroundColor:
                      filter === filterType ? "#0066cc" : "#f0f0f0",
                  }}
                  onPress={() => setFilter(filterType)}
                >
                  <Text
                    style={{
                      color: filter === filterType ? "#fff" : "#333",
                    }}
                  >
                    {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                  </Text>
                </TouchableOpacity>
              )
            )}
          </ScrollView>
        </View>

        <View
          style={{
            flexDirection: "row",
            padding: 10,
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#ddd",
          }}
        >
          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: "#0066cc",
              marginRight: 10,
            }}
            onPress={clearLogs}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: "#0066cc",
              marginRight: 10,
            }}
            onPress={async () => {
              const logsText = logManager.exportLogs();
              await Clipboard.setStringAsync(logsText);
              Alert.alert("Success", "Logs copied to clipboard");
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Copy</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: "#0066cc",
              marginRight: 10,
            }}
            onPress={async () => {
              const logsText = logManager.exportLogs();
              await Share.share({
                message: logsText,
                title: "Debug Logs",
              });
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Share</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={logs}
          renderItem={renderLogItem}
          keyExtractor={(item, index) => `log-${index}-${item.timestamp}`}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <Text
              style={{
                padding: 20,
                textAlign: "center",
                color: "#666",
              }}
            >
              No logs found
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />

        <View
          style={{
            padding: 10,
            borderTopWidth: 1,
            borderTopColor: "#ddd",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ color: "#666", fontSize: 12 }}>
            {logs.length} {logs.length === 1 ? "log" : "logs"} displayed
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default function ProfileScreen() {
  const { styles } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await logout();
          } catch (error) {
            console.error("Logout failed:", error);
            Alert.alert("Error", "Failed to logout. Please try again.");
          }
        },
      },
    ]);
  };


  const handleTestPrinter = async () => {
    Alert.alert("Printer Test", "Starting Sunmi printer test...");
    console.log("[TEST] Starting Sunmi printer test");

    try {
      // Try direct printer first (dynamic import to avoid loading at startup)
      const { default: SunmiDirectPrinterService } = await import("@/utils/SunmiDirectPrinter");
      const directPrinterService = SunmiDirectPrinterService.getInstance();
      const isDirectAvailable = await directPrinterService.isPrinterAvailable();
      console.log("[TEST] Direct printer available:", isDirectAvailable);

      if (isDirectAvailable) {
        try {
          await directPrinterService.printTestReceipt();
          Alert.alert(
            "Printer Test",
            "Test print completed successfully using direct Sunmi printer implementation!"
          );
          return;
        } catch (directError: any) {
          console.error("[TEST] Direct printer test error:", directError);
        }
      } else {
        console.log("[TEST] Direct Sunmi printer is not available, trying legacy method");
      }

      // Fallback to legacy printer (dynamic import; may not be supported on bridgeless)
      const { default: SunmiPrinterService } = await import("@/utils/SunmiPrinter");
      const printerService = SunmiPrinterService.getInstance();

      if (!printerService.isModuleAvailable()) {
        console.error("[TEST] Sunmi printer native module is not available");
        Alert.alert(
          "Printer Not Available",
          "The Sunmi printer module is not available on this device. This could be because:\n\n" +
            "1. You're not using a Sunmi device with built-in printer\n" +
            "2. The printer module is not properly linked\n" +
            "3. Your app build doesn't include the printer library\n\n" +
            "You can continue using the app, but printing features will not work."
        );
        return;
      }

      await printerService.printTestReceipt();
      Alert.alert("Printer Test", "Test print completed successfully!");
    } catch (error: any) {
      console.error("[TEST] Sunmi printer test error:", error);

      const errorMessage = `Failed to print: ${error.message}`;
      let troubleshooting = "";

      if (error.message?.includes("not available")) {
        troubleshooting =
          "\n\nThis is likely a native module linking issue. The app can't find the Sunmi printer native code. We've tried both direct and indirect methods.";
      } else if (error.message?.includes("not ready")) {
        troubleshooting =
          "\n\nThe printer hardware was detected but isn't ready. Check if:\n- Paper is loaded correctly\n- Printer door is closed\n- Printer has power";
      }

      Alert.alert("Printer Error", errorMessage + troubleshooting + "\n\nCheck the developer console for more details.");
    }
  };

  // PIN success handler - now shows logs modal directly
  const handlePinSuccess = () => {
    setShowPinModal(false);
    setShowLogsModal(true);
  };

  // Handle notifications section click
  const handleNotifications = () => {
    // This function can handle regular notifications in the future
    Alert.alert("Notifications", "Choose an option:", [
      { text: "Cancel", style: "cancel" },
      { text: "Debug Logs", onPress: () => setShowPinModal(true) },
    ]);
  };

  const profileActions = [
    {
      title: "Account Settings",
      icon: "account-cog" as IconName,
      onPress: () => router.push("/(account)/settings"),
    },
    {
      title: "Notifications",
      icon: "bell" as IconName,
      onPress: handleNotifications,
    },
    {
      title: "Help & Support",
      icon: "help-circle" as IconName,
      onPress: () => {},
    },
    {
      title: "About",
      icon: "information" as IconName,
      onPress: () => router.push("/(account)/about"),
    },
    {
      title: "Developer Tools",
      icon: "dev-to" as IconName,
      onPress: () => router.push("/(dev)"),
    },
  ];

  // Display name formatting helper
  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.username || "User";
  };

  return (
    <Screen>
      {/* PIN Modal */}
      <PinModal
        visible={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handlePinSuccess}
      />

      {/* Debug Logs Modal */}
      <DebugLogsModal
        visible={showLogsModal}
        onClose={() => setShowLogsModal(false)}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 32,
            alignItems: "center",
          }}
        >
          <View
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              backgroundColor: "#f0f9ff",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <MaterialCommunityIcons name="account" size={48} color="#0ea5e9" />
          </View>
          <Text variant="bold" style={{ fontSize: 24, marginBottom: 4 }}>
            {getDisplayName()}
          </Text>
          <Text style={{ opacity: 0.6, marginBottom: 4 }}>{user?.email}</Text>
          {user?.position && (
            <Text style={{ opacity: 0.5, marginBottom: 8, fontSize: 12 }}>
              {user.position}
            </Text>
          )}
          <View
            style={{
              backgroundColor: "#f0f9ff",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              marginBottom: 8,
            }}
          >
            <Text style={{ color: "#0ea5e9" }}>{user?.role || "Staff"}</Text>
          </View>
          {user?.employeeId && (
            <Text style={{ fontSize: 12, opacity: 0.5 }}>
              ID: {user.employeeId}
            </Text>
          )}
        </View>

        {/* User Details Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderColor: "#E0E0E0",
              borderWidth: 1,
              padding: 16,
            }}
          >
            <Text variant="bold" style={{ fontSize: 16, marginBottom: 12 }}>
              Personal Information
            </Text>
            
            {/* Contact Number */}
            {user?.contactNumber && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
                  Contact Number
                </Text>
                <Text style={{ fontSize: 14 }}>{user.contactNumber}</Text>
              </View>
            )}

            {/* Organization */}
            {user?.organizationName && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
                  Organization
                </Text>
                <Text style={{ fontSize: 14 }}>{user.organizationName}</Text>
              </View>
            )}

            {/* Region */}
            {user?.regionName && (
              <View style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
                  Region
                </Text>
                <Text style={{ fontSize: 14 }}>{user.regionName}</Text>
              </View>
            )}

            {/* Store */}
            {user?.storeName && (
              <View>
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 2 }}>
                  Store
                </Text>
                <Text style={{ fontSize: 14 }}>{user.storeName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Profile Actions */}
        <View style={{ paddingHorizontal: 20 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderColor: "#E0E0E0",
              borderWidth: 1,
              overflow: "hidden",
            }}
          >
            {profileActions.map((action, index) => (
              <React.Fragment key={index}>
                <TouchableOpacity
                  onPress={action.onPress}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                  }}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      backgroundColor: "#f0f9ff",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 16,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={action.icon}
                      size={22}
                      color="#0ea5e9"
                    />
                  </View>
                  <Text variant="medium" style={{ flex: 1 }}>
                    {action.title}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color="#D0D0D0"
                  />
                </TouchableOpacity>
                {index !== profileActions.length - 1 && (
                  <View
                    style={{
                      height: 1,
                      marginLeft: 72,
                      backgroundColor: "#E0E0E0",
                    }}
                  />
                )}
              </React.Fragment>
            ))}
          </View>

          {/* Printer Test Button */}
          {/* <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 16,
              borderColor: "#E0E0E0",
              borderWidth: 1,
              overflow: "hidden",
              marginTop: 16,
            }}
          >
            <TouchableOpacity
              onPress={handleTestPrinter}
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 16,
                backgroundColor: "#f0fdf4", // Light green background
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  backgroundColor: "#dcfce7", // Green accent background
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 16,
                }}
              >
                <MaterialCommunityIcons
                  name="printer"
                  size={22}
                  color="#16a34a" // Green icon
                />
              </View>
              <Text variant="medium" style={{ flex: 1, color: "#16a34a" }}>
                Test Sunmi Printer
              </Text>
            </TouchableOpacity>
          </View> */}
          {/* <DebugStaffSessions /> */}

          {/* Logout Button */}
          <TouchableOpacity
            onPress={handleLogout}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FEE2E2",
              padding: 16,
              borderRadius: 16,
              marginTop: 20,
            }}
          >
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FEF2F2",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
            </View>
            <Text
              variant="semibold"
              style={{ fontSize: 16, flex: 1, color: "#EF4444" }}
            >
              Logout
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#EF4444"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
