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
  Alert
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  getDoc
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

export default function Reports() {
  const router = useRouter();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "reports"), async (snap) => {
      const data = await Promise.all(
        snap.docs.map(async (item) => {
          const report = { id: item.id, ...item.data() };

          let reporterName = "Unknown";
          let reportedName = "Unknown";
          let postTitle = "Deleted Post";

          if (report.reporterId) {
            const reporterSnap = await getDoc(
              doc(db, "users", report.reporterId)
            );
            if (reporterSnap.exists()) {
              reporterName =
                reporterSnap.data().name || "User";
            }
          }

          if (report.reportedUserId) {
            const reportedSnap = await getDoc(
              doc(db, "users", report.reportedUserId)
            );
            if (reportedSnap.exists()) {
              reportedName =
                reportedSnap.data().name || "User";
            }
          }

          if (report.postId) {
            const postSnap = await getDoc(
              doc(db, "chores", report.postId)
            );
            if (postSnap.exists()) {
              postTitle =
                postSnap.data().category ||
                "Reported Post";
            }
          }

          return {
            ...report,
            reporterName,
            reportedName,
            postTitle
          };
        })
      );

      setReports(data);
    });

    return unsub;
  }, []);

  const deletePost = async (postId) => {
    try {
      await deleteDoc(doc(db, "chores", postId));
      Alert.alert("Post deleted");
    } catch {
      Alert.alert("Post already removed");
    }
  };

  const banUser = async (userId) => {
    await updateDoc(doc(db, "users", userId), {
      banned: true
    });
    Alert.alert("User banned");
  };

  const ignoreReport = async (id) => {
    await deleteDoc(doc(db, "reports", id));
  };

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
          Reports
        </Text>

        <View style={{ width: 70 }} />
      </View>

      {reports.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.title}>
            Reason: {item.reason || "No reason"}
          </Text>

          <Text style={styles.text}>
            Reporter: {item.reporterName}
          </Text>

          <Text style={styles.text}>
            Reported User: {item.reportedName}
          </Text>

          <Text style={styles.text}>
            Reported Post: {item.postTitle}
          </Text>

          <Text style={styles.date}>
            {item.createdAt?.toDate
              ? item.createdAt.toDate().toLocaleString()
              : "No date"}
          </Text>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => deletePost(item.postId)}
          >
            <Text style={styles.btnText}>
              Delete Post
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.banBtn}
            onPress={() => banUser(item.reportedUserId)}
          >
            <Text style={styles.btnText}>
              Ban User
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ignoreBtn}
            onPress={() => ignoreReport(item.id)}
          >
            <Text style={styles.btnText}>
              Ignore Report
            </Text>
          </TouchableOpacity>
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

  topBar:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    marginBottom:15
  },

  backBtn:{
    width:70
  },

  backText:{
    color:"#38BDF8",
    fontSize:16,
    fontWeight:"bold"
  },

  header:{
    color:"#fff",
    fontSize:24,
    fontWeight:"bold",
    textAlign:"center",
    flex:1
  },

  card:{
    backgroundColor:"#1E293B",
    padding:15,
    borderRadius:12,
    marginBottom:14
  },

  title:{
    color:"#fff",
    fontSize:18,
    fontWeight:"bold"
  },

  text:{
    color:"#CBD5E1",
    marginTop:6
  },

  date:{
    color:"#8FCACA",
    marginTop:8,
    marginBottom:10
  },

  deleteBtn:{
    backgroundColor:"#F87171",
    padding:10,
    borderRadius:8,
    marginTop:6
  },

  banBtn:{
    backgroundColor:"#EF4444",
    padding:10,
    borderRadius:8,
    marginTop:6
  },

  ignoreBtn:{
    backgroundColor:"#64748B",
    padding:10,
    borderRadius:8,
    marginTop:6
  },

  btnText:{
    color:"#fff",
    textAlign:"center",
    fontWeight:"bold"
  }
});