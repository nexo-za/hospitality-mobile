import React from "react";
import { View, TouchableOpacity, ScrollView } from "react-native";
import { Text as GeistText } from "@/components/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import { useRouter } from "expo-router";
import { Stack, Link } from "expo-router";

const DevMenuOption = ({
  title,
  description,
  icon,
  onPress,
}: {
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={tw`bg-white rounded-xl p-4 mb-4  border border-gray-100`}
    onPress={onPress}
  >
    <View style={tw`flex-row items-center`}>
      <View
        style={tw`w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-4`}
      >
        <MaterialCommunityIcons name={icon as any} size={24} color="#0284c7" />
      </View>
      <View style={tw`flex-1`}>
        <GeistText style={[tw`text-gray-900`, typography.bodyBold]}>
          {title}
        </GeistText>
        <GeistText style={[tw`text-gray-500 text-sm`, typography.body]}>
          {description}
        </GeistText>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
    </View>
  </TouchableOpacity>
);

export default function DevMenuScreen() {
  const router = useRouter();

  const devOptions = [
    {
      title: "API Logs",
      description: "View API request and response logs",
      icon: "api",
      route: "/api-logs",
    },
    {
      title: "Auth Logs",
      description: "View authentication error logs",
      icon: "shield-account",
      route: "/auth-logs",
    },
    {
      title: "API Authentication Debug",
      description: "Test and update API credentials",
      icon: "shield-key",
      route: "/api-debug",
    },
    {
      title: "Network Diagnostics",
      description: "Test API connectivity and latency",
      icon: "lan-connect",
      route: "",
    },
    {
      title: "Cache Management",
      description: "View and clear app cache",
      icon: "cached",
      route: "",
    },
    {
      title: "Environment",
      description: "View environment variables and app config",
      icon: "cog",
      route: "",
    },
    {
      title: "Ecentric Payment Demo",
      description: "Test payment integration",
      icon: "credit-card",
      route: "/(dev)/ecentric-payment",
    },
    {
      title: "Ecentric Auth Test",
      description: "Test authentication flow separately",
      icon: "shield-check",
      route: "/(dev)/ecentric-auth-test",
    },
    {
      title: "Offline Indicator Test",
      description: "Test offline indicator functionality",
      icon: "wifi-off",
      route: "/(dev)/offline-test",
    },
  ];

  return (
    <View style={tw`flex-1 bg-gray-50 p-4`}>
      <Stack.Screen options={{ title: "Developer Options" }} />
      <ScrollView>
        <GeistText style={[tw`text-gray-700 mb-2`, typography.bodyBold]}>
          DEVELOPER TOOLS
        </GeistText>

        {devOptions.map((option, index) => (
          <DevMenuOption
            key={index}
            title={option.title}
            description={option.description}
            icon={option.icon}
            onPress={() => {
              if (option.route) {
                router.push(option.route);
              } else {
                // Option not implemented yet
                console.log(`Option not implemented: ${option.title}`);
              }
            }}
          />
        ))}

        <View style={tw`h-20`} />
      </ScrollView>
    </View>
  );
}
