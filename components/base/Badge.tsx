import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { Text as GeistText } from "@/components/Text";
import tw from "../../styles/tailwind";
import { typography } from "@/styles/typography";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";
type BadgeSize = "small" | "medium";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  label: string;
  style?: StyleProp<ViewStyle>;
}

export function Badge({
  variant = "neutral",
  size = "medium",
  label,
  style,
}: BadgeProps) {
  const baseStyles = tw`rounded-full flex-row items-center justify-center`;

  const variantStyles = {
    success: tw`bg-status-success/10`,
    warning: tw`bg-status-warning/10`,
    error: tw`bg-status-error/10`,
    info: tw`bg-status-info/10`,
    neutral: tw`bg-neutral-gray`,
  }[variant];

  const sizeStyles = {
    small: tw`px-2 py-0.5`,
    medium: tw`px-3 py-1`,
  }[size];

  const textBaseStyles = typography.bodyMedium;

  const textSizeStyles = {
    small: typography.caption,
    medium: typography.body,
  }[size];

  const textColorStyles = {
    success: tw`text-status-success`,
    warning: tw`text-status-warning`,
    error: tw`text-status-error`,
    info: tw`text-status-info`,
    neutral: tw`text-neutral-darkGray`,
  }[variant];

  return (
    <View style={[baseStyles, variantStyles, sizeStyles, style]}>
      <GeistText style={[textBaseStyles, textSizeStyles, textColorStyles]}>
        {label}
      </GeistText>
    </View>
  );
}
