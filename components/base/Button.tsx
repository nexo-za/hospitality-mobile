import React from "react";
import {
  TouchableOpacity,
  ActivityIndicator,
  View,
  StyleProp,
  ViewStyle,
} from "react-native";
import { Text as GeistText } from "@/components/Text";
import tw from "../../styles/tailwind";
import { colors } from "../../styles/theme/tokens";
import { typography } from "@/styles/typography";

type ButtonVariant = "primary" | "secondary" | "text";
type ButtonSize = "standard" | "compact";

interface ButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  onPress,
  children,
  variant = "primary",
  size = "standard",
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
}: ButtonProps) {
  const baseStyles = tw`flex-row items-center justify-center rounded-md`;
  const sizeStyles = {
    standard: tw`h-[48px] px-6`,
    compact: tw`h-[40px] px-4`,
  }[size];

  const variantStyles = {
    primary: tw`bg-primary-main`,
    secondary: tw`bg-white border border-primary-main`,
    text: tw`bg-transparent`,
  }[variant];

  const textBaseStyles = typography.bodyMedium;
  const textVariantStyles = {
    primary: tw`text-white`,
    secondary: tw`text-primary-main`,
    text: tw`text-primary-main`,
  }[variant];

  const disabledStyles = disabled ? tw`opacity-50` : null;
  const fullWidthStyles = fullWidth ? tw`w-full` : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        baseStyles,
        sizeStyles,
        variantStyles,
        disabledStyles,
        fullWidthStyles,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "primary" ? colors.neutral.white : colors.primary.main
          }
          size="small"
        />
      ) : (
        <View style={tw`flex-row items-center gap-2`}>
          {leftIcon}
          <GeistText style={[textBaseStyles, textVariantStyles]}>
            {children}
          </GeistText>
          {rightIcon}
        </View>
      )}
    </TouchableOpacity>
  );
}
