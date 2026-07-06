import React, { useState, useCallback, useRef } from "react";
import { View, Text, ScrollView, Image, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { supabase } from "../../supabaseConfig";
import { useRouter, useFocusEffect } from "expo-router";

export default function Index() {
  const [choresWithUser, setChoresWithUser] = useState([]);
  const [locationFilter, setLocationFilter] = useState("");
  const [budgetFilter, setBudgetFilter] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const router = useRouter();
  
  // Use a ref to keep track of the channel so we don't duplicate it
  const channelRef = useRef(null);

  const fetchChores = async () => {
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
      // Updated to filter by status instead of the boolean 'completed'
      .neq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch Chores Error:", error.message);
    } else {
      setChoresWithUser(data || []);
    }
  };

  useFocusEffect(
    useCallback(() => {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setCurrentUser(data.user);
      });

      fetchChores();

      // Only create the channel if it doesn't already exist
      if (!channelRef.current) {
        channelRef.current = supabase
          .channel("public:chores")
          .on(
            "postgres_changes", 
            { event: "*", schema: "public", table: "chores" }, 
            () => { fetchChores(); }
          )
          .subscribe();
      }

      // Cleanup when the screen loses focus
      return () => {
        if (channelRef.current) {
          supabase.removeChannel(channelRef.current);
          channelRef.current = null; // Reset the ref so it can be re-created on next focus
        }
      };
    }, [])
  );

  const openProfile = (userId) => {
    router.push(`/profile/${userId}`);
  };

  const toggleAcceptTask = async (choreId, currentAcceptedBy) => {
    try {
      if (!currentUser) return Alert.alert("Error", "Login to accept tasks");

      if (currentAcceptedBy === currentUser.id) {
        const { error } = await supabase.from("chores").update({ accepted_by: null }).eq("id", choreId);
        if (error) throw error;
        Alert.alert("Task Unaccepted");
      } else if (!currentAcceptedBy) {
        const { error } = await supabase.from("chores").update({ accepted_by: currentUser.id }).eq("id", choreId);
        if (error) throw error;
        Alert.alert("Task Accepted!");
      } else {
        Alert.alert("Task Already Accepted");
      }
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const filteredChores = choresWithUser.filter((chore) => {
    const matchesLocation = locationFilter
      ? chore.location?.toLowerCase().includes(locationFilter.toLowerCase())
      : true;

    const matchesBudget = budgetFilter ? chore.budget <= parseFloat(budgetFilter) : true;
    return matchesLocation && matchesBudget;
  });

  return (
    <View style={styles.container}>
      <View style={styles.stickyHeader}>
        <Text style={styles.header}>Available Chores</Text>
        <View style={styles.filters}>
          <TextInput 
            style={styles.filterInput} 
            placeholder="Filter by location" 
            value={locationFilter} 
            onChangeText={setLocationFilter} 
          />
          <TextInput 
            style={styles.filterInput} 
            placeholder="Filter by budget (₱)" 
            keyboardType="numeric" 
            value={budgetFilter} 
            onChangeText={setBudgetFilter} 
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.listContent}>
        {filteredChores.map((item) => {
          let buttonColor = "#660005";
          let textColor = "#DF8F9C";
          let buttonText = "Accept Task";
          let disabled = false;

          if (item.accepted_by === currentUser?.id) {
            buttonColor = "#ffff";
            textColor = "#DF8F9C";
            buttonText = "Unaccept Task";
          } else if (item.accepted_by) {
            buttonColor = "#FFFF";
            textColor = "#660005";
            buttonText = "Accepted by Someone";
            disabled = true;
          }

          return (
            <View key={item.id} style={styles.card}>
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
              <Text>{item.description}</Text>
              <Text style={styles.pay}>💰 ₱{item.budget}</Text>
              {item.location && <Text style={styles.location}>📍 {item.location}</Text>}

              <TouchableOpacity
                style={[styles.acceptBtn, { backgroundColor: buttonColor }]}
                onPress={() => toggleAcceptTask(item.id, item.accepted_by)}
                disabled={disabled}
              >
                <Text style={{ fontWeight: "bold", color: textColor }}>{buttonText}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFF" },
  stickyHeader: { 
    paddingTop: 50, 
    paddingHorizontal: 15,
    paddingBottom: 10,
    backgroundColor: "#FFFF",
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#D1EAEA"
  },
  header: { fontSize: 26, fontWeight: "bold", marginVertical: 10, textAlign: "center" },
  filters: { flexDirection: "row", justifyContent: "space-between" },
  filterInput: { flex: 1, backgroundColor: "#DF8F9C", padding: 8, borderRadius: 8, marginHorizontal: 5, borderWidth: 1, borderColor: "#DDD" },
  listContent: { padding: 15 },
  card: { backgroundColor: "#DF8F9C", padding: 15, borderRadius: 12, marginBottom: 12, elevation: 3 },
  posterHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  posterPic: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  picFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#EEE", justifyContent: "center", alignItems: "center", marginRight: 10 },
  realName: { fontWeight: "bold", color: "#660005", fontSize: 14 },
  posterPhone: { fontSize: 11, color: "#FFFF", marginTop: 1 },
  title: { fontSize: 19, fontWeight: "bold", color: "#333" },
  pay: { fontWeight: "bold", color: "green", marginTop: 5, fontSize: 16 },
  location: { color: "#555", marginTop: 5, fontStyle: "italic" },
  acceptBtn: { marginTop: 10, padding: 10, borderRadius: 8, alignItems: "center" }
});