import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Switch, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { supabase } from "../../supabaseConfig";
import { useRouter } from "expo-router";

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);
  // UPDATED: Changed initial state to "LocalHands"
  const [appName, setAppName] = useState("LocalHands"); 
  const router = useRouter();

  useEffect(() => {
    const initializeSettings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace("/login");

      // Verify Admin
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") {
        Alert.alert("Unauthorized", "Admin access required.");
        return router.replace("/");
      }

      // Fetch initial settings
      const { data } = await supabase.from("settings").select("key, value");
      if (data) {
        const mMode = data.find(s => s.key === "maintenance_mode");
        const aName = data.find(s => s.key === "app_name");
        if (mMode) setMaintenance(mMode.value === "true");
        // If data exists in the database, it will overwrite "LocalHands"
        if (aName) setAppName(aName.value);
      }
      setLoading(false);
    };
    initializeSettings();
  }, []);

  const updateSetting = async (key, value) => {
    const { error } = await supabase.from("settings").upsert({ key, value: value.toString() });
    if (error) Alert.alert("Error", "Could not save.");
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#DF8F9C" /></View>;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
  style={styles.backButton} 
  onPress={() => router.replace("/admin/")}
>
  <Text style={styles.backButtonText}>← Back</Text>
</TouchableOpacity>

      <Text style={styles.title}>Admin Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>App Name</Text>
        <TextInput value={appName} onChangeText={setAppName} onBlur={() => updateSetting("app_name", appName)} style={styles.input} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Maintenance Mode</Text>
        <Switch 
          value={maintenance} 
          onValueChange={(val) => {
            setMaintenance(val);
            updateSetting("maintenance_mode", val);
          }} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 20, paddingTop: 50 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0F172A" },
  backButton: { marginBottom: 20 },
  backButtonText: { color: "#DF8F9C", fontSize: 16, fontWeight: "bold" },
  title: { color: "white", fontSize: 22, fontWeight: "bold", marginBottom: 20 },
  card: { backgroundColor: "#111827", padding: 15, marginBottom: 15, borderRadius: 10 },
  label: { color: "white", marginBottom: 8, fontWeight: "600" },
  input: { backgroundColor: "#1F2937", padding: 12, borderRadius: 8, color: "white" }
});