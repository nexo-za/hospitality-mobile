import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import tw from "@/styles/tailwind";

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onStartDateChange: (date: Date) => void;
  onEndDateChange: (date: Date) => void;
  style?: object;
}

export function DateRangeFilter({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  style,
}: DateRangeFilterProps) {
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleStartDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowStartDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      onStartDateChange(selectedDate);
    }
  };

  const handleEndDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    setShowEndDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      onEndDateChange(selectedDate);
    }
  };

  return (
    <View
      style={[
        tw`flex-row items-center justify-between bg-white rounded-lg p-2 border border-gray-200`,
        style,
      ]}
    >
      <View style={tw`flex-row items-center`}>
        <TouchableOpacity
          style={tw`flex-row items-center p-2 rounded-md mx-1`}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#6b7280" />
          <Text style={tw`ml-2 text-sm text-gray-600`}>
            {formatDate(startDate)}
          </Text>
        </TouchableOpacity>

        <Text style={tw`mx-1 text-gray-400`}>to</Text>

        <TouchableOpacity
          style={tw`flex-row items-center p-2 rounded-md mx-1`}
          onPress={() => setShowEndDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={18} color="#6b7280" />
          <Text style={tw`ml-2 text-sm text-gray-600`}>
            {formatDate(endDate)}
          </Text>
        </TouchableOpacity>
      </View>

      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleStartDateChange}
          maximumDate={endDate}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEndDateChange}
          minimumDate={startDate}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}
