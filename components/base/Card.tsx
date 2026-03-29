import React from "react";
import { View, ViewProps, StyleProp, ViewStyle } from "react-native";
import tw from "../../styles/tailwind";

interface CardProps extends Omit<ViewProps, "style"> {
  children: React.ReactNode;
  variant?: "elevated" | "outlined" | "flat";
  padding?: "none" | "small" | "medium" | "large";
  style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  variant = "elevated",
  padding = "medium",
  style,
  ...props
}: CardProps) {
  const baseStyles = tw`bg-white rounded-md overflow-hidden`;

  const variantStyles = {
    elevated: tw`shadow-md`,
    outlined: tw`border border-neutral-border`,
    flat: tw``,
  }[variant];

  const paddingStyles = {
    none: tw``,
    small: tw`p-3`,
    medium: tw`p-4`,
    large: tw`p-6`,
  }[padding];

  return (
    <View {...props} style={[baseStyles, variantStyles, paddingStyles, style]}>
      {children}
    </View>
  );
}
