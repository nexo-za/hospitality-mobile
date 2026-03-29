import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import tw from "@/styles/tailwind";

export default function LoadingScreen() {
  return (
    <View style={tw`flex-1 bg-gray-100 justify-center items-center`}>
      <ActivityIndicator size="large" color="#0ea5e9" />
      <Text style={tw`mt-4 text-gray-600`}>Loading...</Text>
    </View>
  );
}
