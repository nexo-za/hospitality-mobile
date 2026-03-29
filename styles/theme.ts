import { Platform } from "react-native";
import { shadows } from "./theme/tokens";
import { StyleSheet } from "react-native";

export const theme = {
  fonts: {
    geist: {
      thin: Platform.select({
        ios: "Geist-Thin",
        android: "Geist-Thin",
      }),
      light: Platform.select({
        ios: "Geist-Light",
        android: "Geist-Light",
      }),
      regular: Platform.select({
        ios: "Geist-Regular",
        android: "Geist-Regular",
      }),
      medium: Platform.select({
        ios: "Geist-Medium",
        android: "Geist-Medium",
      }),
      semibold: Platform.select({
        ios: "Geist-SemiBold",
        android: "Geist-SemiBold",
      }),
      bold: Platform.select({
        ios: "Geist-Bold",
        android: "Geist-Bold",
      }),
      extrabold: Platform.select({
        ios: "Geist-ExtraBold",
        android: "Geist-ExtraBold",
      }),
      black: Platform.select({
        ios: "Geist-Black",
        android: "Geist-Black",
      }),
    },
  },
};

// Shadow utility styles
export const shadowStyles = StyleSheet.create({
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
});

export type Theme = typeof theme;
