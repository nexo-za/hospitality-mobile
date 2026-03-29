import React, { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import tw from "@/styles/tailwind";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  style?: object;
}

export function ChartCard({
  title,
  subtitle,
  children,
  style,
}: ChartCardProps) {
  return (
    <View
      style={[
        tw`bg-white rounded-lg border border-gray-200 overflow-hidden`,
        style,
      ]}
    >
      <View style={tw`p-4 border-b border-gray-200`}>
        <Text variant="semibold" style={tw`text-lg`}>
          {title}
        </Text>
        {subtitle && <Text style={tw`text-gray-500 mt-1`}>{subtitle}</Text>}
      </View>
      <View style={tw`p-2`}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
    marginBottom: 16,
  },
  headerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 14,
    color: "#757575",
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
});
