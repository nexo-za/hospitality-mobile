import React from "react";
import {
  TouchableOpacity,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Text as GeistText } from "@/components/Text";
import tw from "../../styles/tailwind";
import { typography } from "@/styles/typography";

interface CategoryPillProps {
  label: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function CategoryPill({
  label,
  icon,
  isSelected = false,
  onPress,
  style,
}: CategoryPillProps) {
  const containerStyles = [
    tw`flex-row items-center px-4 h-[36px] rounded-full`,
    isSelected ? tw`bg-primary-main` : tw`bg-neutral-gray`,
    style,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={containerStyles}
      activeOpacity={0.8}
    >
      {icon}
      <GeistText
        style={
          [
            typography.bodyMedium,
            isSelected ? tw`text-white` : tw`text-neutral-darkGray`,
            icon && tw`ml-2`,
          ] as StyleProp<TextStyle>
        }
      >
        {label}
      </GeistText>
    </TouchableOpacity>
  );
}
