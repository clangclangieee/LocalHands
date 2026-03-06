import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
} from "react-native";
import DropDownPicker from "react-native-dropdown-picker";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { router } from "expo-router";

export default function CreateTask() {
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState(null);
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");

  const handlePost = async () => {
    if (!cat || !desc || !budget || !location) {
      Alert.alert(
        "Missing Info",
        "Please select a category, description, budget, and location."
      );
      return;
    }
    try {
      await addDoc(collection(db, "chores"), {
        category: cat,
        description: desc,
        budget: budget,
        location: location,
        userId: auth.currentUser?.uid,
        userName: auth.currentUser?.email?.split("@")[0] || "User",
        createdAt: serverTimestamp(),
      });
      Alert.alert("Success ✨", "Task is now live!");

      // Clear all fields after posting
      setCat(null);
      setDesc("");
      setBudget("");
      setLocation("");
      setOpen(false);

      router.replace("/tasks"); // optional: redirect
    } catch (e) {
      console.error("Firebase Error:", e);
      Alert.alert("Post Failed", e.message);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.header}>Add a Chore</Text>

        <DropDownPicker
          open={open}
          value={cat}
          setOpen={setOpen}
          setValue={setCat}
          items={[
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
          ]}
          placeholder="Select Category"
          style={styles.dropdown}
          dropDownContainerStyle={styles.dropdownContainer}
        />

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
  container: {
    flex: 1,
    backgroundColor: "#D4F0F0",
  },
  form: {
    padding: 20,
    paddingTop: 40,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  dropdown: {
    borderColor: "#DDD",
    marginBottom: 15,
  },
  dropdownContainer: {
    borderColor: "#DDD",
  },
  input: {
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#8FCACA",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#333",
  },
});