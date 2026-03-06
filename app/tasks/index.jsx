import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, onSnapshot, query, orderBy, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function Index() {
  const [choresWithUser, setChoresWithUser] = useState([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");
  const router = useRouter();

  useEffect(() => {
    const choresQuery = query(collection(db, "chores"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(choresQuery, async snap => {
      const choresData = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(chore => !chore.completed);

      const enriched = await Promise.all(
        choresData.map(async chore => {
          const userDoc = await getDoc(doc(db, "users", chore.userId));

          return {
            ...chore,
            realPosterName: userDoc.exists() ? userDoc.data().name : "User",
            posterPic: userDoc.exists() ? userDoc.data().profilePic || null : null
          };
        })
      );

      setChoresWithUser(enriched);
    });

    return unsubscribe;
  }, []);

  const toggleAcceptTask = async (choreId, currentAcceptedBy) => {
    try {
      if (!auth.currentUser) return Alert.alert("Error", "Login to accept tasks");

      const choreRef = doc(db, "chores", choreId);

      if (currentAcceptedBy === auth.currentUser.uid) {
        await updateDoc(choreRef, { acceptedBy: null });
        Alert.alert("Task Unaccepted");
      } else if (!currentAcceptedBy) {
        await updateDoc(choreRef, { acceptedBy: auth.currentUser.uid });
        Alert.alert("Task Accepted!");
      } else {
        Alert.alert("Task Already Accepted");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const openChat = async (userId, userName) => {
    if (!auth.currentUser) return Alert.alert("Error", "Login first");

    const chatId = [auth.currentUser.uid, userId].sort().join("_");

    const chatRef = doc(db, "chats", chatId);
    const chatDoc = await getDoc(chatRef);

    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        participants: [auth.currentUser.uid, userId],
        messages: [],
        createdAt: new Date()
      });
    }

    router.push({
      pathname: `/chat/${chatId}`,
      params: { userName }
    });
  };

  const filteredChores = choresWithUser.filter(chore => {
    const matchesLocation = locationFilter
      ? chore.location?.toLowerCase().includes(locationFilter.toLowerCase())
      : true;

    const matchesBudget = budgetFilter
      ? chore.budget <= parseFloat(budgetFilter)
      : true;

    return matchesLocation && matchesBudget;
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Available Chores</Text>

      <View style={styles.filters}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter by location"
          value={locationFilter}
          onChangeText={setLocationFilter}
        />

        <TextInput
          style={styles.filterInput}
          placeholder="Filter by budget (₱)"
          keyboardType="numeric"
          value={budgetFilter}
          onChangeText={setBudgetFilter}
        />
      </View>

      {filteredChores.map(item => {
        let buttonColor = "#CBAACB";
        let buttonText = "Accept Task";
        let disabled = false;

        if (item.acceptedBy === auth.currentUser?.uid) {
          buttonColor = "#F3B0C3";
          buttonText = "Unaccept Task";
        } else if (item.acceptedBy) {
          buttonColor = "#B0B0B0";
          buttonText = "Accepted by Someone";
          disabled = true;
        }

        return (
          <View key={item.id} style={styles.card}>
            <TouchableOpacity
              style={styles.posterHeader}
              onPress={() => openChat(item.userId, item.realPosterName)}
            >
              {item.posterPic ? (
                <Image source={{ uri: item.posterPic }} style={styles.posterPic} />
              ) : (
                <View style={styles.picFallback}>
                  <Text>👤</Text>
                </View>
              )}

              <Text style={styles.realName}>{item.realPosterName}</Text>
            </TouchableOpacity>

            <Text style={styles.title}>{item.category}</Text>
            <Text>{item.description}</Text>

            <Text style={styles.pay}>💰 ₱{item.budget}</Text>

            {item.location && (
              <Text style={styles.location}>📍 {item.location}</Text>
            )}

            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: buttonColor }]}
              onPress={() => toggleAcceptTask(item.id, item.acceptedBy)}
              disabled={disabled}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {buttonText}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6F7F7", padding: 15 },
  header: { fontSize: 26, fontWeight: "bold", marginVertical: 20, textAlign: "center" },

  filters: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15
  },

  filterInput: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 8,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#DDD"
  },

  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3
  },

  posterHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10
  },

  posterPic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  },

  picFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10
  },

  realName: {
    fontWeight: "bold",
    color: "#888",
    fontSize: 13
  },

  title: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#333"
  },

  pay: {
    fontWeight: "bold",
    color: "green",
    marginTop: 5,
    fontSize: 16
  },

  location: {
    color: "#555",
    marginTop: 5,
    fontStyle: "italic"
  },

  acceptBtn: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  }
});