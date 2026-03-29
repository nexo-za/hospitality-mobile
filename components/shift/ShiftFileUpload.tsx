import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Modal,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import { Text as GeistText } from "@/components/Text";
import tw from "@/styles/tailwind";
import { typography } from "@/styles/typography";
import api from "@/api/api";

interface ShiftFileUploadProps {
  shiftId: string | number;
  userId: number;
  onUploadComplete?: () => void;
  onUploadError?: (error: Error) => void;
}

interface UploadedFile {
  id: number;
  name: string;
  type: string;
  docType: string;
  key: string;
  url: string;
  size: number;
  mimeType: string;
  createdAt: any;
}

interface UploadResponse {
  status: string;
  message: string;
  data: UploadedFile[];
  timestamp: string;
  path: string;
  requestId: string;
}

export default function ShiftFileUpload({
  shiftId,
  userId,
  onUploadComplete,
  onUploadError,
}: ShiftFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    uri: string;
    name: string;
  } | null>(null);
  const [cameraType, setCameraType] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        console.log("Photo captured:", {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          base64: photo.base64 ? "present" : "missing",
        });
        setShowCamera(false);
        setPreviewImage({
          uri: photo.uri,
          name: `photo_${Date.now()}.jpg`,
        });
        setShowPreview(true);
      } catch (error) {
        console.error("Error taking picture:", error);
        onUploadError?.(error as Error);
      }
    }
  };

  const handleUpload = async () => {
    if (!previewImage) return;

    try {
      setIsUploading(true);
      console.log("Starting upload with image:", {
        uri: previewImage.uri,
        name: previewImage.name,
        exists: await checkFileExists(previewImage.uri),
      });
      await uploadFiles([
        {
          uri: previewImage.uri,
          type: "image/jpeg",
          name: previewImage.name,
        },
      ]);
      setShowPreview(false);
      setPreviewImage(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      onUploadError?.(error as Error);
    } finally {
      setIsUploading(false);
    }
  };

  const checkFileExists = async (uri: string): Promise<boolean> => {
    try {
      const response = await fetch(uri);
      return response.ok;
    } catch (error) {
      console.error("Error checking file:", error);
      return false;
    }
  };

  const handleCancel = () => {
    setShowPreview(false);
    setPreviewImage(null);
  };

  const verifyUploadedImage = async (url: string) => {
    try {
      console.log("Verifying uploaded image at URL:", url);
      const response = await fetch(url);
      const blob = await response.blob();
      console.log("Image verification result:", {
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get("content-type"),
        contentLength: response.headers.get("content-length"),
        blobSize: blob.size,
        blobType: blob.type,
      });
      return response.ok;
    } catch (error) {
      console.error("Error verifying uploaded image:", error);
      return false;
    }
  };

  const uploadFiles = async (files: any[]) => {
    try {
      setIsUploading(true);
      console.log(`Uploading files for shift ${shiftId}, user ${userId}`);

      // Create FormData
      const formData = new FormData();

      // Add document type first (to match exact order)
      formData.append("docType", "receipt");

      // Append files with proper structure
      for (const file of files) {
        // Create file object that matches exactly what Postman sends
        const fileData = {
          uri:
            Platform.OS === "ios" ? file.uri.replace("file://", "") : file.uri,
          type: file.mimeType || file.type || "image/jpeg",
          name: file.name || "image.jpg",
        };

        console.log("Adding file to FormData:", {
          ...fileData,
          exists: await checkFileExists(fileData.uri),
        });

        // Append the file with the correct structure for multipart/form-data
        formData.append("document", {
          uri: fileData.uri,
          type: fileData.type,
          name: fileData.name,
        } as any);
      }

      // Log FormData contents
      console.log(
        "FormData created with document files:",
        Array.isArray((formData as any)._parts)
          ? (formData as any)._parts.length + " parts"
          : "unknown structure"
      );

      const endpoint = `shifts/${shiftId}/attachments`;
      console.log(`Making API call with endpoint: ${endpoint}`);

      // Upload files with explicit content-type header
      try {
        console.log("Attempting file upload with custom headers...");

        const response = await api.post<UploadResponse>(endpoint, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        }) as { status: number; data: UploadResponse };

        const uploadedFile = response.data?.data?.[0];
        console.log("File upload response:", {
          status: response.status,
          data: response.data,
          uploadedFile,
        });

        // Verify the uploaded image
        if (response.data?.data?.[0]?.url) {
          console.log(
            "Verifying uploaded image at URL:",
            response.data.data[0].url
          );
          const isVerified = await verifyUploadedImage(
            response.data.data[0].url
          );
          console.log(
            "Image verification result:",
            isVerified ? "SUCCESS" : "FAILED"
          );

          if (!isVerified) {
            console.error(
              "Image verification failed - URL may be invalid or image not accessible"
            );
          }
        }

        console.log("File upload completed successfully");
      } catch (error) {
        console.error("File upload failed with error:", error);
        throw error;
      }

      // Update state with uploaded files
      setUploadedFiles((prev) => [...prev, ...files.map((f) => f.name)]);
      onUploadComplete?.();
    } catch (error) {
      console.error("Error uploading files:", error);
      onUploadError?.(error as Error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileUpload = async () => {
    try {
      // Pick document(s)
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const files = Array.isArray(result.assets)
        ? result.assets
        : [result.assets];

      await uploadFiles(files);
    } catch (error) {
      console.error("Error selecting files:", error);
      onUploadError?.(error as Error);
    }
  };

  const openCamera = async () => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert(
          "Permission required",
          "Camera access is needed to take photos"
        );
        return;
      }
    }

    setShowCamera(true);
  };

  const toggleCameraType = () => {
    setCameraType((current) => (current === "back" ? "front" : "back"));
  };

  return (
    <View style={tw`bg-white rounded-xl p-4 mb-6 border border-gray-100 `}>
      <View style={tw`flex-col `}>
        <GeistText style={[tw`text-gray-900 mb-2`, typography.h3]}>
          Shift Attachments
        </GeistText>
        <View style={tw`flex-row justify-center mb-2 w-full`}>
          <TouchableOpacity
            onPress={openCamera}
            disabled={isUploading}
            style={[
              tw`bg-green-50 rounded-lg px-6 py-3 flex-row items-center justify-center w-full`,
              isUploading && tw`opacity-50`,
            ]}
          >
            <MaterialCommunityIcons
              name="camera"
              size={24}
              color="#22c55e"
              style={tw`mr-2`}
            />
            <GeistText style={[tw`text-green-600`, typography.bodyBold]}>
              Take Photo
            </GeistText>
          </TouchableOpacity>
        </View>
      </View>

      {uploadedFiles.length > 0 && (
        <View style={tw`mt-4`}>
          <GeistText style={[tw`text-gray-900 mb-2`, typography.h3]}>
            Uploaded Files
          </GeistText>
          <View style={tw`bg-gray-50 rounded-lg p-2`}>
            {uploadedFiles.map((fileName, index) => (
              <View
                key={index}
                style={tw`flex-row items-center bg-white rounded-lg p-3 mb-2 shadow-sm`}
              >
                <MaterialCommunityIcons
                  name="file-document"
                  size={24}
                  color="#22c55e"
                  style={tw`mr-3`}
                />
                <GeistText
                  style={[tw`text-gray-700 flex-1`, typography.body]}
                  numberOfLines={1}
                >
                  {fileName}
                </GeistText>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color="#22c55e"
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Camera Modal */}
      <Modal visible={showCamera} transparent={false} animationType="slide">
        <View style={tw`flex-1`}>
          <CameraView
            style={tw`flex-1`}
            ref={cameraRef}
            facing={cameraType}
            onCameraReady={() => {
              console.log("Camera is ready");
            }}
          >
            <View style={tw`flex-1 justify-end items-center pb-10`}>
              <View style={tw`flex-row justify-around w-full px-4`}>
                <TouchableOpacity
                  style={tw`bg-white p-3 rounded-full`}
                  onPress={() => setShowCamera(false)}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={30}
                    color="#ef4444"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-white p-3 rounded-full`}
                  onPress={takePicture}
                >
                  <MaterialCommunityIcons
                    name="camera"
                    size={30}
                    color="#22c55e"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-white p-3 rounded-full`}
                  onPress={toggleCameraType}
                >
                  <MaterialCommunityIcons
                    name="camera-switch"
                    size={30}
                    color="#3b82f6"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Preview Modal */}
      <Modal visible={showPreview} transparent={false} animationType="slide">
        <View style={tw`flex-1 bg-black`}>
          {previewImage && (
            <View style={tw`flex-1`}>
              <View style={tw`flex-1 relative`}>
                <Image
                  source={{ uri: previewImage.uri }}
                  style={tw`flex-1`}
                  resizeMode="contain"
                />
                {isUploading && (
                  <View
                    style={tw`absolute inset-0 bg-black/50 justify-center items-center`}
                  >
                    <ActivityIndicator size="large" color="#22c55e" />
                    <GeistText
                      style={[tw`text-white mt-4`, typography.bodyBold]}
                    >
                      Uploading...
                    </GeistText>
                  </View>
                )}
              </View>
              <View
                style={tw`flex-row justify-around items-center p-4 bg-black`}
              >
                <TouchableOpacity
                  style={tw`bg-red-500 px-6 py-3 rounded-lg`}
                  onPress={handleCancel}
                  disabled={isUploading}
                >
                  <GeistText style={[tw`text-white`, typography.bodyBold]}>
                    Retake
                  </GeistText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw`bg-green-500 px-6 py-3 rounded-lg`}
                  onPress={handleUpload}
                  disabled={isUploading}
                >
                  <GeistText style={[tw`text-white`, typography.bodyBold]}>
                    Upload
                  </GeistText>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}
