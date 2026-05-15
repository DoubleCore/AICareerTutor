import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={() => ({
        headerShown: false,
        tabBarStyle: { display: "none" }
      })}
    >
      <Tabs.Screen name="discover" options={{ title: "发现" }} />
      <Tabs.Screen name="path" options={{ title: "路径" }} />
      <Tabs.Screen name="interview" options={{ title: "面试" }} />
      <Tabs.Screen name="me" options={{ title: "我的" }} />
    </Tabs>
  );
}
