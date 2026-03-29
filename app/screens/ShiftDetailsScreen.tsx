import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { ShiftAPI } from "@/api/services";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";

interface ShiftDetails {
  store_name: string;
  staff: Array<{
    staff_id: string;
    staff_name: string;
  }>;
  starting_cash: number;
  total_sales: string;
  refunds: number;
  discounts: number;
  cash_sales: string;
  card_sales: string;
}

// Specify the proper type for the icon name to fix the linter error
type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

const DetailCard = ({
  title,
  value,
  icon,
  color = "#548AF7",
}: {
  title: string;
  value: string | number;
  icon: IconName;
  color?: string;
}) => (
  <View style={tw`bg-white rounded-xl p-4 mb-3 border border-gray-100 `}>
    <View style={tw`flex-row items-center mb-2`}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={color}
        style={tw`mr-2`}
      />
      <GeistText style={[tw`text-gray-700`, typography.bodyBold]}>
        {title}
      </GeistText>
    </View>
    <GeistText style={[tw`text-gray-900 text-lg`, typography.bodyBold]}>
      {typeof value === "number" ? (
        <CurrencyFormat value={value} />
      ) : typeof value === "string" && value.includes(".") ? (
        <CurrencyFormat value={parseFloat(value)} />
      ) : (
        value
      )}
    </GeistText>
  </View>
);

export default function ShiftDetailsScreen() {
  const { shiftId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<ShiftDetails | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchShiftDetails = async () => {
      try {
        setLoading(true);
        const response = await ShiftAPI.getShiftDetails({ shift_id: Number(shiftId) });
        setDetails(response.data);
      } catch (err: unknown) {
        setError("Failed to load shift details");
      } finally {
        setLoading(false);
      }
    };

    if (shiftId) {
      fetchShiftDetails();
    }
  }, [shiftId]);

  if (loading) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <View
          style={tw`bg-white rounded-xl p-6 mx-4 border border-gray-100  items-center w-full max-w-md`}
        >
          <MaterialCommunityIcons
            name="clock-time-four"
            size={48}
            color="#3b82f6"
            style={tw`mb-4`}
          />
          <GeistText style={[tw`text-gray-900 mb-2`, typography.h3]}>
            Loading Shift Details
          </GeistText>
          <GeistText
            style={[tw`text-gray-500 text-center mb-4`, typography.body]}
          >
            Please wait while we retrieve the shift information
          </GeistText>
          <View style={tw`w-full h-2 bg-gray-200 rounded-full mb-2`}>
            <Animated.View
              style={[tw`h-2 bg-blue-500 rounded-full`, { width: "60%" }]}
            />
          </View>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <View
          style={tw`bg-red-50 rounded-xl p-4 mx-4 border border-red-100  items-center w-full max-w-md`}
        >
          <MaterialCommunityIcons
            name="alert-circle"
            size={48}
            color="#ef4444"
            style={tw`mb-4`}
          />
          <GeistText style={[tw`text-gray-900 mb-2`, typography.h3]}>
            Error Loading Details
          </GeistText>
          <GeistText
            style={[tw`text-red-600 text-center mb-4`, typography.body]}
          >
            {error}
          </GeistText>
          <TouchableOpacity
            style={tw`bg-white border border-red-300 rounded-lg py-2 px-4 flex-row items-center`}
            onPress={() => {
              setLoading(true);
              setError(null);
              ShiftAPI
                .getShiftDetails({ shift_id: Number(shiftId) })
                .then((response: any) => {
                  setDetails(response.data);
                  setLoading(false);
                })
                .catch((err: unknown) => {
                  setError("Failed to load shift details");
                  setLoading(false);
                });
            }}
          >
            <MaterialCommunityIcons
              name="refresh"
              size={18}
              color="#ef4444"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-red-600`, typography.captionSemibold]}>
              Retry
            </GeistText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!details) {
    return (
      <View style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <View
          style={tw`bg-white rounded-xl p-6 mx-4 border border-gray-100  items-center w-full max-w-md`}
        >
          <MaterialCommunityIcons
            name="clipboard-alert"
            size={48}
            color="#9ca3af"
            style={tw`mb-4`}
          />
          <GeistText style={[tw`text-gray-900 mb-2`, typography.h3]}>
            No Data Found
          </GeistText>
          <GeistText
            style={[tw`text-gray-500 text-center mb-4`, typography.body]}
          >
            We couldn't find any details for this shift
          </GeistText>
          <TouchableOpacity
            style={tw`bg-blue-500 rounded-xl py-3 px-6 flex-row justify-center items-center`}
            onPress={() => router.back()}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={20}
              color="white"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-white`, typography.bodyBold]}>
              Go Back
            </GeistText>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header with Blue Background */}
      <View style={tw`bg-[#548AF7] px-4 py-6`}>
        <View style={tw`items-center justify-center`}>
          <GeistText
            style={[tw`text-white text-2xl font-bold mb-1`, typography.h1]}
          >
            Shift Details
          </GeistText>
          <GeistText
            style={[tw`text-white text-opacity-70 text-lg`, typography.body]}
          >
            #{shiftId}
          </GeistText>
        </View>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`p-4`}>
        <TouchableOpacity
          style={tw`flex-row items-center mb-3`}
          onPress={() => router.back()}
        >
          <MaterialCommunityIcons name="arrow-left" size={20} color="#3b82f6" />
          <GeistText
            style={[tw`text-blue-600 ml-1`, typography.captionSemibold]}
          >
            Back to Shifts
          </GeistText>
        </TouchableOpacity>

        <View style={tw`bg-white rounded-xl p-4 mb-4 border border-gray-100 `}>
          <GeistText style={[tw`text-gray-900 mb-1`, typography.h2]}>
            {details.store_name}
          </GeistText>
          <View style={tw`flex-row items-center`}>
            <MaterialCommunityIcons
              name="account"
              size={20}
              color="#3b82f6"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-600`, typography.body]}>
              Staff: {details.staff[0].staff_name}
            </GeistText>
          </View>
          <View style={tw`flex-row items-center mt-1`}>
            <MaterialCommunityIcons
              name="card-account-details"
              size={20}
              color="#3b82f6"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-600`, typography.body]}>
              ID: {details.staff[0].staff_id}
            </GeistText>
          </View>
        </View>

        <DetailCard
          title="Starting Cash"
          value={details.starting_cash}
          icon="cash-multiple"
          color="#10b981"
        />

        <DetailCard
          title="Total Sales"
          value={details.total_sales}
          icon="cash-register"
          color="#3b82f6"
        />

        <View style={tw`flex-row justify-between mb-3`}>
          <View style={tw`w-[49%]`}>
            <DetailCard
              title="Cash Sales"
              value={details.cash_sales}
              icon="cash"
              color="#6366f1"
            />
          </View>
          <View style={tw`w-[49%]`}>
            <DetailCard
              title="Card Sales"
              value={details.card_sales}
              icon="credit-card"
              color="#8b5cf6"
            />
          </View>
        </View>

        <View style={tw`flex-row justify-between mb-3`}>
          <View style={tw`w-[49%]`}>
            <DetailCard
              title="Refunds"
              value={details.refunds}
              icon="cash-refund"
              color="#f97316"
            />
          </View>
          <View style={tw`w-[49%]`}>
            <DetailCard
              title="Discounts"
              value={details.discounts}
              icon="ticket-percent"
              color="#f59e0b"
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
