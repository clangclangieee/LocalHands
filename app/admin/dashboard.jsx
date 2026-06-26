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
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../../firebaseConfig";

export default function Dashboard() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const unsub1 = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsub2 = onSnapshot(collection(db, "chores"), (snap) => {
      setPosts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsub3 = onSnapshot(collection(db, "reports"), (snap) => {
      setReports(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  const bannedUsers = users.filter((u) => u.banned).length;

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.dismissAll();
              router.replace("/tasks/login");
            } catch (error) {
              Alert.alert("Error", error.message);
            }
          }
        }
      ]
    );
  };

  const Card = ({ title, value, route }) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(route)}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Top Bar */}
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
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    padding: 18
  },

  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },

  header: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold"
  },

  logoutBtn: {
    backgroundColor: "#FF4444",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold"
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between"
  },

  card: {
    width: "48%",
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 14,
    marginBottom: 14
  },

  cardTitle: {
    color: "#94A3B8",
    fontSize: 14
  },

  cardValue: {
    color: "#8FCACA",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8
  },

  section: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 10
  },

  activityCard: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10
  },

  activityText: {
    color: "#fff"
  },

  settingsBtn: {
    marginTop: 15,
    backgroundColor: "#8FCACA",
    padding: 14,
    borderRadius: 12,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold"
  }
});