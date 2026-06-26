import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { auth, db } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const user = userCredential.user;

      // 🔥 GET USER ROLE FROM FIRESTORE
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (!userDoc.exists()) {
        Alert.alert("Error", "User profile not found");
        return;
      }

      const data = userDoc.data();

      // 🚨 BLOCK BANNED USERS
      if (data.banned) {
        Alert.alert("Access Denied", "You are banned.");
        return;
      }

      // 🔐 ROLE-BASED ROUTING
      if (data.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/tasks");
      }

    } catch (error) {
      Alert.alert("Login Failed", "Invalid email or password");
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
  screen: { 
    flex: 1, 
    backgroundColor: "#D4F0F0",
    justifyContent: "center", 
    alignItems: "center", 
    padding: 20 
  },

  title: { 
    fontSize: 28, 
    fontWeight: "bold", 
    marginBottom: 25 
  },

  cardWrapper: { 
    width: "100%", 
    alignItems: "center" 
  },

  card: { 
    width: "100%", 
    maxWidth: 420, 
    minHeight: 340,
     backgroundColor: "#CBAACB", 
     borderRadius: 20, 
     padding: 32, 
     justifyContent: "space-between" 
    },
    
  input: { width: "100%", height: 54, borderRadius: 12, borderWidth: 1, backgroundColor: "#FFFFFF", paddingHorizontal: 16, marginBottom: 20 },
  button: { backgroundColor: "#8FCACA", paddingVertical: 18, borderRadius: 16, alignItems: "center" },
  buttonText: { fontWeight: "bold", fontSize: 16 },
  link: { marginTop: 24, fontSize: 15 }
});