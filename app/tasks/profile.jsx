import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { supabase } from "../../supabaseConfig";
import { useRouter } from "expo-router";

export default function TasksProfile() {
  const [userId, setUserId] = useState(null);
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState(null);
  const [edit, setEdit] = useState(false);

  const [myChores, setMyChores] = useState([]);
  const [helperProfile, setHelperProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal states for Chores Edit
  const [editingChore, setEditingChore] = useState(null);
  const [editDesc, setEditDesc] = useState("");
  const [editBudget, setEditBudget] = useState("");

  // Modal states for Helper Profile Edit
  const [editingHelper, setEditingHelper] = useState(null);
  const [helperName, setHelperName] = useState("");
  const [helperExp, setHelperExp] = useState("");
  const [helperContact, setHelperContact] = useState("");

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (session?.user) {
          setUserId(session.user.id);
          await loadProfile(session.user.id);
          await fetchHelperProfile(session.user.id);
          await fetchMyChores(session.user.id);
        } else {
          setLoading(false);
          router.replace("/login");
        }
      } catch (err) {
        console.error("Auth init error:", err);
        if (isMounted) setLoading(false);
      }
    };
    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const loadProfile = async (uid) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setName(data.name || "");
        setNum(data.phone || "");
        setBio(data.bio || "");
        setAvatarUri(data.profile_pic || null);
      }
    } catch (e) {
      console.error("Profile Load Error:", e.message);
    }
  };

  const fetchHelperProfile = async (uid) => {
    try {
      const { data, error } = await supabase
        .from("applicants")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();

      if (error) throw error;
      setHelperProfile(data || null);
    } catch (e) {
      console.log("Error fetching helper application info:", e.message);
    }
  };

  const fetchMyChores = async (uid) => {
    try {
      const { data } = await supabase.from("chores").select("*").eq("user_id", uid);
      if (data) setMyChores(data);
    } catch (e) {
      console.log("Error fetching my chores:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateHelper = async () => {
    if (!helperName.trim() || !helperContact.trim()) {
      return Alert.alert("Validation Error", "Full Name and Contact Info cannot be empty.");
    }
    try {
      const { data, error } = await supabase
        .from("applicants")
        .update({
          full_name: helperName.trim(),
          experience: helperExp.trim(),
          contact_info: helperContact.trim(),
        })
        .eq("user_id", userId)
        .eq("id", helperProfile.id)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        return Alert.alert(
          "Update Failed",
          "No record was updated. Please check your Supabase Row Level Security (RLS) policies."
        );
      }

      setEditingHelper(null);
      await fetchHelperProfile(userId);
      Alert.alert("Success", "Helper profile updated!");
    } catch (e) {
      Alert.alert("Update Error", e.message);
    }
  };

  const deleteHelperProfile = async () => {
    Alert.alert(
      "Delete Application",
      "Are you sure you want to delete your helper application? You can post a new one afterwards.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("applicants")
                .delete()
                .eq("id", helperProfile.id);

              if (error) throw error;

              setHelperProfile(null);
              Alert.alert("Deleted", "Your helper profile has been deleted.");
            } catch (e) {
              Alert.alert("Delete Error", e.message);
            }
          },
        },
      ]
    );
  };

  const toggleChoreStatus = async (chore) => {
    const newStatus = chore.status === "completed" ? "pending" : "completed";
    try {
      const { error } = await supabase
        .from("chores")
        .update({ status: newStatus })
        .eq("id", chore.id);

      if (error) throw error;
      setMyChores(myChores.map((c) => (c.id === chore.id ? { ...c, status: newStatus } : c)));
    } catch (e) {
      Alert.alert("Update Error", e.message);
    }
  };

  const deleteChore = async (choreId) => {
    try {
      const { error } = await supabase.from("chores").delete().eq("id", choreId);
      if (error) throw error;

      setMyChores((prev) => prev.filter((c) => c.id !== choreId));
      Alert.alert("Deleted", "Task has been removed.");
    } catch (e) {
      Alert.alert("Delete Error", e.message);
    }
  };

  const handleUpdateChore = async () => {
    if (!editDesc.trim() || !editBudget.toString().trim()) {
      return Alert.alert("Error", "Fields cannot be empty");
    }
    try {
      const { error } = await supabase
        .from("chores")
        .update({ description: editDesc.trim(), budget: editBudget })
        .eq("id", editingChore.id);

      if (error) throw error;

      setEditingChore(null);
      await fetchMyChores(userId);
      Alert.alert("Success", "Task updated!");
    } catch (e) {
      Alert.alert("Update Error", e.message);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission Denied", "Gallery access is needed.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const saveProfile = async () => {
    if (!name.trim()) return Alert.alert("Validation Error", "Name cannot be blank.");

    try {
      setLoading(true);
      let finalPublicUrl = avatarUri;

      if (
        avatarUri &&
        (avatarUri.startsWith("file://") ||
          avatarUri.startsWith("blob:") ||
          avatarUri.startsWith("data:") ||
          avatarUri.startsWith("content://"))
      ) {
        try {
          const fileExt = avatarUri.split(".").pop()?.split("?")[0] || "jpg";
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${userId}/${fileName}`;
          const contentType = `image/${fileExt === "png" ? "png" : "jpeg"}`;

          let fileBody;

          if (Platform.OS === "web") {
            const response = await fetch(avatarUri);
            fileBody = await response.blob();
          } else {
            fileBody = new FormData();
            fileBody.append("file", {
              uri: avatarUri,
              name: fileName,
              type: contentType,
            });
          }

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(filePath, fileBody, { contentType, upsert: true });

          if (uploadError) throw uploadError;

          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
          finalPublicUrl = urlData.publicUrl;
        } catch (storageErr) {
          console.error("Storage Error Detail:", storageErr);
          Alert.alert("Storage Error", "Upload failed.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({ name: name.trim(), phone: num.trim(), bio: bio.trim(), profile_pic: finalPublicUrl })
        .eq("id", userId);

      if (error) throw error;

      setEdit(false);
      Alert.alert("Success", "Profile updated!");
      loadProfile(userId);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login");
    } catch (error) {
      Alert.alert("Error", "Could not log out.");
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#660005" />
      </View>
    );

  return (
    <ScrollView style={styles.scrollBackground}>
      <View style={styles.container}>
        {/* User Profile Floating Card */}
        {edit ? (
          <View style={styles.floatingCard}>
            <TouchableOpacity onPress={pickImage} style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={{ fontSize: 40 }}>👤</Text>
              )}
              <View style={styles.editOverlay}>
                <Text style={styles.overlayText}>CHANGE</Text>
              </View>
            </TouchableOpacity>

            <TextInput
              style={styles.floatingInput}
              value={name}
              onChangeText={setName}
              placeholder="Username"
              placeholderTextColor="rgba(102, 0, 5, 0.5)"
            />
            <TextInput
              style={styles.floatingInput}
              value={num}
              onChangeText={setNum}
              placeholder="Phone"
              placeholderTextColor="rgba(102, 0, 5, 0.5)"
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.floatingInput, { height: 70 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              placeholderTextColor="rgba(102, 0, 5, 0.5)"
              multiline
            />

            <View style={styles.floatingBtnRow}>
              <TouchableOpacity style={styles.btnCancel} onPress={() => setEdit(false)}>
                <Text style={styles.btnCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={saveProfile}>
                <Text style={styles.btnPrimaryText}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.floatingCard}>
            <TouchableOpacity onPress={pickImage} style={styles.avatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={{ fontSize: 40 }}>👤</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.nameText}>{name || "Anonymous User"}</Text>
            <Text style={styles.numText}>{num || "No phone added"}</Text>
            <Text style={styles.bioText}>{bio || "No bio added"}</Text>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setEdit(true)}>
              <Text style={styles.btnPrimaryText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* HELPER APPLICATION PROFILE SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Helper Profile</Text>
          {helperProfile ? (
            <View style={styles.floatingCard}>
              <Text style={styles.nameText}>{helperProfile.full_name || name}</Text>

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
                {helperProfile.contact_info || num || "No contact info listed"}
              </Text>

              <View style={styles.floatingActionsRow}>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={() => {
                    setEditingHelper(helperProfile);
                    setHelperName(helperProfile.full_name || name);
                    setHelperExp(helperProfile.experience || "");
                    setHelperContact(helperProfile.contact_info || num || "");
                  }}
                >
                  <Text style={styles.btnPrimaryText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnDanger} onPress={deleteHelperProfile}>
                  <Text style={styles.btnDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.floatingCardEmpty}>
              <Text
                style={{
                  color: "#660005",
                  textAlign: "center",
                  marginBottom: 12,
                  fontWeight: "500",
                }}
              >
                You haven't posted a Helper Application yet.
              </Text>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={() => router.push("/tasks/create")}
              >
                <Text style={styles.btnPrimaryText}>CREATE APPLICATION</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* MY POSTED TASKS SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Posted Tasks</Text>
          {myChores.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#888888", marginTop: 5 }}>
              No tasks posted yet.
            </Text>
          ) : (
            myChores.map((chore) => (
              <View key={chore.id} style={styles.floatingMiniCard}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.choreCategory}>{chore.category}</Text>
                  <Text style={styles.choreDesc}>{chore.description}</Text>
                  <Text style={styles.choreBudget}>₱{chore.budget}</Text>
                  <Text
                    style={[
                      styles.choreStatus,
                      { color: chore.status === "completed" ? "#2E7D32" : "#660005" },
                    ]}
                  >
                    {chore.status?.toUpperCase() || "PENDING"}
                  </Text>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.btnOutlineSmall}
                    onPress={() => toggleChoreStatus(chore)}
                  >
                    <Text style={{ color: "#660005", fontWeight: "bold", fontSize: 12 }}>
                      {chore.status === "completed" ? "Undo" : "Done"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.btnPrimarySmall}
                    onPress={() => {
                      setEditingChore(chore);
                      setEditDesc(chore.description);
                      setEditBudget(chore.budget.toString());
                    }}
                  >
                    <Text style={styles.btnPrimaryText}>Edit</Text>
                  </TouchableOpacity>
                  <Pressable
                    style={styles.btnDangerSmall}
                    onPress={() => deleteChore(chore.id)}
                  >
                    <Text style={styles.btnDangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>

      {/* MODALS */}
      <Modal visible={editingHelper !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Helper Application</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput style={styles.inputModal} value={helperName} onChangeText={setHelperName} />
            <Text style={styles.label}>Experience / Qualifications</Text>
            <TextInput
              style={[styles.inputModal, { height: 70 }]}
              value={helperExp}
              onChangeText={setHelperExp}
              multiline
            />
            <Text style={styles.label}>Contact Info</Text>
            <TextInput style={styles.inputModal} value={helperContact} onChangeText={setHelperContact} />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setEditingHelper(null)}
              >
                <Text style={{ color: "#555555", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleUpdateHelper}>
                <Text style={styles.btnPrimaryText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editingChore !== null} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task Details</Text>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.inputModal, { height: 70 }]}
              value={editDesc}
              onChangeText={setEditDesc}
              multiline
            />
            <Text style={styles.label}>Budget (₱)</Text>
            <TextInput
              style={styles.inputModal}
              value={editBudget}
              onChangeText={setEditBudget}
              keyboardType="numeric"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => setEditingChore(null)}
              >
                <Text style={{ color: "#555555", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleUpdateChore}>
                <Text style={styles.btnPrimaryText}>Save</Text>
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
  container: { flex: 1, alignItems: "center", padding: 16, paddingTop: 30 },

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
  editOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    height: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayText: { color: "#FFFFFF", fontSize: 9, fontWeight: "bold" },

  nameText: { fontSize: 22, fontWeight: "bold", color: "#660005", marginBottom: 2 },
  numText: { fontSize: 13, color: "#660005", opacity: 0.8, marginBottom: 6, fontWeight: "600" },
  bioText: { fontSize: 14, color: "#660005", opacity: 0.9, textAlign: "center", marginBottom: 16 },

  floatingInput: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    width: "100%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
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
  btnPrimarySmall: {
    backgroundColor: "#660005",
    paddingVertical: 6,
    width: 68,
    borderRadius: 10,
    alignItems: "center",
  },
  btnDanger: {
    backgroundColor: "rgba(217, 83, 79, 0.2)",
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(217, 83, 79, 0.4)",
  },
  btnDangerSmall: {
    backgroundColor: "rgba(217, 83, 79, 0.2)",
    paddingVertical: 6,
    width: 68,
    borderRadius: 10,
    alignItems: "center",
  },
  btnCancel: {
    backgroundColor: "#E0E0E0",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  btnOutlineSmall: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 6,
    width: 68,
    borderRadius: 10,
    alignItems: "center",
  },

  btnPrimaryText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 13 },
  btnDangerText: { color: "#D9534F", fontWeight: "bold", fontSize: 13 },
  btnCancelText: { color: "#555555", fontWeight: "bold", fontSize: 13 },

  floatingBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  floatingActionsRow: { flexDirection: "row", gap: 10, marginTop: 16, width: "100%", justifyContent: "center" },

  section: { width: "100%", marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333333", marginBottom: 12 },

  fieldLabel: { fontSize: 11, fontWeight: "bold", color: "#660005", opacity: 0.8, marginTop: 10, alignSelf: "flex-start" },
  fieldValue: { fontSize: 14, color: "#660005", marginTop: 2, fontWeight: "500", alignSelf: "flex-start" },
  skillsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4, alignSelf: "flex-start" },
  skillChip: { backgroundColor: "#FFFFFF", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12 },
  skillText: { color: "#660005", fontSize: 12, fontWeight: "bold" },

  choreCategory: { fontWeight: "bold", fontSize: 16, color: "#660005" },
  choreDesc: { fontSize: 13, color: "#660005", opacity: 0.9, marginVertical: 4 },
  choreBudget: { color: "#2E7D32", fontWeight: "bold", fontSize: 15 },
  choreStatus: { fontSize: 11, fontWeight: "bold", marginTop: 4, fontStyle: "italic" },

  actionButtons: { justifyContent: "center", alignItems: "center", gap: 6 },

  btnLogout: {
    marginTop: 20,
    padding: 14,
    width: "100%",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D9534F",
    backgroundColor: "rgba(217, 83, 79, 0.05)",
    marginBottom: 40,
  },
  logoutText: { color: "#D9534F", fontWeight: "bold" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFFFF", width: "85%", padding: 20, borderRadius: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#660005", marginBottom: 15, textAlign: "center" },
  label: { fontWeight: "600", color: "#555555", marginBottom: 4, fontSize: 12 },
  inputModal: { borderWidth: 1, borderColor: "#E0E0E0", padding: 10, borderRadius: 10, marginBottom: 12, color: "#333333" },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, gap: 10 },
  modalBtnCancel: { padding: 10, borderRadius: 10, flex: 1, alignItems: "center", backgroundColor: "#EEEEEE" },
  modalBtnSave: { padding: 10, borderRadius: 10, flex: 1, alignItems: "center", backgroundColor: "#660005" },
});