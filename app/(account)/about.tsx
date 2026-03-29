import React, { useMemo } from "react";
import { View, ScrollView, Linking, TouchableOpacity, Platform } from "react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { getApiConfig } from "@/config/appConfig";

export default function AboutScreen() {
  const { styles } = useTheme();
  const api = getApiConfig();

  const appInfo = useMemo(
    () => [
      { label: "App Version", value: (require("../../app.json") as any).expo.version || "unknown", icon: "information-outline" },
      { label: "Platform", value: Platform.OS, icon: "cellphone" },
    ],
    []
  );

  const apiInfo = useMemo(
    () => [
      { label: "API URL", value: api.url, icon: "cloud" },
      { label: "Cache Duration (s)", value: String(api.cacheDuration), icon: "timer-outline" },
    ],
    [api]
  );

  const paymentInfo = useMemo(
    () => [
      { label: "Ecentric App URL", value: ecentric.appUrl, icon: "link-variant" },
      { label: "Ecentric App Class", value: ecentric.appClass, icon: "cog" },
      { label: "Is Sunmi Device", value: String(ecentric.isSunmiDevice), icon: "printer" },
    ],
    [ecentric]
  );

  const openMail = () => Linking.openURL("mailto:support@nexo.app?subject=Nexo%20Mobile%20Support");

  const renderItem = (icon: string, label: string, value: string | undefined) => (
    <View key={`${label}`} style={{ paddingVertical: 10, flexDirection: "row", alignItems: "center" }}>
      <MaterialCommunityIcons name={icon as any} size={18} color="#64748b" style={{ width: 24 }} />
      <Text style={{ color: "#475569", width: 160 }}>{label}</Text>
      <Text style={{ flex: 1 }} numberOfLines={1} ellipsizeMode="tail">{value || "-"}</Text>
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text variant="bold" style={{ fontSize: 22, marginBottom: 12 }}>About Nexo Mobile</Text>
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderColor: "#E0E0E0", borderWidth: 1, padding: 16, marginBottom: 16 }}>
          {appInfo.map((i) => renderItem(i.icon, i.label, i.value))}
        </View>

        <Text variant="bold" style={{ fontSize: 18, marginBottom: 8 }}>API</Text>
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderColor: "#E0E0E0", borderWidth: 1, padding: 16, marginBottom: 16 }}>
          {apiInfo.map((i) => renderItem(i.icon, i.label, i.value))}
        </View>

        <Text variant="bold" style={{ fontSize: 18, marginBottom: 8 }}>Payments</Text>
        <View style={{ backgroundColor: "#fff", borderRadius: 16, borderColor: "#E0E0E0", borderWidth: 1, padding: 16, marginBottom: 16 }}>
          {paymentInfo.map((i) => renderItem(i.icon, i.label, i.value))}
        </View>

        <TouchableOpacity onPress={openMail} style={{ flexDirection: "row", alignItems: "center", padding: 12, alignSelf: "flex-start" }}>
          <MaterialCommunityIcons name="email" size={18} color="#2563eb" style={{ marginRight: 6 }} />
          <Text style={{ color: "#2563eb" }}>Contact support@nexo.app</Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}


