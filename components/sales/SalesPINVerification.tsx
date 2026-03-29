import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import authService from "@/api/services/authService";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { useAuth } from "@/contexts/AuthContext";

interface SalesPINVerificationProps {
  visible: boolean;
  onVerified: () => void;
  onCancel: () => void;
}

const PinKeypad = ({
  pin,
  setPin,
  onComplete,
  onError,
  loading,
  error,
}: {
  pin: string;
  setPin: React.Dispatch<React.SetStateAction<string>>;
  onComplete: (pin: string) => void;
  onError: (error: string) => void;
  loading: boolean;
  error: string | null;
}) => {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isSmallMobile = width < 360;

  // Animation values for the pin dots (6 digits for sales PIN)
  const dotAnimations = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
  ];

  // Loading spinner animation
  const spinAnimation = useRef(new Animated.Value(0)).current;

  // Error shake animation
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  // Button press animation
  const [pressedKey, setPressedKey] = useState<string | null>(null);

  useEffect(() => {
    // Animate the pin dots when pin changes
    if (pin.length > 0) {
      Animated.spring(dotAnimations[pin.length - 1], {
        toValue: 1,
        useNativeDriver: false,
        friction: 4,
      }).start();
    }

    // Create the spinner animation when loading
    if (loading) {
      Animated.loop(
        Animated.timing(spinAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.linear,
        })
      ).start();
    } else {
      spinAnimation.setValue(0);
    }

    // Create shake animation when there's an error
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -10,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 10,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
      ]).start();
    }
  }, [pin, loading, error]);

  const handleKeyPress = (key: string) => {
    // Set pressed key for animation
    setPressedKey(key);
    setTimeout(() => setPressedKey(null), 150);

    if (key === "delete") {
      if (pin.length > 0) {
        // Reset animation for the removed dot
        Animated.timing(dotAnimations[pin.length - 1], {
          toValue: 0,
          duration: 100,
          useNativeDriver: false,
        }).start();

        setPin((prev: string) => prev.slice(0, -1));
      }
      return;
    }

    if (pin.length < 6) {
      setPin((prev: string) => prev + key);
    }

    // If pin is now 6 digits, call onComplete
    if (pin.length === 5 && key !== "delete") {
      const newPin = pin + key;
      // Small timeout to show the last dot
      setTimeout(() => {
        onComplete(newPin);
      }, 300);
    }
  };

  const renderKey = (key: string, index: number) => {
    const isEmpty = key === "";
    const isDelete = key === "delete";
    const isPressed = pressedKey === key;

    return (
      <TouchableOpacity
        key={index}
        style={[
          isSmallMobile
            ? tw`w-16 h-16`
            : isMobile
            ? tw`w-20 h-16`
            : tw`w-24 h-16`,
          tw`rounded-full justify-center items-center`,
          isEmpty ? tw`bg-transparent` : {},
          !isEmpty && {
            backgroundColor: isPressed ? "#e6f2ff" : "white",
            borderWidth: 1,
            borderColor: isPressed ? "#3b82f6" : "#e5e7eb",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: isPressed ? 1 : 2 },
            shadowOpacity: isPressed ? 0.1 : 0.05,
            shadowRadius: isPressed ? 2 : 3,
            elevation: isPressed ? 1 : 2,
          },
        ]}
        onPress={() => key && handleKeyPress(key)}
        disabled={!key || loading || isEmpty}
        activeOpacity={0.7}
      >
        {isDelete ? (
          <MaterialCommunityIcons
            name="backspace-outline"
            size={isSmallMobile ? 22 : 26}
            color={isPressed ? "#3b82f6" : "#6b7280"}
          />
        ) : key ? (
          <GeistText
            style={[
              isSmallMobile ? tw`text-xl` : tw`text-2xl`,
              isPressed ? tw`text-blue-500` : tw`text-gray-900`,
              typography.h2,
            ]}
          >
            {key}
          </GeistText>
        ) : null}
      </TouchableOpacity>
    );
  };

  // Create a spin interpolation for the loading spinner
  const spin = spinAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={tw`mt-4 md:mt-6`}>
      {/* PIN display */}
      <Animated.View
        style={[
          tw`flex-row justify-center mb-6`,
          {
            transform: [{ translateX: shakeAnimation }],
          },
        ]}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const dotScale = dotAnimations[i].interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [1, 1.4, 1],
          });

          const dotColor = dotAnimations[i].interpolate({
            inputRange: [0, 1],
            outputRange: [
              error ? "#fecaca" : "#e5e7eb",
              error ? "#ef4444" : "#3b82f6",
            ],
          });

          return (
            <Animated.View
              key={i}
              style={[
                tw`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full mx-1.5 sm:mx-2`,
                {
                  backgroundColor:
                    i < pin.length ? dotColor : error ? "#fecaca" : "#e5e7eb",
                  transform: [{ scale: i < pin.length ? dotScale : 1 }],
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: i < pin.length ? 0.2 : 0,
                  shadowRadius: 2,
                  elevation: i < pin.length ? 2 : 0,
                },
              ]}
            />
          );
        })}
      </Animated.View>

      {error && (
        <View style={tw`mb-4 items-center px-4`}>
          <View
            style={tw`bg-red-50 rounded-lg border border-red-100 p-3 w-full max-w-md`}
          >
            <View style={tw`flex-row items-center mb-1`}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={18}
                color="#ef4444"
                style={tw`mr-2`}
              />
              <GeistText style={[tw`text-red-600`, typography.bodyBold]}>
                Error
              </GeistText>
            </View>
            <GeistText style={[tw`text-red-600`, typography.body]}>
              {error}
            </GeistText>
          </View>
        </View>
      )}

      {/* Keypad */}
      <View
        style={[
          isMobile
            ? tw`w-full`
            : tw`max-w-xs mx-auto flex items-center justify-center`,
          tw`mx-auto px-8 sm:px-0`,
        ]}
      >
        {[
          ["1", "2", "3"],
          ["4", "5", "6"],
          ["7", "8", "9"],
          ["", "0", "delete"],
        ].map((row, rowIndex) => (
          <View
            key={rowIndex}
            style={tw`flex-row justify-around my-1.5 sm:my-1.5`}
          >
            {row.map((key, i) => renderKey(key, i))}
          </View>
        ))}
      </View>

      {loading && (
        <View style={tw`mt-6 items-center`}>
          <View
            style={tw`flex-row items-center bg-blue-50 px-4 py-2 rounded-full`}
          >
            <Animated.View
              style={[
                tw`h-4 w-4 mr-2`,
                {
                  transform: [{ rotate: spin }],
                },
              ]}
            >
              <View
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: "#3b82f6",
                  borderTopColor: "transparent",
                }}
              />
            </Animated.View>
            <GeistText style={[tw`text-blue-700`, typography.captionSemibold]}>
              Verifying PIN...
            </GeistText>
          </View>
        </View>
      )}
    </View>
  );
};

