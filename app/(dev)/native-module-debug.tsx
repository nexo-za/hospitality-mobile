import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeModules,
  Platform,
} from "react-native";
import { Stack } from "expo-router";
import {
  logAvailableNativeModules,
  findModulesByNamePattern,
} from "../../utils/NativeModuleDebug";

import { getEcentricConfig } from "../../config/appConfig";
import { useAuth } from "../../contexts/AuthContext";
import storage from "../../utils/storage";
import { getAuthStatus } from "../../utils/api";

/**
 * Screen to debug native modules, particularly the Ecentric payment module
 */
export default function NativeModuleDebugScreen() {
  const [moduleInfo, setModuleInfo] = useState<
    { name: string; methods: string[] }[]
  >([]);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  // Add a log entry
  const addLog = (message: string) => {
    setDebugLogs((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  // Initialize with module list
  useEffect(() => {
    loadModuleInfo();
  }, []);

  // Load module information
  const loadModuleInfo = () => {
    addLog("Loading native module information...");
    try {
      // Get all module names
      const moduleNames = Object.keys(NativeModules);
      addLog(`Found ${moduleNames.length} native modules`);

      // Map modules to info objects
      const modules = moduleNames.map((name) => {
        const module = NativeModules[name];
        const methods = Object.getOwnPropertyNames(module).filter(
          (prop) => typeof module[prop] === "function"
        );

        return { name, methods };
      });

      setModuleInfo(modules);

      // Check if our target module exists
      const hasEcentric = moduleNames.includes("EcentricPaymentModule");
      addLog(`EcentricPaymentModule exists: ${hasEcentric ? "YES" : "NO"}`);

      // Search for similar modules
      const ecentricPattern = moduleNames.filter((name) =>
        /ecentric|payment/i.test(name)
      );
      if (ecentricPattern.length > 0) {
        addLog(
          `Found ${
            ecentricPattern.length
          } similar modules: ${ecentricPattern.join(", ")}`
        );
      } else {
        addLog("No modules with similar names found");
      }
    } catch (error) {
      addLog(`Error loading module info: ${(error as Error).message}`);
    }
  };

 
  // Test API authentication
  const testApiAuth = async () => {
    addLog("Testing API authentication...");
    try {
      const { testApiAuth: testAuth } = useAuth();
      const isAuthenticated = await testAuth();
      addLog(`API authentication test result: ${isAuthenticated ? "SUCCESS" : "FAILED"}`);
    } catch (error) {
      addLog(`API auth test error: ${(error as Error).message}`);
    }
  };

  // Check current access token
  const checkAccessToken = async () => {
    addLog("Checking current access token...");
    try {
      const accessToken = await storage.getItem("access_token", false);
      if (accessToken) {
        addLog(`Access token found: ${accessToken.substring(0, 20)}...`);
        addLog(`Token length: ${accessToken.length} characters`);
      } else {
        addLog("No access token found in storage");
      }
      
      // Also check the current API client auth status
      const authStatus = getAuthStatus();
      addLog(`API Client Auth Status: ${JSON.stringify(authStatus)}`);
    } catch (error) {
      addLog(`Token check error: ${(error as Error).message}`);
    }
  };

  // Run full diagnostics
  const runDiagnostics = () => {
    addLog("Running full diagnostics...");
    try {
      const captureLogs: string[] = [];

      // Override console.log temporarily to capture output
      const originalLog = console.log;
      console.log = (...args) => {
        originalLog(...args);
        captureLogs.push(
          args
            .map((arg) =>
              typeof arg === "object" ? JSON.stringify(arg) : String(arg)
            )
            .join(" ")
        );
      };

      // Run diagnostics
      logAvailableNativeModules();
      findModulesByNamePattern("ecentric");
      findModulesByNamePattern("payment");

      // Restore console.log
      console.log = originalLog;

      // Add captured logs
      captureLogs.forEach((log) => addLog(log));
    } catch (error) {
      addLog(`Diagnostics error: ${(error as Error).message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Native Module Debugger" }} />

      <ScrollView style={styles.scrollView}>
        <Text style={styles.header}>Native Module Debug</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={loadModuleInfo}>
            <Text style={styles.buttonText}>Refresh Modules</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={testApiAuth}>
            <Text style={styles.buttonText}>Test API Auth</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={checkAccessToken}>
            <Text style={styles.buttonText}>Check Token</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={runDiagnostics}>
            <Text style={styles.buttonText}>Full Diagnostics</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Logs:</Text>
        <View style={styles.logsContainer}>
          {debugLogs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
        </View>

        <Text style={styles.sectionHeader}>All Modules:</Text>
        {moduleInfo.map((module, index) => (
          <View key={index} style={styles.moduleContainer}>
            <Text style={styles.moduleName}>{module.name}</Text>
            {module.methods.length > 0 ? (
              <Text style={styles.methodText}>
                Methods: {module.methods.join(", ")}
              </Text>
            ) : (
              <Text style={styles.noMethodsText}>No methods found</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 8,
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  moduleContainer: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#3498db",
  },
  moduleName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  methodText: {
    fontSize: 14,
    color: "#555",
  },
  noMethodsText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  logsContainer: {
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 8,
  },
  logText: {
    fontSize: 12,
    color: "#eee",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    marginBottom: 4,
  },
});
