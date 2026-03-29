import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import { Card } from "@/components/base/Card";
import { GradientBarChart } from "./GradientBarChart";
import { SimpleGradientLineChart } from "./SimpleGradientLineChart";
import tw from "@/styles/tailwind";

export function ChartShowcase() {
  // Sample data for charts
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const lineChartData = [
    { label: "Jan", value: 4150 },
    { label: "Feb", value: 3800 },
    { label: "Mar", value: 6200 },
    { label: "Apr", value: 5400 },
    { label: "May", value: 8100 },
    { label: "Jun", value: 7400 },
    { label: "Jul", value: 9200 },
    { label: "Aug", value: 11000 },
    { label: "Sep", value: 9800 },
    { label: "Oct", value: 10500 },
    { label: "Nov", value: 9600 },
    { label: "Dec", value: 12000 },
  ];

  const employeeBarData = [
    { label: "05", value: 100, color: "#8b5cf6" },
    { label: "SD", value: 300, color: "#8b5cf6" },
    { label: "SD", value: 130, color: "#8b5cf6" },
    { label: "FB", value: 380, color: "#8b5cf6" },
    { label: "SD", value: 180, color: "#8b5cf6" },
    { label: "RA", value: 90, color: "#8b5cf6" },
    { label: "JK", value: 250, color: "#8b5cf6" },
    { label: "GD", value: 280, color: "#8b5cf6" },
    { label: "FA", value: 120, color: "#8b5cf6" },
    { label: "GD", value: 80, color: "#8b5cf6" },
  ];

  const vehicleBarData = [
    { label: "LC", value: 250, color: "#22c55e" },
    { label: "JS", value: 120, color: "#22c55e" },
    { label: "G", value: 320, color: "#22c55e" },
    { label: "Mg", value: 380, color: "#22c55e" },
    { label: "KS", value: 210, color: "#22c55e" },
    { label: "Va", value: 90, color: "#22c55e" },
    { label: "E", value: 280, color: "#22c55e" },
    { label: "Fe", value: 320, color: "#22c55e" },
    { label: "YL", value: 150, color: "#22c55e" },
  ];

  const categoryData = [
    { label: "Fuel", value: 2650, color: "#6366f1", isCurrency: true },
    { label: "Maintenance", value: 1200, color: "#22c55e", isCurrency: true },
    { label: "Insurance", value: 850, color: "#f59e0b", isCurrency: true },
  ];

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Summary Card with Line Chart */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="semibold" style={tw`text-base`}>
            Summary
          </Text>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.summaryDetails}>
            <Text variant="medium" style={styles.summaryLabel}>
              Total $ Spend
            </Text>
            <Text variant="bold" style={styles.summaryValue}>
              $4,250.42
            </Text>
            <View style={styles.summaryIncrease}>
              <Text style={styles.increaseText}>Increased by 20%</Text>
            </View>
            <Text style={styles.comparisonText}>Compared to September</Text>
          </View>

          <SimpleGradientLineChart
            data={lineChartData}
            height={100}
            width={280}
            lineColor="#8b5cf6"
            showLabels={true}
          />
        </View>
      </Card>

      {/* Top Spend by Employee */}
      <Card style={styles.halfCard}>
        <View style={styles.cardHeader}>
          <Text variant="semibold" style={tw`text-base`}>
            Top Spend by Employee
          </Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <View style={styles.cardContent}>
          <Text variant="semibold" style={styles.spenderName}>
            Alex Smith
          </Text>
          <GradientBarChart
            data={employeeBarData}
            height={120}
            showValues={false}
          />
        </View>
      </Card>

      {/* Top Spend by Vehicle */}
      <Card style={styles.halfCard}>
        <View style={styles.cardHeader}>
          <Text variant="semibold" style={tw`text-base`}>
            Top Spend by Vehicle
          </Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <View style={styles.cardContent}>
          <Text variant="semibold" style={styles.spenderName}>
            Ford GT-250
          </Text>
          <GradientBarChart
            data={vehicleBarData}
            height={120}
            showValues={false}
          />
        </View>
      </Card>

      {/* Categories */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text variant="semibold" style={tw`text-base`}>
            Top Spend Categories
          </Text>
          <Text style={styles.viewAll}>View All</Text>
        </View>

        <View style={styles.cardContent}>
          <GradientBarChart
            data={categoryData}
            horizontal={true}
            height={180}
          />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 16,
  },
  halfCard: {
    padding: 0,
    overflow: "hidden",
    borderRadius: 16,
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardContent: {
    padding: 16,
  },
  summaryDetails: {
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 26,
    marginBottom: 8,
  },
  summaryIncrease: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  increaseText: {
    color: "#16a34a",
    fontSize: 12,
    fontWeight: "500",
  },
  comparisonText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  viewAll: {
    fontSize: 14,
    color: "#6366f1",
  },
  spenderName: {
    fontSize: 18,
    marginBottom: 12,
  },
});
