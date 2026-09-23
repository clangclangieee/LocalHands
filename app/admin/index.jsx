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
  Platform,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

export default function Dashboard() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
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
    <TouchableOpacity style={styles.card} onPress={() => router.push(route)} activeOpacity={0.85}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Floating Header */}
      <View style={styles.stickyHeader}>
        <Text style={styles.header}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#DF8F9C" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Dashboard Metrics Grid */}
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
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Open Settings</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  stickyHeader: {
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 15,
    backgroundColor: "#1E293B",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  header: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  logoutBtn: {
    backgroundColor: "#FF4444",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#FF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  logoutText: { color: "#fff", fontWeight: "bold" },
  scrollContent: { padding: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48%",
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  cardTitle: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
  cardValue: { color: "#DF8F9C", fontSize: 28, fontWeight: "bold", marginTop: 8 },
  section: { color: "#fff", fontSize: 20, fontWeight: "bold", marginTop: 15, marginBottom: 10 },
  activityCard: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  activityText: { color: "#fff" },
  settingsBtn: {
    marginTop: 15,
    backgroundColor: "#DF8F9C",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#DF8F9C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    marginBottom: 20,
  },
  btnText: { color: "#fff", fontWeight: "bold" }
});