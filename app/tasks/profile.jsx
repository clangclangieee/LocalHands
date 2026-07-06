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
  Platform
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
  const [loading, setLoading] = useState(true);

  const [editingChore, setEditingChore] = useState(null);
  const [editDesc, setEditDesc] = useState("");
  const [editBudget, setEditBudget] = useState("");

  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        if (session?.user) {
          setUserId(session.user.id);
          await loadProfile(session.user.id);
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
    return () => { isMounted = false; };
  }, []);

  const loadProfile = async (uid) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
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

  const fetchMyChores = async (uid) => {
    try {
      const { data } = await supabase.from("chores").select("*").eq("user_id", uid);
      if (data) setMyChores(data);
    } catch (e) {
      console.log("Error fetching tasks:", e);
    } finally {
      setLoading(false);
    }
  };

  const toggleChoreStatus = async (chore) => {
    const newStatus = chore.status === 'completed' ? 'pending' : 'completed';
    try {
      const { error } = await supabase
        .from("chores")
        .update({ status: newStatus })
        .eq("id", chore.id);

      if (error) throw error;
      setMyChores(myChores.map(c => c.id === chore.id ? { ...c, status: newStatus } : c));
    } catch (e) {
      Alert.alert("Update Error", e.message);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return Alert.alert("Permission Denied", "Gallery access is needed.");
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const saveProfile = async () => {
    if (!name.trim()) return Alert.alert("Validation Error", "Name cannot be blank.");

    try {
      setLoading(true);
      let finalPublicUrl = avatarUri;

      if (avatarUri && (avatarUri.startsWith("file://") || avatarUri.startsWith("blob:") || avatarUri.startsWith("data:") || avatarUri.startsWith("content://"))) {
        try {
          const fileExt = avatarUri.split('.').pop()?.split('?')[0] || 'jpg';
          const fileName = `${Date.now()}.${fileExt}`;
          const filePath = `${userId}/${fileName}`; 
          const contentType = `image/${fileExt === 'png' ? 'png' : 'jpeg'}`;

          let fileBody;

          if (Platform.OS === 'web') {
            const response = await fetch(avatarUri);
            fileBody = await response.blob();
          } else {
            fileBody = new FormData();
            fileBody.append('file', {
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

  const deleteChore = async (choreId) => {
    try {
      const { error } = await supabase.from("chores").delete().eq("id", choreId);
      if (error) throw error;
      
      setMyChores((prev) => prev.filter(c => c.id !== choreId));
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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/login"); 
    } catch (error) {
      Alert.alert("Error", "Could not log out.");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#660005" /></View>;

  return (
    <ScrollView style={{ backgroundColor: "#FFFF" }}>
      <View style={styles.container}>
        <TouchableOpacity onPress={pickImage} style={styles.avatar}>
          {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={{ fontSize: 50 }}>👤</Text>}
          {edit && <View style={styles.editOverlay}><Text style={{ color: "white", fontSize: 10 }}>CHANGE</Text></View>}
        </TouchableOpacity>

        {edit ? (
          <View style={styles.editContainer}>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Username" />
            <TextInput style={styles.input} value={num} onChangeText={setNum} placeholder="Phone" keyboardType="phone-pad" />
            <TextInput style={[styles.input, { height: 80 }]} value={bio} onChangeText={setBio} placeholder="Bio" multiline />
            <TouchableOpacity style={styles.btnSave} onPress={saveProfile}><Text style={styles.btnText}>SAVE CHANGES</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <Text style={styles.nameText}>{name || "Anonymous User"}</Text>
            <Text style={styles.numText}>{num || "No phone added"}</Text>
            <Text style={styles.bioText}>{bio || "No bio added"}</Text>
            <TouchableOpacity style={styles.btnEdit} onPress={() => setEdit(true)}><Text style={styles.btnText}>EDIT PROFILE</Text></TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Posted Tasks</Text>
          {myChores.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#666", marginTop: 10 }}>No tasks posted yet.</Text>
          ) : (
            myChores.map((chore) => (
              <View key={chore.id} style={styles.miniCard}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "bold", fontSize: 18 }}>{chore.category}</Text>
                  <Text style={{ fontSize: 16, marginVertical: 4 }}>{chore.description}</Text>
                  <Text style={{ color: "green", fontWeight: "bold", fontSize: 16 }}>₱{chore.budget}</Text>
                  <Text style={{ 
                    fontSize: 14, 
                    fontWeight: "bold", 
                    marginTop: 5, 
                    color: chore.status === 'completed' ? '#FFFF' : '#660005',
                    fontStyle: 'italic' 
                  }}>
                    {chore.status?.toUpperCase() || 'PENDING'}
                  </Text>
                </View>
                <View style={styles.actionButtons}>
                  <TouchableOpacity style={[styles.smallBtn, { backgroundColor: "#F4C2C2", padding: 10 }]} onPress={() => toggleChoreStatus(chore)}>
                    <Text style={{ color: "#660005", fontWeight: "bold", fontSize: 14 }}>{chore.status === 'completed' ? 'Undo' : 'Done'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.smallBtn, { backgroundColor: "#660005", padding: 10 }]} 
                    onPress={() => { 
                      setEditingChore(chore); 
                      setEditDesc(chore.description); 
                      setEditBudget(chore.budget.toString()); 
                    }}
                  >
                    <Text style={{ color: "#FFFF", fontWeight: "bold", fontSize: 14 }}>Edit</Text>
                  </TouchableOpacity>
                  <Pressable style={[styles.smallBtn, { backgroundColor: "#FFFF", padding: 10 }]} onPress={() => deleteChore(chore.id)}>
                    <Text style={{ color: "red", fontWeight: "bold", fontSize: 14 }}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout}><Text style={styles.logoutText}>LOGOUT</Text></TouchableOpacity>
      </View>

      <Modal visible={editingChore !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Task Details</Text>
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, { height: 70 }]} value={editDesc} onChangeText={setEditDesc} multiline />
            <Text style={styles.label}>Budget (₱)</Text>
            <TextInput style={styles.input} value={editBudget} onChangeText={setEditBudget} keyboardType="numeric" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#660005" }]} onPress={() => setEditingChore(null)}>
                <Text style={styles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#DF8F9C" }]} onPress={handleUpdateChore}>
                <Text style={styles.btnText}>Save</Text>
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
  container: { flex: 1, alignItems: "center", padding: 20, paddingTop: 40 },
  avatar: { width: 120, height: 120, borderRadius: 60, backgroundColor: "#FFFF", justifyContent: "center", alignItems: "center", marginBottom: 20, elevation: 5, overflow: "hidden" },
  avatarImage: { width: "100%", height: "100%" },
  editOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0,0,0,0.6)", height: 25, justifyContent: "center", alignItems: "center" },
  input: { backgroundColor: "#DF8F9C", width: "100%", padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: "#660005" },
  profileCard: { backgroundColor: "#DF8F9C", width: "100%", padding: 20, borderRadius: 20, alignItems: "center", marginBottom: 20, elevation: 5 },
  editContainer: { width: "100%", alignItems: "center", marginBottom: 20 },
  btnSave: { backgroundColor: "#660005", padding: 15, borderRadius: 25, width: 200, alignItems: "center" },
  btnEdit: { backgroundColor: "#660005", padding: 12, borderRadius: 25, width: 150, alignItems: "center" },
  btnText: { color: "#FFFF", fontWeight: "bold" },
  section: { width: "100%", marginTop: 30 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  miniCard: { backgroundColor: "#DF8F9C", padding: 15, borderRadius: 15, marginBottom: 10, flexDirection: "row", alignItems: "center", elevation: 3 },
  actionButtons: { justifyContent: "center", alignItems: "center" },
  smallBtn: { borderRadius: 8, alignItems: "center", width: 80, marginBottom: 5 },
  btnLogout: { marginTop: 40, padding: 15, width: "100%", alignItems: "center", borderRadius: 12, borderWidth: 1, borderColor: "#FF4444", marginBottom: 40 },
  logoutText: { color: "#FF4444", fontWeight: "bold" },
  nameText: { fontSize: 24, fontWeight: "bold" },
  numText: { fontSize: 14, color: "#FFFF", marginBottom: 5, fontWeight: "600" },
  bioText: { fontSize: 14, color: "#FFFF", marginBottom: 10, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#FFFF", width: "85%", padding: 20, borderRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  label: { fontWeight: "600", color: "#444", marginBottom: 5, alignSelf: "flex-start" },
  modalActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, width: "100%" },
  modalBtn: { padding: 12, borderRadius: 20, width: "45%", alignItems: "center" }
});