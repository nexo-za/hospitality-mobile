import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { Button } from "@/components/base/Button";
import api from "@/api/api";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { useAuth } from "@/contexts/AuthContext";

interface PINVerificationProps {
  staffId: string;
  onVerified: (userId: string) => void;
  onCancel: () => void;
}

const PINVerification = ({
  staffId,
  onVerified,
  onCancel,
}: PINVerificationProps) => {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [staffName, setStaffName] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [validated, setValidated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { currentStaff } = useStaffSession();
  const { user } = useAuth();

  // When component mounts, validate staff ID
  useEffect(() => {
    validateStaffId();
  }, [staffId]);

  const validateStaffId = async () => {
    try {
      setLookupLoading(true);
      setError("");

      console.log(`Validating staff ID: ${staffId}`);

      // Use the validate_staff_id endpoint to validate staff
      const { data: response } = await api.get("/validate_staff_id", {
        params: { staff_id: staffId },
      });

      console.log("Validate staff response:", JSON.stringify(response));

      if (
        response &&
        response.status === "success" &&
        response.data &&
        response.data.message === "Validated Successfully" &&
        response.data.name
      ) {
        const name = response.data.name;
        const userIdFromResponse = response.data.user_id;
        console.log(`Staff validated: ${name}`);
        setStaffName(name);
        setValidated(true);

        // Use the user_id directly from the validation response
        if (userIdFromResponse) {
          console.log(`Found user ID ${userIdFromResponse} in validation response`);
          setUserId(userIdFromResponse.toString());
        } else {
          // Fallback to the complex lookup if user_id is not in validation response
          await getUserIdForStaff(staffId);
        }
      } else {
        console.error("Failed to validate staff ID:", staffId);
        setError("Invalid staff ID. Please try again.");
      }
    } catch (error) {
      console.error("Error validating staff ID:", error);
      setError("Failed to verify staff identity. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const getUserIdForStaff = async (staffId: string) => {
    try {
      console.log(`Looking up user ID for staff ID: ${staffId}`);

      // Instead of hardcoded mappings, fetch all users to get the staff_id to user_id mapping
      try {
        // Get all users to map staff_id to user_id
        const { data: usersResponse } = await api.get("/users");
        console.log("Users response:", JSON.stringify(usersResponse));

        const usersData = usersResponse?.data ?? usersResponse;
        if (usersData && Array.isArray(usersData)) {
          const users = usersData;
          console.log(`Found ${users.length} users in system`);

          // Find the user with matching staff_id
          const matchingUser = users.find(
            (user: { id: number | string; staff_id: string }) =>
              user.staff_id === staffId
          );

          if (matchingUser) {
            const userId = matchingUser.id.toString();
            console.log(`Found user with ID ${userId} for staff ID ${staffId}`);

            // Set this as the user ID for verification
            setUserId(userId);
            return;
          } else {
            console.warn(
              `No user found with staff ID ${staffId} in users list`
            );
          }
        } else {
          console.warn("Invalid or empty users response format");
        }
      } catch (userFetchError) {
        console.error("Error fetching users:", userFetchError);
        console.log("Falling back to staff search by store");
      }

      // Fallback: Get staff by store to find the user with this staff ID
      const fallbackStoreId = Number(
        (currentStaff?.storeId as any) ?? (user as any)?.store_id ?? (user as any)?.storeId ?? 0
      );

      if (!fallbackStoreId) {
        console.warn(
          "No store ID available from context; cannot fetch staff by store for fallback."
        );
        throw new Error("Missing store ID for staff lookup fallback");
      }

      console.log(`Fallback staff lookup using store ID: ${fallbackStoreId}`);
      const { data: staffByStoreResp } = await api.get("/get_staff_by_store", {
        params: { store_id: fallbackStoreId },
      });

      console.log("Staff search response:", JSON.stringify(staffByStoreResp));

      const staffList = staffByStoreResp?.data ?? staffByStoreResp;
      if (staffList && Array.isArray(staffList)) {
        console.log(
          `Found ${staffList.length} staff members in store`
        );

        const staffMember = staffList.find(
          (staff: any) => staff.staff_id === staffId
        );

        console.log(
          `Staff member search result:`,
          staffMember ? JSON.stringify(staffMember) : "Staff not found"
        );

        if (staffMember && staffMember.user_id) {
          // If the API directly provides the user_id with the staff, use it
          setUserId(staffMember.user_id.toString());
          console.log(
            `Found user ID ${staffMember.user_id} directly from staff member data`
          );
          return;
        } else if (staffMember && staffMember.name) {
          console.log(
            `Found staff with name: "${staffMember.name}" but no direct user ID`
          );

          // If we have a separate endpoint to get user by name, could try that here
          // For now, we'll use the fallback below
        }
      }

      // If we get here, we couldn't find or map the user ID
      console.warn(
        "Could not dynamically map staff ID to user ID. Please check API responses.",
        staffId
      );

      // Try one more approach - send the staff_id to the validation endpoint directly
      // The backend might be able to handle the mapping
      try {
        const { data: validationResponse } = await api.post("/verify_staff", {
          staff_id: staffId,
        });

        if (validationResponse && validationResponse.user_id) {
          console.log(
            `Backend provided user ID ${validationResponse.user_id} for staff ID ${staffId}`
          );
          setUserId(validationResponse.user_id.toString());
          return;
        }
      } catch (validationError) {
        console.error("Staff validation failed:", validationError);
      }

      // As a very last resort, fall back to using staff ID, though this will likely fail
      console.error(
        `WARNING: Could not map staff ID ${staffId} to a user ID. Authentication will likely fail.`
      );
      setUserId(staffId);
    } catch (error) {
      console.error("Error looking up user ID:", error);
      // Fallback in case of overall error
      console.error(
        `Error occurred during lookup process for staff ID ${staffId}`
      );
      setUserId(staffId);
    }
  };

  const handleVerify = async () => {
    if (!pin.trim()) {
      setError("Please enter your PIN");
      return;
    }

    if (!validated || !staffId) {
      setError("Staff identity could not be verified. Please try again.");
      return;
    }

    if (!userId) {
      console.warn("No user ID found, falling back to staff ID");
      setUserId(staffId);
    }

    console.log("userId", userId);
    console.log("pin", pin);
    console.log("validated", validated);
    console.log("staffId", staffId);

    try {
      setLoading(true);
      setError("");

      // Create the payload object we'll send to the API
      const payload = {
        user_id: userId,
        pin,
      };

      console.log(`Verifying PIN with payload:`, JSON.stringify(payload));

      // Call the API to verify PIN using user_id and pin
      const { data: response } = await api.post("/verify_pin", payload);

      console.log("PIN verification response:", JSON.stringify(response));

      if (response && response.status === "success") {
        console.log(`PIN verified successfully for user ID: ${userId}`);

        // PIN verified successfully
        onVerified(userId || staffId);
      } else {
        console.log(
          `PIN verification failed with response:`,
          JSON.stringify(response)
        );
        setError("Invalid PIN. Please try again.");
      }
    } catch (error: any) {
      console.error("Error verifying PIN:", error);
      if (error.response) {
        console.error(
          "Error response data:",
          JSON.stringify(error.response.data)
        );
        console.error("Error response status:", error.response.status);
      }
      setError("Failed to verify PIN. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={true}
      onRequestClose={onCancel}
    >
      <View
        style={tw`flex-1 bg-black bg-opacity-50 justify-center items-center p-5`}
      >
        <View style={tw`bg-white rounded-2xl w-full max-w-md p-6`}>
          <View style={tw`flex-row justify-between items-center mb-4`}>
            <GeistText style={[tw`text-gray-900`, typography.h2]}>
              Staff PIN Verification
            </GeistText>
            <TouchableOpacity onPress={onCancel}>
              <MaterialCommunityIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {lookupLoading ? (
            <View style={tw`items-center py-4`}>
              <GeistText style={[tw`text-gray-500 mb-2`, typography.body]}>
                Verifying staff identity...
              </GeistText>
              <View
                style={tw`w-8 h-8 border-t-2 border-r-2 border-blue-500 rounded-full animate-spin`}
              />
            </View>
          ) : validated ? (
            <>
              <GeistText style={[tw`text-gray-500 mb-2`, typography.body]}>
                Please enter your PIN to verify your identity.
              </GeistText>

              {staffName && (
                <View
                  style={tw`bg-blue-50 rounded-lg p-3 mb-4 flex-row items-center`}
                >
                  <MaterialCommunityIcons
                    name="account-check"
                    size={20}
                    color="#3b82f6"
                    style={tw`mr-2`}
                  />
                  <GeistText style={[tw`text-blue-700`, typography.bodyMedium]}>
                    {staffName}
                  </GeistText>
                </View>
              )}

              <View style={tw`mb-4`}>
                <GeistText
                  style={[
                    tw`text-neutral-darkGray mb-1`,
                    typography.bodyMedium,
                  ]}
                >
                  PIN
                </GeistText>
                <View
                  style={[
                    tw`flex-row items-center border rounded-md px-4 h-[48px] bg-white`,
                    tw`border-neutral-border`,
                    error ? tw`border-status-error` : null,
                  ]}
                >
                  <TextInput
                    value={pin}
                    onChangeText={setPin}
                    placeholder="Enter your PIN"
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={6}
                    style={[tw`flex-1`, typography.body]}
                  />
                </View>
                {error ? (
                  <GeistText
                    style={[tw`text-status-error mt-1`, typography.caption]}
                  >
                    {error}
                  </GeistText>
                ) : null}
              </View>

              <View style={tw`flex-row justify-end mt-4`}>
                <Button variant="text" onPress={onCancel} style={tw`mr-3`}>
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  onPress={handleVerify}
                  loading={loading}
                  disabled={loading}
                >
                  Verify
                </Button>
              </View>
            </>
          ) : (
            <>
              <GeistText style={[tw`text-gray-500 mb-2`, typography.body]}>
                Could not verify staff identity. Please try again.
              </GeistText>

              {error ? (
                <GeistText
                  style={[tw`text-status-error mt-1 mb-4`, typography.caption]}
                >
                  {error}
                </GeistText>
              ) : null}

              <View style={tw`flex-row justify-end mt-4`}>
                <Button variant="text" onPress={onCancel}>
                  Cancel
                </Button>

                <Button
                  variant="primary"
                  onPress={validateStaffId}
                  loading={lookupLoading}
                  disabled={lookupLoading}
                  style={tw`ml-3`}
                >
                  Retry
                </Button>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default PINVerification;
