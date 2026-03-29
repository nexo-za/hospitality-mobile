import React from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { useAuth } from "@/contexts/AuthContext";
import { Stack, useRouter } from "expo-router";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export default function AccountSettingsScreen() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0ea5e9" />
        </View>
      </Screen>
    );
  }

  if (!user) {
    return (
      <Screen>
        <Stack.Screen
          options={{
            title: "Account Settings",
            headerBackTitle: "Back",
          }}
        />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 20 }}>
            You need to be logged in to view account settings.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/login")}
            style={{
              backgroundColor: "#0ea5e9",
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: "white", fontWeight: "bold" }}>Login</Text>
          </TouchableOpacity>
        </View>
      </Screen>
    );
  }

  const renderField = (label: string, value: string | undefined, icon?: IconName) => {
    return (
      <View style={{ 
        flexDirection: "row", 
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f1f5f9"
      }}>
        <View style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 20,
          backgroundColor: "#e0f2fe",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16,
          shadowColor: "#0ea5e9",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2
        }}>
          <MaterialCommunityIcons 
            name={icon || "information"} 
            size={22} 
            color="#0ea5e9" 
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 13, 
            color: "#64748b",
            marginBottom: 4,
            fontWeight: "400"
          }}>
            {label}
          </Text>
          <Text style={{ 
            fontSize: 17,
            color: "#1e293b",
            fontWeight: "700"
          }}>
            {value || "Not provided"}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "Account Settings",
          headerBackTitle: "Back",
        }}
      />
      
      <ScrollView style={{ flex: 1 }}>
        {/* Profile Header */}
        <View style={{ 
          backgroundColor: "#f8fafc",
          padding: 24,
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0"
        }}>
          <View style={{ 
            width: 90, 
            height: 90, 
            borderRadius: 45,
            backgroundColor: "#e0f2fe",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
            borderWidth: 3,
            borderColor: "#0ea5e9",
            shadowColor: "#0ea5e9",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4
          }}>
            <MaterialCommunityIcons name="account" size={45} color="#0ea5e9" />
          </View>
          
          <Text style={{ 
            fontSize: 28, 
            fontWeight: "800",
            color: "#1e293b",
            marginBottom: 4
          }}>
            {user.firstName} {user.lastName}
          </Text>
          
          <Text style={{ 
            fontSize: 16,
            color: "#64748b",
            marginBottom: 12,
            fontWeight: "500"
          }}>
            {user.username}
          </Text>
          
          <View style={{ 
            backgroundColor: "#e0f2fe",
            paddingHorizontal: 16,
            paddingVertical: 6,
            borderRadius: 20,
            shadowColor: "#0ea5e9",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 2
          }}>
            <Text style={{ 
              color: "#0ea5e9",
              fontSize: 14,
              fontWeight: "700"
            }}>
              {user.role}
            </Text>
          </View>
        </View>

        {/* Personal Information */}
        <View style={{ padding: 24 }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: "700",
            color: "#1e293b",
            marginBottom: 16
          }}>
            Personal Information
          </Text>
          
          <View style={{ 
            backgroundColor: "white",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3
          }}>
            {renderField("Email", user.email, "email")}
            {renderField("Contact Number", user.contactNumber, "phone")}
            {renderField("First Name", user.firstName, "account")}
            {renderField("Last Name", user.lastName, "account")}
          </View>
        </View>

        {/* Work Information */}
        <View style={{ padding: 24, paddingTop: 0 }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: "700",
            color: "#1e293b",
            marginBottom: 16
          }}>
            Work Information
          </Text>
          
          <View style={{ 
            backgroundColor: "white",
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#e2e8f0",
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 3
          }}>
            {renderField("Staff ID", user.staffId, "badge-account")}
            {renderField("Store", user.store, "store")}
            {renderField("Region", user.regionName, "map-marker")}
            
            <View style={{ 
              padding: 20,
              borderTopWidth: 1,
              borderTopColor: "#f1f5f9",
              backgroundColor: "#f8fafc"
            }}>
              <Text style={{ 
                fontSize: 15, 
                color: "#64748b",
                marginBottom: 12,
                fontWeight: "500"
              }}>
                Permissions
              </Text>
              <View style={{ 
                flexDirection: "row", 
                flexWrap: "wrap",
                gap: 8
              }}>
                {(user.permissions || []).map((permission, index) => (
                  <View 
                    key={index}
                    style={{ 
                      backgroundColor: "#e0f2fe",
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      shadowColor: "#0ea5e9",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.1,
                      shadowRadius: 2,
                      elevation: 1
                    }}
                  >
                    <Text style={{ 
                      color: "#0ea5e9",
                      fontSize: 13,
                      fontWeight: "600"
                    }}>
                      {permission}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
} 