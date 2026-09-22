import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "../../supabaseConfig";

const categories = [
  { id: "cleaning", name: "Cleaning", icon: require("../../assets/icons/cleaning.png") },
  { id: "repairs", name: "Small Repairs", icon: require("../../assets/icons/repairs.png") },
  { id: "groceries", name: "Groceries", icon: require("../../assets/icons/groceries.png") },
  { id: "errands", name: "Errands", icon: require("../../assets/icons/errands.png") },
  { id: "yard", name: "Yard Work", icon: require("../../assets/icons/yard.png") },
  { id: "moving", name: "Moving", icon: require("../../assets/icons/moving.png") },
  { id: "pets", name: "Pet Sit", icon: require("../../assets/icons/pets.png") },
  { id: "tech", name: "Tech Help", icon: require("../../assets/icons/tech.png") },
  { id: "laundry", name: "Laundry", icon: require("../../assets/icons/laundry.png") },
  { id: "other", name: "Other Tasks", icon: require("../../assets/icons/other.png") },
];

export default function Search() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*");
        if (data) setUsers(data);
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };

    fetchUsers();
  }, []);

  const openProfile = (userId) => {
    router.push(`/profile/${userId}`);
  };

  const filteredCategories = categories.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  const filteredUsers = users.filter((item) =>
    (item.name ?? "").toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Search categories, name..."
          placeholderTextColor="#888888"
          value={query}
          onChangeText={setQuery}
        />
        <Ionicons name="search" size={20} color="#660005" />
      </View>

      <FlatList
        data={filteredCategories}
        numColumns={3}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        keyboardShouldPersistTaps="always"
        ListFooterComponent={
          <>
            {query.length > 0 && filteredUsers.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.sectionTitle}>Users</Text>
                {filteredUsers.map((item) => (
                  <View key={item.id} style={styles.userCard}>
                    <View style={styles.posterHeader}>
                      <TouchableOpacity onPress={() => openProfile(item.id)} activeOpacity={0.8}>
                        {item.profile_pic ? (
                          <Image source={{ uri: item.profile_pic }} style={styles.posterPic} />
                        ) : (
                          <View style={styles.picFallback}>
                            <Text>👤</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openProfile(item.id)} activeOpacity={0.8}>
                        <Text style={styles.userName}>
                          {item.name || "No Name"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/category/[type]",
                params: { type: item.name },
              })
            }
            style={({ pressed }) => [
              styles.card,
              pressed && styles.pressed,
            ]}
          >
            <View style={styles.iconWrapper}>
              <Image source={item.icon} style={styles.icon} />
            </View>
            <Text style={styles.label} numberOfLines={2}>
              {item.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },
  
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  input: { flex: 1, fontSize: 16, marginRight: 8, color: "#333333" },

  row: { justifyContent: "center" },

  card: {
    backgroundColor: "#DF8F9C",
    margin: 6,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    height: 110,
    width: 110,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pressed: { transform: [{ scale: 0.95 }], opacity: 0.85 },
  iconWrapper: { width: 40, height: 40, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  icon: { width: 35, height: 35, resizeMode: "contain" },
  label: { fontSize: 12, fontWeight: "bold", textAlign: "center", color: "#660005" },

  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, marginLeft: 8, color: "#333333" },
  userCard: {
    backgroundColor: "#DF8F9C",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  posterHeader: { flexDirection: "row", alignItems: "center" },
  posterPic: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  picFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  userName: { fontWeight: "bold", color: "#660005", fontSize: 14 },
});