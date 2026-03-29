import React, { useMemo } from "react";
import { View, Dimensions } from "react-native";
import { Text } from "@/components/Text";
import { LinearGradient } from "expo-linear-gradient";
import tw from "@/styles/tailwind";

interface ModernBarChartProps {
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
  barWidth?: number;
  currencyPrefix?: string;
  showZeroLine?: boolean;
}

export function ModernBarChart({
  data,
  height = 200,
  width = Dimensions.get("window").width - 40,
  showLabels = true,
  showValues = true,
  style,
  barWidth,
  currencyPrefix = "R",
  showZeroLine = false,
}: ModernBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <View style={[tw`justify-center items-center`, { height, width }]}>
        <Text variant="medium" style={tw`text-gray-500`}>
          No data available
        </Text>
      </View>
    );
  }

  // Use data as provided, don't sort it
  const chartData = [...data];

  // Process data for display - optimize for small screens when there are many data points
  const processedData = useMemo(() => {
    // If we have fewer than 8 data points, just return the original data
    if (chartData.length <= 8) {
      console.log("ModernBarChart: Using original data as-is, ≤ 8 data points");
      return chartData;
    }

    // Calculate how many bars we can reasonably fit
    const availableWidth = width - 40; // Account for padding and left axis labels
    const minBarWidth = 30; // Minimum width for each bar to be readable
    const maxBars = Math.floor(availableWidth / minBarWidth);

    console.log(
      `ModernBarChart: Can fit maximum ${maxBars} bars in ${availableWidth}px width`
    );

    // If we can fit all bars, return the original data
    if (chartData.length <= maxBars) {
      console.log("ModernBarChart: All bars fit in the available space");
      return chartData;
    }

    console.log(
      `ModernBarChart: Need to condense ${chartData.length} data points to fit ${maxBars} bars`
    );

    // We need to condense data to fit the available space
    // Calculate how many original bars to combine into one displayed bar
    const groupSize = Math.ceil(chartData.length / maxBars);
    console.log(`ModernBarChart: Group size for condensing: ${groupSize}`);

    // Create condensed data by grouping
    const condensedData = [];

    for (let i = 0; i < chartData.length; i += groupSize) {
      const group = chartData.slice(
        i,
        Math.min(i + groupSize, chartData.length)
      );

      if (group.length === 0) continue;

      // For display label: Only show the first and last if they're different
      let displayLabel;
      if (group.length === 1) {
        displayLabel = group[0].label;
      } else {
        displayLabel =
          group[0].label === group[group.length - 1].label
            ? group[0].label
            : `${group[0].label}-${group[group.length - 1].label}`;
      }

      // Add all values in this group
      const totalValue = group.reduce((sum, item) => sum + item.value, 0);

      condensedData.push({
        label: displayLabel,
        value: totalValue,
        originalValues: group.map((g) => g.value), // Store original values for reference
        originalLabels: group.map((g) => g.label), // Store original labels
        isCurrency: group[0].isCurrency,
        color: group[0].color,
      });
    }

    console.log(
      `ModernBarChart: Condensed ${chartData.length} data points to ${condensedData.length} bars`
    );
    return condensedData;
  }, [chartData, width]);

  // Calculate the maximum value for scaling
  const maxValue = Math.max(...processedData.map((item) => item.value));
  console.log(`ModernBarChart: Max value for scaling: ${maxValue}`);

  // Format currency value
  const formatCurrency = (value: number) => {
    return `${currencyPrefix}${value.toLocaleString()}`;
  };

  // Calculate responsive bar width if not provided
  const responsiveBarWidth = useMemo(() => {
    if (barWidth) return barWidth;

    const availableWidth = width - 40; // Account for padding and left axis labels
    const barCount = processedData.length;
    // Calculate a suitable bar width based on available space
    // Min width of 20 and max width of 60
    return Math.min(Math.max(20, (availableWidth / barCount) * 0.7), 60);
  }, [width, processedData.length, barWidth]);

  // Calculate spacing between bars based on available width
  const marginH = useMemo(() => {
    const availableWidth = width - 40;
    const totalBarWidth = responsiveBarWidth * processedData.length;
    return Math.max(
      2,
      (availableWidth - totalBarWidth) / (processedData.length * 2)
    );
  }, [width, processedData.length, responsiveBarWidth]);

  // Calculate label font size based on number of bars
  const labelFontSize = useMemo(() => {
    // Decrease font size as the number of bars increases
    if (processedData.length > 8) return 8;
    if (processedData.length > 5) return 9;
    return 10;
  }, [processedData.length]);

  return (
    <View style={[{ width, height }, style]}>
      {/* Chart container with grid lines */}
      <View style={[tw`flex-1 `, { paddingBottom: showLabels ? 20 : 0 }]}>
        {/* Grid lines */}
        {[...Array(5)].map((_, index) => (
          <View
            key={index}
            style={[
              tw`absolute left-0 right-0 h-px bg-gray-100`,
              {
                top: (index * (height - (showLabels ? 20 : 0))) / 4,
              },
            ]}
          />
        ))}

        {/* Y-axis labels */}
        {[...Array(5)].map((_, index) => (
          <Text
            key={index}
            variant="medium"
            style={[
              tw`absolute left-0 text-gray-400`,
              {
                top: (index * (height - (showLabels ? 20 : 0))) / 4 - 8,
                fontSize: 10,
              },
            ]}
          >
            {maxValue > 0 && processedData.some((item) => item.isCurrency)
              ? formatCurrency(maxValue - index * (maxValue / 4))
              : Math.round(maxValue - index * (maxValue / 4))}
          </Text>
        ))}

        {/* Zero line */}
        {showZeroLine && (
          <View
            style={[
              tw`absolute left-8 right-0 h-px bg-gray-200`,
              {
                bottom: showLabels ? 20 : 0,
              },
            ]}
          />
        )}

        {/* Bars */}
        <View style={tw`flex-1 flex-row justify-between items-end pl-8 pr-2.5`}>
          {processedData.map((item, index) => {
            const barHeight =
              maxValue > 0
                ? (item.value / maxValue) * (height - (showLabels ? 30 : 10))
                : 0;
            const barColor = item.color || "#2664EB";

            return (
              <View
                key={index}
                style={[
                  tw`items-center justify-end`,
                  {
                    width: responsiveBarWidth,
                    height: height - (showLabels ? 20 : 0),
                    marginHorizontal: marginH,
                  },
                ]}
              >
                {/* Value label on top of bar */}
                {showValues && (
                  <Text
                    variant="bold"
                    style={[
                      tw`text-gray-500 text-center`,
                      {
                        fontSize: Math.min(12, responsiveBarWidth / 2),
                        position: "absolute",
                        top:
                          height -
                          Math.max(barHeight, 5) -
                          (showLabels ? 30 : 10) -
                          16,
                        width: responsiveBarWidth * 1.8,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.isCurrency ? formatCurrency(item.value) : item.value}
                  </Text>
                )}

                {/* Bar with gradient */}
                <LinearGradient
                  colors={[barColor, `${barColor}90`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={[
                    tw`rounded-t-sm`,
                    {
                      width: responsiveBarWidth,
                      height: barHeight,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      {/* X-axis labels */}
      {showLabels && (
        <View
          style={[
            tw`flex-row`,
            {
              height: 20,
              paddingLeft: 30,
              paddingRight: 10,
            },
          ]}
        >
          {processedData.map((item, index) => {
            return (
              <Text
                key={index}
                variant="bold"
                style={[
                  tw`text-gray-500 text-center`,
                  {
                    fontSize: labelFontSize,
                    width: responsiveBarWidth,
                    marginHorizontal: marginH,
                  },
                ]}
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
