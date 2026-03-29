import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text as GeistText } from "@/components/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import StaffSelector from "@/components/staff/StaffSelector";
import { useAuth } from "@/contexts/AuthContext";

interface StaffHeaderProps {
  showStoreInfo?: boolean;
  compact?: boolean;
  variant?: 'default' | 'onDark';
}

const StaffHeader: React.FC<StaffHeaderProps> = ({
  showStoreInfo = true,
  compact = false,
  variant = 'default',
}) => {
  const { currentStaff } = useStaffSession();
  const { user } = useAuth();

  // Get store ID from current staff, else from user (supports snake_case and camelCase)
  const storeId = currentStaff?.storeId
    ? Number(currentStaff.storeId)
    : (user as any)?.store_id != null
    ? Number((user as any).store_id)
    : (user as any)?.storeId != null
    ? Number((user as any).storeId)
    : 0;

  const storeName = currentStaff?.storeName || user?.storeName || (user as any)?.store_name || "";

  return (
    <View
      style={tw`${
        compact ? "" : "bg-red-50 border-b border-red-200 px-4 py-2"
      } flex-row items-center`}
    >
      {showStoreInfo && !compact && !!storeName && (
        <View style={tw`flex-row items-center mr-4`}>
          <GeistText style={[tw`text-gray-700` , typography.bodyBold]} numberOfLines={1}>
            {storeName}
          </GeistText>
        </View>
      )}

      <View style={tw`max-w-[180px]`}>
        <StaffSelector storeId={storeId} compact={compact} variant={variant} />
      </View>
    </View>
  );
};

export default StaffHeader;