export default function SalesPINVerification({
  visible,
  onVerified,
  onCancel,
}: SalesPINVerificationProps) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { currentStaff: selectedStaff } = useStaffSession();
  const { user } = useAuth();

  // use selected staff instead of user from context

  const handlePinComplete = async (pin: string) => {
    // Prefer the selected staff's userId when switching staff; fallback to authenticated user
    const userId = Number((selectedStaff?.userId as any) ?? user?.id ?? 0);
    if (!userId) {
      setError("User not found. Please log in again.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const success = await authService.verifyPin(userId, pin);

      if (!success) {
        // Simulate a 400 error for incorrect PIN
        const error: any = new Error("Incorrect PIN");
        error.status = 400;
        throw error;
      }

      // Clear form and call success callback
      setPin("");
      setError("");
      onVerified();
    } catch (err: any) {
      console.error("PIN verification error:", err);

      const apiMessage =
        err?.response?.data?.message ||
        err?.response?.data?.data?.message ||
        err?.message ||
        "Invalid PIN. Please try again.";

      if (
        err?.status === 400 ||
        err?.response?.status === 400 ||
        apiMessage.toLowerCase().includes("invalid pin")
      ) {
        setError("Incorrect PIN. If you don't remember the pin, please contact support for assistance.");
      } else {
        setError(apiMessage);
      }
      setPin("");

      // Clear error after 3 seconds
      setTimeout(() => {
        setError("");
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setPin("");
    setError("");
    onCancel();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`bg-white rounded-xl w-full max-w-lg p-6 shadow-lg`}>
            {/* Header */}
            <View style={tw`mb-6`}>
              <View style={tw`flex-row items-center justify-between mb-4`}>
                <GeistText style={[tw`text-gray-900`, typography.h2]}>
                  Verify PIN to Continue
                </GeistText>
                <TouchableOpacity
                  onPress={handleCancel}
                  style={tw`w-8 h-8 items-center justify-center`}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color="#6b7280"
                  />
                </TouchableOpacity>
              </View>

              <GeistText style={[tw`text-gray-500 mb-3`, typography.body]}>
                {selectedStaff?.displayName
                  ? `Enter your 6-digit PIN, ${selectedStaff.displayName}`
                  : "Enter your 6-digit PIN to start making sales"}
              </GeistText>

              {(selectedStaff || user) && (
                <View
                  style={tw`bg-blue-50 rounded-lg p-3 flex-row items-center`}
                >
                  <MaterialCommunityIcons
                    name="account-check"
                    size={20}
                    color="#3b82f6"
                    style={tw`mr-2`}
                  />
                  <GeistText style={[tw`text-blue-700`, typography.bodyMedium]}>
                    {selectedStaff?.displayName || user?.firstName || user?.username || "Unknown"}
                  </GeistText>
                  {(selectedStaff?.storeName || user?.store_name) && (
                    <GeistText style={[tw`text-blue-600 ml-2`, typography.caption]}>
                      {selectedStaff?.storeName || user?.store_name}
                    </GeistText>
                  )}
                </View>
              )}
            </View>

            {/* PIN Keypad */}
            <PinKeypad
              pin={pin}
              setPin={setPin}
              onComplete={handlePinComplete}
              onError={setError}
              loading={loading}
              error={error}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
