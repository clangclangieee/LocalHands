import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

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
  const router = useRouter();

  // Filters the grid icons as the user types
  const filtered = categories.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <TextInput
          style={styles.input}
          placeholder="Search categories..."
          value={query}
          onChangeText={setQuery}
        />
        <Ionicons name="search" size={20} color="#777" />
      </View>

      {/* Category Grid */}
      <FlatList
        data={filtered}
        numColumns={3}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <Pressable
            // 🔑 IMPORTANT: This pushes to the category filter screen 
            // We pass 'item.name' because that matches what you save in CreateTask
            onPress={() => router.push({
                pathname: "/category/[type]",
                params: { type: item.name }
            })}
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
  container: {
    flex: 1,
    backgroundColor: "#D4F0F0",
    padding: 20,
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 20,
    marginTop: 40,
  },
  input: {
    flex: 1,
    fontSize: 16,
    marginRight: 8,
  },
  row: {
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#F7AFC4",
    margin: 6,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    height: 110,
    width: 110,
    maxWidth: 110,
  },
  pressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  icon: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 10, // Adjusted for better spacing
  },
});