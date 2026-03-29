import { create } from "twrnc";
import {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
} from "./theme/tokens";

const tw = create({
  theme: {
    extend: {
      colors: {
        primary: {
          main: colors.primary.main,
          light: colors.primary.light,
          dark: colors.primary.dark,
        },
        neutral: {
          gray: colors.neutral.gray,
          darkGray: colors.neutral.darkGray,
          white: colors.neutral.white,
          border: colors.neutral.border,
        },
        status: {
          success: colors.status.success,
          warning: colors.status.warning,
          error: colors.status.error,
          info: colors.status.info,
        },
      },
      fontFamily: {
        sans: [typography.fontFamily.primary],
      },
      fontSize: {
        h1: typography.fontSize.h1,
        h2: typography.fontSize.h2,
        h3: typography.fontSize.h3,
        body: typography.fontSize.body,
        small: typography.fontSize.small,
        caption: typography.fontSize.caption,
      },
      fontWeight: {
        regular: typography.fontWeight.regular,
        medium: typography.fontWeight.medium,
        semibold: typography.fontWeight.semiBold,
      },
      spacing: {
        xs: spacing.xs,
        sm: spacing.sm,
        md: spacing.md,
        lg: spacing.lg,
        xl: spacing.xl,
        xxl: spacing.xxl,
      },
      borderRadius: {
        sm: borderRadius.sm,
        md: borderRadius.md,
        lg: borderRadius.lg,
        full: borderRadius.full,
      },
    },
  },
});

export default tw;
