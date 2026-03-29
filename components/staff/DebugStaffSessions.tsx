import React, { useState } from "react";
import { View, Text, Button, ScrollView } from "react-native";
import { debugActiveStaffSessions } from "@/contexts/StaffSessionContext";
import tw from "@/styles/tailwind";

export const DebugStaffSessions = () => {
  const [sessions, setSessions] = useState<{
    activeStaff: any[];
    currentStaff: any | null;
  } | null>(null);

  const checkSessions = async () => {
    const result = await debugActiveStaffSessions();
    setSessions(result);
  };

  return (
    <View
      style={tw`p-4 bg-white rounded-lg shadow-md m-2 border border-gray-200`}
    >
      <Text style={tw`text-lg font-bold mb-2`}>Staff Sessions Debug</Text>
      <Button
        title="Check Active Sessions"
        onPress={checkSessions}
        color="#2563eb"
      />

      {sessions && (
        <ScrollView style={tw`mt-4`}>
          <Text style={tw`font-bold mb-1`}>Current Staff:</Text>
          <Text style={tw`mb-4 p-2 bg-gray-100 rounded`}>
            {sessions.currentStaff
              ? JSON.stringify(sessions.currentStaff, null, 2)
              : "None"}
          </Text>

          <Text style={tw`font-bold mb-1`}>
            Active Staff ({sessions.activeStaff.length}):
          </Text>
          <View style={tw`p-2 bg-gray-100 rounded`}>
            {sessions.activeStaff.length > 0 ? (
              sessions.activeStaff.map((staff, index) => (
                <View
                  key={staff.staffId}
                  style={tw`mb-2 p-2 bg-white rounded border border-gray-200`}
                >
                  <Text style={tw`font-bold`}>{staff.displayName}</Text>
                  <Text>Staff ID: {staff.staffId}</Text>
                  <Text>User ID: {staff.userId}</Text>
                  <Text>Role: {staff.role}</Text>
                </View>
              ))
            ) : (
              <Text>No active staff sessions</Text>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default DebugStaffSessions;
