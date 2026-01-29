import React, { useState, useEffect } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, Text, ScrollView, Platform } from "react-native";
import DropDownPicker from "react-native-dropdown-picker";

export default function CreateTask() {
  const [choreOpen, setChoreOpen] = useState(false);
  const [choreValue, setChoreValue] = useState(null);
  const [choreItems, setChoreItems] = useState([
    { label: "Cleaning", value: "cleaning" },
    { label: "Small Repairs", value: "repairs" },
    { label: "Groceries", value: "groceries" },
    { label: "Errands", value: "errands" },
    { label: "Yard Work", value: "yard" },
    { label: "Moving", value: "moving" },
    { label: "Pet Sit", value: "pets" },
    { label: "Tech Help", value: "tech" },
    { label: "Laundry", value: "laundry" },
    { label: "Others", value: "other" },
  ]);

  const handlePost = () => {
    console.log("Task Posted:", { chore: choreValue });
    // Add your logic to submit task here
  };

  // Close dropdown when scrolling (optional, improves UX)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const listener = () => setChoreOpen(false);
    window.addEventListener("scroll", listener);
    return () => window.removeEventListener("scroll", listener);
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.form}>
          {/* Header */}
          <Text style={styles.header}>Add a Chore</Text>

          {/* Chore Dropdown */}
          <DropDownPicker
            open={choreOpen}
            value={choreValue}
            items={choreItems}
            setOpen={setChoreOpen}
            setValue={setChoreValue}
            setItems={setChoreItems}
            placeholder="Select Chore"
            style={styles.dropdown}
            containerStyle={{ marginBottom: 12 }}
            dropDownContainerStyle={styles.dropdownContainer}
          />

          {/* Inputs */}
          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Chore Description"
            placeholderTextColor="#aaa"
            multiline
          />
          <TextInput
            style={styles.input}
            placeholder="Salary (₱)"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="dd/mm/yyyy"
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={styles.input}
            placeholder="Optional: Address"
            placeholderTextColor="#aaa"
          />

          {/* Button */}
          <TouchableOpacity style={styles.button} onPress={handlePost}>
            <Text style={styles.buttonText}>POST</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#D4F0F0" 
  },
  scrollContainer: { 
    paddingBottom: 20 
  },
  form: { 
    padding: 20, 
    paddingTop: 40 
  },
  header: { fontSize: 28, fontWeight: "bold", marginBottom: 20, color: "#333", textAlign:"center", }, // header style
  dropdown: { backgroundColor: "#FFF", borderRadius: 10, borderColor: "#DDD", height: 50 },
  dropdownContainer: { backgroundColor: "#FFF", borderRadius: 10, borderColor: "#DDD" },
  input: { backgroundColor: "#FFF", padding: 12, borderRadius: 10, marginBottom: 12, fontStyle: "italic" },
  button: { backgroundColor: "#8FCACA", padding: 15, borderRadius: 12, alignItems: "center", marginTop: 10 },
  buttonText: { fontWeight: "bold", fontSize: 20 },
});
