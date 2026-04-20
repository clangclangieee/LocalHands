import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { db, auth } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp
} from "firebase/firestore";

export default function UserProfile() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();

  const [userData, setUserData] = useState(null);
  const [postedTasks, setPostedTasks] = useState([]);
  const [acceptedTasks, setAcceptedTasks] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [avgRating, setAvgRating] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const loadUser = async () => {
      const docRef = await getDoc(doc(db, "users", userId));
      if (docRef.exists()) setUserData(docRef.data());
    };
    loadUser();

    const q1 = query(collection(db, "chores"), where("userId", "==", userId));
    const unsub1 = onSnapshot(q1, (snap) => {
      setPostedTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const q2 = query(collection(db, "chores"), where("acceptedBy", "==", userId));
    const unsub2 = onSnapshot(q2, (snap) => {
      setAcceptedTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    const q3 = query(collection(db, "reviews"), where("targetUserId", "==", userId));
    const unsub3 = onSnapshot(q3, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReviews(data);
      setAvgRating(
        data.length > 0
          ? (data.reduce((sum, r) => sum + r.rating, 0) / data.length).toFixed(1)
          : 0
      );
    });

    return () => {
      unsub1(); unsub2(); unsub3();
    };
  }, [userId]);

  // Navigate to chat page: use existing chat or create a new one
  const goToChat = async () => {
    if (!auth.currentUser) return;

    const currentUserId = auth.currentUser.uid;
    const chatId = currentUserId > userId ? `${currentUserId}_${userId}` : `${userId}_${currentUserId}`;

    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      // Create new chat if it doesn't exist
      await setDoc(chatRef, {
        participants: [currentUserId, userId],
        messages: [],
        createdAt: serverTimestamp()
      });
    }

    router.push(`/chat/${chatId}`);
  };

  const goBack = () => router.back();

  const submitReview = async () => {
    if (!rating) return Alert.alert("Error", "Please select a rating");
    if (reviews.find((r) => r.reviewerId === auth.currentUser.uid))
      return Alert.alert("Error", "You already reviewed this user");

    try {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      await collection(db, "reviews").add({
        reviewerId: auth.currentUser.uid,
        reviewerName: userDoc.data().name || "User",
        reviewerPic: userDoc.data().profilePic || null,
        targetUserId: userId,
        rating,
        comment,
        createdAt: serverTimestamp()
      });
      setRating(0); setComment("");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const reportUser = async () => {
    Alert.prompt(
      "Report User",
      "Please describe the issue:",
      async (text) => {
        if (!text) return;
        try {
          await collection(db, "reports").add({
            reporterId: auth.currentUser.uid,
            reportedUserId: userId,
            reason: text,
            createdAt: serverTimestamp()
          });
          Alert.alert("Success", "Report submitted successfully");
        } catch (e) {
          Alert.alert("Error", e.message);
        }
      }
    );
  };

  if (loading || !userData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8FCACA" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: "#D4F0F0" }}>
      <View style={styles.container}>

        {/* BACK & REPORT BUTTONS */}
        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.backBtn} onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportBtn} onPress={reportUser}>
            <Text style={styles.reportText}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatar}>
          {userData.profilePic ? (
            <Image source={{ uri: userData.profilePic }} style={styles.avatarImage} />
          ) : <Text style={{ fontSize: 50 }}>👤</Text>}
        </View>

        {/* Info */}
        <Text style={styles.name}>{userData.name}</Text>
        <Text style={styles.bio}>{userData.bio || "No bio"}</Text>

        {/* Rating */}
        <Text style={styles.rating}>
          ⭐ {avgRating} ({reviews.length} reviews)
        </Text>

        {/* MESSAGE BUTTON */}
        <TouchableOpacity style={styles.messageBtn} onPress={goToChat}>
          <Text style={styles.btnText}>MESSAGE</Text>
        </TouchableOpacity>

        {/* ⭐ Add Review */}
        <View style={styles.section}>
          <Text style={styles.title}>Leave a Review</Text>

          <View style={{ flexDirection: "row", marginVertical: 10 }}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity key={star} onPress={() => setRating(star)}>
                <Text style={{ fontSize: 30 }}>{star <= rating ? "⭐" : "☆"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            placeholder="Write a review..."
            value={comment}
            onChangeText={setComment}
            style={styles.input}
          />

          <TouchableOpacity style={styles.messageBtn} onPress={submitReview}>
            <Text style={styles.btnText}>SUBMIT REVIEW</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews List */}
        <View style={styles.section}>
          <Text style={styles.title}>Reviews</Text>
          {reviews.length === 0 ? (
            <Text>No reviews yet.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {r.reviewerPic ? (
                    <Image source={{ uri: r.reviewerPic }} style={styles.reviewPic} />
                  ) : <Text>👤</Text>}
                  <View>
                    <Text style={{ fontWeight: "bold" }}>{r.reviewerName}</Text>
                    <Text>{"⭐".repeat(r.rating)}</Text>
                  </View>
                </View>
                {r.comment ? <Text style={{ marginTop: 5 }}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </View>

        {/* Posted Tasks */}
        <View style={styles.section}>
          <Text style={styles.title}>Posted Tasks</Text>
          {postedTasks.map((task) => (
            <View key={task.id} style={styles.card}>
              <Text style={{ fontWeight: "bold" }}>{task.category}</Text>
              <Text>{task.description}</Text>
              <Text>📍 {task.location}</Text>
              <Text style={{ color: "green" }}>₱{task.budget}</Text>
            </View>
          ))}
        </View>

        {/* Accepted Tasks */}
        <View style={styles.section}>
          <Text style={styles.title}>Accepted Tasks</Text>
          {acceptedTasks.map((task) => (
            <View key={task.id} style={styles.card}>
              <Text style={{ fontWeight: "bold" }}>{task.category}</Text>
              <Text>{task.description}</Text>
              <Text>📍 {task.location}</Text>
              <Text style={{ color: "green" }}>₱{task.budget}</Text>
            </View>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { padding: 20, alignItems: "center" },

  topButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 10
  },
  backBtn: { padding: 8 },
  backText: { fontSize: 16, color: "#8FCACA", fontWeight: "bold" },

  reportBtn: {
    backgroundColor: "#F3B0C3",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10
  },
  reportText: { color: "#fff", fontWeight: "bold" },

  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15
  },
  avatarImage: { width: "100%", height: "100%" },

  name: { fontSize: 22, fontWeight: "bold" },
  bio: { color: "#666", marginBottom: 10, textAlign: "center" },
  rating: { marginBottom: 15, color: "#444" },

  messageBtn: {
    backgroundColor: "#8FCACA",
    padding: 12,
    borderRadius: 20,
    width: 180,
    alignItems: "center",
    marginBottom: 15
  },
  btnText: { color: "#FFF", fontWeight: "bold" },

  section: { width: "100%", marginTop: 20 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },

  card: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10
  },

  input: {
    backgroundColor: "#FFF",
    width: "100%",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10
  },

  reviewPic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10
  }
});