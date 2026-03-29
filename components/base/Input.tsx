import React from "react";
import {
  TextInput,
  View,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { Text as GeistText } from "@/components/Text";
import tw from "../../styles/tailwind";
import { colors } from "../../styles/theme/tokens";
import { typography } from "@/styles/typography";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  fullWidth = false,
  containerStyle,
  inputStyle,
  ...props
}: InputProps) {
  const containerStyles = [tw`mb-4`, fullWidth && tw`w-full`, containerStyle];

  const inputContainerStyles = [
    tw`flex-row items-center border rounded-md px-4 h-[48px] bg-white`,
    tw`border-neutral-border`,
    props.editable === false && tw`bg-neutral-gray opacity-50`,
    error && tw`border-status-error`,
  ];

  return (
    <View style={containerStyles}>
      {label && (
        <GeistText
          style={[tw`text-neutral-darkGray mb-1`, typography.bodyMedium]}
        >
          {label}
        </GeistText>
      )}

      <View style={inputContainerStyles}>
        {leftIcon}
        <TextInput
          {...props}
          placeholderTextColor={colors.neutral.darkGray}
          style={
            [
              tw`flex-1`,
              typography.body,
              leftIcon && tw`ml-2`,
              rightIcon && tw`mr-2`,
              inputStyle,
            ] as StyleProp<TextStyle>
          }
        />
        {rightIcon}
      </View>

      {error && (
        <GeistText style={[tw`text-status-error mt-1`, typography.caption]}>
          {error}
        </GeistText>
      )}
    </View>
  );
}
