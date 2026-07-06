import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  Platform
} from "react-native";
import { supabase } from "../../supabaseConfig";
import { router } from "expo-router";
import { Dropdown } from 'react-native-element-dropdown';

const CATEGORIES = [
  { label: "Cleaning", value: "Cleaning" },
  { label: "Small Repairs", value: "Small Repairs" },
  { label: "Groceries", value: "Groceries" },
  { label: "Errands", value: "Errands" },
  { label: "Yard Work", value: "Yard Work" },
  { label: "Moving", value: "Moving" },
  { label: "Pet Sit", value: "Pet Sit" },
  { label: "Tech Help", value: "Tech Help" },
  { label: "Laundry", value: "Laundry" },
  { label: "Other Tasks", value: "Other Tasks" },
];

export default function CreateTask() {
  const [cat, setCat] = useState(null);
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");

  const handlePost = async () => {
    if (!cat || !desc || !budget || !location) {
      Alert.alert("Missing Info", "Please select a category, description, budget, and location.");
      return;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User session not found. Please log in again.");

      const { error } = await supabase.from("chores").insert([
        {
          category: cat,
          description: desc,
          budget: parseFloat(budget) || 0,
          location: location,
          user_id: user.id,
        },
      ]);

      if (error) throw error;

      Alert.alert("Success ✨", "Task is now live!");
      setCat(null);
      setDesc("");
      setBudget("");
      setLocation("");
      router.replace("/tasks");
    } catch (e) {
      Alert.alert("Post Failed", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.form} 
        keyboardShouldPersistTaps="always"
      >
        <Text style={styles.header}>Add a Chore</Text>

        <View style={styles.dropdownWrapper}>
          {Platform.OS === "web" ? (
            <select
              style={styles.webSelect}
              value={cat || ""}
              onChange={(e) => setCat(e.target.value || null)}
            >
              <option value="" disabled>Select Category</option>
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          ) : (
            <Dropdown
              style={styles.dropdown}
              placeholderStyle={styles.placeholderStyle}
              selectedTextStyle={styles.selectedTextStyle}
              data={CATEGORIES}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Category"
              value={cat}
              onChange={item => setCat(item.value)}
            />
          )}
        </View>

        <TextInput
          style={[styles.input, { height: 100 }]}
          placeholder="What needs to be done?"
          multiline
          value={desc}
          onChangeText={setDesc}
        />
        <TextInput
          style={styles.input}
          placeholder="Budget (₱)"
          keyboardType="numeric"
          value={budget}
          onChangeText={setBudget}
        />
        <TextInput
          style={styles.input}
          placeholder="Location"
          value={location}
          onChangeText={setLocation}
        />

        <TouchableOpacity style={styles.button} onPress={handlePost}>
          <Text style={styles.buttonText}>POST TASK</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFF" },
  form: { padding: 20, paddingTop: 40 },
  header: { fontSize: 28, fontWeight: "bold", textAlign: "center", marginBottom: 20 },
  dropdownWrapper: { marginBottom: 15 },
  dropdown: { 
    backgroundColor: "#DF8F9C", 
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: "#DDD" 
  },
  placeholderStyle: { color: "#660005" },
  selectedTextStyle: { color: "#660005" },
  webSelect: {
    width: "100%",
    height: 48,
    backgroundColor: "#DF8F9C",
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 0,
    fontSize: 15,
  },
  input: { backgroundColor: "#DF8F9C", padding: 12, borderRadius: 10, marginBottom: 15, textAlignVertical: "top" },
  button: { backgroundColor: "#660005", padding: 18, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { fontWeight: "bold", fontSize: 18, color: "#FFFF" },
});