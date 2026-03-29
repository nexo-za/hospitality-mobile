import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, Animated } from "react-native";
import { Svg, Rect, LinearGradient, Defs, Stop } from "react-native-svg";
import { CartesianChart, Bar } from "victory-native";
import { LinearGradient as ExpoGradient } from "expo-linear-gradient";
import tw from "@/styles/tailwind";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

interface GradientBarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
    isCurrency?: boolean;
  }[];
  horizontal?: boolean;
  height?: number;
  width?: number;
  showValues?: boolean;
  style?: object;
  animated?: boolean;
}

export function GradientBarChart({
  data,
  horizontal = false,
  height = 300,
  width = Dimensions.get("window").width - 40,
  showValues = true,
  style,
  animated = true,
}: GradientBarChartProps) {
  const [chartData, setChartData] = useState(
    data.map((item) => ({
      x: item.label,
      y: 0, // Start with zero for animation
      actualY: item.value,
      color: item.color || "#6366f1",
      isCurrency: item.isCurrency,
    }))
  );

  // Animation effect
  useEffect(() => {
    if (animated) {
      // Animate bars from 0 to actual value
      setChartData((prevData) =>
        prevData.map((item) => ({
          ...item,
          y: 0,
        }))
      );

      setTimeout(() => {
        setChartData((prevData) =>
          prevData.map((item) => ({
            ...item,
            y: item.actualY,
          }))
        );
      }, 100);
    } else {
      // No animation, just set to actual values
      setChartData(
        data.map((item) => ({
          x: item.label,
          y: item.value,
          actualY: item.value,
          color: item.color || "#6366f1",
          isCurrency: item.isCurrency,
        }))
      );
    }
  }, [data, animated]);

  // Maximum value for scaling
  const maxValue = Math.max(...data.map((item) => item.value));

  // For horizontal bars, we'll use a custom render approach
  if (horizontal) {
    return (
      <View style={[tw`w-full`, style]}>
        {data.map((item, index) => {
          const widthPercent = (item.value / maxValue) * 100;
          const baseColor = item.color || "#6366f1";
          const lightColor = lightenColor(baseColor, 30);

          return (
            <View key={index} style={tw`mb-5`}>
              <View style={tw`flex-row justify-between mb-2`}>
                <Text
                  style={tw`text-sm font-medium text-gray-700`}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
                {showValues && (
                  <Text style={tw`text-sm font-medium text-gray-700`}>
                    {item.isCurrency ? (
                      <CurrencyFormat value={item.value} />
                    ) : (
                      item.value.toLocaleString()
                    )}
                  </Text>
                )}
              </View>

              <View style={tw`h-8 bg-gray-100 rounded-lg overflow-hidden`}>
                <Animated.View
                  style={{
                    width: animated ? `${widthPercent}%` : 0,
                    height: "100%",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <ExpoGradient
                    colors={[baseColor, lightColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: "100%", width: "100%" }}
                  />
                </Animated.View>
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // For vertical bars
  return (
    <View style={[tw`w-full`, style]}>
      <View style={tw`flex-row mt-6`}>
        {data.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 0.8; // 80% of chart height max
          const baseColor = item.color || "#6366f1";
          const lightColor = lightenColor(baseColor, 30);

          return (
            <View key={index} style={tw`flex-1 items-center mx-1`}>
              {showValues && (
                <Text style={tw`text-xs mb-1 font-medium text-gray-700`}>
                  {item.isCurrency ? (
                    <CurrencyFormat value={item.value} />
                  ) : (
                    item.value.toLocaleString()
                  )}
                </Text>
              )}

              <View style={tw`relative w-full items-center justify-end`}>
                <View
                  style={[
                    tw`bg-gray-100 w-full absolute bottom-0`,
                    { height: height * 0.8 },
                  ]}
                />

                <Animated.View
                  style={{
                    width: "70%",
                    height: height * heightPercent,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    overflow: "hidden",
                    marginBottom: 0,
                  }}
                >
                  <ExpoGradient
                    colors={[lightColor, baseColor]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    style={{ height: "100%", width: "100%" }}
                  />
                </Animated.View>
              </View>

              <Text
                style={tw`text-xs mt-2 text-gray-600 text-center`}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
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
