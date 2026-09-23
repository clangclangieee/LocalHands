import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../supabaseConfig";
import { useRouter, useFocusEffect } from "expo-router";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Index() {
  const [activeTab, setActiveTab] = useState("Chores");
  const [choresWithUser, setChoresWithUser] = useState([]);
  const [applicantsWithUser, setApplicantsWithUser] = useState([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;

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

  const fetchChores = async () => {
    try {
      const { data, error } = await supabase
        .from("chores")
        .select(`
          *,
          profiles!chores_user_id_fkey!left (
            name,
            phone,
            profile_pic
          )
        `)
        .neq("status", "completed")
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChoresWithUser(data || []);
    } catch (err) {
      console.error("Error fetching chores:", err.message);
    }
  };

  const fetchApplicants = async () => {
    try {
      const { data, error } = await supabase
        .from("applicants")
        .select(`
          *,
          profiles!applicants_user_id_fkey!left (
            name,
            phone,
            profile_pic
          )
        `)
        .order("is_boosted", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplicantsWithUser(data || []);
    } catch (err) {
      console.error("Error fetching applicants:", err.message);
    }
  };

  // Auth User Fetching
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUser(data.user);
    });
  }, []);

  // Fetch data on focus
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      setLoading(true);

      Promise.all([fetchChores(), fetchApplicants()]).finally(() => {
        if (isMounted) setLoading(false);
      });

      return () => {
        isMounted = false;
      };
    }, [])
  );

  // Real-time Subscriptions Lifecycle
  useEffect(() => {
    const choresChannel = supabase
      .channel("public:chores")
      .on("postgres_changes", { event: "*", schema: "public", table: "chores" }, () => fetchChores())
      .subscribe();

    const applicantsChannel = supabase
      .channel("public:applicants")
      .on("postgres_changes", { event: "*", schema: "public", table: "applicants" }, () => fetchApplicants())
      .subscribe();

    return () => {
      supabase.removeChannel(choresChannel);
      supabase.removeChannel(applicantsChannel);
    };
  }, []);

  const openProfile = (userId) => router.push(`/profile/${userId}`);

  const handleBoostClick = (item) => {
    router.push({
      pathname: "/checkout",
      params: { itemId: item.id, itemType: activeTab === "Chores" ? "chore" : "applicant" },
    });
  };

  const toggleAcceptTask = async (choreId, currentAcceptedBy) => {
    if (!currentUser) return Alert.alert("Error", "Login to accept tasks");

    if (currentAcceptedBy && currentAcceptedBy !== currentUser.id) {
      return Alert.alert("Task Already Accepted");
    }

    const newAcceptedBy = currentAcceptedBy === currentUser.id ? null : currentUser.id;

    // Optimistic state update
    setChoresWithUser((prev) =>
      prev.map((chore) =>
        chore.id === choreId ? { ...chore, accepted_by: newAcceptedBy } : chore
      )
    );

    try {
      const { error } = await supabase
        .from("chores")
        .update({ accepted_by: newAcceptedBy })
        .eq("id", choreId);

      if (error) throw error;
    } catch (e) {
      fetchChores(); // Revert on failure
      Alert.alert("Error", e.message);
    }
  };

  // Helper to check if a boost is currently active
  const isBoostActive = (item) => {
    if (!item.is_boosted) return false;
    if (!item.boosted_until) return true; // Fallback if timestamp not provided
    return new Date(item.boosted_until) > new Date();
  };

  const filteredChores = choresWithUser.filter((chore) => {
    const matchesLocation = locationFilter
      ? chore.location?.toLowerCase().includes(locationFilter.toLowerCase())
      : true;
    const parsedBudget = parseFloat(budgetFilter);
    const matchesBudget = !isNaN(parsedBudget) ? chore.budget <= parsedBudget : true;
    return matchesLocation && matchesBudget;
  });

  const bubbleLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "50%"],
  });

  const renderChoreItem = ({ item }) => {
    let buttonColor = "#660005";
    let textColor = "#DF8F9C";
    let buttonText = "Accept Task";
    let disabled = false;

    if (item.accepted_by === currentUser?.id) {
      buttonColor = "#FFFFFF";
      textColor = "#660005";
      buttonText = "Unaccept Task";
    } else if (item.accepted_by) {
      buttonColor = "#FFFFFF";
      textColor = "#660005";
      buttonText = "Accepted by Someone";
      disabled = true;
    }

    const isOwner = currentUser?.id === item.user_id;
    const boosted = isBoostActive(item);

    return (
      <View style={[styles.card, boosted && styles.urgentCard]}>
        {boosted && (
          <View style={styles.urgentBadge}>
            <Text style={styles.urgentBadgeText}>🚨 URGENT</Text>
          </View>
        )}

        <View style={styles.posterHeader}>
          <TouchableOpacity onPress={() => openProfile(item.user_id)}>
            {item.profiles?.profile_pic ? (
              <Image source={{ uri: item.profiles.profile_pic }} style={styles.posterPic} />
            ) : (
              <View style={styles.picFallback}><Text>👤</Text></View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => openProfile(item.user_id)}>
              <Text style={styles.realName}>{item.profiles?.name || "User"}</Text>
            </TouchableOpacity>
            {item.profiles?.phone && (
              <Text style={styles.posterPhone}>📞 {item.profiles.phone}</Text>
            )}
          </View>
        </View>

        <Text style={styles.title}>{item.category}</Text>
        <Text style={styles.bodyText}>{item.description}</Text>
        <Text style={styles.pay}>💰 ₱{item.budget}</Text>
        {item.location && <Text style={styles.location}>📍 {item.location}</Text>}

        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: buttonColor }]}
          onPress={() => toggleAcceptTask(item.id, item.accepted_by)}
          disabled={disabled}
          activeOpacity={0.85}
        >
          <Text style={{ fontWeight: "bold", color: textColor }}>{buttonText}</Text>
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
  };

  const renderApplicantItem = ({ item }) => {
    const boosted = isBoostActive(item);

    return (
      <View style={[styles.card, boosted && styles.boostedCard]}>
        {boosted && (
          <View style={styles.boostBadge}>
            <Text style={styles.boostBadgeText}>⚡ FEATURED HELPER</Text>
          </View>
        )}

        <View style={styles.posterHeader}>
          <TouchableOpacity onPress={() => openProfile(item.user_id)}>
            {item.profiles?.profile_pic ? (
              <Image source={{ uri: item.profiles.profile_pic }} style={styles.posterPic} />
            ) : (
              <View style={styles.picFallback}><Text>👤</Text></View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <TouchableOpacity onPress={() => openProfile(item.user_id)}>
              <Text style={styles.realName}>{item.full_name || item.profiles?.name || "Applicant"}</Text>
            </TouchableOpacity>
            {item.contact_info && (
              <Text style={styles.posterPhone}>📞 {item.contact_info}</Text>
            )}
          </View>
        </View>

        <Text style={styles.title}>🛠 Skills: {item.skills}</Text>
        <Text style={styles.bodyText}>📝 {item.experience}</Text>

        <TouchableOpacity
          style={styles.contactBtn}
          onPress={() => openProfile(item.user_id)}
          activeOpacity={0.85}
        >
          <Text style={{ fontWeight: "bold", color: "#FFFFFF" }}>VIEW PROFILE / CONTACT</Text>
        </TouchableOpacity>

        {currentUser?.id === item.user_id && !boosted && (
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
  };

  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <View style={styles.pillContainer}>
          <Animated.View style={[styles.pillBubble, { left: bubbleLeft }]} />

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Chores")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === "Chores" && styles.pillTextActive]}>
              Chores
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Applicants")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, activeTab === "Applicants" && styles.pillTextActive]}>
              Applicants
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "Chores" && (
          <View style={styles.filters}>
            <TextInput
              style={styles.filterInput}
              placeholder="Filter by location"
              placeholderTextColor="#8C3A48"
              value={locationFilter}
              onChangeText={setLocationFilter}
            />
            <TextInput
              style={styles.filterInput}
              placeholder="Filter by budget (₱)"
              placeholderTextColor="#8C3A48"
              keyboardType="numeric"
              value={budgetFilter}
              onChangeText={setBudgetFilter}
            />
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#660005" />
        </View>
      ) : activeTab === "Chores" ? (
        <FlatList
          data={filteredChores}
          renderItem={renderChoreItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No chores available.</Text>}
        />
      ) : (
        <FlatList
          data={applicantsWithUser}
          renderItem={renderApplicantItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>No helper applications posted yet.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  stickyHeader: {
    paddingTop: 50,
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: "#FFFFFF",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 30,
    paddingVertical: 4,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
    shadowOpacity: 0.12,
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
    fontSize: 15,
    color: "#888888",
  },
  pillTextActive: {
    color: "#660005",
    fontWeight: "bold",
  },
  filters: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  filterInput: {
    flex: 1,
    backgroundColor: "#DF8F9C",
    padding: 10,
    borderRadius: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    color: "#660005",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listContent: { padding: 15 },
  emptyText: { textAlign: "center", color: "#888888", marginTop: 20, fontSize: 14 },
  card: {
    backgroundColor: "#DF8F9C",
    padding: 16,
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
  posterPic: { width: 42, height: 42, borderRadius: 21, marginRight: 10 },
  picFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  realName: { fontWeight: "bold", color: "#660005", fontSize: 15 },
  posterPhone: { fontSize: 12, color: "#FFFFFF", marginTop: 2 },
  title: { fontSize: 18, fontWeight: "bold", color: "#660005", marginBottom: 4 },
  bodyText: { color: "#333333", fontSize: 14, marginVertical: 4 },
  pay: { fontWeight: "bold", color: "#1b5e20", marginTop: 6, fontSize: 16 },
  location: { color: "#444444", marginTop: 4, fontStyle: "italic" },
  acceptBtn: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  contactBtn: {
    backgroundColor: "#660005",
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#660005",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  boostBtn: {
    marginTop: 8,
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