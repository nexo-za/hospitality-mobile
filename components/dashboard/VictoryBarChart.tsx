import React from "react";
import { View, Dimensions } from "react-native";
import {
  VictoryBar,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel,
} from "victory-native";
import { Text } from "@/components/Text";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";
import tw from "@/styles/tailwind";

interface VictoryBarChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
    isCurrency?: boolean;
  }[];
  horizontal?: boolean;
  animate?: boolean;
  height?: number;
  width?: number;
  style?: object;
}

export function VictoryBarChart({
  data,
  horizontal = false,
  animate = true,
  height = 300,
  width = Dimensions.get("window").width - 40,
  style,
}: VictoryBarChartProps) {
  // Transform data for Victory
  const chartData = data.map((item, index) => ({
    x: item.label,
    y: item.value,
    color: item.color || getDefaultColor(index),
    isCurrency: item.isCurrency,
  }));

  // Get default color based on index
  function getDefaultColor(index: number) {
    const colors = [
      "#0ea5e9",
      "#22c55e",
      "#f59e0b",
      "#6366f1",
      "#ec4899",
      "#8b5cf6",
    ];
    return colors[index % colors.length];
  }

  // Custom label component for currency formatting
  const CustomLabel = (props: any) => {
    const { datum } = props;
    return (
      <VictoryLabel
        {...props}
        text={
          datum.isCurrency
            ? `$${datum.y.toLocaleString()}`
            : datum.y.toLocaleString()
        }
      />
    );
  };

  return (
    <View style={[tw`w-full items-center`, style]}>
      <VictoryChart
        domainPadding={{ x: 20 }}
        height={height}
        width={width}
        padding={{ top: 20, bottom: 50, left: 60, right: 40 }}
        theme={VictoryTheme.material}
        horizontal={horizontal}
      >
        <VictoryAxis
          tickLabelComponent={
            <VictoryLabel
              style={{ fontSize: 10 }}
              angle={horizontal ? 0 : -45}
              textAnchor={horizontal ? "start" : "end"}
            />
          }
        />
        <VictoryAxis
          dependentAxis
          tickFormat={(tick) =>
            data[0]?.isCurrency
              ? `$${tick.toLocaleString()}`
              : tick.toLocaleString()
          }
        />
        <VictoryBar
          data={chartData}
          x="x"
          y="y"
          style={{
            data: {
              fill: ({ datum }) => datum.color,
              width: horizontal ? 15 : 30,
            },
          }}
          animate={animate ? { duration: 500 } : undefined}
          labels={({ datum }) => datum.y}
          labelComponent={<CustomLabel dy={-10} />}
        />
      </VictoryChart>
    </View>
  );
}
