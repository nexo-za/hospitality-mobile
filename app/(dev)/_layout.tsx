import React from "react";
import { Stack } from "expo-router";
import { View, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useRouter } from "expo-router";

export default function DevLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1e293b" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerLeft: () => (
          <TouchableOpacity style={tw`p-2`} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Developer Tools",
          headerRight: () => (
            <TouchableOpacity style={tw`p-2`} onPress={() => router.push("/")}>
              <MaterialCommunityIcons name="home" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="api-logs"
        options={{
          title: "API Logs",
          headerRight: () => (
            <TouchableOpacity style={tw`p-2`} onPress={() => router.push("/")}>
              <MaterialCommunityIcons name="home" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="auth-logs"
        options={{
          title: "Auth Logs",
          headerRight: () => (
            <TouchableOpacity style={tw`p-2`} onPress={() => router.push("/")}>
              <MaterialCommunityIcons name="home" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="api-debug"
        options={{
          title: "API Authentication Debug",
          headerRight: () => (
            <TouchableOpacity style={tw`p-2`} onPress={() => router.push("/")}>
              <MaterialCommunityIcons name="home" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="ecentric-payment"
        options={{
          title: "Ecentric Payment Demo",
        }}
      />
      <Stack.Screen
        name="ecentric-auth-test"
        options={{
          title: "Ecentric Auth Test",
        }}
      />
    </Stack>
  );
}
