import React, { useMemo } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Image,
  Animated,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift } from "../contexts/ShiftContext";
import { useRouter, useLocalSearchParams } from "expo-router";
import { AccountInfo } from "@/src/types/apiTypes";
import { LinearGradient } from "expo-linear-gradient";
import ActiveStaffList from "@/components/shift/ActiveStaffList";
import ShiftStaffStatus from "@/components/shift/ShiftStaffStatus";
import StaffSalesActivity from "@/components/shift/StaffSalesActivity";
import ShiftFileUpload from "@/components/shift/ShiftFileUpload";

const formatCurrency = (amount: number | undefined) => {
  if (amount === undefined || amount === null) {
    return "R0.00";
  }
  return `R${amount.toFixed(2)}`;
};

const formatDate = (dateString: string | undefined) => {
  if (!dateString) {
    return "N/A";
  }
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });
};

const formatShiftId = (id: string) => {
  if (!id) return "Unknown";
  // If id follows the pattern "shift_timestamp", extract part of the timestamp
  if (id.startsWith("shift_") && id.length > 6) {
    return id.substring(6, Math.min(14, id.length));
  }
  return id.substring(0, 8); // Just show first 8 chars
};

interface ShiftManagementScreenProps {
  userId: number;
  storeId: number;
  userData: AccountInfo | null;
}

