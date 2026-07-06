// ===================================
// FILE: app/admin/posts.jsx
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
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

export default function Posts() {
  const router = useRouter();
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");

  const loadPostsWithUserInfo = async () => {
    try {
      const { data, error } = await supabase
        .from("chores")
        .select("*, profiles(name)");

      if (error) {
        const fallback = await supabase
          .from("chores")
          .select("*, profiles!chores_user_id_fkey(name)");
        
        if (fallback.error) throw fallback.error;
        if (fallback.data) {
          const parsedFallback = fallback.data.map(item => ({
            ...item,
            posterName: item.profiles?.name || "Unknown User"
          }));
          setPosts(parsedFallback);
          return;
        }
        throw error;
      }

      if (data) {
        const parsed = data.map(item => ({
          ...item,
          posterName: item.profiles?.name || "Unknown User"
        }));
        setPosts(parsed);
      }
    } catch (err) {
      console.error("Failed to load admin posts:", err.message);
    }
  };

  useEffect(() => {
    loadPostsWithUserInfo();

    const choresChannel = supabase
      .channel("posts_admin_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => loadPostsWithUserInfo())
      .subscribe();

    return () => {
      supabase.removeChannel(choresChannel);
    };
  }, []);

  const deletePost = async (id) => {
    if (!id) {
      if (Platform.OS === 'web') alert("Post ID is missing.");
      else Alert.alert("Error", "Post ID is missing.");
      return;
    }

    const executeDeletion = async () => {
      try {
        const { error } = await supabase
          .from("chores")
          .delete()
          .eq("id", id);

        if (error) {
          if (Platform.OS === 'web') alert("Database Error: " + error.message);
          else Alert.alert("Database Error", error.message);
          return;
        }

        setPosts((currentPosts) => currentPosts.filter((post) => post.id !== id));
        
        if (Platform.OS === 'web') alert("Post deleted successfully.");
        else Alert.alert("Success", "Post deleted successfully.");
      } catch (err) {
        if (Platform.OS === 'web') alert("App Error: " + err.message);
        else Alert.alert("App Error", err.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm("Are you sure you want to permanently delete this chore post?");
      if (confirmWeb) executeDeletion();
    } else {
      Alert.alert(
        "Delete Post",
        "Are you sure you want to permanently delete this chore post?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDeletion }
        ]
      );
    }
  };

  const filtered = posts.filter((item) =>
    `${item.category} ${item.description} ${item.posterName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Manage Posts</Text>
        <View style={{ width: 70 }} />
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search posts..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {filtered.length === 0 ? (
        <Text style={styles.emptyText}>No posts found.</Text>
      ) : (
        filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.title}>{item.category || "No Category"}</Text>
            <Text style={styles.desc}>{item.description || "No Description"}</Text>
            <Text style={styles.meta}>Posted by: {item.posterName}</Text>
            <Text style={styles.money}>₱{item.budget || 0}</Text>

            <TouchableOpacity style={styles.deleteBtn} onPress={() => deletePost(item.id)}>
              <Text style={styles.btnText}>Delete Post</Text>
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
  search: { backgroundColor: "#1E293B", color: "#fff", padding: 12, borderRadius: 10, marginBottom: 15 },
  card: { backgroundColor: "#1E293B", padding: 15, borderRadius: 12, marginBottom: 12 },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  desc: { color: "#CBD5E1", marginTop: 6 },
  meta: { color: "#DF8F9C", marginTop: 6 },
  money: { color: "#22C55E", marginTop: 6, fontWeight: "bold" },
  deleteBtn: { marginTop: 12, backgroundColor: "#F87171", padding: 10, borderRadius: 8 },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  emptyText: { color: "#94A3B8", textAlign: "center", marginTop: 40, fontSize: 16 }
});