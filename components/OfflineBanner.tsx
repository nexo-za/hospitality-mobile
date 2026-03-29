import React, { useState, useEffect } from "react";
import { View, StyleSheet, Animated, TouchableOpacity } from "react-native";
import { Text as GeistText } from "@/components/Text";
import networkManager from "@/utils/networkManager";
import { Ionicons } from "@expo/vector-icons";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";

interface OfflineBannerProps {
  onRetry?: () => void;
  showSyncStatus?: boolean;
  style?: any;
}

export function OfflineBanner({
  onRetry,
  showSyncStatus = true,
  style,
}: OfflineBannerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(-100)).current;
  const expandAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Get initial network state
    setIsOnline(networkManager.getIsOnline());

    // Get initial pending sync count
    if (showSyncStatus) {
      networkManager.getPendingSyncCount().then(setPendingSyncCount);
    }

    // Subscribe to network changes
    const unsubscribe = networkManager.addListener((online: boolean) => {
      setIsOnline(online);

      // Animate the banner
      Animated.spring(slideAnim, {
        toValue: online ? -100 : 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    });

    // Update pending sync count periodically
    if (showSyncStatus) {
      const syncInterval = setInterval(async () => {
        const count = await networkManager.getPendingSyncCount();
        setPendingSyncCount(count);
      }, 5000);

      return () => {
        unsubscribe();
        clearInterval(syncInterval);
      };
    }

    return unsubscribe;
  }, [slideAnim, showSyncStatus]);

  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default retry behavior - trigger sync
      await networkManager.syncOfflineData();
    }
  };

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);

    Animated.spring(expandAnim, {
      toValue: newExpanded ? 1 : 0,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  // Don't show if online
  if (isOnline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
        },
        style,
      ]}
    >
      <View style={styles.banner}>
        <View style={styles.mainContent}>
          <Ionicons
            name="wifi-outline"
            size={20}
            color="#ffffff"
            style={styles.icon}
          />
          <View style={styles.textContainer}>
            <GeistText style={[styles.title, typography.bodyBold]}>
              No Internet Connection
            </GeistText>
            <GeistText style={[styles.subtitle, typography.body]}>
              You're working offline
            </GeistText>
          </View>

          {showSyncStatus && pendingSyncCount > 0 && (
            <View style={styles.syncBadge}>
              <GeistText style={[styles.syncText, typography.caption]}>
                {pendingSyncCount}
              </GeistText>
            </View>
          )}

          <TouchableOpacity
            onPress={toggleExpanded}
            style={styles.expandButton}
          >
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#ffffff"
            />
          </TouchableOpacity>
        </View>

        <Animated.View
          style={[
            styles.expandedContent,
            {
              maxHeight: expandAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 100],
              }),
              opacity: expandAnim,
            },
          ]}
        >
          <View style={styles.expandedInner}>
            {showSyncStatus && (
              <GeistText style={[styles.expandedText, typography.body]}>
                {pendingSyncCount > 0
                  ? `${pendingSyncCount} items waiting to sync when you're back online`
                  : "All data is up to date"}
              </GeistText>
            )}

            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Ionicons name="refresh" size={16} color="#3b82f6" />
              <GeistText style={[styles.retryText, typography.bodyBold]}>
                Retry
              </GeistText>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
  },
  banner: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mainContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
  },
  subtitle: {
    color: "#fecaca",
    fontSize: 14,
    marginTop: 2,
  },
  syncBadge: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  syncText: {
    color: "#ef4444",
    fontWeight: "bold",
  },
  expandButton: {
    padding: 4,
  },
  expandedContent: {
    overflow: "hidden",
    marginTop: 8,
  },
  expandedInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.2)",
  },
  expandedText: {
    color: "#fecaca",
    flex: 1,
    marginRight: 12,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  retryText: {
    color: "#3b82f6",
    marginLeft: 4,
  },
});
