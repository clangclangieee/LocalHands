import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { router } from "expo-router";
import { supabase } from "../supabaseConfig";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // 📱 Added phone state
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      alert("Validation Error: Please fill out all fields.");
      return;
    }

    try {
      console.log("Attempting sign up for:", email.trim());
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            phone: phone.trim(), // 🚀 Passes phone string down into your database trigger
          },
        },
      });

      if (error) {
        console.error("Supabase returned an error:", error.message);
        alert("Registration Failed: " + error.message);
        return;
      }

      console.log("Sign up response data:", data);

      alert("Registration Complete! ✨ Please check your email for confirmation.");
      
      setTimeout(() => {
        router.replace("/login");
      }, 500);

    } catch (error) {
      console.error("Catch block error caught:", error);
      alert("Registration Failed Exception: " + error.message);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.screen}>
        <Text style={styles.title}>Sign Up</Text>
        <View style={styles.card}>
          <TextInput 
            style={styles.input} 
            placeholder="Full Name" 
            value={name}
            onChangeText={setName} 
            autoCapitalize="words" 
          />
          <TextInput 
            style={styles.input} 
            placeholder="Email" 
            value={email}
            onChangeText={setEmail} 
            autoCapitalize="none" 
            keyboardType="email-address"
          />
          {/* 📱 Added Phone Number Field Input */}
          <TextInput 
            style={styles.input} 
            placeholder="Phone Number" 
            value={phone}
            onChangeText={setPhone} 
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <TextInput 
            style={styles.input} 
            placeholder="Password" 
            secureTextEntry 
            value={password}
            onChangeText={setPassword} 
          />
          <TouchableOpacity style={styles.button} onPress={handleSignup}>
            <Text style={styles.buttonText}>SIGN UP</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, backgroundColor: "#FFFF" },
  screen: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 25 },
  card: { width: "100%", maxWidth: 400, backgroundColor: "#DF8F9C", borderRadius: 20, padding: 30 },
  input: { backgroundColor: "#FFF", height: 50, borderRadius: 10, paddingHorizontal: 15, marginBottom: 15 },
  button: { backgroundColor: "#660005", padding: 15, borderRadius: 10, alignItems: "center", marginTop: 5 },
  buttonText: { fontWeight: "bold", color: "#FFFF" },
  link: { marginTop: 20, color: "#660005" }
});