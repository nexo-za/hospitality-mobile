import React from "react";
import { View, Dimensions } from "react-native";
import { VictoryPie, VictoryLabel, VictoryLegend } from "victory-native";
import { Text } from "@/components/Text";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";
import tw from "@/styles/tailwind";

interface VictoryPieChartProps {
  data: {
    label: string;
    value: number;
    color?: string;
    isCurrency?: boolean;
  }[];
  animate?: boolean;
  height?: number;
  width?: number;
  showLegend?: boolean;
  style?: object;
}

export function VictoryPieChart({
  data,
  animate = true,
  height = 300,
  width = Dimensions.get("window").width - 40,
  showLegend = true,
  style,
}: VictoryPieChartProps) {
  // Transform data for Victory
  const chartData = data.map((item, index) => ({
    x: item.label,
    y: item.value,
    color: item.color || getDefaultColor(index),
    isCurrency: item.isCurrency,
  }));

  // Calculate total for percentage
  const total = data.reduce((sum, item) => sum + item.value, 0);

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

  // Format data for the legend
  const legendData = chartData.map((datum) => ({
    name: `${datum.x} (${((datum.y / total) * 100).toFixed(1)}%)`,
    symbol: { fill: datum.color },
    labels: { fill: "#333" },
  }));

  return (
    <View style={[tw`w-full items-center`, style]}>
      <View style={{ height, width }}>
        <VictoryPie
          data={chartData}
          colorScale={chartData.map((item) => item.color)}
          width={width}
          height={showLegend ? height * 0.7 : height}
          padding={showLegend ? { top: 0, bottom: 0, left: 20, right: 20 } : 40}
          labelRadius={({ innerRadius }: { innerRadius: number }) =>
            (innerRadius || 0) + 30
          }
          innerRadius={70}
          style={{
            labels: { fill: "white", fontSize: 12, fontWeight: "bold" },
            data: {
              fillOpacity: 0.9,
              stroke: "#fff",
              strokeWidth: 2,
            },
          }}
          labels={({ datum }: { datum: any }) => {
            const percentage = Number(((datum.y / total) * 100).toFixed(0));
            return percentage > 5 ? `${percentage}%` : "";
          }}
          animate={animate ? { duration: 1000, easing: "bounce" } : undefined}
        />

        {showLegend && (
          <VictoryLegend
            x={width / 2 - 150}
            y={height * 0.75}
            centerTitle
            title="Legend"
            orientation="horizontal"
            gutter={20}
            style={{
              title: { fontSize: 14 },
              labels: { fontSize: 12 },
            }}
            data={legendData}
            width={300}
          />
        )}
      </View>
    </View>
  );
}
