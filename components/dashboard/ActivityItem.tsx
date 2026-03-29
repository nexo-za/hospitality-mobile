import React, { ReactNode } from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { Avatar } from "../base/Avatar";
import { Badge } from "../base/Badge";

interface ActivityItemProps {
  title: string;
  subtitle: string | ReactNode;
  timestamp: string;
  status?: {
    label: string;
    variant: "success" | "warning" | "error" | "info";
  };
  avatar?: {
    image?: { uri: string };
    initials?: string;
  };
  icon?: {
    name: keyof typeof Ionicons.glyphMap;
    color: string;
    backgroundColor: string;
  };
  onPress?: () => void;
}

export function ActivityItem({
  title,
  subtitle,
  timestamp,
  status,
  avatar,
  icon,
  onPress,
}: ActivityItemProps) {
  const content = (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 16,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        {avatar ? (
          <Avatar
            size="medium"
            source={avatar.image}
            initials={avatar.initials}
            style={{ marginRight: 12 }}
          />
        ) : icon ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: icon.backgroundColor,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={icon.name} size={20} color={icon.color} />
          </View>
        ) : null}
        <View style={{ flex: 1, marginRight: 16 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 4,
            }}
          >
            <Text
              variant="semibold"
              style={{ fontSize: 14, marginRight: 8 }}
              numberOfLines={1}
            >
              {title}
            </Text>
            {status && (
              <Badge
                label={status.label}
                variant={status.variant}
                size="small"
              />
            )}
          </View>
          <Text style={{ fontSize: 14, opacity: 0.6 }} numberOfLines={2}>
            {subtitle}
          </Text>
        </View>
        <Text style={{ fontSize: 12, opacity: 0.5 }}>{timestamp}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={{ backgroundColor: "#FFFFFF" }}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}
