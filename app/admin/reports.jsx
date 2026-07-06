// ===================================
// FILE: app/admin/reports.jsx
// ===================================
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

export default function Reports() {
  const router = useRouter();
  const [reports, setReports] = useState([]);

  const loadDataTree = async () => {
    try {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          id,
    reason,
    reporter_id,
    reported_user_id,
    post_id,
    created_at,
    reporter:profiles!reports_reporter_id_fkey(name),
    reportedUser:profiles!reports_reported_user_id_fkey(name),
    chore:chores!reports_post_id_fkey(category)
        `);

      if (error) throw error;

      if (data) {
        const formatted = data.map(report => ({
          ...report,
          reporterName: report.reporter?.name || "Unknown User",
          reportedName: report.reportedUser?.name || "Unknown User",
          postTitle: report.chore?.category || "Deleted Post"
        }));
        setReports(formatted);
      }
    } catch (err) {
      console.error("Reports loading error:", err.message);
      // ✅ Friendly warning check for missing tables or query roadblocks
      const warningMsg = "Reports table could not be read. Please make sure it exists in your Supabase database.";
      if (Platform.OS === 'web') console.warn(warningMsg);
      else Alert.alert("Notice", warningMsg);
    }
  };

  useEffect(() => {
    loadDataTree();

    const reportsSub = supabase
      .channel("reports_live_view")
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => loadDataTree())
      .subscribe();

    return () => {
      supabase.removeChannel(reportsSub);
    };
  }, []);

  const deletePost = async (postId) => {
    if (!postId) return;

    const executePostDelete = async () => {
      const { error } = await supabase.from("chores").delete().eq("id", postId);
      const msg = !error ? "Post deleted successfully." : "Post already removed or missing.";
      
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert("Notice", msg);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Delete this reported post permanently?")) executePostDelete();
    } else {
      Alert.alert("Delete Post", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: executePostDelete }
      ]);
    }
  };

  const banUser = async (userId) => {
    if (!userId) return;

    const executeUserBan = async () => {
      const { error } = await supabase.from("profiles").update({ banned: true }).eq("id", userId);
      
      if (!error) {
        if (Platform.OS === 'web') alert("User banned successfully.");
        else Alert.alert("Success", "User banned.");
      } else {
        if (Platform.OS === 'web') alert("Action failed: " + error.message);
        else Alert.alert("Error", error.message);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to ban this reported user?")) executeUserBan();
    } else {
      Alert.alert("Ban User", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Ban", style: "destructive", onPress: executeUserBan }
      ]);
    }
  };

  const ignoreReport = async (id) => {
    if (!id) return;

    const executeIgnore = async () => {
      const { error } = await supabase.from("reports").delete().eq("id", id);
      if (!error) {
        if (Platform.OS === 'web') alert("Report dismissed.");
        else Alert.alert("Dismissed", "Report ignored.");
        loadDataTree();
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Dismiss this report request?")) executeIgnore();
    } else {
      executeIgnore();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Reports</Text>
        <View style={{ width: 70 }} />
      </View>

      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No reports found or pending layout database sync.</Text>
      ) : (
        reports.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>Reason: {item.reason || "No reason"}</Text>
            <Text style={styles.text}>Reporter: {item.reporterName}</Text>
            <Text style={styles.text}>Reported User: {item.reportedName}</Text>
            <Text style={styles.text}>Reported Post: {item.postTitle}</Text>
            <Text style={styles.date}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : "No date"}
            </Text>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePost(item.post_id)}>
              <Text style={styles.btnText}>Delete Post</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.banBtn} onPress={() => banUser(item.reported_user_id)}>
              <Text style={styles.btnText}>Ban User</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.ignoreBtn} onPress={() => ignoreReport(item.id)}>
              <Text style={styles.btnText}>Ignore Report</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 15 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  backBtn: { width: 70 },
  backText: { color: "#DF8F9C", fontSize: 16, fontWeight: "bold" },
  header: { color: "#fff", fontSize: 24, fontWeight: "bold", textAlign: "center", flex: 1 },
  card: { backgroundColor: "#1E293B", padding: 15, borderRadius: 12, marginBottom: 14 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  text: { color: "#CBD5E1", marginTop: 6 },
  date: { color: "#DF8F9C", marginTop: 8, marginBottom: 10 },
  deleteBtn: { backgroundColor: "#F87171", padding: 10, borderRadius: 8, marginTop: 6 },
  banBtn: { backgroundColor: "#EF4444", padding: 10, borderRadius: 8, marginTop: 6 },
  ignoreBtn: { backgroundColor: "#64748B", padding: 10, borderRadius: 8, marginTop: 6 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  emptyText: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 16 }
});