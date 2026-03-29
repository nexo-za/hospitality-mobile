import React from "react";
import { View, Image, Text, StyleProp, ViewStyle } from "react-native";
import tw from "../../styles/tailwind";
import { colors } from "../../styles/theme/tokens";

type AvatarSize = "small" | "medium" | "large";

interface AvatarProps {
  size?: AvatarSize;
  source?: { uri: string };
  initials?: string;
  style?: StyleProp<ViewStyle>;
}

const AVATAR_SIZES = {
  small: 32,
  medium: 40,
  large: 48,
};

const FONT_SIZES = {
  small: tw`text-caption`,
  medium: tw`text-small`,
  large: tw`text-body`,
};

export function Avatar({
  size = "medium",
  source,
  initials,
  style,
}: AvatarProps) {
  const avatarSize = AVATAR_SIZES[size];
  const fontSize = FONT_SIZES[size];

  const containerStyles = [
    tw`rounded-full overflow-hidden items-center justify-center`,
    { width: avatarSize, height: avatarSize },
    !source && tw`bg-primary-main/10`,
    style,
  ];

  if (source) {
    return (
      <View style={containerStyles}>
        <Image
          source={source}
          style={{ width: avatarSize, height: avatarSize }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={containerStyles}>
      <Text style={[fontSize, tw`font-medium text-primary-main`]}>
        {initials?.toUpperCase() || "?"}
      </Text>
    </View>
  );
}
