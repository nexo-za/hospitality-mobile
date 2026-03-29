import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { CurrencyFormat } from "@/components/base/CurrencyFormat";

interface RecentSale {
  id: number;
  title: string;
  amount: number;
  date: string;
}

interface RecentSalesListProps {
  title: string;
  data: RecentSale[];
  onItemPress?: (item: RecentSale) => void;
}

export function RecentSalesList({
  title,
  data,
  onItemPress,
}: RecentSalesListProps) {
  return (
    <View style={tw`bg-white rounded-xl p-4 border border-gray-100`}>
      <Text
        style={[tw`text-gray-900 text-base font-semibold mb-3`, typography.h3]}
      >
        {title}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} style={tw`max-h-64`}>
        {data.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={tw`flex-row justify-between items-center mb-4 last:mb-0`}
            onPress={() => onItemPress && onItemPress(item)}
            activeOpacity={0.7}
          >
            <View style={tw`flex-row items-center`}>
              <View
                style={tw`w-8 h-8 rounded-full bg-green-500 opacity-15 mr-3`}
              />
              <View>
                <Text style={[tw`text-gray-900`, typography.bodyMedium]}>
                  {item.title}
                </Text>
                <Text style={[tw`text-gray-500 text-xs`, typography.caption]}>
                  {item.date}
                </Text>
              </View>
            </View>
            <View style={tw`items-end`}>
              <Text
                style={[
                  tw`text-gray-900 font-semibold`,
                  typography.bodySemibold,
                ]}
              >
                ${item.amount}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default RecentSalesList;
