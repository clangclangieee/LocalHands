import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { db } from "../../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function CategoryView() {
  const { type } = useLocalSearchParams();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    // 🔑 Fetches only chores matching the clicked category icon
    const q = query(collection(db, "chores"), where("category", "==", type));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, [type]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>{type} Tasks</Text>
      {tasks.length === 0 ? (
        <Text style={styles.empty}>No tasks in this category.</Text>
      ) : (
        tasks.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.user}>{item.userName}</Text>
            <Text style={styles.title}>{item.category}</Text>
            <Text>{item.description}</Text>
            <Text style={styles.pay}>₱{item.budget}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6F7F7", padding: 20 },
  header: { fontSize: 26, fontWeight: "bold", marginVertical: 20, textAlign: "center" },
  empty: { textAlign: 'center', marginTop: 50, color: '#777' },
  card: { backgroundColor: "#FFF", padding: 15, borderRadius: 12, marginBottom: 15, elevation: 2 },
  user: { fontWeight: "bold", color: "#888", fontSize: 12 },
  title: { fontSize: 18, fontWeight: "bold" },
  pay: { fontWeight: "bold", color: "green" }
});