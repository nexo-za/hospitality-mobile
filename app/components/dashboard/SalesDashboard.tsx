import React from "react";
import { View } from "react-native";
import tw from "@/styles/tailwind";
import SalesBarGraph from "./SalesBarGraph";
import RecentSalesList from "./RecentSalesList";

// Define types to match component props
interface SalesData {
  id: number;
  label: string;
  amount: number;
  color?: string;
}

interface RecentSale {
  id: number;
  title: string;
  amount: number;
  date: string;
}

// Sample data for the bar graph
const topSalesData = [
  { id: 1, label: "Repairs", amount: 3000 },
  { id: 2, label: "House Rent", amount: 3500 },
  { id: 3, label: "Licenses", amount: 2800 },
  { id: 4, label: "Transport", amount: 1500 },
  { id: 5, label: "Laptop", amount: 2400 },
  { id: 6, label: "Net Bill", amount: 2700 },
  { id: 7, label: "AC", amount: 1700 },
  { id: 8, label: "Dish Bill", amount: 1100 },
  { id: 9, label: "School", amount: 2300 },
  { id: 10, label: "Plants", amount: 1450 },
];

// Sample data for recent sales
const recentSalesData = [
  { id: 1, title: "Fridge", amount: 550, date: "5th January, 2023" },
  { id: 2, title: "Internet Bill", amount: 17, date: "29th December, 2022" },
  { id: 3, title: "Indoor Plants", amount: 96, date: "27th December, 2022" },
  { id: 4, title: "Transport", amount: 11, date: "22nd December, 2022" },
  { id: 5, title: "Grocery", amount: 35, date: "20th December, 2022" },
  { id: 6, title: "Utilities", amount: 120, date: "15th December, 2022" },
];

export default function SalesDashboard() {
  const handleBarPress = (item: SalesData) => {
    console.log("Bar pressed:", item);
  };

  const handleRecentSalePress = (item: RecentSale) => {
    console.log("Recent sale pressed:", item);
  };

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View style={{ marginBottom: 24 }}>
        <SalesBarGraph
          title="Top 5 Expense Source"
          data={topSalesData}
          onItemPress={handleBarPress}
        />
      </View>

      <View style={{ marginBottom: 24 }}>
        <RecentSalesList
          title="Recent Expenses"
          data={recentSalesData}
          onItemPress={handleRecentSalePress}
        />
      </View>
    </View>
  );
}
