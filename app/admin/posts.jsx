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
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function Posts() {
  const router = useRouter();

  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "chores"), async (snap) => {
      const data = await Promise.all(
        snap.docs.map(async (item) => {
          const post = { id: item.id, ...item.data() };

          let posterName = "Unknown User";

          if (post.userId) {
            try {
              const userSnap = await getDoc(doc(db, "users", post.userId));

              if (userSnap.exists()) {
                posterName = userSnap.data().name || "User";
              }
            } catch (error) {
              console.log(error);
            }
          }

          return {
            ...post,
            posterName
          };
        })
      );

      setPosts(data);
    });

    return unsub;
  }, []);

  const deletePost = async (id) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "chores", id));

              Alert.alert(
                "Success",
                "Post deleted successfully."
              );
            } catch (error) {
              Alert.alert(
                "Error",
                "Failed to delete post."
              );
              console.log(error);
            }
          }
        }
      ]
    );
  };

  const filtered = posts.filter((item) =>
    `${item.category} ${item.description} ${item.posterName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.header}>
          Manage Posts
        </Text>

        <View style={{ width: 70 }} />
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search posts..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {filtered.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.title}>
            {item.category || "No Category"}
          </Text>

          <Text style={styles.desc}>
            {item.description || "No Description"}
          </Text>

          <Text style={styles.meta}>
            Posted by: {item.posterName}
          </Text>

          <Text style={styles.money}>
            ₱{item.budget || 0}
          </Text>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deletePost(item.id)}
          >
            <Text style={styles.btnText}>
              Delete Post
            </Text>
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 15
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15
  },

  backBtn: {
    width: 70
  },

  backText: {
    color: "#38BDF8",
    fontSize: 16,
    fontWeight: "bold"
  },

  header: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    flex: 1
  },

  search: {
    backgroundColor: "#1E293B",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15
  },

  card: {
    backgroundColor: "#1E293B",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12
  },

  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold"
  },

  desc: {
    color: "#CBD5E1",
    marginTop: 6
  },

  meta: {
    color: "#8FCACA",
    marginTop: 6
  },

  money: {
    color: "#22C55E",
    marginTop: 6,
    fontWeight: "bold"
  },

  deleteBtn: {
    marginTop: 12,
    backgroundColor: "#F87171",
    padding: 10,
    borderRadius: 8
  },

  btnText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "bold"
  }
});