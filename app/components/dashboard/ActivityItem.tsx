import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";

interface ActivityItemProps {
  title: string;
  subtitle: string | React.ReactNode;
  timestamp: string;
  status?: {
    label: string;
    variant: "success" | "warning" | "error";
  };
  icon?: {
    name: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
    backgroundColor: string;
  };
  avatar?: {
    initials: string;
  };
}

export function ActivityItem({
  title,
  subtitle,
  timestamp,
  status,
  icon,
  avatar,
}: ActivityItemProps) {
  return (
    <View style={tw`p-4 flex-row items-center`}>
      {icon ? (
        <View
          style={[
            tw`p-2 rounded-lg mr-3`,
            { backgroundColor: icon.backgroundColor },
          ]}
        >
          <MaterialCommunityIcons
            name={icon.name}
            size={20}
            color={icon.color}
          />
        </View>
      ) : avatar ? (
        <View
          style={tw`w-10 h-10 rounded-full bg-blue-100 items-center justify-center mr-3`}
        >
          <Text
            style={[tw`text-blue-600 font-semibold`, typography.bodyMedium]}
          >
            {avatar.initials}
          </Text>
        </View>
      ) : null}

      <View style={tw`flex-1`}>
        <Text style={[tw`text-gray-900 font-medium`, typography.bodyMedium]}>
          {title}
        </Text>
        <View style={tw`flex-row items-center justify-between`}>
          <Text style={[tw`text-gray-500 text-sm`, typography.body]}>
            {subtitle}
          </Text>
          <Text style={[tw`text-gray-400 text-xs`, typography.body]}>
            {timestamp}
          </Text>
        </View>
        {status && (
          <View
            style={[
              tw`mt-1 px-2 py-0.5 rounded-full self-start`,
              status.variant === "success"
                ? tw`bg-green-100`
                : status.variant === "warning"
                ? tw`bg-yellow-100`
                : tw`bg-red-100`,
            ]}
          >
            <Text
              style={[
                tw`text-xs font-medium`,
                status.variant === "success"
                  ? tw`text-green-700`
                  : status.variant === "warning"
                  ? tw`text-yellow-700`
                  : tw`text-red-700`,
                typography.smallMedium,
              ]}
            >
              {status.label}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default ActivityItem;
