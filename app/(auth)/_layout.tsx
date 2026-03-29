import { Stack } from "expo-router";
import { theme } from "@/styles/theme";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitleStyle: {
          fontFamily: theme.fonts.geist.medium,
        },
        gestureEnabled: true,
        animation: "fade",
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
          gestureEnabled: true,
          animation: "fade",
        }}
      />
    </Stack>
  );
} 