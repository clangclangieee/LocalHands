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
  Modal
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { db, auth, storage } from "../../firebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "expo-router";

export default function Profile() {
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUri, setAvatarUri] = useState(null);
  const [edit, setEdit] = useState(false);

  const [myChores, setMyChores] = useState([]);
  const [acceptedChores, setAcceptedChores] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingChore, setEditingChore] = useState(null);
  const [editDesc, setEditDesc] = useState("");
  const [editBudget, setEditBudget] = useState("");

  const router = useRouter();

  useEffect(() => {
    let unsubscribeChores;
    let unsubscribeAccepted;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await loadProfile(user.uid);

        // My Posted Chores
        const q = query(collection(db, "chores"), where("userId", "==", user.uid));
        unsubscribeChores = onSnapshot(q, (snap) => {
          const chores = snap.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }));
          setMyChores(chores);
        });

        // Accepted Chores
        const qAccepted = query(collection(db, "chores"), where("acceptedBy", "==", user.uid));
        unsubscribeAccepted = onSnapshot(qAccepted, async (snap) => {
          const accepted = await Promise.all(
            snap.docs.map(async (choreDoc) => {
              const chore = { id: choreDoc.id, ...choreDoc.data() };
              const posterDoc = await getDoc(doc(db, "users", chore.userId));
              if (posterDoc.exists()) {
                chore.posterName = posterDoc.data().name || "User";
                chore.posterPic = posterDoc.data().profilePic || null;
              }
              return chore;
            })
          );
          setAcceptedChores(accepted);
          setLoading(false);
        });

      } else {
        router.replace("/login");
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeChores) unsubscribeChores();
      if (unsubscribeAccepted) unsubscribeAccepted();
    };
  }, []);

  const loadProfile = async (uid) => {
    try {
      const d = await getDoc(doc(db, "users", uid));
      if (d.exists()) {
        const data = d.data();
        setName(data.name || "");
        setNum(data.number || "");
        setBio(data.bio || "");
        setAvatarUri(data.profilePic || null);
      }
    } catch (e) {
      console.log("Profile Load Error:", e);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "Gallery access is needed.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const saveProfile = async () => {
    let finalPicUrl = avatarUri;
    try {
      if (avatarUri && avatarUri.startsWith("file://")) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        const storageRef = ref(storage, `profile_pics/${auth.currentUser.uid}`);
        await uploadBytes(storageRef, blob);
        finalPicUrl = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "users", auth.currentUser.uid), {
        name,
        number: num,
        bio,
        profilePic: finalPicUrl,
        email: auth.currentUser.email
      });

      setEdit(false);
      Alert.alert("Success", "Profile updated!");
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const deleteChore = async (choreId) => {
    try {
      await deleteDoc(doc(db, "chores", choreId));
    } catch (e) {
      Alert.alert("Delete Error", e.message);
    }
  };

  const toggleChoreComplete = async (chore) => {
    try {
      await updateDoc(doc(db, "chores", chore.id), { completed: !chore.completed });
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const handleUpdateChore = async () => {
    if (!editDesc || !editBudget)
      return Alert.alert("Error", "Fields cannot be empty");
    try {
      const choreRef = doc(db, "chores", editingChore.id);
      await updateDoc(choreRef, {
        description: editDesc,
        budget: editBudget,
        location: editingChore.location || ""
      });
      setEditingChore(null);
      setEditDesc("");
      setEditBudget("");
      Alert.alert("Success", "Task updated!");
    } catch (e) {
      Alert.alert("Update Error", e.message);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.replace("/login");
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#8FCACA" />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: "#D4F0F0" }}>
      <View style={styles.container}>
        {/* Profile Avatar */}
        <TouchableOpacity onPress={pickImage} style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <Text style={{ fontSize: 50 }}>👤</Text>
          )}
          {edit && (
            <View style={styles.editOverlay}>
              <Text style={{ color: "white", fontSize: 10 }}>CHANGE</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Profile Info */}
        {edit ? (
          <View style={styles.editContainer}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Username"
            />
            <TextInput
              style={styles.input}
              value={num}
              onChangeText={setNum}
              placeholder="Phone"
              keyboardType="phone-pad"
            />
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={bio}
              onChangeText={setBio}
              placeholder="Bio"
              multiline
            />
            <TouchableOpacity style={styles.btnSave} onPress={saveProfile}>
              <Text style={styles.btnText}>SAVE CHANGES</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <Text style={styles.nameText}>{name || "Anonymous User"}</Text>
            <Text style={styles.numText}>{num || "No phone added"}</Text>
            <Text style={styles.bioText}>{bio || "No bio added"}</Text>
            <TouchableOpacity style={styles.btnEdit} onPress={() => setEdit(true)}>
              <Text style={styles.btnText}>EDIT PROFILE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* My Posted Chores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Posted Tasks</Text>
          {myChores.length === 0 ? (
            <Text style={styles.emptyText}>You haven't posted any chores yet.</Text>
          ) : (
            myChores.map((chore) => (
              <View key={chore.id} style={styles.miniCard}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>{chore.category}</Text>
                  <Text style={{ color: "#666" }} numberOfLines={2}>{chore.description}</Text>
                  <Text style={{ color: "#666" }}>{chore.location || "No location"}</Text>
                  <Text style={{ color: "green", fontWeight: "bold" }}>₱{chore.budget}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { backgroundColor: "#CBAACB" }]}
                    onPress={() => {
                      setEditingChore(chore);
                      setEditDesc(chore.description);
                      setEditBudget(chore.budget);
                    }}
                  >
                    <Text style={{ color: "#FFF", fontWeight: "bold" }}>Edit</Text>
                  </TouchableOpacity>
                  <Pressable
                    style={[styles.smallBtn, { backgroundColor: "#FFF0F0", marginTop: 6 }]}
                    onPress={() => deleteChore(chore.id)}
                  >
                    <Text style={{ color: "red", fontWeight: "bold" }}>Delete</Text>
                  </Pressable>
                  <TouchableOpacity
                    style={{ marginTop: 5 }}
                    onPress={() => toggleChoreComplete(chore)}
                  >
                    <Text style={{ color: chore.completed ? "green" : "gray", fontWeight: "bold" }}>
                      {chore.completed ? "✔ Completed" : "Mark Complete"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Accepted Chores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accepted Tasks</Text>
          {acceptedChores.length === 0 ? (
            <Text style={styles.emptyText}>No accepted tasks yet.</Text>
          ) : (
            acceptedChores.map((chore) => (
              <View key={chore.id} style={styles.miniCard}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontWeight: "bold", fontSize: 16 }}>{chore.category}</Text>
                  <Text style={{ color: "#666" }} numberOfLines={2}>{chore.description}</Text>
                  <Text style={{ color: "#666" }}>{chore.location || "No location"}</Text>
                  <Text style={{ color: "green", fontWeight: "bold" }}>₱{chore.budget}</Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={{ marginTop: 5 }}
                    onPress={() => toggleChoreComplete(chore)}
                  >
                    <Text style={{ color: chore.completed ? "green" : "gray", fontWeight: "bold" }}>
                      {chore.completed ? "✔ Completed" : "Mark Complete"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Edit Modal */}
        <Modal visible={editingChore !== null} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Task</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                multiline
                value={editDesc}
                onChangeText={setEditDesc}
              />
              <TextInput
                style={styles.input}
                value={editBudget}
                onChangeText={setEditBudget}
                placeholder="Budget"
                keyboardType="numeric"
              />
              <TextInput
                style={styles.input}
                value={editingChore?.location || ""}
                onChangeText={(text) =>
                  setEditingChore({ ...editingChore, location: text })
                }
                placeholder="Location"
              />
              <View style={{ flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#CCC" }]}
                  onPress={() => setEditingChore(null)}
                >
                  <Text>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: "#8FCACA" }]}
                  onPress={handleUpdateChore}
                >
                  <Text style={{ fontWeight: "bold" }}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}>
          <Text style={styles.logoutText}>LOGOUT</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#D4F0F0" },
  container: { flex: 1, alignItems: "center", padding: 20, paddingTop: 40 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFF", justifyContent: "center", alignItems: "center", marginBottom: 20, elevation: 5, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  editOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)", height: 25, justifyContent: "center", alignItems: "center" },
  input: { backgroundColor: "#FFF", width: "100%", padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#CBAACB" },
  profileCard: { backgroundColor: "#FFF", width: "100%", padding: 20, borderRadius: 20, alignItems: "center", marginBottom: 20, elevation: 5 },
  editContainer: { width: "100%", alignItems: "center", marginBottom: 20 },
  bioText: { fontSize: 14, color: "#666", marginBottom: 10, textAlign: "center" },
  nameText: { fontSize: 24, fontWeight: "bold" },
  numText: { fontSize: 14, color: "#666", marginBottom: 5 },
  btnSave: { backgroundColor: "#8FCACA", padding: 15, borderRadius: 25, width: 200, alignItems: "center" },
  btnEdit: { backgroundColor: "#CBAACB", padding: 12, borderRadius: 25, width: 150, alignItems: "center" },
  btnText: { color: "#FFF", fontWeight: "bold" },
  section: { width: "100%", marginTop: 30 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  miniCard: { backgroundColor: "#FFF", padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: "row", alignItems: "center", elevation: 3 },
  actionButtons: { justifyContent: "center", alignItems: "center" },
  smallBtn: { padding: 8, borderRadius: 8, alignItems: "center", width: 80 },
  emptyText: { textAlign: "center", color: "#777", marginTop: 10 },
  btnLogout: { marginTop: 40, padding: 15, width: "100%", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#FF4444", marginBottom: 40 },
  logoutText: { color: "#FF4444", fontWeight: "bold" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFF", width: "85%", padding: 20, borderRadius: 20, alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15 },
  modalBtn: { padding: 12, borderRadius: 10, width: "48%", alignItems: "center" }
});