import React from "react";
import { View, TouchableOpacity, FlatList } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift } from "@/app/contexts/ShiftContext";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import JoinShiftButton from "./JoinShiftButton";
import LeaveShiftButton from "./LeaveShiftButton";

interface ShiftStaffStatusProps {
  storeId: number;
  compact?: boolean;
}

const ShiftStaffStatus: React.FC<ShiftStaffStatusProps> = ({
  storeId,
  compact = false,
}) => {
  const { currentShift, isShiftActive } = useShift();
  const { currentStaff } = useStaffSession();

  // If no active shift, don't show anything
  if (!isShiftActive || !currentShift) {
    return null;
  }

  // Check if current staff is in the shift
  const isStaffInShift =
    currentStaff &&
    currentShift.activeStaff?.some(
      (staff) => staff.staffId === currentStaff.staffId
    );

  const renderStaffItem = ({ item }: { item: any }) => {
    const isCurrentStaff = currentStaff?.staffId === item.staffId;

    return (
      <View
        style={tw`flex-row items-center p-3 ${
          isCurrentStaff ? "bg-blue-50" : ""
        } border-b border-gray-100`}
      >
        <View style={tw`mr-3 relative`}>
          <MaterialCommunityIcons
            name="account-circle"
            size={compact ? 30 : 40}
            color={isCurrentStaff ? "#3b82f6" : "#64748b"}
          />
          <View
            style={tw`absolute bottom-0 right-0 w-2 h-2 rounded-full bg-green-500 border border-white`}
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
            {formatTimeAgo(item.joinTime)}
          </GeistText>
        </View>

        {isCurrentStaff && (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="#3b82f6"
          />
        )}
      </View>
    );
  };

  return (
    <View style={tw`bg-white rounded-lg border border-gray-200 mb-4`}>
      <View
        style={tw`flex-row justify-between items-center p-3 border-b border-gray-100`}
      >
        <View style={tw`flex-row items-center`}>
          <MaterialCommunityIcons
            name="account-group"
            size={20}
            color="#3b82f6"
            style={tw`mr-2`}
          />
          <GeistText style={[tw`text-gray-900`, typography.h3]}>
            Active Staff
          </GeistText>
          <View style={tw`ml-2 bg-blue-100 rounded-full px-2 py-0.5`}>
            <GeistText
              style={[tw`text-blue-700 font-semibold`, typography.caption]}
            >
              {currentShift.activeStaff?.length || 0}
            </GeistText>
          </View>
        </View>

        <View style={tw`flex-row`}>
          {!isStaffInShift && (
            <JoinShiftButton storeId={storeId} compact={true} />
          )}

          {isStaffInShift && <LeaveShiftButton compact={true} />}
        </View>
      </View>

      {currentShift.activeStaff && currentShift.activeStaff.length > 0 ? (
        <FlatList
          data={currentShift.activeStaff}
          keyExtractor={(item) => item.staffId}
          renderItem={renderStaffItem}
          style={tw`max-h-60`}
        />
      ) : (
        <View style={tw`p-4`}>
          <GeistText style={[tw`text-gray-500 text-center`, typography.body]}>
            No active staff members in this shift
          </GeistText>
        </View>
      )}
    </View>
  );
};

// Helper function to format time as "10 minutes ago" etc.
const formatTimeAgo = (dateString: string) => {
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

export default ShiftStaffStatus;
