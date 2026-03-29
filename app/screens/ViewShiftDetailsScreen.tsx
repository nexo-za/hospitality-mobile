import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useShift, Shift } from "../contexts/ShiftContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

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

const formatShiftId = (id: string | number) => {
  if (!id) return "Unknown";
  const idString = id.toString();
  if (idString.startsWith("shift_") && idString.length > 6) {
    return idString.substring(6, Math.min(14, idString.length));
  }
  return idString.substring(0, 8);
};

export default function ViewShiftDetailsScreen() {
  const { shiftHistory } = useShift();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;

  const shift = shiftHistory.find((s) => s.id === id);
  if (!shift) {
    return (
      <View style={tw`flex-1 items-center justify-center bg-gray-50`}>
        <GeistText style={[tw`text-gray-500`, typography.body]}>
          Shift not found
        </GeistText>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Enhanced Header with Gradient Background */}
      <View
        style={tw`bg-gradient-to-r from-blue-600 to-blue-700 px-3 sm:px-4 md:px-6 py-3 sm:py-4`}
      >
        <View style={tw`flex-row items-center`}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw`mr-3 sm:mr-4`}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={isSmallMobile ? 20 : isMobile ? 24 : 28}
              color="#ffffff"
            />
          </TouchableOpacity>
          <View>
            <GeistText
              style={[
                tw`text-white ${isSmallMobile ? "text-xl" : ""}`,
                typography.h1,
              ]}
            >
              Shift Details
            </GeistText>
            <GeistText style={[tw`text-blue-100 text-sm`, typography.body]}>
              #{formatShiftId(shift.id)}
            </GeistText>
          </View>
        </View>
      </View>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`p-3 sm:p-4 md:p-6`}
      >
        {/* Status Badge with Enhanced Colors */}
        <View style={tw`mb-3 sm:mb-4`}>
          <View
            style={[
              tw`px-4 py-2 rounded-full self-start flex-row items-center `,
              shift.status === "active"
                ? tw`bg-green-50 border border-green-200`
                : tw`bg-gray-50 border border-gray-200`,
            ]}
          >
            <View
              style={[
                tw`w-2.5 h-2.5 rounded-full mr-2`,
                shift.status === "active" ? tw`bg-green-500` : tw`bg-gray-500`,
              ]}
            />
            <GeistText
              style={[
                shift.status === "active"
                  ? tw`text-green-700 font-medium`
                  : tw`text-gray-700 font-medium`,
                typography.bodyMedium,
              ]}
            >
              {shift.status === "active" ? "Active" : "Completed"}
            </GeistText>
          </View>
        </View>

        {/* Shift Details Card with Accent */}
        <View
          style={tw`bg-white rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-gray-100  border-l-4 border-l-blue-500`}
        >
          <View style={tw`flex-row items-center mb-3 sm:mb-4`}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={20}
              color="#3b82f6"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-900`, typography.h2]}>
              Shift Details
            </GeistText>
          </View>
          <View style={tw`space-y-3`}>
            <View
              style={tw`flex-row justify-between items-center bg-gray-50 p-2 rounded-lg`}
            >
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Start Time
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                {formatDate(shift.startTime)}
              </GeistText>
            </View>
            {shift.endTime && (
              <View
                style={tw`flex-row justify-between items-center bg-gray-50 p-2 rounded-lg`}
              >
                <GeistText style={[tw`text-gray-600`, typography.body]}>
                  End Time
                </GeistText>
                <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
                  {formatDate(shift.endTime)}
                </GeistText>
              </View>
            )}
          </View>
        </View>

        {/* Sales Summary Card with Accent */}
        <View
          style={tw`bg-white rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-gray-100  border-l-4 border-l-green-500`}
        >
          <View style={tw`flex-row items-center mb-3 sm:mb-4`}>
            <MaterialCommunityIcons
              name="cash-multiple"
              size={20}
              color="#22c55e"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-900`, typography.h2]}>
              Sales Summary
            </GeistText>
          </View>
          <View style={tw`space-y-3`}>
            <View
              style={tw`flex-row justify-between items-center bg-green-50 p-3 rounded-lg`}
            >
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Total Sales
              </GeistText>
              <GeistText
                style={[
                  tw`text-green-700 text-lg sm:text-xl`,
                  typography.bodyBold,
                ]}
              >
                <CurrencyFormat value={shift.salesTotal} />
              </GeistText>
            </View>
            <View
              style={tw`flex-row justify-between items-center bg-gray-50 p-2 rounded-lg`}
            >
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Cash Sales
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.body]}>
                <CurrencyFormat value={shift.cashSales} />
              </GeistText>
            </View>
            <View
              style={tw`flex-row justify-between items-center bg-gray-50 p-2 rounded-lg`}
            >
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Card Sales
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.body]}>
                <CurrencyFormat value={shift.cardSales} />
              </GeistText>
            </View>
            <View
              style={tw`flex-row justify-between items-center bg-gray-50 p-2 rounded-lg`}
            >
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Other Sales
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.body]}>
                <CurrencyFormat value={shift.otherSales} />
              </GeistText>
            </View>
            <View
              style={tw`flex-row justify-between items-center bg-gray-50 p-2 rounded-lg`}
            >
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Transactions
              </GeistText>
              <GeistText style={[tw`text-gray-900`, typography.body]}>
                {shift.transactionCount}
              </GeistText>
            </View>
          </View>
        </View>

        {/* Cash Management Card with Accent */}
        <View
          style={tw`bg-white rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-gray-100  border-l-4 border-l-purple-500`}
        >
          <View style={tw`flex-row items-center mb-3 sm:mb-4`}>
            <MaterialCommunityIcons
              name="cash-register"
              size={20}
              color="#a855f7"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-gray-900`, typography.h2]}>
              Cash Management
            </GeistText>
          </View>
          <View style={tw`space-y-3`}>
            <View
              style={tw`flex-row justify-between items-center bg-purple-50 p-3 rounded-lg`}
            >
              <GeistText style={[tw`text-gray-600`, typography.body]}>
                Starting Cash
              </GeistText>
              <GeistText style={[tw`text-purple-700`, typography.bodyBold]}>
                <CurrencyFormat value={shift.startCash} />
              </GeistText>
            </View>
            {shift.endCash !== undefined && (
              <View
                style={tw`flex-row justify-between items-center bg-purple-50 p-3 rounded-lg`}
              >
                <GeistText style={[tw`text-gray-600`, typography.body]}>
                  Ending Cash
                </GeistText>
                <GeistText style={[tw`text-purple-700`, typography.bodyBold]}>
                  <CurrencyFormat value={shift.endCash} />
                </GeistText>
              </View>
            )}
            {shift.cashTransactions && shift.cashTransactions.length > 0 && (
              <View style={tw`mt-4`}>
                <GeistText
                  style={[
                    tw`text-gray-700 mb-2 font-medium`,
                    typography.bodyMedium,
                  ]}
                >
                  Cash Transactions
                </GeistText>
                {shift.cashTransactions.map((transaction) => (
                  <View
                    key={transaction.id}
                    style={tw`flex-row justify-between py-2 px-3 rounded-lg ${
                      transaction.type === "add" ? "bg-green-50" : "bg-red-50"
                    } mb-2`}
                  >
                    <View style={tw`flex-1 mr-2`}>
                      <GeistText
                        style={[
                          tw`font-medium`,
                          transaction.type === "add"
                            ? tw`text-green-700`
                            : tw`text-red-700`,
                          typography.body,
                        ]}
                      >
                        {transaction.type === "add" ? "Cash In" : "Cash Out"}
                      </GeistText>
                      {transaction.note && (
                        <GeistText
                          style={[tw`text-gray-500 text-sm`, typography.small]}
                        >
                          {transaction.note}
                        </GeistText>
                      )}
                    </View>
                    <GeistText
                      style={[
                        transaction.type === "add"
                          ? tw`text-green-700`
                          : tw`text-red-700`,
                        typography.bodyBold,
                      ]}
                    >
                      {transaction.type === "add" ? "+" : "-"}
                      <CurrencyFormat value={transaction.amount} />
                    </GeistText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Inventory Card with Accent */}
        {shift.inventory && shift.inventory.length > 0 && (
          <View
            style={tw`bg-white rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 border border-gray-100  border-l-4 border-l-orange-500`}
          >
            <View style={tw`flex-row items-center mb-3 sm:mb-4`}>
              <MaterialCommunityIcons
                name="package-variant"
                size={20}
                color="#f97316"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-gray-900`, typography.h2]}>
                Inventory Count
              </GeistText>
            </View>
            {shift.inventory.map((item) => (
              <View
                key={item.productId}
                style={tw`flex-row justify-between py-2 px-3 rounded-lg bg-orange-50 mb-2`}
              >
                <View style={tw`flex-1 mr-2`}>
                  <GeistText style={[tw`text-gray-900`, typography.body]}>
                    {item.productName}
                  </GeistText>
                  <GeistText
                    style={[tw`text-gray-500 text-sm`, typography.small]}
                  >
                    Expected: {item.expectedCount}
                  </GeistText>
                </View>
                <View style={tw`items-end`}>
                  <GeistText
                    style={[
                      item.discrepancy === 0
                        ? tw`text-gray-900`
                        : item.discrepancy > 0
                        ? tw`text-green-600`
                        : tw`text-red-600`,
                      typography.bodyBold,
                    ]}
                  >
                    {item.actualCount}
                  </GeistText>
                  {item.discrepancy !== 0 && (
                    <GeistText
                      style={[
                        item.discrepancy > 0
                          ? tw`text-green-600`
                          : tw`text-red-600`,
                        typography.small,
                      ]}
                    >
                      {item.discrepancy > 0 ? "+" : ""}
                      {item.discrepancy}
                    </GeistText>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Notes Card with Accent */}
        {shift.comments && (
          <View
            style={tw`bg-white rounded-xl p-3 sm:p-4 md:p-6 border border-gray-100  border-l-4 border-l-indigo-500`}
          >
            <View style={tw`flex-row items-center mb-3 sm:mb-4`}>
              <MaterialCommunityIcons
                name="note-text-outline"
                size={20}
                color="#6366f1"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-gray-900`, typography.h2]}>
                Notes
              </GeistText>
            </View>
            <GeistText
              style={[
                tw`text-gray-700 bg-indigo-50 p-3 rounded-lg`,
                typography.body,
              ]}
            >
              {shift.comments}
            </GeistText>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
