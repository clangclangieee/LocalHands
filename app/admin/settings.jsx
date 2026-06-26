import React, { useState } from "react";
import { View, Text, TextInput, Switch, StyleSheet } from "react-native";

export default function Settings() {
  const [maintenance, setMaintenance] = useState(false);
  const [appName, setAppName] = useState("My App");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.card}>
        <Text style={styles.label}>App Name</Text>
        <TextInput
          value={appName}
          onChangeText={setAppName}
          style={styles.input}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Maintenance Mode</Text>
        <Switch value={maintenance} onValueChange={setMaintenance} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Admin Password</Text>
        <TextInput placeholder="Change password" style={styles.input} secureTextEntry />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 10 },
  title: { color: "white", fontSize: 22, fontWeight: "bold" },

  card: {
    backgroundColor: "#111827",
    padding: 15,
    marginBottom: 10,
    borderRadius: 10,
  },

  label: { color: "white", marginBottom: 5 },

  input: {
    backgroundColor: "#1F2937",
    padding: 10,
    borderRadius: 8,
    color: "white",
  },
});