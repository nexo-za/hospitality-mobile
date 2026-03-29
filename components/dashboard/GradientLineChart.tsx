import React, { useEffect, useState } from "react";
import { View, Dimensions, Text, Animated } from "react-native";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import tw from "@/styles/tailwind";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

interface GradientLineChartProps {
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
  showDots?: boolean;
  style?: object;
  lineColor?: string;
  animated?: boolean;
}

export function GradientLineChart({
  data,
  height = 200,
  width = Dimensions.get("window").width - 40,
  showLabels = true,
  showValues = false,
  showDots = true,
  lineColor = "#6366f1",
  style,
  animated = true,
}: GradientLineChartProps) {
  const [progress] = useState(new Animated.Value(0));

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
  const paddingTop = 20;
  const paddingBottom = 30;
  const paddingLeft = 10;
  const paddingRight = 10;

  // Calculate chart dimensions
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Create data points
  const points = sortedData.map((item, index) => {
    const x = paddingLeft + (index / (sortedData.length - 1 || 1)) * chartWidth;
    // Normalize value between 0 and chartHeight, then invert (SVG y-axis is inverted)
    const normalizedValue = (item.value - minValue) / valueRange;
    const y = height - paddingBottom - normalizedValue * chartHeight;
    return {
      x,
      y,
      value: item.value,
      label: item.label,
      isCurrency: item.isCurrency,
    };
  });

  // Generate path
  const linePath = points.reduce((path, point, index) => {
    const command = index === 0 ? "M" : "L";
    return `${path} ${command} ${point.x},${point.y}`;
  }, "");

  // Generate fill path (closes the path to the bottom)
  const fillPath = `${linePath} L ${paddingLeft + chartWidth},${
    height - paddingBottom
  } L ${paddingLeft},${height - paddingBottom} Z`;

  useEffect(() => {
    if (animated) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    } else {
      progress.setValue(1);
    }
  }, [data, animated, progress]);

  // Create month labels
  const renderXLabels = () => {
    if (!showLabels) return null;

    // If we have too many points, show fewer labels
    const step = sortedData.length > 12 ? Math.ceil(sortedData.length / 6) : 1;

    return (
      <View style={tw`flex-row justify-between px-2 mt-2`}>
        {sortedData.map((item, index) => {
          if (index % step !== 0 && index !== sortedData.length - 1)
            return null;
          return (
            <Text
              key={index}
              style={[
                tw`text-xs text-gray-500`,
                {
                  width: chartWidth / Math.ceil(sortedData.length / step),
                  textAlign: "center",
                },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          );
        })}
      </View>
    );
  };

  // To animate the path drawing
  const AnimatedPath = Animated.createAnimatedComponent(Path);
  const AnimatedCircle = Animated.createAnimatedComponent(Circle);

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

      {/* Chart SVG */}
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="1" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.5" />
          </LinearGradient>
          <LinearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={lineColor} stopOpacity="0.3" />
            <Stop offset="1" stopColor={lineColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>

        {/* Area fill */}
        <AnimatedPath
          d={fillPath}
          fill="url(#fillGradient)"
          strokeWidth={0}
          opacity={progress}
        />

        {/* Line */}
        <AnimatedPath
          d={linePath}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={progress}
        />

        {/* Data points */}
        {showDots &&
          points.map((point, index) => (
            <AnimatedCircle
              key={index}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#fff"
              stroke={lineColor}
              strokeWidth={2}
              opacity={progress}
            />
          ))}
      </Svg>

      {/* X-axis labels */}
      {renderXLabels()}
    </View>
  );
}
