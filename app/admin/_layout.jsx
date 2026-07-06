// ================================
// FILE: app/admin/_layout.jsx
// ================================
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Platform, Alert } from "react-native";
import { Slot, useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

export default function AdminGuard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkAdminSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          if (isMounted) router.replace("/");
          return;
        }

        const { data: userData, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error || !userData || userData.role !== "admin") {
          const deniedMsg = "Access denied. Role is not admin or profile missing.";
          console.log(deniedMsg);
          
          if (Platform.OS === 'web') alert(deniedMsg);
          else Alert.alert("Unauthorized", deniedMsg);

          if (isMounted) router.replace("/");
          return;
        }

        if (isMounted) setLoading(false);
      } catch (err) {
        console.error("Admin guard error:", err.message);
        if (isMounted) router.replace("/");
      }
    };

    checkAdminSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && isMounted) {
        router.replace("/");
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0F172A",
          justifyContent: "center",
          alignItems: "center"
        }}
      >
        <ActivityIndicator size="large" color="#DF8F9C" />
      </View>
    );
  }

  return <Slot />;
}