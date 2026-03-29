import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import tw from "@/styles/tailwind";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

interface BarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
    isCurrency?: boolean;
  }[];
  maxBarHeight?: number;
  showValues?: boolean;
  horizontal?: boolean;
  style?: object;
}

export function BarChart({
  data,
  maxBarHeight = 150,
  showValues = true,
  horizontal = false,
  style,
}: BarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  if (horizontal) {
    return (
      <ScrollView
        style={[tw`w-full`, style]}
        showsVerticalScrollIndicator={false}
      >
        {data.map((item, index) => {
          const width = `${(item.value / maxValue) * 100}%`;
          const barColor = item.color || "#3b82f6";

          return (
            <View key={index} style={tw`mb-4`}>
              <View style={tw`flex-row justify-between items-center mb-1`}>
                <Text style={tw`text-sm text-gray-600 w-1/3`} numberOfLines={1}>
                  {item.label}
                </Text>
                {showValues && (
                  <Text style={tw`text-sm text-gray-700 font-medium`}>
                    {item.isCurrency ? (
                      <CurrencyFormat value={item.value} />
                    ) : (
                      item.value.toLocaleString()
                    )}
                  </Text>
                )}
              </View>
              <View style={tw`h-6 bg-gray-100 rounded-full overflow-hidden`}>
                <View
                  style={[
                    tw`h-full rounded-full`,
                    { width, backgroundColor: barColor },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  return (
    <View style={[tw`flex-row items-end justify-around`, style]}>
      {data.map((item, index) => {
        const height = `${(item.value / maxValue) * maxBarHeight}px`;
        const barColor = item.color || "#3b82f6";

        return (
          <View
            key={index}
            style={tw`items-center justify-end flex-1 px-1 max-w-20`}
          >
            {showValues && (
              <Text style={tw`text-xs text-gray-700 font-medium mb-1`}>
                {item.isCurrency ? (
                  <CurrencyFormat value={item.value} />
                ) : (
                  item.value.toLocaleString()
                )}
              </Text>
            )}
            <View
              style={[
                tw`w-full rounded-t-lg`,
                { height, backgroundColor: barColor },
              ]}
            />
            <Text
              style={tw`mt-2 text-xs text-gray-600 text-center`}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
