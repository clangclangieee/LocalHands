// ===================================
// FILE: app/admin/posts.jsx
// ===================================
import React, { useEffect, useState, useRef } from "react";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Posts() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Chores");
  const [chores, setChores] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const slideAnim = useRef(new Animated.Value(0)).current;

  // Tab switching animation
  const switchTab = (tab) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === "Chores" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  };

  const bubbleLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "50%"],
  });

  // Check if boost is active
  const isBoostActive = (item) => {
    if (!item.is_boosted) return false;
    if (!item.boosted_until) return true;
    return new Date(item.boosted_until) > new Date();
  };

  // Fetch Chores (Tasks)
  const fetchChores = async () => {
    try {
      const { data, error } = await supabase
        .from("chores")
        .select("*, profiles!chores_user_id_fkey!left(name)")
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        // Fallback query if standard left join fails
        const fallback = await supabase
          .from("chores")
          .select("*, profiles(name)")
          .order("is_boosted", { ascending: false })
          .order("created_at", { ascending: false });

        if (!fallback.error && fallback.data) {
          setChores(fallback.data.map(item => ({
            ...item,
            posterName: item.profiles?.name || "Unknown User"
          })));
          return;
        }
        throw error;
      }

      if (data) {
        setChores(data.map(item => ({
          ...item,
          posterName: item.profiles?.name || "Unknown User"
        })));
      }
    } catch (err) {
      console.error("Failed to load admin chores:", err.message);
    }
  };

  // Fetch Applicants (Helpers)
  const fetchApplicants = async () => {
    try {
      const { data, error } = await supabase
        .from("applicants")
        .select("*, profiles!applicants_user_id_fkey!left(name)")
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        const fallback = await supabase
          .from("applicants")
          .select("*, profiles(name)")
          .order("is_boosted", { ascending: false })
          .order("created_at", { ascending: false });

        if (!fallback.error && fallback.data) {
          setApplicants(fallback.data.map(item => ({
            ...item,
            posterName: item.full_name || item.profiles?.name || "Applicant"
          })));
          return;
        }
        throw error;
      }

      if (data) {
        setApplicants(data.map(item => ({
          ...item,
          posterName: item.full_name || item.profiles?.name || "Applicant"
        })));
      }
    } catch (err) {
      console.error("Failed to load admin applicants:", err.message);
    }
  };

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([fetchChores(), fetchApplicants()]);
    setLoading(false);
  };

  useEffect(() => {
    loadAllData();

    // Realtime subscriptions
    const choresChannel = supabase
      .channel("admin_chores_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => fetchChores())
      .subscribe();

    const applicantsChannel = supabase
      .channel("admin_applicants_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "applicants" }, () => fetchApplicants())
      .subscribe();

    return () => {
      supabase.removeChannel(choresChannel);
      supabase.removeChannel(applicantsChannel);
    };
  }, []);

  // Unboost / Stop Boost handler
  const removeBoost = async (id, type) => {
    const tableName = type === "Chore" ? "chores" : "applicants";

    const executeUnboost = async () => {
      try {
        const { error } = await supabase
          .from(tableName)
          .update({ is_boosted: false, boosted_until: null })
          .eq("id", id);

        if (error) {
          if (Platform.OS === 'web') alert("Database Error: " + error.message);
          else Alert.alert("Database Error", error.message);
          return;
        }

        if (type === "Chore") {
          setChores((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, is_boosted: false, boosted_until: null } : item
            )
          );
        } else {
          setApplicants((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, is_boosted: false, boosted_until: null } : item
            )
          );
        }

        if (Platform.OS === 'web') alert(`Boost stopped successfully.`);
        else Alert.alert("Success", `Boost stopped successfully.`);
      } catch (err) {
        if (Platform.OS === 'web') alert("App Error: " + err.message);
        else Alert.alert("App Error", err.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm(`Are you sure you want to stop the boost for this ${type.toLowerCase()}?`);
      if (confirmWeb) executeUnboost();
    } else {
      Alert.alert(
        `Stop Boost`,
        `Are you sure you want to stop the boost for this ${type.toLowerCase()}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Stop Boost", style: "destructive", onPress: executeUnboost }
        ]
      );
    }
  };

  // Delete handler for Chores or Applicants
  const deleteItem = async (id, type) => {
    if (!id) {
      const msg = "Item ID is missing.";
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert("Error", msg);
      return;
    }

    const tableName = type === "Chore" ? "chores" : "applicants";

    const executeDeletion = async () => {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq("id", id);

        if (error) {
          if (Platform.OS === 'web') alert("Database Error: " + error.message);
          else Alert.alert("Database Error", error.message);
          return;
        }

        if (type === "Chore") {
          setChores((prev) => prev.filter((item) => item.id !== id));
        } else {
          setApplicants((prev) => prev.filter((item) => item.id !== id));
        }

        if (Platform.OS === 'web') alert(`${type} deleted successfully.`);
        else Alert.alert("Success", `${type} deleted successfully.`);
      } catch (err) {
        if (Platform.OS === 'web') alert("App Error: " + err.message);
        else Alert.alert("App Error", err.message);
      }
    };

    if (Platform.OS === 'web') {
      const confirmWeb = window.confirm(`Are you sure you want to permanently delete this ${type.toLowerCase()}?`);
      if (confirmWeb) executeDeletion();
    } else {
      Alert.alert(
        `Delete ${type}`,
        `Are you sure you want to permanently delete this ${type.toLowerCase()}?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: executeDeletion }
        ]
      );
    }
  };

  // Filter lists based on search query
  const filteredChores = chores.filter((item) =>
    `${item.category} ${item.description} ${item.posterName} ${item.location}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredApplicants = applicants.filter((item) =>
    `${item.skills} ${item.experience} ${item.posterName} ${item.contact_info}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Manage Posts</Text>
        <View style={{ width: 70 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Floating Pill Switcher */}
        <View style={styles.pillContainer}>
          <Animated.View style={[styles.pillBubble, { left: bubbleLeft }]} />

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Chores")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === "Chores" && styles.pillTextActive]}>
              Chores ({chores.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Applicants")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === "Applicants" && styles.pillTextActive]}>
              Helpers ({applicants.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <TextInput
          style={styles.search}
          placeholder={activeTab === "Chores" ? "Search chores by category, user..." : "Search helpers by skills, user..."}
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#DF8F9C" />
          </View>
        ) : activeTab === "Chores" ? (
          /* Chores List */
          filteredChores.length === 0 ? (
            <Text style={styles.emptyText}>No chore posts found.</Text>
          ) : (
            filteredChores.map((item) => {
              const boosted = isBoostActive(item);

              return (
                <View key={item.id} style={[styles.card, boosted && styles.urgentCard]}>
                  {boosted && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>🚨 URGENT / BOOSTED</Text>
                    </View>
                  )}

                  <Text style={styles.title}>{item.category || "No Category"}</Text>
                  <Text style={styles.desc}>{item.description || "No Description"}</Text>
                  {item.location && <Text style={styles.location}>📍 {item.location}</Text>}
                  <Text style={styles.meta}>Posted by: {item.posterName}</Text>
                  <Text style={styles.money}>₱{item.budget || 0}</Text>

                  <View style={styles.actionRow}>
                    {boosted && (
                      <TouchableOpacity
                        style={styles.unboostBtn}
                        onPress={() => removeBoost(item.id, "Chore")}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.unboostBtnText}>⚡ Stop Boost</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.deleteBtn, boosted && { flex: 1, marginTop: 0 }]}
                      onPress={() => deleteItem(item.id, "Chore")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.btnText}>Delete Chore</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          /* Applicants / Helpers List */
          filteredApplicants.length === 0 ? (
            <Text style={styles.emptyText}>No helper applications found.</Text>
          ) : (
            filteredApplicants.map((item) => {
              const boosted = isBoostActive(item);

              return (
                <View key={item.id} style={[styles.card, boosted && styles.boostedCard]}>
                  {boosted && (
                    <View style={styles.boostBadge}>
                      <Text style={styles.boostBadgeText}>⚡ FEATURED HELPER / BOOSTED</Text>
                    </View>
                  )}

                  <Text style={styles.title}>🛠 Skills: {item.skills || "N/A"}</Text>
                  <Text style={styles.desc}>📝 {item.experience || "No details provided"}</Text>
                  {item.contact_info && <Text style={styles.contact}>📞 {item.contact_info}</Text>}
                  <Text style={styles.meta}>Applicant: {item.posterName}</Text>

                  <View style={styles.actionRow}>
                    {boosted && (
                      <TouchableOpacity
                        style={styles.unboostBtn}
                        onPress={() => removeBoost(item.id, "Applicant")}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.unboostBtnText}>⚡ Stop Boost</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.deleteBtn, boosted && { flex: 1, marginTop: 0 }]}
                      onPress={() => deleteItem(item.id, "Applicant")}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.btnText}>Delete Helper Application</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  centerContainer: { paddingVertical: 40, alignItems: "center" },
  topBar: {
    paddingTop: 50,
    paddingHorizontal: 18,
    paddingBottom: 15,
    backgroundColor: "#1E293B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    zIndex: 10,
  },
  backBtn: { width: 70 },
  backText: { color: "#DF8F9C", fontSize: 16, fontWeight: "bold" },
  header: { color: "#fff", fontSize: 20, fontWeight: "bold", textAlign: "center", flex: 1 },
  scrollContent: { padding: 18 },
  
  // Floating Tab Switcher
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#1E293B",
    borderRadius: 30,
    paddingVertical: 4,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    position: "relative",
    height: 48,
  },
  pillBubble: {
    position: "absolute",
    top: 4,
    width: "48%",
    height: 40,
    borderRadius: 25,
    backgroundColor: "#DF8F9C",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  pillButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    zIndex: 1,
  },
  pillText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#94A3B8",
  },
  pillTextActive: {
    color: "#660005",
    fontWeight: "bold",
  },

  search: {
    backgroundColor: "#1E293B",
    color: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  card: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  urgentCard: {
    borderWidth: 2,
    borderColor: "#FF4444",
  },
  urgentBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FF4444",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  urgentBadgeText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 11,
  },
  boostedCard: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  boostBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  boostBadgeText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 11,
  },
  title: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  desc: { color: "#CBD5E1", marginTop: 6, fontSize: 14 },
  location: { color: "#94A3B8", marginTop: 4, fontStyle: "italic", fontSize: 13 },
  contact: { color: "#94A3B8", marginTop: 4, fontSize: 13 },
  meta: { color: "#DF8F9C", marginTop: 6, fontSize: 13, fontWeight: "600" },
  money: { color: "#22C55E", marginTop: 6, fontWeight: "bold", fontSize: 16 },
  
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  deleteBtn: {
    backgroundColor: "#FF4444",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#FF4444",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  unboostBtn: {
    flex: 1,
    backgroundColor: "#EAB308",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  unboostBtnText: {
    color: "#000000",
    fontWeight: "bold",
  },
  btnText: { color: "#fff", textAlign: "center", fontWeight: "bold" },
  emptyText: { color: "#94A3B8", textAlign: "center", marginTop: 30, fontSize: 15 }
});