import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../supabaseConfig";

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
  const [currentUser, setCurrentUser] = useState(null);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    const fetchAuthUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchAuthUser();
  }, []);

  const fetchUserDataBlocks = async () => {
    if (!userId) return;
    try {
      const userProfile = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (userProfile.data) setUserData(userProfile.data);

      const pTasks = await supabase.from("chores").select("*").eq("user_id", userId);
      if (pTasks.data) setPostedTasks(pTasks.data);

      const aTasks = await supabase.from("chores").select("*").eq("accepted_by", userId);
      if (aTasks.data) setAcceptedTasks(aTasks.data);

      const rView = await supabase.from("reviews").select("*").eq("target_user_id", userId);
      if (rView.data) {
        setReviews(rView.data);
        const avg = rView.data.length > 0 
          ? (rView.data.reduce((sum, r) => sum + r.rating, 0) / rView.data.length).toFixed(1)
          : 0;
        setAvgRating(avg);
      }
    } catch (err) {
      console.error("Data block fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchUserDataBlocks();

      const choresChannel = supabase
        .channel(`profile-chores-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, (payload) => {
          if (payload.eventType === "UPDATE") {
            setPostedTasks((prev) =>
              prev.map((task) => (task.id === payload.new.id ? { ...task, ...payload.new } : task))
            );
          } else {
            fetchUserDataBlocks();
          }
        })
        .subscribe();

      const reviewsChannel = supabase
        .channel(`profile-reviews-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () => fetchUserDataBlocks())
        .subscribe();

      return () => {
        supabase.removeChannel(choresChannel);
        supabase.removeChannel(reviewsChannel);
      };
    }, [userId])
  );

  const toggleAcceptTask = async (choreId, currentAcceptedBy) => {
    if (!currentUser) return Alert.alert("Error", "Login to accept tasks");

    const newAcceptedBy = currentAcceptedBy === currentUser.id ? null : currentUser.id;

    if (currentAcceptedBy && currentAcceptedBy !== currentUser.id) {
      return Alert.alert("Task Already Accepted");
    }

    // 1. Optimistic Update: Change button state immediately in local UI
    setPostedTasks((prev) =>
      prev.map((task) =>
        task.id === choreId ? { ...task, accepted_by: newAcceptedBy } : task
      )
    );

    // 2. Execute DB update in background
    try {
      const { error } = await supabase
        .from("chores")
        .update({ accepted_by: newAcceptedBy })
        .eq("id", choreId);

      if (error) throw error;
    } catch (e) {
      // 3. Rollback state if the update fails
      setPostedTasks((prev) =>
        prev.map((task) =>
          task.id === choreId ? { ...task, accepted_by: currentAcceptedBy } : task
        )
      );
      Alert.alert("Error", e.message);
    }
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/profile/tasks");
    }
  };

  const goToChat = async () => {
    if (!currentUser) return Alert.alert("Error", "Please log in to chat");
    if (currentUser.id === userId) return Alert.alert("Error", "You cannot chat with yourself");

    const currentUserId = currentUser.id;
    const chatId = currentUserId > userId ? `${currentUserId}_${userId}` : `${userId}_${currentUserId}`;

    const { data: chatRoom } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .maybeSingle();

    if (!chatRoom) {
      await supabase.from("chats").insert({
        id: chatId,
        participants: [currentUserId, userId]
      });
    }

    router.push(`/chat/${chatId}`);
  };

  const submitReview = async () => {
    if (!currentUser) return Alert.alert("Error", "Log in to submit a review");
    if (!rating) return Alert.alert("Error", "Please select a rating star value");
    
    const alreadyReviewed = reviews.some((r) => r.reviewer_id === currentUser.id);
    if (alreadyReviewed) return Alert.alert("Error", "You have already reviewed this profile.");

    try {
      const { data: profile } = await supabase.from("profiles").select("name, profile_pic").eq("id", currentUser.id).maybeSingle();
      
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: currentUser.id,
        reviewer_name: profile?.name || "Anonymous User",
        reviewer_pic: profile?.profile_pic || null,
        target_user_id: userId,
        rating: parseInt(rating),
        comment: comment.trim()
      });

      if (error) throw error;

      setRating(0); 
      setComment("");
      Alert.alert("Success", "Review submitted successfully!");
      await fetchUserDataBlocks();
    } catch (e) {
      Alert.alert("Review Error", e.message);
    }
  };

  const handleReportUserSubmit = async () => {
    if (!reportReason.trim()) return Alert.alert("Error", "Please clarify the violation details.");
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: currentUser.id,
        reported_user_id: userId,
        reason: reportReason.trim()
      });
      if (error) throw error;
      
      setReportModalVisible(false);
      setReportReason("");
      Alert.alert("Report Filed", "Thank you, this report will be evaluated by staff administrators.");
    } catch (e) {
      Alert.alert("Report Error", e.message);
    }
  };

  if (loading || !userData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#660005" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: "#FFFF" }}>
      <View style={styles.container}>
        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.backBtn} onPress={handleGoBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          {currentUser?.id !== userId && (
            <TouchableOpacity style={styles.reportBtn} onPress={() => setReportModalVisible(true)}>
              <Text style={styles.reportText}>Report</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.avatar}>
          {userData.profile_pic ? (
            <Image source={{ uri: userData.profile_pic }} style={styles.avatarImage} />
          ) : <Text style={{ fontSize: 50 }}>👤</Text>}
        </View>

        <Text style={styles.name}>{userData.name || "User Profile"}</Text>
        
        {userData.phone && <Text style={styles.phone}>📞 {userData.phone}</Text>}
        
        <Text style={styles.bio}>{userData.bio || "No biography info set."}</Text>

        <Text style={styles.rating}>
          ⭐ {avgRating} ({reviews.length} reviews)
        </Text>

        {currentUser?.id !== userId && (
          <TouchableOpacity style={styles.messageBtn} onPress={goToChat}>
            <Text style={styles.btnText}>MESSAGE</Text>
          </TouchableOpacity>
        )}

        {currentUser?.id !== userId && (
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
        )}

        <View style={styles.section}>
          <Text style={styles.title}>Reviews</Text>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews yet.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {r.reviewer_pic ? (
                    <Image source={{ uri: r.reviewer_pic }} style={styles.reviewPic} />
                  ) : <Text style={{ marginRight: 10, fontSize: 20 }}>👤</Text>}
                  <View>
                    <Text style={{ fontWeight: "bold" }}>{r.reviewer_name || "User"}</Text>
                    <Text>{"⭐".repeat(r.rating)}</Text>
                  </View>
                </View>
                {r.comment ? <Text style={{ marginTop: 5, color: "#444" }}>{r.comment}</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Posted Tasks</Text>
          {postedTasks.length === 0 ? <Text style={styles.emptyText}>No posted tasks.</Text> : postedTasks.map((task) => (
            <View key={task.id} style={styles.card}>
              <Text style={{ fontWeight: "bold" }}>{task.category}</Text>
              <Text style={{ color: "#555", marginVertical: 2 }}>{task.description}</Text>
              {task.location && <Text style={{ fontSize: 12, color: "#666" }}>📍 {task.location}</Text>}
              <Text style={{ color: "green", fontWeight: "bold", marginTop: 2 }}>₱{task.budget}</Text>
              
              {currentUser?.id !== userId && (
                <TouchableOpacity 
                  style={[styles.acceptBtn, { backgroundColor: task.accepted_by === currentUser?.id ? "#FFF" : "#660005" }]}
                  onPress={() => toggleAcceptTask(task.id, task.accepted_by)}
                >
                  <Text style={{ color: task.accepted_by === currentUser?.id ? "#660005" : "#FFF", fontWeight: "bold" }}>
                    {task.accepted_by === currentUser?.id ? "Unaccept Task" : 
                     task.accepted_by ? "Already Accepted" : "Accept Task"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Accepted Tasks</Text>
          {acceptedTasks.length === 0 ? <Text style={styles.emptyText}>No accepted tasks.</Text> : acceptedTasks.map((task) => (
            <View key={task.id} style={styles.card}>
              <Text style={{ fontWeight: "bold" }}>{task.category}</Text>
              <Text style={{ color: "#555", marginVertical: 2 }}>{task.description}</Text>
              {task.location && <Text style={{ fontSize: 12, color: "#666" }}>📍 {task.location}</Text>}
              <Text style={{ color: "green", fontWeight: "bold", marginTop: 2 }}>₱{task.budget}</Text>
            </View>
          ))}
        </View>
      </View>

      <Modal visible={reportModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report User</Text>
            <Text style={styles.label}>Please clarify the exact details of the incident or problem below:</Text>
            <TextInput
              style={[styles.input, { height: 90, borderWidth: 1, borderColor: "#DDD" }]}
              placeholder="Reason for report..."
              multiline
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#DF8F9C" }]} onPress={() => { setReportModalVisible(false); setReportReason(""); }}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#660005" }]} onPress={handleReportUserSubmit}>
                <Text style={styles.btnText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#FFFF" },
  container: { padding: 20, alignItems: "center" },
  topButtons: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 10, zIndex: 10, elevation: 10 },
  backBtn: { padding: 15, zIndex: 20 },
  backText: { fontSize: 16, color: "#660005", fontWeight: "bold" },
  reportBtn: { backgroundColor: "#660005", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  reportText: { color: "#FFFF", fontWeight: "bold" },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#660005", justifyContent: "center", alignItems: "center", marginBottom: 15, elevation: 3, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%", borderRadius: 60 },
  name: { fontSize: 22, fontWeight: "bold" },
  phone: { fontSize: 16, color: "#660005", fontWeight: "600", marginBottom: 5 },
  bio: { color: "#666", marginBottom: 10, textAlign: "center" },
  rating: { marginBottom: 15, color: "#444" },
  messageBtn: { backgroundColor: "#660005", padding: 12, borderRadius: 20, width: 180, alignItems: "center", marginBottom: 15 },
  btnText: { color: "#FFFF", fontWeight: "bold" },
  section: { width: "100%", marginTop: 20 },
  title: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  card: { backgroundColor: "#DF8F9C", padding: 12, borderRadius: 12, marginBottom: 10, elevation: 2 },
  input: { backgroundColor: "#DF8F9C", width: "100%", padding: 12, borderRadius: 10, marginBottom: 10 },
  reviewPic: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  emptyText: { color: "#666", fontStyle: "italic", paddingLeft: 5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFF", width: "85%", padding: 20, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, textAlign: "center", color: "#660005" },
  label: { fontSize: 13, color: "#555", marginBottom: 10 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  modalBtn: { padding: 12, borderRadius: 20, width: "47%", alignItems: "center" },
  acceptBtn: { marginTop: 10, padding: 10, borderRadius: 8, alignItems: "center", borderWidth: 1, borderColor: "#660005" }
});