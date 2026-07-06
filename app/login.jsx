import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { supabase } from "../supabaseConfig";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Input Error", "Please fill in all fields.");
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) throw authError;

      // Matches your exact "profiles" table structure
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (profile) {
        if (profile.banned) {
          await supabase.auth.signOut();
          Alert.alert("Access Denied", "You are banned.");
          return;
        }

        if (profile.role === "admin") {
          router.replace("/admin");
          return;
        }
      }

      // Default route for clients
      router.replace("/tasks");
    } catch (error) {
      Alert.alert("Login Failed", error.message);
    }
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Login</Text>
      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.form}>
            <TextInput 
              style={styles.input} 
              placeholder="Email" 
              onChangeText={setEmail} 
              autoCapitalize="none" 
              keyboardType="email-address"
            />
            <TextInput 
              style={styles.input} 
              placeholder="Password" 
              secureTextEntry 
              onChangeText={setPassword} 
            />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleLogin}>
            <Text style={styles.buttonText}>LOGIN</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity onPress={() => router.push("/signup")}>
        <Text style={styles.link}>Don’t have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFF", justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 25 },
  cardWrapper: { width: "100%", alignItems: "center" },
  card: { width: "100%", maxWidth: 420, minHeight: 340, backgroundColor: "#DF8F9C", borderRadius: 20, padding: 32, justifyContent: "space-between" },
  input: { width: "100%", height: 54, borderRadius: 12, borderWidth: 1, borderColor: "#BBB", backgroundColor: "#FFFFFF", paddingHorizontal: 16, marginBottom: 20 },
  button: { backgroundColor: "#660005", paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  buttonText: { fontWeight: "bold", fontSize: 16, color: "#FFFF" },
  link: { marginTop: 24, fontSize: 15, color: "#660005", fontWeight: "600" }
});