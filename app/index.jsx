import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";
import { supabase } from "../supabaseConfig";

export default function Landing() {
  
  // ✅ AUTOMATIC LOGIN CHECK
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // User is already signed in, check their database profile role
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("role, banned")
            .eq("id", session.user.id)
            .maybeSingle(); // prevents crashes if row is still generating

          if (error) throw error;

          if (profile) {
            if (profile.banned) {
              await supabase.auth.signOut();
              return;
            }
            if (profile.role === "admin") {
              router.replace("/admin");
              return;
            }
          }
          router.replace("/tasks");
        }
      } catch (err) {
        console.error("Auto-login check failed:", err.message);
      }
    };

    checkUserSession();
  }, []);

  return (
    <View style={styles.container}>
      {/* App Name */}
      <Text style={styles.title}>LocalHands</Text>

      {/* Local Logo Image */}
      <View style={styles.imageWrapper}>
        <Image 
          source={require("../assets/landing.png")} 
          style={styles.logo} 
        />
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Get your chores done by trusted locals
      </Text>

      {/* Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.buttonText}>Let’s get started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFF",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imageWrapper: {
    marginVertical: 40,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 150, // Ensures space doesn't collapse
    width: "100%",
  },
  logo: {
    width: 180,
    height: 180,
    resizeMode: "contain",
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 18,
    textAlign: "center",
    marginVertical: 20,
    color: "#555",
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "#660005",
    paddingHorizontal: 45,
    paddingVertical: 20,
    borderRadius: 12,
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFF",
  },
});