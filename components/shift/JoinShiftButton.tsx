import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift } from "@/app/contexts/ShiftContext";
import { useStaffSession, StaffSession } from "@/contexts/StaffSessionContext";
import StaffSelector from "@/components/staff/StaffSelector";

interface JoinShiftButtonProps {
  storeId: number;
  compact?: boolean;
}

const JoinShiftButton: React.FC<JoinShiftButtonProps> = ({
  storeId,
  compact = false,
}) => {
  const { currentShift, joinShift, isShiftActive } = useShift();
  const { currentStaff } = useStaffSession();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check if there's an active shift to join
  if (!isShiftActive) {
    return null;
  }

  // Check if current staff is already in the shift
  const isStaffInShift = currentShift?.activeStaff?.some(
    (staff) => staff.staffId === currentStaff?.staffId
  );

  // If staff is already in the shift, don't show the join button
  if (isStaffInShift) {
    return null;
  }

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleStaffSelect = async (
    staffId: string,
    staffName: string,
    userId: number
  ) => {
    try {
      setLoading(true);
      console.log(`Joining shift as ${staffName} (${staffId})`);

      await joinShift(staffId, staffName, userId);

      setModalVisible(false);
      Alert.alert("Success", `You have joined the shift as ${staffName}.`, [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error joining shift:", error);
      Alert.alert("Error", "Could not join the shift. Please try again.", [
        { text: "OK" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={tw`flex-row items-center ${
          compact ? "px-2 py-1" : "px-3 py-2"
        } bg-green-100 rounded-lg border border-green-200`}
        onPress={handleOpenModal}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#22c55e" style={tw`mr-2`} />
        ) : (
          <MaterialCommunityIcons
            name="account-plus"
            size={compact ? 18 : 24}
            color="#22c55e"
            style={tw`mr-2`}
          />
        )}
        <GeistText style={[tw`text-green-700`, typography.bodyBold]}>
          Join Active Shift
        </GeistText>
      </TouchableOpacity>

      {/* Staff Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl max-h-96`}>
            <View
              style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}
            >
              <GeistText style={[tw`text-gray-900`, typography.h2]}>
                Join Shift as Staff
              </GeistText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <StaffSelector
              storeId={storeId}
              onSelectStaff={handleStaffSelect}
              hideCurrentStaff={true}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default JoinShiftButton;
