// /app/_layout.jsx
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import * as ScreenCapture from "expo-screen-capture";

export default function RootLayout() {
  useEffect(() => {
    // ✅ Allow screenshots globally for all screens
    ScreenCapture.allowScreenCaptureAsync();
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

        {/* Main App (Tabs inside tasks) */}
        <Stack.Screen name="tasks" />
      </Stack>
    </>
  );
}
