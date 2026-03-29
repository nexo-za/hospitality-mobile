import React from "react";
import { View, Dimensions } from "react-native";
import { Text } from "@/components/Text";
import tw from "@/styles/tailwind";

interface SimplePieChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
    isCurrency?: boolean;
  }[];
  height?: number;
  width?: number;
  showLegend?: boolean;
  style?: object;
}

export function SimplePieChart({
  data,
  height = 200,
  width = Dimensions.get("window").width - 40,
  showLegend = true,
  style,
}: SimplePieChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[tw`justify-center items-center`, { height, width }]}>
        <Text style={tw`text-gray-500`}>No data available</Text>
      </View>
    );
  }

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Default colors if not provided
  const defaultColors = [
    "#2664EB", // Updated to match the new blue primary color
    "#0ea5e9",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#64748b",
  ];

  return (
    <View style={[{ width, height }, style]}>
      {/* Simple colored bars to represent the pie */}
      <View
        style={[
          tw`flex-row`,
          {
            height: showLegend ? height * 0.6 : height,
          },
        ]}
      >
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <View
              key={index}
              style={[
                {
                  flex: percentage,
                  backgroundColor:
                    item.color || defaultColors[index % defaultColors.length],
                  height: "100%",
                  borderRadius: index === 0 ? 8 : 0,
                  borderTopRightRadius: index === data.length - 1 ? 8 : 0,
                  borderBottomRightRadius: index === data.length - 1 ? 8 : 0,
                  borderBottomLeftRadius: index === 0 ? 8 : 0,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Legend */}
      {showLegend && (
        <View style={tw`mt-4 flex-row flex-wrap justify-center`}>
          {data.map((item, index) => {
            const percentage =
              total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";

            return (
              <View key={index} style={tw`flex-row items-center mr-3 mb-2`}>
                <View
                  style={[
                    tw`w-3 h-3 mr-1 rounded-full`,
                    {
                      backgroundColor:
                        item.color ||
                        defaultColors[index % defaultColors.length],
                    },
                  ]}
                />
                <Text style={tw`text-xs text-gray-800`}>
                  {item.label} ({percentage}%)
                  {item.isCurrency
                    ? ` - R${item.value.toLocaleString()}`
                    : ` - ${item.value.toLocaleString()}`}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
