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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { supabase } from "../../supabaseConfig";

export default function UserProfile() {
  const { userId } = useLocalSearchParams();
  const router = useRouter();

  const [userData, setUserData] = useState(null);
  const [helperProfile, setHelperProfile] = useState(null);
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    fetchAuthUser();
  }, []);

  const fetchUserDataBlocks = async () => {
    if (!userId) return;
    try {
      // Profile Info
      const userProfile = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (userProfile.data) setUserData(userProfile.data);

      // Helper Application Info
      const helperData = await supabase
        .from("applicants")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (helperData.data) setHelperProfile(helperData.data);

      // Posted Tasks with accepted user details joined
      const pTasks = await supabase
        .from("chores")
        .select("*, acceptor:profiles!accepted_by(name)")
        .eq("user_id", userId);
      if (pTasks.data) setPostedTasks(pTasks.data);

      // Accepted Tasks
      const aTasks = await supabase.from("chores").select("*").eq("accepted_by", userId);
      if (aTasks.data) setAcceptedTasks(aTasks.data);

      // Reviews
      const rView = await supabase.from("reviews").select("*").eq("target_user_id", userId);
      if (rView.data) {
        setReviews(rView.data);
        const avg =
          rView.data.length > 0
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
        .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => {
          fetchUserDataBlocks();
        })
        .subscribe();

      const reviewsChannel = supabase
        .channel(`profile-reviews-${userId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "reviews" }, () =>
          fetchUserDataBlocks()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(choresChannel);
        supabase.removeChannel(reviewsChannel);
      };
    }, [userId])
  );

  const toggleAcceptTask = async (task) => {
    if (!currentUser) return Alert.alert("Error", "Login to accept tasks");

    const isAcceptedByMe = task.accepted_by === currentUser.id;
    const newAcceptedBy = isAcceptedByMe ? null : currentUser.id;

    if (task.accepted_by && !isAcceptedByMe) {
      return Alert.alert("Notice", "This task is already accepted by someone else.");
    }

    try {
      const { error } = await supabase
        .from("chores")
        .update({ accepted_by: newAcceptedBy })
        .eq("id", task.id);

      if (error) throw error;
      fetchUserDataBlocks();
    } catch (e) {
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
    const chatId =
      currentUserId > userId ? `${currentUserId}_${userId}` : `${userId}_${currentUserId}`;

    const { data: chatRoom } = await supabase
      .from("chats")
      .select("*")
      .eq("id", chatId)
      .maybeSingle();

    if (!chatRoom) {
      await supabase.from("chats").insert({
        id: chatId,
        participants: [currentUserId, userId],
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, profile_pic")
        .eq("id", currentUser.id)
        .maybeSingle();

      const { error } = await supabase.from("reviews").insert({
        reviewer_id: currentUser.id,
        reviewer_name: profile?.name || "Anonymous User",
        reviewer_pic: profile?.profile_pic || null,
        target_user_id: userId,
        rating: parseInt(rating),
        comment: comment.trim(),
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
        reason: reportReason.trim(),
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
    <ScrollView style={styles.scrollBackground}>
      <View style={styles.container}>
        
        {/* Navigation Bar */}
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

        {/* User Profile Floating Card */}
        <View style={styles.floatingCard}>
          <View style={styles.avatar}>
            {userData.profile_pic ? (
              <Image source={{ uri: userData.profile_pic }} style={styles.avatarImage} />
            ) : (
              <Text style={{ fontSize: 40 }}>👤</Text>
            )}
          </View>

          <Text style={styles.nameText}>{userData.name || "User Profile"}</Text>

          {userData.phone && <Text style={styles.numText}>📞 {userData.phone}</Text>}

          <Text style={styles.bioText}>{userData.bio || "No biography info set."}</Text>

          <Text style={styles.ratingText}>
            ⭐ {avgRating} ({reviews.length} reviews)
          </Text>

          {currentUser?.id !== userId && (
            <TouchableOpacity style={styles.btnPrimary} onPress={goToChat}>
              <Text style={styles.btnPrimaryText}>MESSAGE</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* HELPER PROFILE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Helper Profile</Text>
          {helperProfile ? (
            <View style={styles.floatingCard}>
              <Text style={styles.nameText}>{helperProfile.full_name || userData.name}</Text>

              <Text style={styles.fieldLabel}>Selected Skill(s):</Text>
              <View style={styles.skillsContainer}>
                {Array.isArray(helperProfile.skills) ? (
                  helperProfile.skills.map((skill, index) => (
                    <View key={index} style={styles.skillChip}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.fieldValue}>{helperProfile.skills || "None listed"}</Text>
                )}
              </View>

              <Text style={styles.fieldLabel}>Experience / Qualifications:</Text>
              <Text style={styles.fieldValue}>
                {helperProfile.experience || "No experience details added"}
              </Text>

              <Text style={styles.fieldLabel}>Contact Info:</Text>
              <Text style={styles.fieldValue}>
                {helperProfile.contact_info || userData.phone || "No contact info listed"}
              </Text>
            </View>
          ) : (
            <View style={styles.floatingCardEmpty}>
              <Text style={{ color: "#660005", textAlign: "center", fontWeight: "500" }}>
                This user has not posted a Helper Application yet.
              </Text>
            </View>
          )}
        </View>

        {/* LEAVE A REVIEW SECTION */}
        {currentUser?.id !== userId && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Leave a Review</Text>
            <View style={styles.floatingCard}>
              <View style={{ flexDirection: "row", marginBottom: 12 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Text style={{ fontSize: 28, marginHorizontal: 2 }}>
                      {star <= rating ? "⭐" : "☆"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                placeholder="Write a review..."
                placeholderTextColor="rgba(102, 0, 5, 0.5)"
                value={comment}
                onChangeText={setComment}
                style={styles.floatingInput}
                multiline
              />

              <TouchableOpacity style={styles.btnPrimary} onPress={submitReview}>
                <Text style={styles.btnPrimaryText}>SUBMIT REVIEW</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* REVIEWS LIST */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reviews</Text>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>No reviews yet.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={styles.floatingMiniCard}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {r.reviewer_pic ? (
                    <Image source={{ uri: r.reviewer_pic }} style={styles.reviewPic} />
                  ) : (
                    <Text style={{ marginRight: 10, fontSize: 24 }}>👤</Text>
                  )}
                  <View>
                    <Text style={styles.reviewerName}>{r.reviewer_name || "User"}</Text>
                    <Text>{"⭐".repeat(r.rating)}</Text>
                  </View>
                </View>
                {r.comment ? (
                  <Text style={styles.reviewComment}>{r.comment}</Text>
                ) : null}
              </View>
            ))
          )}
        </View>

        {/* POSTED TASKS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Posted Tasks</Text>
          {postedTasks.length === 0 ? (
            <Text style={styles.emptyText}>No posted tasks.</Text>
          ) : (
            postedTasks.map((task) => {
              const isOwner = currentUser?.id === userId;
              const isAcceptedByMe = task.accepted_by === currentUser?.id;
              const isAcceptedByOther = task.accepted_by && !isAcceptedByMe;
              const acceptorName = task.acceptor?.name || "someone";

              return (
                <View key={task.id} style={styles.floatingMiniCard}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.choreCategory}>{task.category}</Text>
                    <Text style={styles.choreDesc}>{task.description}</Text>
                    {task.location && (
                      <Text style={{ fontSize: 12, color: "#660005", opacity: 0.8 }}>
                        📍 {task.location}
                      </Text>
                    )}
                    <Text style={styles.choreBudget}>₱{task.budget}</Text>
                  </View>

                  {/* Accept Button Logic */}
                  {isOwner ? (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>
                        {task.accepted_by
                          ? `Accepted by ${acceptorName}`
                          : "Pending Helper"}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      disabled={isAcceptedByOther}
                      style={[
                        styles.btnOutlineSmall,
                        isAcceptedByMe && styles.btnAcceptedMe,
                        isAcceptedByOther && styles.btnAcceptedOther,
                      ]}
                      onPress={() => toggleAcceptTask(task)}
                    >
                      <Text
                        style={[
                          styles.btnOutlineText,
                          (isAcceptedByMe || isAcceptedByOther) && { color: "#FFFFFF" },
                        ]}
                      >
                        {isAcceptedByMe
                          ? "Cancel Acceptance"
                          : isAcceptedByOther
                          ? `Accepted by ${acceptorName}`
                          : "Accept Task"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ACCEPTED TASKS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accepted Tasks</Text>
          {acceptedTasks.length === 0 ? (
            <Text style={styles.emptyText}>No accepted tasks.</Text>
          ) : (
            acceptedTasks.map((task) => (
              <View key={task.id} style={styles.floatingMiniCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.choreCategory}>{task.category}</Text>
                  <Text style={styles.choreDesc}>{task.description}</Text>
                  {task.location && (
                    <Text style={{ fontSize: 12, color: "#660005", opacity: 0.8 }}>
                      📍 {task.location}
                    </Text>
                  )}
                  <Text style={styles.choreBudget}>₱{task.budget}</Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>

      {/* REPORT MODAL */}
      <Modal visible={reportModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report User</Text>
            <Text style={styles.label}>
              Please clarify the exact details of the incident or problem below:
            </Text>
            <TextInput
              style={[styles.floatingInput, { height: 90, backgroundColor: "#F8F9FA" }]}
              placeholder="Reason for report..."
              placeholderTextColor="#888888"
              multiline
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => {
                  setReportModalVisible(false);
                  setReportReason("");
                }}
              >
                <Text style={{ color: "#555555", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleReportUserSubmit}>
                <Text style={styles.btnPrimaryText}>Submit Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollBackground: { backgroundColor: "#F8F9FA" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F8F9FA" },
  container: { flex: 1, alignItems: "center", padding: 16, paddingTop: 10 },

  topButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 10,
  },
  backBtn: { paddingVertical: 10, paddingRight: 15 },
  backText: { fontSize: 16, color: "#660005", fontWeight: "bold" },
  reportBtn: {
    backgroundColor: "#660005",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  reportText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },

  floatingCard: {
    backgroundColor: "#DF8F9C",
    width: "100%",
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingCardEmpty: {
    backgroundColor: "rgba(223, 143, 156, 0.25)",
    width: "100%",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DF8F9C",
  },
  floatingMiniCard: {
    backgroundColor: "#DF8F9C",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },

  nameText: { fontSize: 22, fontWeight: "bold", color: "#660005", marginBottom: 2 },
  numText: { fontSize: 13, color: "#660005", opacity: 0.8, marginBottom: 6, fontWeight: "600" },
  bioText: { fontSize: 14, color: "#660005", opacity: 0.9, textAlign: "center", marginBottom: 8 },
  ratingText: { fontSize: 13, color: "#660005", fontWeight: "bold", marginBottom: 12 },

  floatingInput: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    width: "100%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    color: "#660005",
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
  },

  btnPrimary: {
    backgroundColor: "#660005",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    elevation: 3,
  },
  btnPrimaryText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  btnOutlineSmall: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justify: "center",
  },
  btnOutlineText: {
    color: "#660005",
    fontWeight: "bold",
    fontSize: 11,
    textAlign: "center",
  },
  btnAcceptedMe: {
    backgroundColor: "#660005",
  },
  btnAcceptedOther: {
    backgroundColor: "rgba(102, 0, 5, 0.5)",
  },

  badgeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  badgeText: {
    color: "#660005",
    fontWeight: "bold",
    fontSize: 11,
  },

  section: { width: "100%", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333333", marginBottom: 12 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#660005",
    opacity: 0.8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  fieldValue: { fontSize: 14, color: "#660005", marginTop: 2, fontWeight: "500", alignSelf: "flex-start" },
  skillsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, alignSelf: "flex-start" },
  skillChip: { backgroundColor: "#FFFFFF", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  skillText: { color: "#660005", fontSize: 12, fontWeight: "bold" },

  reviewerName: { fontWeight: "bold", color: "#660005", fontSize: 14 },
  reviewComment: { marginTop: 6, color: "#660005", opacity: 0.9, fontSize: 13 },
  reviewPic: { width: 36, height: 36, borderRadius: 18, marginRight: 10 },

  choreCategory: { fontWeight: "bold", fontSize: 15, color: "#660005" },
  choreDesc: { fontSize: 13, color: "#660005", opacity: 0.9, marginVertical: 2 },
  choreBudget: { color: "#2E7D32", fontWeight: "bold", fontSize: 14, marginTop: 2 },

  emptyText: { color: "#888888", fontStyle: "italic", paddingLeft: 5 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", width: "85%", padding: 20, borderRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#660005", marginBottom: 10, textAlign: "center" },
  label: { fontSize: 12, color: "#555555", marginBottom: 10 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 },
  modalBtnCancel: { padding: 10, borderRadius: 10, flex: 1, alignItems: "center", backgroundColor: "#EEEEEE" },
  modalBtnSave: { padding: 10, borderRadius: 10, flex: 1, alignItems: "center", backgroundColor: "#660005" },
});