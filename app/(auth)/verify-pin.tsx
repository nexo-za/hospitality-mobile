import React, { useState } from "react";
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from "react-native";
import tw from "@/styles/tailwind";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/api/services/authService";
import { router } from "expo-router";

export default function VerifyPinScreen() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { width } = useWindowDimensions();

  const handleVerifyPin = async () => {
    if (!pin) {
      setError("Please enter your PIN");
      return;
    }

    if (!user?.id) {
      setError("User ID not found");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const userId = Number(user.id);
      const success = await authService.verifyPin(userId, pin);

      if (!success) {
        throw new Error("Invalid PIN");
      }

      // Navigate to main app
      router.replace("/(tabs)");
    } catch (err: any) {
      console.error("PIN verification error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Calculate responsive dimensions
  const containerWidth = Math.min(width * 0.9, 400);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={tw`flex-1 bg-white`}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <View style={tw`flex-1 justify-center items-center px-4`}>
        <View style={{ width: containerWidth }}>
          <View style={tw`items-center mb-6`}>
            <Text
              style={tw`text-h1 font-semibold text-neutral-darkGray mb-2 text-center`}
            >
              Enter PIN
            </Text>
            <Text
              style={tw`text-body text-neutral-darkGray text-center opacity-60`}
            >
              Please enter your PIN to continue
            </Text>
          </View>

          {error ? (
            <View
              style={tw`mb-4 flex-row items-center bg-status-error/10 p-3 rounded-lg`}
            >
              <Text style={tw`flex-1 text-small text-status-error`}>
                {error}
              </Text>
            </View>
          ) : null}

          <View>
            <View
              style={tw`flex-row items-center rounded-lg mb-4 px-4 h-[48px] bg-white`}
            >
              <Input
                placeholder="Enter PIN"
                value={pin}
                onChangeText={(text) => {
                  setPin(text);
                  setError("");
                }}
                secureTextEntry
                keyboardType="numeric"
                maxLength={4}
                containerStyle={tw`mb-0 flex-1`}
                inputStyle={tw`h-[48px]`}
              />
            </View>

            <Button
              onPress={handleVerifyPin}
              loading={loading}
              fullWidth
              style={tw`mt-4 h-[48px]`}
            >
              Verify PIN
            </Button>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
