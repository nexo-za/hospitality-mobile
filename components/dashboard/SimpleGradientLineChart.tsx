import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import tw from "@/styles/tailwind";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

interface SimpleGradientLineChartProps {
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
  lineColor?: string;
  animated?: boolean;
  style?: object;
}

export function SimpleGradientLineChart({
  data,
  height = 200,
  width = Dimensions.get("window").width - 40,
  showLabels = true,
  showValues = false,
  lineColor = "#6366f1",
  style,
  animated = true,
}: SimpleGradientLineChartProps) {
  const [animationProgress] = useState(new Animated.Value(0));

  // Sort data by label (assuming labels can be converted to numbers)
  const sortedData = [...data].sort((a, b) => {
    // Try to parse as dates first
    const aDate = new Date(a.label);
    const bDate = new Date(b.label);

    if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime())) {
      return aDate.getTime() - bDate.getTime();
    }

    // If not dates, try as numbers
    const aNum = Number(a.label);
    const bNum = Number(b.label);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }

    // Fall back to string comparison
    return a.label.localeCompare(b.label);
  });

  // Calculate the minimum, maximum, and range of values
  const values = sortedData.map((item) => item.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1; // Prevent division by zero

  // Padding to avoid chart touching the edges
  const chartHeight = height * 0.7; // Allocate 70% of height for the chart
  const barWidth = 8; // Width of each bar
  const dotSize = 8; // Size of each data point

  // Run animation
  useEffect(() => {
    if (animated) {
      animationProgress.setValue(0);
      Animated.timing(animationProgress, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }).start();
    } else {
      animationProgress.setValue(1);
    }
  }, [data, animated, animationProgress]);

  return (
    <View style={[tw`w-full`, style]}>
      {/* Chart title or current value */}
      {showValues && (
        <View style={tw`flex-row justify-end mb-2`}>
          <Text style={tw`text-sm font-semibold text-gray-800`}>
            {sortedData[sortedData.length - 1]?.isCurrency ? (
              <CurrencyFormat
                value={sortedData[sortedData.length - 1]?.value}
              />
            ) : (
              sortedData[sortedData.length - 1]?.value.toLocaleString()
            )}
          </Text>
        </View>
      )}

      {/* Chart Area */}
      <View style={tw`w-full h-${height} relative`}>
        {/* Bars for each data point */}
        <View style={tw`flex-row items-end justify-between w-full h-full`}>
          {sortedData.map((item, index) => {
            const normalizedHeight =
              ((item.value - minValue) / valueRange) * chartHeight;
            const animatedHeight = animated
              ? animationProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, normalizedHeight],
                })
              : normalizedHeight;

            return (
              <View key={index} style={tw`items-center`}>
                <Animated.View
                  style={{
                    width: barWidth,
                    height: animatedHeight,
                    backgroundColor: "transparent",
                    position: "relative",
                  }}
                >
                  <LinearGradient
                    colors={[lightenColor(lineColor, 30), lineColor]}
                    style={{
                      position: "absolute",
                      left: 0,
                      bottom: 0,
                      width: "100%",
                      height: "100%",
                      borderTopLeftRadius: 4,
                      borderTopRightRadius: 4,
                    }}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                  />

                  {/* Data point dot */}
                  <View
                    style={{
                      position: "absolute",
                      top: -dotSize / 2,
                      left: (barWidth - dotSize) / 2,
                      width: dotSize,
                      height: dotSize,
                      borderRadius: dotSize / 2,
                      backgroundColor: "white",
                      borderWidth: 2,
                      borderColor: lineColor,
                    }}
                  />
                </Animated.View>
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      {showLabels && (
        <View style={tw`flex-row justify-between mt-2`}>
          {sortedData.map((item, index) => {
            // Show fewer labels if we have many data points
            if (
              sortedData.length > 12 &&
              index % 3 !== 0 &&
              index !== sortedData.length - 1
            ) {
              return <View key={index} style={tw`flex-1`} />;
            }

            return (
              <Text
                key={index}
                style={tw`text-xs text-gray-500 text-center flex-1`}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            );
          })}
        </View>
      )}
    </View>
  );
}

// Helper function to lighten a color
function lightenColor(color: string, percent: number): string {
  // Convert hex to RGB
  let r = parseInt(color.substring(1, 3), 16);
  let g = parseInt(color.substring(3, 5), 16);
  let b = parseInt(color.substring(5, 7), 16);

  // Lighten
  r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
  g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
  b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));

  // Convert back to hex
  return `#${r.toString(16).padStart(2, "0")}${g
    .toString(16)
    .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
