import { useWindowDimensions } from "react-native";

export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  // Determine if device is in landscape orientation
  const isLandscape = width > height;

  // For landscape orientation on smaller tablets, we need to adjust our detection
  // If in landscape mode and the device's shorter dimension (height) is tablet-sized
  const isLandscapeTablet = isLandscape && height >= 600; // Common tablet min-height

  const isPhone = !isLandscapeTablet && width < BREAKPOINTS.tablet;
  const isTablet =
    isLandscapeTablet ||
    (width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop);
  const isDesktop = width >= BREAKPOINTS.desktop;

  const breakpoint: Breakpoint = isLandscapeTablet
    ? "tablet"
    : width < BREAKPOINTS.tablet
    ? "phone"
    : width < BREAKPOINTS.desktop
    ? "tablet"
    : "desktop";

  return {
    isPhone,
    isTablet,
    isDesktop,
    isLandscape,
    breakpoint,
    width,
    height,
  };
}
