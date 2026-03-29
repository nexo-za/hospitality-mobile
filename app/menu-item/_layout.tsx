import { Stack } from 'expo-router';

export default function MenuItemLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
