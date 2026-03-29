import React from "react";
import { View, Dimensions, Text } from "react-native";
import { PolarChart, Pie } from "victory-native";
import tw from "@/styles/tailwind";

interface ModernPieChartProps {
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

export function ModernPieChart({
  data,
  height = 300,
  width = Dimensions.get("window").width - 40,
  showLegend = true,
  style,
}: ModernPieChartProps) {
  // Transform data for Victory
  const chartData = data.map((item) => ({
    x: item.label,
    y: item.value,
    color: item.color || "#0ea5e9",
  }));

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <View style={[tw`w-full items-center`, style]}>
      <View style={{ height: showLegend ? height * 0.7 : height, width }}>
        <PolarChart
          width={width}
          height={showLegend ? height * 0.7 : height}
          padding={40}
        >
          <Pie
            data={chartData}
            innerRadius={70}
            padAngle={1}
            sliceProps={({ datum }) => ({
              fill: datum.color,
            })}
          />
        </PolarChart>
      </View>

      {/* Custom Legend */}
      {showLegend && (
        <View style={tw`flex-row flex-wrap justify-center mt-4`}>
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <View key={index} style={tw`flex-row items-center mx-3 mb-2`}>
                <View
                  style={[
                    tw`w-3 h-3 mr-1 rounded-full`,
                    { backgroundColor: item.color || "#0ea5e9" },
                  ]}
                />
                <Text style={tw`text-xs`}>
                  {item.label} ({percentage}%)
                  {item.isCurrency
                    ? ` - $${item.value.toLocaleString()}`
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
