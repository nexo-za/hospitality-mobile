import React from "react";
import { View, Text, Dimensions } from "react-native";

interface SimpleLineChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
    isCurrency?: boolean;
  }[];
  height?: number;
  width?: number;
  showLabels?: boolean;
  showValues?: boolean;
  style?: object;
  lineColor?: string;
}

export function SimpleLineChart({
  data,
  height = 200,
  width = Dimensions.get("window").width - 40,
  showLabels = true,
  showValues = false,
  lineColor = "#6366f1",
  style,
}: SimpleLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View
        style={{
          height,
          width,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#6b7280" }}>No data available</Text>
      </View>
    );
  }

  // Sort data by label
  const sortedData = [...data].sort((a, b) => a.label.localeCompare(b.label));

  // Calculate the maximum value for scaling
  const maxValue = Math.max(...sortedData.map((item) => item.value));

  return (
    <View style={[{ width, height }, style]}>
      {/* Chart values */}
      {showValues && maxValue > 0 && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 12, color: "#6b7280" }}>
            {sortedData[sortedData.length - 1]?.isCurrency
              ? `$${sortedData[sortedData.length - 1]?.value.toLocaleString()}`
              : sortedData[sortedData.length - 1]?.value.toLocaleString()}
          </Text>
        </View>
      )}

      {/* Chart bars */}
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-end",
        }}
      >
        {sortedData.map((item, index) => {
          const barHeight =
            maxValue > 0 ? (item.value / maxValue) * (height - 40) : 0;

          return (
            <View key={index} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: 8,
                  height: Math.max(barHeight, 4),
                  backgroundColor: lineColor,
                  borderRadius: 4,
                }}
              />
            </View>
          );
        })}
      </View>

      {/* X-axis labels */}
      {showLabels && (
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          {sortedData.map((item, index) => (
            <Text
              key={index}
              style={{
                fontSize: 10,
                color: "#6b7280",
                flex: 1,
                textAlign: "center",
              }}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
