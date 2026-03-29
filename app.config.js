

export default {
  name: "NEXO",
  slug: "nexoza",
  version: "1.0003",
  orientation: "default",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  splash: {
    image: "./assets/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#ffffff",
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.nexo-za.nexo",
    buildNumber: "9",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/adaptive-icon.png",
      backgroundColor: "#ffffff",
    },
    package: "com.nexo_za.nexo",
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  plugins: ["expo-router", "expo-secure-store"],
  extra: {
    router: {
      origin: false,
    },
    eas: {
      projectId: "07b8d13e-4877-4575-8be2-207a793522a3",
    },
  },
  owner: "nexo-mobile-app",
  cli: {
    appVersionSource: "remote",
  },
  fonts: [
    "./assets/fonts/Geist-Thin.ttf",
    "./assets/fonts/Geist-Light.ttf",
    "./assets/fonts/Geist-Regular.ttf",
    "./assets/fonts/Geist-Medium.ttf",
    "./assets/fonts/Geist-SemiBold.ttf",
    "./assets/fonts/Geist-Bold.ttf",
    "./assets/fonts/Geist-ExtraBold.ttf",
    "./assets/fonts/Geist-Black.ttf",
  ],
};
