import React from "react";
import {
  TextInput,
  View,
  TouchableOpacity,
  StyleProp,
  ViewStyle,
} from "react-native";
import tw from "../../styles/tailwind";
import { colors } from "../../styles/theme/tokens";
import { Ionicons } from "@expo/vector-icons";

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchInput({
  value,
  onChangeText,
  placeholder = "Search...",
  style,
}: SearchInputProps) {
  const handleClear = () => {
    onChangeText("");
  };

  return (
    <View
      style={[
        tw`flex-row items-center bg-white rounded-md border border-neutral-border px-3`,
        style,
      ]}
    >
      <Ionicons
        name="search-outline"
        size={20}
        color={colors.neutral.darkGray}
        style={tw`mr-2`}
      />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral.darkGray}
        style={tw`flex-1 h-[40px] text-body`}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={tw`ml-2`}>
          <Ionicons
            name="close-circle"
            size={20}
            color={colors.neutral.darkGray}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}
