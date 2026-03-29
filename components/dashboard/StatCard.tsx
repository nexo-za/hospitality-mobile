import React, { ReactNode } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import { typography } from "@/styles/typography";

interface StatCardProps {
  title: string;
  value: string | ReactNode;
  icon: {
    name: keyof typeof Ionicons.glyphMap;
    color: string;
    backgroundColor: string;
  };
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        padding: 20,
        borderColor: "#E0E0E0",
        borderWidth: 1,
        minHeight: 140,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: icon.backgroundColor,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Ionicons name={icon.name} size={20} color={icon.color} />
      </View>
      <GeistText
        style={[
          {
            marginBottom: 8,
            opacity: 0.7,
          },
          typography.body,
        ]}
      >
        {title}
      </GeistText>
      <GeistText
        style={[
          {
            fontSize: 28,
          },
          typography.h1,
        ]}
      >
        {value}
      </GeistText>
    </View>
  );
}
