import React, { useState, useEffect } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Badge } from "@/components/base/Badge";
import networkManager from "@/utils/networkManager";
import { Ionicons } from "@expo/vector-icons";
import tw from "@/styles/tailwind";

interface OfflineIndicatorProps {
  showWhenOnline?: boolean; // For debugging - show indicator even when online
}

export function OfflineIndicator({
  showWhenOnline = false,
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const slideAnim = React.useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    // Get initial network state
    setIsOnline(networkManager.getIsOnline());

    // Get initial pending sync count
    networkManager.getPendingSyncCount().then(setPendingSyncCount);

    // Subscribe to network changes
    const unsubscribe = networkManager.addListener((online: boolean) => {
      setIsOnline(online);

      // Animate the indicator
      Animated.spring(slideAnim, {
        toValue: !online || showWhenOnline ? 0 : -50,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    });

    // Update pending sync count periodically
    const syncInterval = setInterval(async () => {
      const count = await networkManager.getPendingSyncCount();
      setPendingSyncCount(count);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(syncInterval);
    };
  }, [slideAnim, showWhenOnline]);

  // Don't show if online and not in debug mode
  if (isOnline && !showWhenOnline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.indicator}>
        <Ionicons
          name="wifi-outline"
          size={16}
          color={isOnline ? "#10b981" : "#ef4444"}
          style={styles.icon}
        />
        <Badge
          variant={isOnline ? "success" : "error"}
          size="small"
          label={isOnline ? "Online" : "Offline"}
        />
        {!isOnline && pendingSyncCount > 0 && (
          <Badge
            variant="warning"
            size="small"
            label={`${pendingSyncCount} pending`}
            style={styles.syncBadge}
          />
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: "center",
    paddingTop: 10,
  },
  indicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  icon: {
    marginRight: 6,
  },
  syncBadge: {
    marginLeft: 6,
  },
});
