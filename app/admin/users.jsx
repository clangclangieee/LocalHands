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
  Alert
} from "react-native";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useRouter } from "expo-router";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(
        snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );
    });

    return unsub;
  }, []);

  const toggleBan = async (id, current, name) => {
    try {
      const userRef = doc(db, "users", id);

      if (!current) {
        await updateDoc(userRef, {
          banned: true,
          bannedAt: serverTimestamp(),
          banReason: "Violation of community guidelines",
          notification:
            "Your account has been banned by admin."
        });

        Alert.alert(
          "User Banned",
          `${name || "User"} has been banned.`
        );
      } else {
        await updateDoc(userRef, {
          banned: false,
          bannedAt: null,
          banReason: null,
          notification:
            "Your account has been unbanned."
        });

        Alert.alert(
          "User Unbanned",
          `${name || "User"} has been unbanned.`
        );
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const deleteUser = async (id) => {
    Alert.alert("Delete User", "Are you sure?", [
      { text: "Cancel" },
      {
        text: "Delete",
        onPress: async () => {
          await deleteDoc(doc(db, "users", id));
        }
      }
    ]);
  };

  const filtered = users.filter((u) =>
    (u.name || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <ScrollView style={styles.container}>
      
      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.header}>
          Manage Users
        </Text>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search users..."
        placeholderTextColor="#999"
        value={search}
        onChangeText={setSearch}
      />

      {filtered.map((user) => (
        <View key={user.id} style={styles.card}>
          <Text style={styles.name}>
            {user.name || "No Name"}
          </Text>

          <Text style={styles.email}>
            {user.email || "No Email"}
          </Text>

          <Text style={styles.role}>
            Role: {user.role || "user"}
          </Text>

          <Text style={styles.status}>
            Status: {user.banned ? "BANNED" : "ACTIVE"}
          </Text>

          <View style={styles.row}>
            <TouchableOpacity
              style={styles.banBtn}
              onPress={() =>
                toggleBan(
                  user.id,
                  user.banned,
                  user.name
                )
              }
            >
              <Text style={styles.btnText}>
                {user.banned
                  ? "Unban User"
                  : "Ban User"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() =>
                deleteUser(user.id)
              }
            >
              <Text style={styles.btnText}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    backgroundColor:"#0F172A",
    padding:15
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

  search:{
    backgroundColor:"#1E293B",
    color:"#fff",
    padding:12,
    borderRadius:10,
    marginBottom:15
  },

  card:{
    backgroundColor:"#1E293B",
    padding:15,
    borderRadius:12,
    marginBottom:12
  },

  name:{
    color:"#fff",
    fontSize:18,
    fontWeight:"bold"
  },

  email:{
    color:"#CBD5E1",
    marginTop:4
  },

  role:{
    color:"#8FCACA",
    marginTop:4
  },

  status:{
    color:"#F3B0C3",
    marginTop:4,
    marginBottom:10
  },

  row:{
    flexDirection:"row",
    justifyContent:"space-between"
  },

  banBtn:{
    flex:1,
    backgroundColor:"#8FCACA",
    padding:10,
    borderRadius:8,
    marginRight:8
  },

  deleteBtn:{
    flex:1,
    backgroundColor:"#F87171",
    padding:10,
    borderRadius:8
  },

  btnText:{
    color:"#fff",
    textAlign:"center",
    fontWeight:"bold"
  }
});