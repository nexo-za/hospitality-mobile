import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import {
  useStaffSession,
  StaffSession,
  refreshStaffSessionsFromStorage,
} from "@/contexts/StaffSessionContext";
import { useShift } from "@/app/contexts/ShiftContext";
import api from "@/api/api";
import { StoreStaff, AccountInfo } from "@/src/types/apiTypes";
import PINVerification from "@/components/staff/PINVerification";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";

const ACTIVE_STAFF_KEY = "pos_active_staff";
const CURRENT_STAFF_KEY = "pos_current_staff";

interface StaffSelectorProps {
  storeId: number;
  onStaffChange?: (staff: StaffSession) => void;
  showCurrentStaff?: boolean;
  compact?: boolean;
  variant?: 'default' | 'onDark';
}

const StaffSelector = ({
  storeId,
  onStaffChange,
  showCurrentStaff = true,
  compact = false,
  variant = 'default',
}: StaffSelectorProps) => {
  const onDark = variant === 'onDark';
  const {
    activeStaff,
    currentStaff,
    switchToStaff,
    addStaffSession,
    refreshSessions,
  } = useStaffSession();
  const { user } = useAuth();
  const { joinShift, isShiftActive } = useShift();
  const [modalVisible, setModalVisible] = useState(false);
  const [storeStaff, setStoreStaff] = useState<StoreStaff[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffSession | null>(null);
  const [showPINVerification, setShowPINVerification] = useState(false);

  // Fetch available staff for the store
  useEffect(() => {
    if (modalVisible) {
      fetchStoreStaff();
    }
  }, [modalVisible, storeId]);

  const fetchStoreStaff = async () => {
    try {
      setLoading(true);
      // Derive effective store ID: prefer valid prop, else context; if mismatch, prefer authenticated user's store
      // Prefer authenticated user's store over possibly stale staff session
      const userStoreId = Number(
        (user as any)?.store_id ?? (user as any)?.storeId ?? (currentStaff?.storeId as any) ?? 0
      );

      let effectiveStoreId = Number(storeId || 0);
      if (!effectiveStoreId || effectiveStoreId <= 0) {
        effectiveStoreId = userStoreId;
      }

      if (
        effectiveStoreId > 0 &&
        userStoreId > 0 &&
        effectiveStoreId !== userStoreId
      ) {
        // Prefer authenticated user's store silently
        effectiveStoreId = userStoreId;
      }

      console.log(`Fetching staff for store ID: ${effectiveStoreId}`);

      // Check if storeId is valid
      if (!effectiveStoreId || effectiveStoreId <= 0) {
        console.error("Invalid store ID:", effectiveStoreId);
        setStoreStaff([]);
        return;
      }

      // Add cache-busting parameter and headers
      const timestamp = Date.now();
      const response = await api.get("/get_staff_by_store", {
        params: {
          store_id: effectiveStoreId,
          _t: timestamp,
        },
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
      console.log("Staff fetch response:", response.data);

      const staffData = response.data?.data ?? response.data;
      if (staffData && Array.isArray(staffData)) {
        console.log(`Found ${staffData.length} staff members`);
        setStoreStaff(staffData);

        // Reconcile currentStaff displayName/storeName from fresh list to avoid stale header
        if (currentStaff?.staffId) {
          const match = (staffData as any[]).find(
            (s) => String(s.staff_id) === String(currentStaff.staffId)
          );
          if (match) {
            const updated = {
              ...currentStaff,
              displayName: match.name || currentStaff.displayName,
              storeId: match.storeId ?? currentStaff.storeId,
              storeName: match.storeName ?? currentStaff.storeName,
            };
            try {
              // Update CURRENT and ACTIVE caches, then refresh context state
              const activeJson = await AsyncStorage.getItem(ACTIVE_STAFF_KEY);
              const active = activeJson ? JSON.parse(activeJson) : [];
              const nextActive = active.map((s: any) =>
                String(s.staffId) === String(updated.staffId) ? { ...s, ...updated } : s
              );
              await AsyncStorage.setItem(ACTIVE_STAFF_KEY, JSON.stringify(nextActive));
              await AsyncStorage.setItem(CURRENT_STAFF_KEY, JSON.stringify(updated));
              await refreshSessions();
            } catch {}
          }
        }

        // Ensure default/current staff is from this store and not stale
        try {
          const list: any[] = staffData as any[];
          const hasCurrentInList = currentStaff
            ? list.some((s) => String(s.staff_id) === String(currentStaff.staffId))
            : false;
          const currentStoreMatches = currentStaff
            ? Number(currentStaff.storeId) === Number(effectiveStoreId)
            : false;

          if (!currentStaff || !hasCurrentInList || !currentStoreMatches) {
            // Prefer staff with same userId as authenticated user; fallback to first
            const preferred = list.find(
              (s) => Number(s.userId) === Number((user as any)?.id)
            ) || list[0];

            if (preferred) {
              const newSession: StaffSession = {
                staffId: String(preferred.staff_id),
                userId: Number(preferred.userId),
                userName: preferred.username || "",
                displayName: preferred.name || "",
                role: preferred.role || "",
                storeId: Number(preferred.storeId ?? effectiveStoreId),
                storeName: preferred.storeName || "",
                lastActive: Date.now(),
              } as any;

              // Upsert into ACTIVE and set CURRENT, then refresh context
              const activeJson = await AsyncStorage.getItem(ACTIVE_STAFF_KEY);
              const active = activeJson ? JSON.parse(activeJson) : [];
              const filtered = active.filter(
                (s: any) => String(s.staffId) !== String(newSession.staffId)
              );
              const nextActive = [...filtered, newSession];
              await AsyncStorage.setItem(
                ACTIVE_STAFF_KEY,
                JSON.stringify(nextActive)
              );
              await AsyncStorage.setItem(
                CURRENT_STAFF_KEY,
                JSON.stringify(newSession)
              );
              await refreshSessions();
            }
          }
        } catch {}
      } else {
        console.error("No staff data returned:", response);
        setStoreStaff([]);
      }
    } catch (error) {
      console.error("Error fetching store staff:", error);
      setStoreStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = (staff: StoreStaff) => {
    // Check if the staff is already active
    const existingStaff = activeStaff.find((s) => s.staffId === staff.staff_id);

    if (existingStaff) {
      // Staff is already active, switch directly
      handleStaffSwitch(existingStaff);
    } else {
      // New staff needs PIN verification
      // Show PIN verification for the staff
      setSelectedStaff({
        staffId: staff.staff_id,
        userId: "", // Will be set after verification
        userName: "",
        displayName: staff.name,
        role: staff.role,
        storeId: staff.storeId,
        storeName: staff.storeName,
        lastActive: Date.now(),
      });
      setShowPINVerification(true);
    }
  };

  const handlePINVerified = async (userId: string) => {
    if (selectedStaff) {
      try {
        console.log(`Getting user information for user ID: ${userId}`);

        // Find the corresponding user in the staff list to get their full information
        const staffData = storeStaff.find(
          (staff) => staff.staff_id === selectedStaff.staffId
        );

        if (!staffData) {
          console.error(
            `Could not find staff data for staff ID: ${selectedStaff.staffId}`
          );
        } else {
          console.log(
            `Found staff data from list: ${JSON.stringify(staffData)}`
          );
          // Immediately use the name from the staff data as the primary source of truth
          selectedStaff.displayName = staffData.name;
        }

        // Try to get additional user information from the API
        let username = "";
        let validUserData = false;

        try {
          // Fetch user details based on user ID
          const userResponse = await api.get("/users", {
            params: { user_id: userId },
          });
          const userRespData = userResponse.data?.data ?? userResponse.data;
          console.log(
            "User details response:",
            JSON.stringify(userRespData)
          );

          if (Array.isArray(userRespData) && userRespData.length > 0) {
            const userData = userRespData[0];

            if (userData.id.toString() === userId.toString()) {
              username = userData.username || "";
              validUserData = true;
            } else {
              console.warn(
                `User ID mismatch: API returned ${userData.id} when looking up ${userId}`
              );
            }
          } else {
            console.warn(`No user data found for user ID: ${userId}`);
          }
        } catch (userError) {
          console.error("Error fetching user details:", userError);
        }

        // If we couldn't get the username from API, derive it from the user ID
        if (!username) {
          switch (userId) {
            case "1":
              username = "superuser";
              break;
            case "2":
              username = "kiosk@nexo.app";
              break;
            case "3":
              username = "warehouse";
              break;
            case "4":
              username = "kiosk2@nexo.com";
              break;
            default:
              username = `user${userId}`;
          }
        }

        // Update selected staff with verified user ID and complete information
        const verifiedStaff: StaffSession = {
          ...selectedStaff,
          userId,
          userName: username,
          // Always prioritize the name from staffData over anything else
          displayName:
            staffData && staffData.name
              ? staffData.name
              : selectedStaff.displayName || `User ${userId}`,
          lastActive: Date.now(),
        };

        console.log(`Verified staff with final information:`, verifiedStaff);

        // Add to active staff and switch to it
        handleStaffSwitch(verifiedStaff);
      } catch (error) {
        console.error("Error processing verified staff:", error);
        // Still try to continue with basic info if we have an error
        const verifiedStaff: StaffSession = {
          ...selectedStaff,
          userId,
          lastActive: Date.now(),
        };
        handleStaffSwitch(verifiedStaff);
      }
    }

    setShowPINVerification(false);
    setSelectedStaff(null);
  };

  const handlePINCancel = () => {
    setShowPINVerification(false);
    setSelectedStaff(null);
  };

  const handleStaffSwitch = async (staff: StaffSession) => {
    try {
      // First, add the staff to active sessions if it's not already present
      const existingStaff = activeStaff.find(
        (s) => s.staffId === staff.staffId
      );

      if (!existingStaff) {
        console.log(
          `Adding staff ${staff.staffId} to active sessions with user ID ${staff.userId}`
        );

        // First, get the staff data from the store staff list
        // This ensures we're using the name directly from the API response
        const staffDataFromList = storeStaff.find(
          (s) => s.staff_id === staff.staffId
        );

        if (staffDataFromList) {
          console.log(
            `Found staff in store list: ${JSON.stringify(staffDataFromList)}`
          );
          // Override displayName with the correct name from the staff list
          staff.displayName = staffDataFromList.name || staff.displayName;
          staff.storeId = staffDataFromList.storeId;
          staff.storeName = staffDataFromList.storeName;
        }

        // Initialize userData with known correct values
        let userData: AccountInfo = {
          user_id:
            typeof staff.userId === "string"
              ? parseInt(staff.userId)
              : staff.userId,
          username: staff.userName || "",
          first_name: "",
          last_name: "",
          email: "",
          contact_number: "",
          staff_id: staff.staffId,
          store: "",
          region_id: 0,
          region_name: "",
          role: staff.role || "",
          active: 1,
          store_id: Number(staff.storeId ?? storeId),
          store_name: staff.storeName || "",
        };

        // Try to get additional user information from the API
        try {
          // Fetch user details based on user ID
          const userResponse = await api.get("/users", {
            params: { user_id: staff.userId },
          });
          const userRespData2 = userResponse.data?.data ?? userResponse.data;
          console.log(
            "User details response:",
            JSON.stringify(userRespData2)
          );

          if (Array.isArray(userRespData2) && userRespData2.length > 0) {
            const user = userRespData2[0];

            if (user.id.toString() === staff.userId.toString()) {
              console.log(`Found matching user data for ID ${staff.userId}`);

              // Set username from API only if it doesn't conflict with staff
              userData.username = user.username || staff.userName || "";
              userData.first_name = user.first_name || "";
              userData.last_name = user.last_name || "";
              userData.email = user.email || "";
              userData.contact_number = user.contact_number || "";
              userData.role = user.role || staff.role || "";

              // Only update the username, don't change the displayName from store data
              staff.userName = user.username || staff.userName;
            } else {
              console.warn(
                `User ID mismatch: API returned ${user.id} when looking up ${staff.userId}`
              );
            }
          } else {
            console.warn(`No user data found for user ID: ${staff.userId}`);
          }
        } catch (userError) {
          console.error("Error fetching user details:", userError);
        }

        // PRIORITY: Always use the staff name from the store data for display
        // This ensures we're using the correct name from the API
        if (staffDataFromList && staffDataFromList.name) {
          console.log(
            `Using name from staff list: "${staffDataFromList.name}"`
          );
          staff.displayName = staffDataFromList.name;
          staff.storeId = staffDataFromList.storeId;
          staff.storeName = staffDataFromList.storeName;

          // Try to parse first/last name from display name
          const nameParts = staff.displayName.split(" ");
          if (nameParts.length > 0) {
            userData.first_name = nameParts[0] || userData.first_name;
            userData.last_name =
              nameParts.slice(1).join(" ") || userData.last_name;
          }
          // Ensure store info populated into userData as well
          userData.store_id = Number(staffDataFromList.storeId ?? userData.store_id);
          userData.store_name = staffDataFromList.storeName || userData.store_name;
        } else if (!staff.displayName) {
          // Fallback if we still don't have a displayName
          staff.displayName = `User ${staff.userId}`;
        }

        // Set appropriate username for the user ID if empty
        if (!staff.userName) {
          // Try to derive username based on user ID
          switch (staff.userId.toString()) {
            case "1":
              staff.userName = "superuser";
              break;
            case "2":
              staff.userName = "kiosk@nexo.app";
              break;
            case "3":
              staff.userName = "warehouse";
              break;
            case "4":
              staff.userName = "kiosk2@nexo.com";
              break;
            default:
              staff.userName = userData.username || `user${staff.userId}`;
          }
        }

        // Update the userData with our reliable information
        userData.username = staff.userName;

        console.log(`Final staff object before adding to session:`, staff);
        console.log(`Complete user data for staff session:`, userData);

        // Add the staff to active sessions
        await addStaffSession(userData);

        // For new staff, don't try to use switchToStaff - go directly to manual approach
        // since we know there's a race condition with the state not updating yet
        try {
          // Read the current state directly from AsyncStorage using the helper
          const { activeStaff: updatedActiveStaff } =
            await refreshStaffSessionsFromStorage();

          // Find the staff we just added
          const newlyAddedStaff = updatedActiveStaff.find(
            (s: { staffId: string }) => s.staffId === staff.staffId
          );

          if (newlyAddedStaff) {
            console.log(
              `Manually switching to newly added staff: ${staff.staffId} (User ID: ${staff.userId})`
            );

            // Update last active time
            const updatedStaff = {
              ...newlyAddedStaff,
              lastActive: Date.now(),
            };

            // Save as current staff directly to AsyncStorage
            await AsyncStorage.setItem(
              CURRENT_STAFF_KEY,
              JSON.stringify(updatedStaff)
            );
            console.log(
              `Manually set current staff to: ${updatedStaff.staffId} (User ID: ${updatedStaff.userId})`
            );

            // Refresh the sessions to update the UI
            await refreshSessions();
          } else {
            console.error(
              `Could not find newly added staff ${staff.staffId} in AsyncStorage`
            );
            throw new Error("Staff not found after adding to sessions");
          }
        } catch (manualSwitchError) {
          console.error(
            "Error with manual switch approach:",
            manualSwitchError
          );
          throw manualSwitchError;
        }
      } else {
        // Staff is already in activeStaff state, can use the regular switchToStaff
        await switchToStaff(staff.staffId);
      }

      // Add staff to the active shift if there is one
      if (isShiftActive) {
        try {
          // Ensure we're using the correct numerical user ID
          const userId =
            typeof staff.userId === "string"
              ? parseInt(staff.userId)
              : staff.userId;
          await joinShift(staff.staffId, staff.displayName, Number(userId));
          console.log(
            `Staff ${staff.staffId} (${staff.displayName}) with User ID ${userId} added to active shift`
          );
        } catch (shiftError) {
          console.error("Error adding staff to shift:", shiftError);
          // Continue with staff switch even if joining shift fails
        }
      }

      if (onStaffChange) {
        onStaffChange(staff);
      }
      // Optionally, emit a custom event here if needed for global cart clearing
      setModalVisible(false);
    } catch (error) {
      console.error("Error switching staff:", error);
      Alert.alert(
        "Staff Switch Error",
        "There was a problem switching staff. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Render the current staff indicator
  const renderCurrentStaff = () => {
    if (!showCurrentStaff) return null;

    // Placeholder when no current staff is selected yet
    if (!currentStaff) {
      return (
        <TouchableOpacity
          style={[
            tw`flex-row items-center ${compact ? "px-2 py-1" : "px-3 py-2"} rounded-lg max-w-[160px]`,
            onDark
              ? { backgroundColor: 'rgba(255,255,255,0.15)' }
              : tw`bg-white border border-gray-200`,
          ]}
          onPress={() => setModalVisible(true)}
        >
          <View
            style={[
              tw`w-6 h-6 rounded-full items-center justify-center mr-1.5`,
              onDark
                ? { backgroundColor: 'rgba(255,255,255,0.2)' }
                : tw`bg-gray-100`,
            ]}
          >
            <MaterialCommunityIcons
              name="account-question"
              size={compact ? 13 : 16}
              color={onDark ? '#ffffff' : '#9ca3af'}
            />
          </View>

          <GeistText
            style={[
              tw`${compact ? "text-xs max-w-[120px]" : ""}`,
              { color: onDark ? '#ffffff' : '#6b7280' },
              compact ? {} : typography.body,
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            Select staff
          </GeistText>

          <MaterialCommunityIcons
            name="chevron-down"
            size={compact ? 12 : 16}
            color={onDark ? 'rgba(255,255,255,0.7)' : '#9ca3af'}
            style={tw`ml-0.5`}
          />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        style={[
          tw`flex-row items-center ${compact ? "px-2 py-1" : "px-3 py-2"} rounded-lg max-w-[180px]`,
          onDark
            ? { backgroundColor: 'rgba(255,255,255,0.15)' }
            : tw`bg-white border border-gray-200`,
        ]}
        onPress={() => setModalVisible(true)}
      >
        <View
          style={[
            tw`w-6 h-6 rounded-full items-center justify-center mr-1.5`,
            onDark
              ? { backgroundColor: 'rgba(255,255,255,0.2)' }
              : tw`bg-blue-50`,
          ]}
        >
          <MaterialCommunityIcons
            name="account"
            size={compact ? 13 : 16}
            color={onDark ? '#ffffff' : '#3b82f6'}
          />
        </View>

        <GeistText
          style={[
            tw`${compact ? "text-xs max-w-[120px]" : ""}`,
            { color: onDark ? '#ffffff' : '#4b5563' },
            compact ? {} : typography.body,
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {currentStaff.displayName}
        </GeistText>

        <MaterialCommunityIcons
          name="chevron-down"
          size={compact ? 12 : 16}
          color={onDark ? 'rgba(255,255,255,0.7)' : '#9ca3af'}
          style={tw`ml-0.5`}
        />
      </TouchableOpacity>
    );
  };

  // Render a staff item in the dropdown
  const renderStaffItem = ({ item }: { item: StoreStaff }) => {
    // Check if this staff is the current active staff
    const isCurrentStaff = currentStaff?.staffId === item.staff_id;

    // Check if this staff is in the active staff list
    const isActiveStaff = activeStaff.some(
      (staff) => staff.staffId === item.staff_id
    );

    return (
      <TouchableOpacity
        style={[
          tw`flex-row items-center p-3 border-b border-gray-100`,
          isCurrentStaff && tw`bg-blue-50`,
        ]}
        onPress={() => handleStaffSelect(item)}
      >
        <View style={tw`mr-3 relative`}>
          <MaterialCommunityIcons
            name="account-circle"
            size={40}
            color={isCurrentStaff ? "#3b82f6" : "#64748b"}
          />
          {isActiveStaff && (
            <View
              style={tw`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white`}
            />
          )}
        </View>

        <View style={tw`flex-1`}>
          <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
            {item.name}
          </GeistText>
          <View style={tw`flex-row flex-wrap`}>
            {!!item.role && (
              <GeistText style={[tw`text-gray-500 mr-2`, typography.caption]}>
                {item.role}
              </GeistText>
            )}
            {!!item.username && (
              <GeistText style={[tw`text-gray-500 mr-2`, typography.caption]}>
                @{item.username}
              </GeistText>
            )}
            {!!item.storeName && (
              <GeistText style={[tw`text-gray-500`, typography.caption]}>
                {item.storeName}
              </GeistText>
            )}
          </View>
          {/* Email and phone removed per requirements */}
        </View>

        {isCurrentStaff && (
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color="#3b82f6"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View>
      {/* Current Staff Display */}
      {renderCurrentStaff()}

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
              <GeistText style={[tw`text-gray-900`, typography.h2]} numberOfLines={1}>
                {`Select Staff${currentStaff?.storeName ? ` - ${currentStaff.storeName}` : storeStaff?.[0]?.storeName ? ` - ${storeStaff[0].storeName}` : ""}`}
              </GeistText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={tw`p-8 items-center justify-center`}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <GeistText style={[tw`mt-4 text-gray-500`, typography.body]}>
                  Loading staff members...
                </GeistText>
              </View>
            ) : (
              <FlatList
                data={storeStaff}
                keyExtractor={(item) => item.staff_id}
                renderItem={renderStaffItem}
                contentContainerStyle={tw`pb-8`}
                ListEmptyComponent={
                  <View style={tw`p-8 items-center justify-center`}>
                    <MaterialCommunityIcons
                      name="account-alert"
                      size={40}
                      color="#64748b"
                    />
                    <GeistText
                      style={[tw`mt-4 text-gray-500`, typography.body]}
                    >
                      No staff members found for this store
                    </GeistText>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      {/* PIN Verification Modal */}
      {showPINVerification && selectedStaff && (
        <PINVerification
          staffId={selectedStaff.staffId}
          onVerified={handlePINVerified}
          onCancel={handlePINCancel}
        />
      )}
    </View>
  );
};

export default StaffSelector;
