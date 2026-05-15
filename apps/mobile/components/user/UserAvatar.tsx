import { MaterialIcons } from "@expo/vector-icons";
import { Image, StyleSheet, View } from "react-native";
import { colors } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

export function UserAvatar({ size = 64 }: { size?: number }) {
  const avatarUri = useAppStore((state) => state.avatarUri);
  const radius = size / 2;

  if (avatarUri) {
    return <Image source={{ uri: avatarUri }} style={{ width: size, height: size, borderRadius: radius }} />;
  }

  return (
    <View style={[styles.defaultAvatar, { width: size, height: size, borderRadius: radius }]}>
      <View style={[styles.avatarInner, { width: size * 0.72, height: size * 0.72, borderRadius: size * 0.36 }]}>
        <MaterialIcons name="person" size={size * 0.44} color="#fff" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  defaultAvatar: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF",
    borderWidth: 1,
    borderColor: "#D5E5FF"
  },
  avatarInner: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  }
});
