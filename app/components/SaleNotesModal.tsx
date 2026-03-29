import React, { useState, useEffect } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";

interface SaleNotesModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  initialNotes?: string;
}

export default function SaleNotesModal({
  visible,
  onClose,
  onSave,
  initialNotes = "",
}: SaleNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);

  // Update internal state when initialNotes prop changes
  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleSave = () => {
    onSave(notes);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
      >
        <View
          style={tw`flex-1 bg-gray-800 bg-opacity-50 justify-center items-center p-6`}
        >
          <View style={tw`bg-white w-full max-w-md rounded-xl p-6`}>
            {/* Header */}
            <View style={tw`flex-row justify-between items-center mb-4`}>
              <GeistText style={[tw`text-gray-900`, typography.h2]}>
                Add Sale Notes
              </GeistText>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>

            {/* Notes Input */}
            <View style={tw`mb-6`}>
              <TextInput
                style={[
                  tw`bg-gray-50 rounded-lg p-4 text-gray-900 min-h-[120px]`,
                  typography.body,
                ]}
                placeholder="Enter any notes about this sale..."
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
                maxLength={500}
              />
              <GeistText
                style={[tw`text-gray-500 mt-2 text-right`, typography.caption]}
              >
                {notes.length}/500 characters
              </GeistText>
            </View>

            {/* Action Buttons */}
            <View style={tw`flex-row justify-end space-x-3`}>
              <TouchableOpacity
                style={tw`px-4 py-2 rounded-lg bg-gray-100`}
                onPress={onClose}
              >
                <GeistText style={[tw`text-gray-700`, typography.bodyMedium]}>
                  Cancel
                </GeistText>
              </TouchableOpacity>
              <TouchableOpacity
                style={tw`px-4 py-2 rounded-lg bg-blue-600`}
                onPress={handleSave}
              >
                <GeistText style={[tw`text-white`, typography.bodyMedium]}>
                  Save Notes
                </GeistText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
