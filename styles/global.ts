import { StyleSheet } from "react-native";
import { theme } from "./theme";

export const globalStyles = StyleSheet.create({
  text: {
    fontFamily: theme.fonts.geist.regular,
  },
  heading: {
    fontFamily: theme.fonts.geist.bold,
  },
  subheading: {
    fontFamily: theme.fonts.geist.semibold,
  },
  caption: {
    fontFamily: theme.fonts.geist.light,
  },
});