export default function ShiftManagementScreen({
  userId,
  storeId,
  userData,
}: ShiftManagementScreenProps) {
  const { currentShift, shiftHistory, isShiftActive } = useShift();
  const router = useRouter();
  const params = useLocalSearchParams();
  const mode = params.mode as string;
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;

  // If mode is 'end', navigate to end shift screen
  React.useEffect(() => {
    if (mode === "end" && isShiftActive) {
      router.replace("/screens/EndShiftScreen");
    }
  }, [mode, isShiftActive, router]);

  const handleStartShift = () => {
    // Ensure we have valid user data
    if (!userData) {
      console.error("No user data available");
      return;
    }

    console.log("=== ShiftManagementScreen - Starting Shift ===");
    console.log("Raw userData:", userData);
    console.log("userData keys:", Object.keys(userData));

    // Pass the full user data as a stringified JSON
    const userDataString = JSON.stringify({
      id: userData.user_id,
      username: userData.username,
      email: userData.email,
      role: userData.role,
      store_id: userData.store_id || 0,
      store_name: userData.store_name || "",
      firstName: userData.first_name || "",
      lastName: userData.last_name || "",
      name:
        userData.username ||
        (userData.first_name && userData.last_name
          ? `${userData.first_name} ${userData.last_name}`.trim()
          : userData.username) ||
        "Unknown User",
    });

    console.log("=== ShiftManagementScreen - Navigation Parameters ===");
    console.log("userId:", userId);
    console.log("storeId:", storeId);
    console.log("userDataString length:", userDataString.length);
    console.log(
      "userDataString preview:",
      userDataString.substring(0, 100) + "..."
    );

    // Log the parsed data to verify it's correct
    try {
      const parsedData = JSON.parse(userDataString);
      console.log("=== ShiftManagementScreen - Parsed Navigation Data ===");
      console.log("Parsed userData:", parsedData);
      console.log("Parsed name field:", parsedData.name);
      console.log("Name field source:", {
        hasName: !!parsedData.name,
        hasUsername: !!parsedData.username,
        hasFirstName: !!parsedData.firstName,
        hasLastName: !!parsedData.lastName,
      });
    } catch (error) {
      console.error("Error parsing userDataString:", error);
    }

    console.log("=== ShiftManagementScreen - Navigation ===");
    console.log("Navigating to:", "/screens/StartShiftScreen");
    console.log("With params:", {
      userId: String(userId),
      storeId: String(storeId),
      userData: userDataString.substring(0, 100) + "...",
    });

    router.push({
      pathname: "/screens/StartShiftScreen",
      params: {
        userId: String(userId),
        storeId: String(storeId),
        userData: userDataString,
      },
    });
  };

  const handleEndShift = () => {
    router.push("/screens/EndShiftScreen");
  };

  const handleViewShiftDetails = (shiftId: string | number) => {
    router.push(`/screens/ViewShiftDetailsScreen?id=${shiftId.toString()}`);
  };

  const latestShifts = useMemo(() => {
    return shiftHistory.slice(0, 3);
  }, [shiftHistory]);

  const shiftStats = useMemo(() => {
    if (!currentShift) return null;

    return [
      {
        label: "Sales",
        value: formatCurrency(currentShift.salesTotal),
        icon: "cash-multiple" as const,
        color: "#4ade80",
      },
      {
        label: "Cash Sales",
        value: formatCurrency(currentShift.cashSales),
        icon: "cash" as const,
        color: "#22d3ee",
      },
      {
        label: "Card Sales",
        value: formatCurrency(currentShift.cardSales),
        icon: "credit-card" as const,
        color: "#a78bfa",
      },
      {
        label: "Transactions",
        value: currentShift.transactionCount.toString(),
        icon: "receipt" as const,
        color: "#f97316",
      },
    ];
  }, [currentShift]);

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header with Background Gradient */}
      <LinearGradient
        colors={isShiftActive ? ["#3b82f6", "#2563eb"] : ["#64748b", "#475569"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={tw`p-3 sm:p-5 md:p-6 border-b border-gray-100`}
      >
        <GeistText
          style={[
            tw`text-white ${isSmallMobile ? "text-xl" : "text-2xl"}`,
            typography.h1,
          ]}
        >
          Shift Management
        </GeistText>

        {currentShift && (
          <View style={tw`mt-2 flex-row items-center`}>
            <View
              style={tw`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-400 mr-2 animate-pulse`}
            />
            <GeistText
              style={[tw`text-white text-opacity-90`, typography.body]}
            >
              Active Shift • Started {formatDate(currentShift?.startTime)}
            </GeistText>
          </View>
        )}
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-3 sm:p-4 md:p-6`}
      >
        {/* Shift Status Card */}
        <View style={tw`mb-4 sm:mb-5 md:mb-6`}>
          {isShiftActive ? (
            <View
              style={tw`bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 `}
            >
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <GeistText style={[tw`text-gray-900`, typography.h2]}>
                  Current Shift
                </GeistText>
                <View style={tw`px-3 py-1 bg-green-100 rounded-full`}>
                  <GeistText
                    style={[tw`text-green-700`, typography.captionSemibold]}
                  >
                    ACTIVE
                  </GeistText>
                </View>
              </View>

              <GeistText style={[tw`text-gray-500 mb-4`, typography.caption]}>
                Your shift is currently active. Track staff, sales, and add
                attachments from this screen.
              </GeistText>

              <View style={tw`border-b border-gray-100 my-3 sm:my-4`} />

              {/* Staff Status Section - Replace old staff list with new component */}
              <ShiftStaffStatus storeId={storeId} />

              {/* Staff Sales Activity */}
              <StaffSalesActivity />

              {/* Shift File Upload */}
              {isShiftActive &&
                currentShift &&
                (() => {
                  // Debug logs outside of JSX
                  console.log(
                    `[ShiftManagementScreen] currentShift.id: ${
                      currentShift.id
                    } (type: ${typeof currentShift.id})`
                  );
                  console.log(
                    `[ShiftManagementScreen] Full currentShift:`,
                    JSON.stringify(currentShift, null, 2)
                  );

                  return (
                    <ShiftFileUpload
                      shiftId={currentShift.id}
                      userId={userId}
                      onUploadComplete={() => {
                        // Optionally refresh shift data or show success message
                      }}
                      onUploadError={(error) => {
                        console.error("Error uploading files:", error);
                        // Optionally show error message to user
                      }}
                    />
                  );
                })()}

              {/* Shift Stats */}
              <View style={tw`mt-4 mb-2`}>
                <GeistText style={[tw`text-gray-900 mb-1`, typography.h3]}>
                  Shift Performance
                </GeistText>
                <GeistText style={[tw`text-gray-500 mb-3`, typography.caption]}>
                  Track your sales performance metrics for this shift
                </GeistText>
              </View>

              <View style={tw`flex-row flex-wrap -mx-2`}>
                {shiftStats?.map((stat, index) => (
                  <View key={index} style={tw`w-1/2 px-2 mb-3`}>
                    <View style={tw`flex-row items-center`}>
                      <View
                        style={[
                          tw`w-10 h-10 rounded-full items-center justify-center mr-3`,
                          { backgroundColor: `${stat.color}20` },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={stat.icon}
                          size={22}
                          color={stat.color}
                        />
                      </View>
                      <View>
                        <GeistText
                          style={[tw`text-gray-500`, typography.caption]}
                        >
                          {stat.label}
                        </GeistText>
                        <GeistText
                          style={[tw`text-gray-900`, typography.bodyBold]}
                        >
                          {stat.value}
                        </GeistText>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={tw`bg-blue-50 mt-5 rounded-xl py-3 px-4 flex-row justify-center items-center`}
                onPress={handleEndShift}
              >
                <MaterialCommunityIcons
                  name="stop-circle"
                  size={20}
                  color="#3b82f6"
                  style={tw`mr-2`}
                />
                <GeistText style={[tw`text-blue-600`, typography.bodyBold]}>
                  End Current Shift
                </GeistText>
              </TouchableOpacity>
              <GeistText
                style={[
                  tw`text-gray-500 text-center mt-2 italic`,
                  typography.caption,
                ]}
              >
                End your shift when you're done for the day to finalize sales
                data
              </GeistText>
            </View>
          ) : (
            <View
              style={tw`bg-white rounded-2xl p-4 sm:p-5 md:p-6 border border-gray-100 `}
            >
              <View style={tw`flex-row justify-between items-center mb-2`}>
                <GeistText style={[tw`text-gray-900`, typography.h2]}>
                  No Active Shift
                </GeistText>
                <View style={tw`px-3 py-1 bg-gray-100 rounded-full`}>
                  <GeistText
                    style={[tw`text-gray-700`, typography.captionSemibold]}
                  >
                    INACTIVE
                  </GeistText>
                </View>
              </View>

              <View style={tw`border-b border-gray-100 my-3 sm:my-4`} />

              <View style={tw`items-center py-6`}>
                <View
                  style={tw`w-16 h-16 rounded-full bg-gray-100 mb-4 items-center justify-center`}
                >
                  <MaterialCommunityIcons
                    name="cash-register"
                    size={32}
                    color="#94a3b8"
                  />
                </View>
                <GeistText
                  style={[tw`text-gray-600 text-center mb-1`, typography.body]}
                >
                  No active shift is in progress
                </GeistText>
                <GeistText
                  style={[
                    tw`text-gray-500 text-center mb-4`,
                    typography.caption,
                  ]}
                >
                  Start a new shift to begin processing sales and tracking staff
                  activity
                </GeistText>

                <TouchableOpacity
                  style={tw`bg-blue-500 rounded-xl py-3 px-6 flex-row justify-center items-center`}
                  onPress={handleStartShift}
                >
                  <MaterialCommunityIcons
                    name="play-circle"
                    size={20}
                    color="white"
                    style={tw`mr-2`}
                  />
                  <GeistText style={[tw`text-white`, typography.bodyBold]}>
                    Start New Shift
                  </GeistText>
                </TouchableOpacity>
                <GeistText
                  style={[
                    tw`text-gray-500 text-center mt-3 italic`,
                    typography.caption,
                  ]}
                >
                  Starting a shift will allow you to track sales and manage
                  staff
                </GeistText>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <GeistText style={[tw`text-gray-900 mb-2 ml-1`, typography.h3]}>
          Quick Actions
        </GeistText>
        <GeistText style={[tw`text-gray-500 mb-3 ml-1`, typography.caption]}>
          Common actions for managing your shift
        </GeistText>

        <View style={tw`flex-row flex-wrap -mx-1.5 mb-5`}>
          {[
            {
              title: "Start Shift",
              icon: "play-circle" as const,
              color: "#22c55e",
              bgColor: "#dcfce7",
              action: handleStartShift,
              disabled: isShiftActive,
            },
            {
              title: "End Shift",
              icon: "stop-circle" as const,
              color: "#ef4444",
              bgColor: "#fee2e2",
              action: handleEndShift,
              disabled: !isShiftActive,
            },
          ].map((action, index) => (
            <View key={index} style={tw`w-1/2 sm:w-1/3 md:w-1/4 px-1.5 mb-3`}>
              <TouchableOpacity
                style={tw`bg-white rounded-xl p-3 border border-gray-100  items-center justify-center ${
                  action.disabled ? "opacity-50" : ""
                }`}
                onPress={action.action}
                disabled={action.disabled}
              >
                <View
                  style={[
                    tw`w-12 h-12 rounded-full items-center justify-center mb-2`,
                    { backgroundColor: action.bgColor },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={action.icon}
                    size={24}
                    color={action.color}
                  />
                </View>
                <GeistText
                  style={[tw`text-gray-900 text-center`, typography.caption]}
                >
                  {action.title}
                </GeistText>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
