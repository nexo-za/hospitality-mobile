import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift } from "@/app/contexts/ShiftContext";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { Button } from "@/components/base/Button";

interface LeaveShiftButtonProps {
  compact?: boolean;
}

const LeaveShiftButton: React.FC<LeaveShiftButtonProps> = ({
  compact = false,
}) => {
  const { currentShift, leaveShift, isShiftActive } = useShift();
  const { currentStaff } = useStaffSession();
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState("");

  // Check if there's an active shift
  if (!isShiftActive || !currentShift) {
    return null;
  }

  // Check if current staff is in the shift
  const isStaffInShift = currentShift.activeStaff?.some(
    (staff) => staff.staffId === currentStaff?.staffId
  );

  // If staff is not in the shift, don't show the leave button
  if (!isStaffInShift || !currentStaff) {
    return null;
  }

  const handleOpenModal = () => {
    setModalVisible(true);
  };

  const handleLeaveShift = async () => {
    try {
      setLoading(true);
      console.log(
        `Leaving shift as ${currentStaff.displayName} (${currentStaff.staffId})`
      );

      await leaveShift(currentStaff.staffId, reason || undefined);

      setModalVisible(false);
      Alert.alert("Success", "You have left the shift.", [{ text: "OK" }]);
    } catch (error) {
      console.error("Error leaving shift:", error);
      Alert.alert("Error", "Could not leave the shift. Please try again.", [
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
        } bg-red-50 rounded-lg border border-red-100`}
        onPress={handleOpenModal}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ef4444" style={tw`mr-2`} />
        ) : (
          <MaterialCommunityIcons
            name="account-arrow-right"
            size={compact ? 18 : 24}
            color="#ef4444"
            style={tw`mr-2`}
          />
        )}
        <GeistText style={[tw`text-red-700`, typography.bodyBold]}>
          Leave Shift
        </GeistText>
      </TouchableOpacity>

      {/* Leave Shift Confirmation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center`}
        >
          <View style={tw`bg-white rounded-2xl w-4/5 max-w-md p-4`}>
            <View style={tw`mb-4`}>
              <GeistText style={[tw`text-gray-900 text-center`, typography.h2]}>
                Leave Shift
              </GeistText>
              <GeistText
                style={[tw`text-gray-500 text-center mt-2`, typography.body]}
              >
                Are you sure you want to leave the current shift? The shift will
                remain active for other staff members.
              </GeistText>
            </View>

            <View style={tw`mb-4`}>
              <GeistText style={[tw`text-gray-700 mb-1`, typography.bodyBold]}>
                Reason for leaving (optional)
              </GeistText>
              <TextInput
                style={tw`border border-gray-200 rounded-lg px-3 py-2 text-gray-700`}
                placeholder="Enter reason"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={tw`flex-row justify-end mt-4`}>
              <TouchableOpacity
                style={tw`mr-2 px-4 py-2 bg-gray-100 rounded-lg`}
                onPress={() => setModalVisible(false)}
              >
                <GeistText style={[tw`text-gray-700`, typography.bodyBold]}>
                  Cancel
                </GeistText>
              </TouchableOpacity>

              <Button
                label="Leave Shift"
                variant="primary"
                onPress={handleLeaveShift}
                loading={loading}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default LeaveShiftButton;
