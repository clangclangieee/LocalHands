// /app/_layout.jsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";
import { Platform } from "react-native";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      ScreenCapture.allowScreenCaptureAsync();
    }
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        {/* Landing */}
        <Stack.Screen name="index" />

        {/* Auth */}
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />

        {/* Admin Screens Group */}
        <Stack.Screen name="admin" />

        {/* Main App (Tabs inside tasks) */}
        <Stack.Screen name="tasks" />
      </Stack>
    </>
  );
}