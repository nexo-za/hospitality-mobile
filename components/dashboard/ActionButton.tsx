import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";

interface ActionButtonProps {
  label: string;
  icon: {
    name: keyof typeof Ionicons.glyphMap;
    color: string;
    backgroundColor: string;
  };
  onPress: () => void;
}

export function ActionButton({ label, icon, onPress }: ActionButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        minWidth: 140,
        maxWidth: 160,
      }}
      activeOpacity={0.8}
    >
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          padding: 20,
          borderColor: "#E0E0E0",
          borderWidth: 1,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            backgroundColor: icon.backgroundColor,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Ionicons name={icon.name} size={28} color={icon.color} />
        </View>
        <Text
          variant="semibold"
          style={{
            fontSize: 16,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
