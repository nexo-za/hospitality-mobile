import { View, ViewProps } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { SafeAreaView } from "react-native-safe-area-context";

interface ScreenProps extends ViewProps {
  children: React.ReactNode;
  useSafeArea?: boolean;
}

export function Screen({
  children,
  style,
  useSafeArea = true,
  ...props
}: ScreenProps) {
  const { styles } = useTheme();

  const Container = useSafeArea ? SafeAreaView : View;

  return (
    <Container style={[{ flex: 1, backgroundColor: "#fff" }, style]} {...props}>
      {children}
    </Container>
  );
}
