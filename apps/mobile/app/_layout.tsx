import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { colors } from "@/constants/theme";
import { useAppStore } from "@/store/useAppStore";

/**
 * Hydration gate:AsyncStorage 是异步 rehydrate,未完成前 store 仍是初始 mock 值,
 * 直接渲染会先闪 mock、再被持久值覆盖。这里等持久化恢复完成后再渲染路由栈。
 */
export default function RootLayout() {
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    // 兜底:若 onFinishHydration 在订阅前已触发,补一次判断。
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, [hydrated]);

  if (!hydrated) {
    return (
      <>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="explore" />
        <Stack.Screen name="interview" />
      </Stack>
    </>
  );
}
