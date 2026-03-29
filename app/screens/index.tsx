import { Stack } from "expo-router";
import React from "react";

export default function ScreensLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="StartShiftScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EndShiftScreen"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ShiftManagementScreen"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
