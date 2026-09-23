import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CategoryView() {
  const { type } = useLocalSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("Chores"); // "Chores" | "Applicants"
  const slideAnim = useState(new Animated.Value(0))[0];

  const [tasks, setTasks] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();

    if (!type) return;

    // Fetch initial chores with profile info (Boosted first)
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from("chores")
        .select(`
          *,
          profiles:user_id ( name, profile_pic )
        `)
        .eq("category", type)
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching category tasks:", error);
      } else if (data) {
        setTasks(data);
      }
    };

    // Fetch initial applicants matching current category in their skills (Boosted first)
    const fetchApplicants = async () => {
      const { data, error } = await supabase
        .from("applicants")
        .select(`
          *,
          profiles:user_id ( name, profile_pic )
        `)
        .ilike("skills", `%${type}%`)
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching category applicants:", error);
      } else if (data) {
        setApplicants(data);
      }
    };

    fetchTasks();
    fetchApplicants();

    // Set up realtime updates for chores
    const choresChannel = supabase
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
            fetchTasks();
          }
        }
      )
      .subscribe();

    // Set up realtime updates for applicants
    const applicantsChannel = supabase
      .channel(`applicants-category-${type}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "applicants" },
        () => {
          fetchApplicants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(choresChannel);
      supabase.removeChannel(applicantsChannel);
    };
  }, [type]);

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

  const openProfile = (userId) => {
    router.push(`/profile/${userId}`);
  };

  const handleBoostClick = (item) => {
    router.push({
      pathname: "/checkout",
      params: { itemId: item.id, itemType: activeTab === "Chores" ? "chore" : "applicant" },
    });
  };

  const isBoostActive = (item) => {
    if (!item.is_boosted) return false;
    if (!item.boosted_until) return true;
    return new Date(item.boosted_until) > new Date();
  };

  const toggleAcceptTask = async (choreId, currentAcceptedBy) => {
    if (!currentUserId) return Alert.alert("Error", "Login to accept tasks");

    const newAcceptedBy = currentAcceptedBy === currentUserId ? null : currentUserId;

    if (currentAcceptedBy && currentAcceptedBy !== currentUserId) {
      return Alert.alert("Task Already Accepted");
    }

    setTasks((prev) =>
      prev.map((task) =>
        task.id === choreId ? { ...task, accepted_by: newAcceptedBy } : task
      )
    );

    try {
      const { error } = await supabase
        .from("chores")
        .update({ accepted_by: newAcceptedBy })
        .eq("id", choreId);

      if (error) throw error;
    } catch (e) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === choreId ? { ...task, accepted_by: currentAcceptedBy } : task
        )
      );
      Alert.alert("Error", e.message);
    }
  };

  const bubbleLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "50%"],
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="always">
        
        {/* Top Header Section */}
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.header}>{type}</Text>

        {/* Animated Pill Switcher */}
        <View style={styles.pillContainer}>
          <Animated.View style={[styles.pillBubble, { left: bubbleLeft }]} />

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Chores")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === "Chores" && styles.pillTextActive]}>
              Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Applicants")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === "Applicants" && styles.pillTextActive]}>
              Helpers
            </Text>
          </TouchableOpacity>
        </View>

        {/* CHORES TAB */}
        {activeTab === "Chores" && (
          tasks.length === 0 ? (
            <Text style={styles.empty}>No tasks available in this category.</Text>
          ) : (
            tasks.map((item) => {
              let buttonColor = "#660005";
              let textColor = "#FFFFFF";
              let buttonText = "Accept Task";
              let disabled = false;

              if (item.accepted_by === currentUserId) {
                buttonColor = "#FFFFFF";
                textColor = "#660005";
                buttonText = "Unaccept Task";
              } else if (item.accepted_by) {
                buttonColor = "#E0E0E0";
                textColor = "#888888";
                buttonText = "Already Accepted";
                disabled = true;
              }

              const posterName = item.profiles?.name || "User";
              const posterPic = item.profiles?.profile_pic || null;
              const boosted = isBoostActive(item);
              const isOwner = currentUserId === item.user_id;

              return (
                <View key={item.id} style={[styles.card, boosted && styles.urgentCard]}>
                  {boosted && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>🚨 URGENT</Text>
                    </View>
                  )}

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

                  <Text style={styles.cardTitle}>{item.category}</Text>
                  <Text style={styles.cardDescription}>{item.description}</Text>
                  <Text style={styles.pay}>₱{item.budget}</Text>

                  {item.location && (
                    <Text style={styles.location}>📍 {item.location}</Text>
                  )}

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: buttonColor }]}
                    onPress={() => toggleAcceptTask(item.id, item.accepted_by)}
                    disabled={disabled}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.actionBtnText, { color: textColor }]}>{buttonText}</Text>
                  </TouchableOpacity>

                  {isOwner && !boosted && (
                    <TouchableOpacity
                      style={styles.boostBtn}
                      onPress={() => handleBoostClick(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.boostBtnText}>⚡ Mark as URGENT (Boost to Top)</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )
        )}

        {/* APPLICANTS TAB */}
        {activeTab === "Applicants" && (
          applicants.length === 0 ? (
            <Text style={styles.empty}>No helpers listed for this category yet.</Text>
          ) : (
            applicants.map((item) => {
              const posterName = item.profiles?.name || item.full_name || "Applicant";
              const posterPic = item.profiles?.profile_pic || null;
              const boosted = isBoostActive(item);
              const isOwner = currentUserId === item.user_id;

              return (
                <View key={item.id} style={[styles.card, boosted && styles.boostedCard]}>
                  {boosted && (
                    <View style={styles.boostBadge}>
                      <Text style={styles.boostBadgeText}>⚡ FEATURED HELPER</Text>
                    </View>
                  )}

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

                  <Text style={styles.cardTitle}>Skills: {item.skills}</Text>
                  <Text style={styles.cardDescription}>Experience: {item.experience}</Text>
                  <Text style={styles.contactText}>📞 Contact: {item.contact_info}</Text>

                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openProfile(item.user_id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.actionBtnText}>View Profile</Text>
                  </TouchableOpacity>

                  {isOwner && !boosted && (
                    <TouchableOpacity
                      style={styles.boostBtn}
                      onPress={() => handleBoostClick(item)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.boostBtnText}>⚡ Boost Profile to Top</Text>
                    </TouchableOpacity>
                  )}
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
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  contentContainer: { padding: 20, paddingTop: 40 },

  backBtn: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    marginBottom: 10,
  },
  backText: { fontSize: 14, fontWeight: "bold", color: "#660005" },

  header: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 20, color: "#333333" },

  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    paddingVertical: 4,
    marginBottom: 25,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    position: "relative",
    height: 50,
  },
  pillBubble: {
    position: "absolute",
    top: 4,
    width: "48%",
    height: 42,
    borderRadius: 25,
    backgroundColor: "#DF8F9C",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
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
    fontSize: 16,
    color: "#888888",
  },
  pillTextActive: {
    color: "#660005",
    fontWeight: "bold",
  },

  empty: { textAlign: "center", marginTop: 40, color: "#888888", fontSize: 15 },

  card: {
    backgroundColor: "#DF8F9C",
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    position: "relative",
  },
  urgentCard: {
    borderWidth: 2,
    borderColor: "#FF0000",
    shadowColor: "#FF0000",
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  urgentBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FF0000",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  urgentBadgeText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  boostedCard: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  boostBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#FFD700",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  boostBadgeText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 11,
  },
  posterHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  posterPic: { width: 42, height: 42, borderRadius: 21, marginRight: 12 },
  picFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  realName: { fontWeight: "bold", color: "#660005", fontSize: 16 },

  cardTitle: { fontSize: 17, fontWeight: "bold", color: "#660005", marginBottom: 6 },
  cardDescription: { fontSize: 14, color: "#660005", lineHeight: 20, fontWeight: "500" },
  pay: { fontWeight: "bold", color: "#2E7D32", marginTop: 8, fontSize: 16 },
  location: { marginTop: 6, color: "#660005", fontStyle: "italic", fontSize: 13 },
  contactText: { marginTop: 8, fontWeight: "600", color: "#660005", fontSize: 14 },

  actionBtn: {
    backgroundColor: "#660005",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  actionBtnText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 15 },
  boostBtn: {
    marginTop: 10,
    backgroundColor: "#FFD700",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  boostBtnText: {
    color: "#000000",
    fontWeight: "bold",
    fontSize: 13,
  },
});