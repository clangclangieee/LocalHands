import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Profile() {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [avatar, setAvatar] = useState(null);

  /* ===== LOAD SAVED PROFILE ===== */
  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const savedName = await AsyncStorage.getItem("name");
      const savedNumber = await AsyncStorage.getItem("number");
      const savedAvatar = await AsyncStorage.getItem("avatar");

      if (savedName) setName(savedName);
      if (savedNumber) setNumber(savedNumber);
      if (savedAvatar) setAvatar(savedAvatar);
    } catch (error) {
      console.log("Failed to load profile", error);
    }
  };

  /* ===== SAVE PROFILE ===== */
  const saveProfile = async () => {
    try {
      await AsyncStorage.setItem("name", name);
      await AsyncStorage.setItem("number", number);
      if (avatar) await AsyncStorage.setItem("avatar", avatar);

      setIsEditing(false);
      Alert.alert("Saved ✨", "Profile updated successfully");
    } catch (error) {
      console.log("Failed to save profile", error);
    }
  };

  /* ===== PICK IMAGE ===== */
  const pickImage = async () => {
    if (!isEditing) return;

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Permission needed", "Please allow gallery access");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <TouchableOpacity style={styles.avatar} onPress={pickImage}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>👤</Text>
        )}
        {isEditing && <Text style={styles.editHint}>Tap to change</Text>}
      </TouchableOpacity>

      {/* Name */}
      <View style={styles.fieldContainer}>
        {isEditing ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            style={styles.inputName}
          />
        ) : (
          <Text style={styles.name}>{name || "Your Name"}</Text>
        )}
      </View>

      {/* Number */}
      <View style={styles.fieldContainer}>
        {isEditing ? (
          <TextInput
            value={number}
            onChangeText={setNumber}
            placeholder="Enter number"
            keyboardType="phone-pad"
            style={styles.inputNumber}
          />
        ) : (
          <Text style={styles.number}>{number || "Your Number"}</Text>
        )}
      </View>

      {/* Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={isEditing ? saveProfile : () => setIsEditing(true)}
      >
        <Text style={styles.buttonText}>
          {isEditing ? "SAVE" : "EDIT"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4F0F0",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  avatar: {
    backgroundColor: "#FADADD",
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
    borderWidth: 3,
    borderColor: "#FFFFFF",
    elevation: 3,
    overflow: "hidden",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
  },

  avatarText: {
    fontSize: 60,
  },

  editHint: {
    position: "absolute",
    bottom: 8,
    fontSize: 12,
    color: "#555",
    backgroundColor: "rgba(255,255,255,0.7)",
    paddingHorizontal: 6,
    borderRadius: 6,
  },

  fieldContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 15,
  },

  name: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },

  inputName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
    borderBottomWidth: 2,
    borderColor: "#C9A3C9",
    textAlign: "center",
    width: "80%",
  },

  number: {
    fontSize: 20,
    color: "#555",
  },

  inputNumber: {
    fontSize: 20,
    color: "#555",
    borderBottomWidth: 1,
    borderColor: "#C9A3C9",
    textAlign: "center",
    width: "70%",
  },

  button: {
    marginTop: 30,
    backgroundColor: "#C9A3C9",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    minWidth: 120,
    alignItems: "center",
    elevation: 2,
  },

  buttonText: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
});
