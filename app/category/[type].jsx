import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";

export default function CategoryView() {
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "chores"),
      where("category", "==", type)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const baseTasks = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));

      // 🔥 enrich with user data (same as main feed)
      const enriched = await Promise.all(
        baseTasks.map(async (task) => {
          const userDoc = await getDoc(
            doc(db, "users", task.userId)
          );

          return {
            ...task,
            realPosterName: userDoc.exists()
              ? userDoc.data().name
              : "User",
            posterPic: userDoc.exists()
              ? userDoc.data().profilePic || null
              : null
          };
        })
      );

      setTasks(enriched);
    });

    return unsubscribe;
  }, [type]);

  // 👤 open profile
  const openProfile = (userId) => {
    router.push(`/profile/${userId}`);
  };

  // ✅ accept / unaccept
  const toggleAcceptTask = async (choreId, currentAcceptedBy) => {
    try {
      if (!auth.currentUser)
        return Alert.alert("Error", "Login to accept tasks");

      const choreRef = doc(db, "chores", choreId);

      if (currentAcceptedBy === auth.currentUser.uid) {
        await updateDoc(choreRef, { acceptedBy: null });
        Alert.alert("Task Unaccepted");
      } else if (!currentAcceptedBy) {
        await updateDoc(choreRef, {
          acceptedBy: auth.currentUser.uid
        });
        Alert.alert("Task Accepted!");
      } else {
        Alert.alert("Task Already Accepted");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* 🔙 BACK BUTTON */}
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
      >
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.header}>{type} Tasks</Text>

      {tasks.length === 0 ? (
        <Text style={styles.empty}>
          No tasks in this category.
        </Text>
      ) : (
        tasks.map((item) => {
          let buttonColor = "#CBAACB";
          let buttonText = "Accept Task";
          let disabled = false;

          if (item.acceptedBy === auth.currentUser?.uid) {
            buttonColor = "#F3B0C3";
            buttonText = "Unaccept Task";
          } else if (item.acceptedBy) {
            buttonColor = "#B0B0B0";
            buttonText = "Already Accepted";
            disabled = true;
          }

          return (
            <View key={item.id} style={styles.card}>
              
              {/* 👤 POSTER HEADER */}
              <View style={styles.posterHeader}>
                
                <TouchableOpacity
                  onPress={() => openProfile(item.userId)}
                >
                  {item.posterPic ? (
                    <Image
                      source={{ uri: item.posterPic }}
                      style={styles.posterPic}
                    />
                  ) : (
                    <View style={styles.picFallback}>
                      <Text>👤</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openProfile(item.userId)}
                >
                  <Text style={styles.realName}>
                    {item.realPosterName}
                  </Text>
                </TouchableOpacity>

              </View>

              {/* TASK INFO */}
              <Text style={styles.title}>
                {item.category}
              </Text>

              <Text>{item.description}</Text>

              <Text style={styles.pay}>
                ₱{item.budget}
              </Text>

              {item.location && (
                <Text style={styles.location}>
                  📍 {item.location}
                </Text>
              )}

              {/* ACCEPT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.acceptBtn,
                  { backgroundColor: buttonColor }
                ]}
                onPress={() =>
                  toggleAcceptTask(item.id, item.acceptedBy)
                }
                disabled={disabled}
              >
                <Text style={styles.btnText}>
                  {buttonText}
                </Text>
              </TouchableOpacity>

            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F7F7",
    padding: 15
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "center"
  },

  empty: {
    textAlign: "center",
    marginTop: 50,
    color: "#777"
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
    color: "#8FCACA"
  },

  title: {
    fontSize: 18,
    fontWeight: "bold"
  },

  pay: {
    fontWeight: "bold",
    color: "green",
    marginTop: 5
  },

  location: {
    marginTop: 5,
    color: "#555",
    fontStyle: "italic"
  },

  acceptBtn: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    alignItems: "center"
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold"
  },

  backBtn: {
    marginTop: 10,
    marginBottom: 5,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#E6F7F7",
    borderRadius: 8,
    elevation: 2
},

  backText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#8FCACA"
},
});