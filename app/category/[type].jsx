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
import { supabase } from "../../supabaseConfig";

export default function CategoryView() {
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    // Get currently authenticated user info
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();

    if (!type) return;

    // 1. Fetch initial category tasks with associated profile info
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("chores")
        .select(`
          *,
          profiles:user_id ( name, profile_pic )
        `)
        .eq("category", type);

      if (error) {
        console.error("Error fetching category tasks:", error);
      } else if (data) {
        setTasks(data);
      }
    };

    fetchTasks();

    // 2. Set up realtime updates for dynamic changes
    const channel = supabase
      .channel(`chores-category-${type}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chores", filter: `category=eq.${type}` },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setTasks((prev) =>
              prev.map((task) =>
                task.id === payload.new.id ? { ...task, ...payload.new } : task
              )
            );
          } else {
            fetchTasks(); // Re-fetch for inserts or deletions
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [type]);

  const openProfile = (userId) => {
    router.push(`/profile/${userId}`);
  };

  const toggleAcceptTask = async (choreId, currentAcceptedBy) => {
    if (!currentUserId) return Alert.alert("Error", "Login to accept tasks");

    const newAcceptedBy = currentAcceptedBy === currentUserId ? null : currentUserId;

    if (currentAcceptedBy && currentAcceptedBy !== currentUserId) {
      return Alert.alert("Task Already Accepted");
    }

    // 1. Optimistic Update: Update state immediately so UI changes without delay
    setTasks((prev) =>
      prev.map((task) =>
        task.id === choreId ? { ...task, accepted_by: newAcceptedBy } : task
      )
    );

    // 2. Database update in background
    try {
      const { error } = await supabase
        .from("chores")
        .update({ accepted_by: newAcceptedBy })
        .eq("id", choreId);

      if (error) throw error;
    } catch (e) {
      // 3. Roll back local state if the network call fails
      setTasks((prev) =>
        prev.map((task) =>
          task.id === choreId ? { ...task, accepted_by: currentAcceptedBy } : task
        )
      );
      Alert.alert("Error", e.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      
      <Text style={styles.header}>{type} Tasks</Text>

      {tasks.length === 0 ? (
        <Text style={styles.empty}>No tasks in this category.</Text>
      ) : (
        tasks.map((item) => {
          let buttonColor = "#660005";
          let textColor = "#DF8F9C";
          let buttonText = "Accept Task";
          let disabled = false;

          if (item.accepted_by === currentUserId) {
            buttonColor = "#FFFF";
            textColor = "#DF8F9C";
            buttonText = "Unaccept Task";
          } else if (item.accepted_by) {
            buttonColor = "#FFFF";
            textColor = "#660005";
            buttonText = "Already Accepted";
            disabled = true;
          }

          const posterName = item.profiles?.name || "User";
          const posterPic = item.profiles?.profile_pic || null;

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.posterHeader}>
                <TouchableOpacity onPress={() => openProfile(item.user_id)}>
                  {posterPic ? (
                    <Image source={{ uri: posterPic }} style={styles.posterPic} />
                  ) : (
                    <View style={styles.picFallback}>
                      <Text>👤</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => openProfile(item.user_id)}>
                  <Text style={styles.realName}>{posterName}</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.title}>{item.category}</Text>
              <Text>{item.description}</Text>
              <Text style={styles.pay}>₱{item.budget}</Text>

              {item.location && (
                <Text style={styles.location}>📍 {item.location}</Text>
              )}

              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: buttonColor }]}
                onPress={() => toggleAcceptTask(item.id, item.accepted_by)}
                disabled={disabled}
              >
                <Text style={[styles.btnText, { color: textColor }]}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFF", padding: 15 },
  header: { fontSize: 26, fontWeight: "bold", marginVertical: 20, textAlign: "center" },
  empty: { textAlign: "center", marginTop: 50, color: "#777" },
  card: { backgroundColor: "#DF8F9C", padding: 15, borderRadius: 12, marginBottom: 12, elevation: 3 },
  posterHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  posterPic: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  picFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEE", justifyContent: "center", alignItems: "center", marginRight: 10 },
  realName: { fontWeight: "bold", color: "#660005" },
  title: { fontSize: 18, fontWeight: "bold" },
  pay: { fontWeight: "bold", color: "green", marginTop: 5 },
  location: { marginTop: 5, color: "#555", fontStyle: "italic" },
  acceptBtn: { marginTop: 10, padding: 10, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#F7F4D5", fontWeight: "bold" },
  backBtn: { marginTop: 10, marginBottom: 5, alignSelf: "flex-start", paddingVertical: 6, paddingHorizontal: 10, backgroundColor: "#FFFF", borderRadius: 8, elevation: 2 },
  backText: { fontSize: 16, fontWeight: "bold", color: "#660005" },
});