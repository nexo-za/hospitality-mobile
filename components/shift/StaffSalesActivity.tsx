import React, { useState, useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift } from "@/app/contexts/ShiftContext";
import { useStaffSession } from "@/contexts/StaffSessionContext";

interface StaffSalesActivityProps {
  compact?: boolean;
}

// Interface for staff sales data
interface StaffSalesData {
  staffId: string;
  name: string;
  totalSales: number;
  transactionCount: number;
  lastSaleTime?: string | null;
}

const StaffSalesActivity: React.FC<StaffSalesActivityProps> = ({
  compact = false,
}) => {
  const { currentShift, getSalesByStaff } = useShift();
  const { currentStaff } = useStaffSession();
  const [staffSalesData, setStaffSalesData] = useState<StaffSalesData[]>([]);
  const [expanded, setExpanded] = useState(false);

  // Calculate staff sales statistics whenever the current shift changes
  useEffect(() => {
    if (!currentShift || !currentShift.activeStaff) {
      setStaffSalesData([]);
      return;
    }

    // Get real sales data for each staff member
    const realStaffSales: StaffSalesData[] = currentShift.activeStaff.map(
      (staff) => {
        // Get this staff member's sales data
        const salesData = getSalesByStaff(staff.staffId);

        return {
          staffId: staff.staffId,
          name: staff.name,
          totalSales: salesData.totalSales,
          transactionCount: salesData.transactionCount,
          lastSaleTime: salesData.lastSaleTime,
        };
      }
    );

    // Sort by sales (highest first)
    realStaffSales.sort((a, b) => b.totalSales - a.totalSales);

    setStaffSalesData(realStaffSales);
  }, [currentShift, getSalesByStaff]);

  if (!currentShift || staffSalesData.length === 0) {
    return null;
  }

  const renderStaffSalesItem = (item: StaffSalesData, index: number) => {
    const isCurrentStaff = currentStaff?.staffId === item.staffId;

    return (
      <View
        key={item.staffId}
        style={tw`flex-row items-center p-3 border-b border-gray-100 ${
          isCurrentStaff ? "bg-blue-50" : ""
        }`}
      >
        <View style={tw`mr-3`}>
          <MaterialCommunityIcons
            name="account-circle"
            size={compact ? 30 : 40}
            color={isCurrentStaff ? "#3b82f6" : "#64748b"}
          />
        </View>

        <View style={tw`flex-1`}>
          <GeistText
            style={[
              tw`${isCurrentStaff ? "text-blue-900" : "text-gray-900"}`,
              typography.bodyBold,
            ]}
          >
            {item.name}
          </GeistText>
          <GeistText
            style={[
              tw`${isCurrentStaff ? "text-blue-700" : "text-gray-500"}`,
              typography.caption,
            ]}
          >
            {item.transactionCount}{" "}
            {item.transactionCount === 1 ? "transaction" : "transactions"}
          </GeistText>
        </View>

        <View style={tw`items-end`}>
          <GeistText
            style={[
              tw`${isCurrentStaff ? "text-blue-900" : "text-gray-900"}`,
              typography.bodyBold,
            ]}
          >
            R{item.totalSales.toFixed(2)}
          </GeistText>
          {item.lastSaleTime && (
            <GeistText
              style={[
                tw`${isCurrentStaff ? "text-blue-700" : "text-gray-500"}`,
                typography.caption,
              ]}
            >
              Last sale: {formatTimeAgo(item.lastSaleTime)}
            </GeistText>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={tw`bg-white rounded-lg border border-gray-100 mb-4`}>
      <TouchableOpacity
        style={tw`flex-row justify-between items-center p-3 border-b border-gray-100`}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={tw`flex-row items-center`}>
          <MaterialCommunityIcons
            name="account-cash"
            size={20}
            color="#3b82f6"
            style={tw`mr-2`}
          />
          <GeistText style={[tw`text-gray-900`, typography.h3]}>
            Staff Sales Activity
          </GeistText>
        </View>

        <MaterialCommunityIcons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={24}
          color="#64748b"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={tw`max-h-80`}>
          {staffSalesData.map((item, index) =>
            renderStaffSalesItem(item, index)
          )}
        </View>
      )}
    </View>
  );
};

// Helper function to format time as "10 minutes ago" etc.
const formatTimeAgo = (dateString: string | null) => {
  if (!dateString) return "No sales yet";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) {
    return "just now";
  } else if (diffMins < 60) {
    return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
  } else {
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    } else {
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`;
    }
  }
};

export default StaffSalesActivity;
