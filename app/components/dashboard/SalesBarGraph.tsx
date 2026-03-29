import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

interface SalesData {
  id: number;
  label: string;
  amount: number;
  color?: string;
}

interface SalesBarGraphProps {
  title: string;
  data: SalesData[];
  onItemPress?: (item: SalesData) => void;
}

export function SalesBarGraph({
  title,
  data,
  onItemPress,
}: SalesBarGraphProps) {
  // Find max value for scaling
  const maxValue = Math.max(...data.map((item) => item.amount), 1);

  // Default colors if not provided
  const defaultColors = [
    "#34d399", // Green
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#f97316", // Orange
    "#10b981", // Emerald
    "#6366f1", // Indigo
    "#ef4444", // Red
  ];

  return (
    <View style={tw`bg-white rounded-xl p-4 border border-gray-100`}>
      <View style={tw`flex-row justify-between items-center mb-6`}>
        <Text
          style={[tw`text-gray-900 text-base font-semibold`, typography.h3]}
        >
          {title}
        </Text>
        <TouchableOpacity>
          <Text style={tw`text-gray-400`}>•••</Text>
        </TouchableOpacity>
      </View>

      <View style={tw`flex-row items-end justify-between min-h-32`}>
        {data.map((item, index) => {
          // Calculate height based on percentage of max value (min 10px)
          const percentage = (item.amount / maxValue) * 100;
          const height = Math.max(percentage * 0.7, 10); // Max height is 70% of container
          const barColor =
            item.color || defaultColors[index % defaultColors.length];

          return (
            <TouchableOpacity
              key={item.id}
              style={tw`items-center`}
              onPress={() => onItemPress && onItemPress(item)}
              activeOpacity={0.7}
            >
              <View style={tw`items-center justify-center`}>
                {percentage > 50 && (
                  <Text
                    style={[tw`text-xs mb-1 text-gray-700`, typography.small]}
                  >
                    ${item.amount}
                  </Text>
                )}
              </View>
              <View
                style={[
                  tw`w-7 rounded-t-md`,
                  {
                    height,
                    backgroundColor: barColor,
                  },
                ]}
              />
              <Text
                style={[
                  tw`text-xs mt-2 text-gray-500 max-w-12 text-center`,
                  typography.caption,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default SalesBarGraph;
