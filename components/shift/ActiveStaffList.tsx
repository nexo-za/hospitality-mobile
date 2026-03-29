import React, { useEffect, useState } from "react";
import { View, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift } from "@/app/contexts/ShiftContext";
import { ShiftAPI } from "@/api/services";

// Format a date string to a human-readable format
const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // For today, show just the time
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // For yesterday, show 'Yesterday' and the time
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }

  // For other dates, show the full date and time
  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface ActiveStaffListProps {
  compact?: boolean;
  onStaffSelect?: (staffId: string) => void;
}

const ActiveStaffList: React.FC<ActiveStaffListProps> = ({
  compact = false,
  onStaffSelect,
}) => {
  const { currentShift } = useShift();
  const [hasActive, setHasActive] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        if (currentShift) {
          mounted && setHasActive(true);
          return;
        }
        const resp = await ShiftAPI.getActiveShift({});
        mounted && setHasActive(Boolean(resp?.has_active_shift && resp.active_shift));
      } catch {
        mounted && setHasActive(false);
      }
    };
    check();
    return () => {
      mounted = false;
    };
  }, [currentShift]);

  if (!hasActive || !currentShift || !currentShift.activeStaff || currentShift.activeStaff.length === 0) {
    return (
      <View style={tw`bg-white rounded-lg p-4 border border-gray-200`}>
        <GeistText style={[tw`text-gray-500 text-center`, typography.body]}>
          No active shift
        </GeistText>
      </View>
    );
  }

  const renderStaffItem = (
    item: (typeof currentShift.activeStaff)[0],
    index: number
  ) => {
    return (
      <TouchableOpacity
        key={item.staffId}
        style={tw`flex-row items-center p-3 border-b border-gray-100`}
        onPress={() => onStaffSelect && onStaffSelect(item.staffId)}
        disabled={!onStaffSelect}
      >
        <View style={tw`mr-3`}>
          <MaterialCommunityIcons
            name="account-circle"
            size={compact ? 30 : 40}
            color="#3b82f6"
          />
        </View>

        <View style={tw`flex-1`}>
          <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
            {item.name}
          </GeistText>
          <GeistText style={[tw`text-gray-500`, typography.caption]}>
            Joined {formatDate(item.joinTime)}
          </GeistText>
        </View>

        {onStaffSelect && (
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color="#64748b"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={tw`bg-white rounded-lg border border-gray-100 `}>
      <View style={tw`flex-row items-center p-3 border-b border-gray-100`}>
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
            {currentShift.activeStaff.length}
          </GeistText>
        </View>
      </View>

      <View style={tw`pb-1`}>
        {currentShift.activeStaff.map((item, index) =>
          renderStaffItem(item, index)
        )}
      </View>
    </View>
  );
};

export default ActiveStaffList;
