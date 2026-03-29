import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import tw from "@/styles/tailwind";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Input";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffSession } from "@/contexts/StaffSessionContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import userService from "@/utils/userService";
import { typography } from "@/styles/typography";
import api from "@/api/api";
import { StoreStaff } from "@/src/types/apiTypes";
import { loadAppConfig } from "@/config/dynamicAppConfig";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showStaffSelector, setShowStaffSelector] = useState(false);
  const [storeStaff, setStoreStaff] = useState<StoreStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const { addStaffSession } = useStaffSession();
  const { width } = useWindowDimensions();
  const router = useRouter();

  // Load remembered username and check auth state
  useEffect(() => {
    async function initializeLoginScreen() {
      try {
        console.log("[LoginScreen] Initializing login screen");

        // Check if we're already authenticated
        const isAuth = userService.isAuthenticated;
        console.log("[LoginScreen] Current auth state:", isAuth);

        if (isAuth) {
          console.log(
            "[LoginScreen] User is already authenticated, redirecting"
          );

          const appConfig = loadAppConfig();

          console.log("[LoginScreen] App config:", appConfig);
          // Use setTimeout to ensure navigation happens after component mount
          setTimeout(() => {
            router.replace("/(tabs)");
          }, 0);
          return;
        }

        const rememberedUsername = await userService.getRememberedUsername();
        console.log(
          "[LoginScreen] Remembered username:",
          rememberedUsername || "none"
        );

        if (rememberedUsername) {
          setUsername(rememberedUsername);
          setRememberMe(true);
        }
        setIsInitialized(true);
      } catch (err) {
        console.error("[LoginScreen] Failed to initialize login screen:", err);
        setIsInitialized(true);
      }
    }

    initializeLoginScreen();
  }, []);

  // Fetch staff list when store ID is available
  useEffect(() => {
    if (storeId && showStaffSelector) {
      fetchStoreStaff();
    }
  }, [storeId, showStaffSelector]);

  const fetchStoreStaff = async () => {
    if (!storeId) return;

    try {
      setLoadingStaff(true);
      const response = await api.get("/get_staff_by_store", {
        params: { store_id: storeId },
      });
      if (response?.data?.data) {
        setStoreStaff(response.data.data);
      } else if (response?.data) {
        setStoreStaff(response.data);
      }
    } catch (error) {
      console.error("Error fetching store staff:", error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleLogin = async () => {
    // Validate email and password
    if (!username) {
      setError("Please enter your email address");
      return;
    }

    if (!password) {
      setError("Please enter your password");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setLoading(true);

    try {
      // Regular login
      await login(username, password, rememberMe);

      console.log("[LoginScreen] Login successful");


      // Retrieve user data
      const userData = userService.currentUser;

      if (userData) {
        console.log("User logged in:", userData);

        // Check if user has a store ID
        if (userData.storeId) {
          setStoreId(Number(userData.storeId));

          // If the user has a staff ID, we can add them directly to the session
          if (userData.employeeId) {
            const staffUserData = { ...userData, staffId: userData.employeeId };
            await addStaffSession(staffUserData);
            // Navigation will be handled by the auth context in _layout.tsx
          } else {
            // If they don't have a staff ID, show the staff selector
            setShowStaffSelector(true);
          }
        } else {
          // No store ID, just proceed with the login
          // Navigation will be handled by the auth context in _layout.tsx
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSelect = async (staff: StoreStaff) => {
    try {
      setSelectedStaffId(staff.staff_id);
      setLoadingStaff(true);

      // Get the current user data
      const userData = userService.currentUser;

      if (userData) {
        // Create a merged user object with the selected staff ID
        const staffUserData = {
          ...userData,
          staffId: staff.staff_id,
        };

        // Add the staff session
        await addStaffSession(staffUserData);

        // Close the modal
        setShowStaffSelector(false);

        // Navigation will be handled by the auth context in _layout.tsx
      } else {
        throw new Error("User data not available");
      }
    } catch (error) {
      console.error("Error selecting staff:", error);
      setError("Failed to select staff. Please try again.");
    } finally {
      setLoadingStaff(false);
      setSelectedStaffId(null);
    }
  };

  // Calculate responsive dimensions
  const containerWidth = Math.min(width * 0.9, 400);
  const imageSize = Math.min(width * 0.3, 160);

  // Don't render until initialization is complete
  if (!isInitialized) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={tw`flex-1 bg-white`}
      keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
    >
      <ScrollView
        contentContainerStyle={tw`flex-1 justify-center`}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={tw`flex-1 justify-center items-center px-4 py-8`}>
          <View style={{ width: containerWidth }}>
            <View style={tw`items-center mb-6`}>
              <Image
                source={require("@/assets/images/nexoslo.png")}
                style={{ width: imageSize, height: imageSize }}
                resizeMode="contain"
              />
              <Text
                style={tw`text-h1 font-semibold text-neutral-darkGray mb-2 text-center`}
              >
                Welcome back
              </Text>
              <Text
                style={tw`text-body text-neutral-darkGray text-center opacity-60`}
              >
                Sign in to your account
              </Text>
            </View>

            {error ? (
              <View
                style={tw`mb-4 flex-row items-center bg-status-error/10 p-3 rounded-lg`}
              >
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color="#ef4444"
                  style={tw`mr-2`}
                />
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
                  placeholder="Email"
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    setError("");
                  }}
                  autoCapitalize="none"
                  containerStyle={tw`mb-0 flex-1`}
                  inputStyle={tw`h-[48px]`}
                />
              </View>
            </View>

            <View>
              <View
                style={tw`flex-row items-center mb-4 rounded-lg px-4 h-[48px] bg-white`}
              >
                <Input
                  placeholder="Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setError("");
                  }}
                  secureTextEntry={!showPassword}
                  containerStyle={tw`mb-0 flex-1`}
                  inputStyle={tw`h-[48px]`}
                  rightIcon={
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color="#64748b"
                      />
                    </TouchableOpacity>
                  }
                />
              </View>
            </View>

            <View style={tw`flex-row justify-between mb-4`}>
              <TouchableOpacity
                style={tw`flex-row items-center`}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View
                  style={[
                    tw`w-5 h-5 rounded border mr-2 items-center justify-center`,
                    rememberMe
                      ? tw`bg-primary-main border-primary-main`
                      : tw`border-neutral-border`,
                  ]}
                >
                  {rememberMe && (
                    <Ionicons name="checkmark" size={18} color="white" />
                  )}
                </View>
                <Text style={tw`text-small text-neutral-darkGray`}>
                  Remember me
                </Text>
              </TouchableOpacity>

              <TouchableOpacity>
                <Text style={tw`text-small text-primary-main`}>
                  Forgot password?
                </Text>
              </TouchableOpacity>
            </View>

            <Button
              onPress={handleLogin}
              loading={loading}
              fullWidth
              style={tw`mt-4 h-[48px]`}
            >
              Sign in
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Staff Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showStaffSelector}
        onRequestClose={() => setShowStaffSelector(false)}
      >
        <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl max-h-96`}>
            <View
              style={tw`flex-row justify-between items-center p-4 border-b border-gray-100`}
            >
              <Text style={[tw`text-gray-900`, typography.h2]}>
                Select Staff Profile
              </Text>
              <TouchableOpacity onPress={() => setShowStaffSelector(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            {loadingStaff ? (
              <View style={tw`p-8 items-center justify-center`}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={[tw`mt-4 text-gray-500`, typography.body]}>
                  Loading staff members...
                </Text>
              </View>
            ) : (
              <FlatList
                data={storeStaff}
                keyExtractor={(item) => item.staff_id}
                renderItem={({ item }) => {
                  const isLoading =
                    selectedStaffId === item.staff_id && loadingStaff;

                  return (
                    <TouchableOpacity
                      style={tw`flex-row items-center p-3 border-b border-gray-100`}
                      onPress={() => handleStaffSelect(item)}
                      disabled={isLoading}
                    >
                      <View style={tw`mr-3 relative`}>
                        <MaterialCommunityIcons
                          name="account-circle"
                          size={40}
                          color="#64748b"
                        />
                      </View>

                      <View style={tw`flex-1`}>
                        <Text style={[tw`text-gray-900`, typography.bodyBold]}>
                          {item.name}
                        </Text>
                        <Text style={[tw`text-gray-500`, typography.caption]}>
                          {item.role}
                        </Text>
                      </View>

                      {isLoading && (
                        <ActivityIndicator
                          size="small"
                          color="#3b82f6"
                          style={tw`mr-2`}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={tw`pb-8`}
                ListEmptyComponent={
                  <View style={tw`p-8 items-center justify-center`}>
                    <MaterialCommunityIcons
                      name="account-alert"
                      size={40}
                      color="#64748b"
                    />
                    <Text style={[tw`mt-4 text-gray-500`, typography.body]}>
                      No staff members found for this store
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
