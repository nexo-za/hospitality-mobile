import React from "react";
import { View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";

interface StatCardProps {
  title: string;
  value: string | React.ReactNode;
  icon: {
    name: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
    backgroundColor: string;
  };
}

export function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <View style={tw`bg-white rounded-xl p-4 border border-gray-100`}>
      <View style={tw`flex-row justify-between items-start mb-2`}>
        <Text style={[tw`text-gray-500 text-sm`, typography.body]}>
          {title}
        </Text>
        <View
          style={[
            tw`p-2 rounded-lg`,
            { backgroundColor: icon.backgroundColor },
          ]}
        >
          <MaterialCommunityIcons
            name={icon.name}
            size={20}
            color={icon.color}
          />
        </View>
      </View>
      <Text style={[tw`text-gray-900 text-xl font-semibold`, typography.h3]}>
        {value}
      </Text>
    </View>
  );
}

export default StatCard;
