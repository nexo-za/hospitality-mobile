import {
  Text as RNText,
  TextProps as RNTextProps,
  StyleSheet,
} from "react-native";
import { theme } from "@/styles/theme";

interface TextProps extends RNTextProps {
  variant?:
    | "thin"
    | "light"
    | "regular"
    | "medium"
    | "semibold"
    | "bold"
    | "extrabold"
    | "black";
}

export function Text({ style, variant = "regular", ...props }: TextProps) {
  return (
    <RNText
      style={[styles.text, { fontFamily: theme.fonts.geist[variant] }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  text: {
    color: "#000000",
  },
});
