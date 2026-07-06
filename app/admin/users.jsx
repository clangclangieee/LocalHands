// ===================================
// FILE: app/admin/users.jsx
// ===================================
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from "react-native";
import { supabase } from "../../supabaseConfig";
import { useRouter } from "expo-router";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const fetchUsersList = async () => {
    const { data, error } = await supabase.from("profiles").select("*");
    if (error) console.error(error.message);
    if (data) setUsers(data);
  };

  useEffect(() => {
    fetchUsersList();

    const syncChannel = supabase
      .channel("users_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchUsersList())
      .subscribe();

    return () => {
      supabase.removeChannel(syncChannel);
    };
  }, []);

  const toggleBan = async (id, current, name) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ banned: !current })
        .eq("id", id);

      if (error) throw error;
      
      const title = !current ? "User Banned" : "User Unbanned";
      const message = `${name || "User"} status has been updated.`;

      if (Platform.OS === 'web') alert(`${title}: ${message}`);
      else Alert.alert(title, message);

      fetchUsersList();
    } catch (error) {
      if (Platform.OS === 'web') alert("Error: " + error.message);
      else Alert.alert("Error", error.message);
    }
  };

  const deleteUser = async (id) => {
    if (!id) return;

    const executeUserDeletion = async () => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (!error) {
        if (Platform.OS === 'web') alert("User account removed.");
        else Alert.alert("Success", "User account removed.");
        fetchUsersList();
      } else {
        if (Platform.OS === 'web') alert("Deletion Failed: " + error.message);
        else Alert.alert("Error", error.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm("Are you sure you want to delete this user profile?");
      if (confirmWeb) executeUserDeletion();
    } else {
      Alert.alert("Delete User", "Are you sure?", [
        { text: "Cancel" },
        { text: "Delete", style: "destructive", onPress: executeUserDeletion }
      ]);
    }
  };

  const filtered = users.filter((u) => {
    const nameMatch = (u.name || "").toLowerCase().includes(search.toLowerCase());
    const emailMatch = (u.email || "").toLowerCase().includes(search.toLowerCase());
    return nameMatch || emailMatch;
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Manage Users</Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search users by name or email..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {filtered.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.name}>{user.name || "No Name"}</Text>
          <Text style={styles.email}>{user.email || "No Email"}</Text>
          <Text style={styles.role}>Role: {user.role || "user"}</Text>
          
          {/* 🔄 Dynamic Status Indicator Label */}
          <Text style={styles.status}>
            Status:{" "}
            <Text style={user.banned ? styles.bannedText : styles.activeText}>
              {user.banned ? "BANNED" : "ACTIVE"}
            </Text>
          </Text>

          <View style={styles.row}>
            {/* 🔄 Dynamic Ban/Unban Interactive Toggle Button */}
            <TouchableOpacity
              style={[
                styles.banBtn,
                user.banned ? styles.unbanBtnVariant : styles.banBtnVariant
              ]}
              onPress={() => toggleBan(user.id, user.banned, user.name)}
            >
              <Text style={[styles.btnText, user.banned && { color: "#000" }]}>
                {user.banned ? "Unban User" : "Ban User"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteUser(user.id)}>
              <Text style={styles.btnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A", padding: 15 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 15 },
  backBtn: { width: 70 },
  backText: { color: "#DF8F9C", fontSize: 16, fontWeight: "bold" },
  header: { color: "#fff", fontSize: 24, fontWeight: "bold", textAlign: "center", flex: 1 },
  search: { backgroundColor: "#1E293B", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  card: { backgroundColor: "#1E293B", padding: 15, borderRadius: 12, marginBottom: 12 },
  name: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  email: { color: "#CBD5E1", marginTop: 4 },
  role: { color: "#DF8F9C", marginTop: 4 },
  status: { color: "#94A3B8", marginTop: 4, marginBottom: 10 },
  activeText: { color: "#22C55E", fontWeight: "bold" },
  bannedText: { color: "#F87171", fontWeight: "bold" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  banBtn: { flex: 1, padding: 10, borderRadius: 8, marginRight: 8 },
  banBtnVariant: { backgroundColor: "#DF8F9C" },
  unbanBtnVariant: { backgroundColor: "#EAB308" }, // Distinctive caution yellow for unbanning
  deleteBtn: { flex: 1, backgroundColor: "#F87171", padding: 10, borderRadius: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" }
});