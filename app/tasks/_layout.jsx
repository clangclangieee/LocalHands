// /app/tasks/_layout.jsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { Platform } from "react-native";
import 'react-native-gesture-handler';

export default function TasksLayout() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      ScreenCapture.allowScreenCaptureAsync();
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        tabBarStyle: {
          backgroundColor: "#FFFF",
          height: 70,
          paddingBottom: 15,
          paddingTop: 6,
        },

        tabBarActiveTintColor: "#DF8F9C",
        tabBarInactiveTintColor: "#660005",

        // 👇 tab label below the icon
        tabBarLabelPosition: "below-icon",
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Ionicons name="search-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Create",
          tabBarIcon: ({ color }) => <Ionicons name="add-outline" size={28} color={color} />,
        }}
      />

      <Tabs.Screen
        name="message"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => <Ionicons name="chatbubble-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
