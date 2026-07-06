// ===================================
// FILE: app/admin/dashboard.jsx
// ===================================
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

export default function Dashboard() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);

  const fetchDashboardMetrics = async () => {
    try {
      // 1. Fetch profiles table data
      const { data: usersData, error: usersErr } = await supabase.from("profiles").select("*");
      if (!usersErr && usersData) setUsers(usersData);

      // 2. Fetch chores table data
      const { data: choresData, error: choresErr } = await supabase.from("chores").select("*");
      if (!choresErr && choresData) setPosts(choresData);

      // 3. Fetch reports table data (Safe-guarded if the table doesn't exist yet)
      const { data: reportsData, error: reportsErr } = await supabase.from("reports").select("*");
      if (!reportsErr && reportsData) {
        setReports(reportsData);
      } else {
        setReports([]); // Fallback to empty list without crashing the page
      }
    } catch (err) {
      console.error("Failed loading dashboard database metrics:", err.message);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();

    const usersChannel = supabase
      .channel("live_users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchDashboardMetrics())
      .subscribe();

    const choresChannel = supabase
      .channel("live_chores")
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => fetchDashboardMetrics())
      .subscribe();

    const reportsChannel = supabase
      .channel("live_reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => fetchDashboardMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(choresChannel);
      supabase.removeChannel(reportsChannel);
    };
  }, []);

  // Filter metrics locally based on explicit true boolean configurations
  const bannedUsers = users.filter((u) => u.banned === true).length;

  const handleLogout = () => {
    const executeLogoutAction = async () => {
      try {
        await supabase.auth.signOut();
        router.dismissAll();
        router.replace("/login"); 
      } catch (error) {
        if (Platform.OS === 'web') alert("Logout Error: " + error.message);
        else Alert.alert("Error", error.message);
      }
    };

    // 🛠️ Cross-Platform Alert Dialog Layer
    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm("Are you sure you want to logout?");
      if (confirmWeb) executeLogoutAction();
    } else {
      Alert.alert(
        "Logout",
        "Are you sure you want to logout?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Logout", style: "destructive", onPress: executeLogoutAction }
        ]
      );
    }
  };

  const Card = ({ title, value, route }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(route)}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.header}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <Card title="Total Users" value={users.length} route="/admin/users" />
        <Card title="Total Posts" value={posts.length} route="/admin/posts" />
        <Card title="Reports" value={reports.length} route="/admin/reports" />
        <Card title="Banned Users" value={bannedUsers} route="/admin/users" />
      </View>

      <Text style={styles.section}>Latest Activity</Text>

      {posts.slice(0, 5).map((item) => (
        <View key={item.id} style={styles.activityCard}>
          <Text style={styles.activityText}>
            New post: {item.category || "Untitled"}
          </Text>
        </View>
      ))}

      <TouchableOpacity
        style={styles.settingsBtn}
        onPress={() => router.push("/admin/settings")}
      >
        <Text style={styles.btnText}>Open Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 18 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  header: { color: "#fff", fontSize: 28, fontWeight: "bold" },
  logoutBtn: { backgroundColor: "#FF4444", paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  logoutText: { color: "#fff", fontWeight: "bold" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: { width: "48%", backgroundColor: "#1E293B", padding: 18, borderRadius: 14, marginBottom: 14 },
  cardTitle: { color: "#94A3B8", fontSize: 14 },
  cardValue: { color: "#DF8F9C", fontSize: 28, fontWeight: "bold", marginTop: 8 },
  section: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 15, marginBottom: 10 },
  activityCard: { backgroundColor: "#1E293B", padding: 14, borderRadius: 12, marginBottom: 10 },
  activityText: { color: "#fff" },
  settingsBtn: { marginTop: 15, backgroundColor: "#DF8F9C", padding: 14, borderRadius: 12, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" }
});