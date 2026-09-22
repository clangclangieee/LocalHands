import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Text,
  ScrollView,
  Alert,
  Platform,
  Animated,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../../supabaseConfig";
import { useRouter } from "expo-router";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [formType, setFormType] = useState("Chores");
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const router = useRouter();

  // Chore Form States (Single Select for Category)
  const [cat, setCat] = useState(null);
  const [desc, setDesc] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");

  // Applicant Form States (Multi-Select for Skills)
  const [applicantName, setApplicantName] = useState("");
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [experience, setExperience] = useState("");
  const [contactInfo, setContactInfo] = useState("");

  // Pre-fill Applicant fields with current user profile info
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, phone")
            .eq("id", user.id)
            .single();

          if (profile) {
            if (profile.name && !applicantName) setApplicantName(profile.name);
            if (profile.phone && !contactInfo) setContactInfo(profile.phone);
          }
        }
      } catch (err) {
        console.error("Error pre-filling profile info:", err.message);
      }
    };

    fetchUserProfile();
  }, []);

  const switchTab = (type) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFormType(type);
    Animated.spring(slideAnim, {
      toValue: type === "Chores" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 50,
    }).start();
  };

  // Single Selection for Category (Chores)
  const selectCategory = (categoryValue) => {
    setCat(cat === categoryValue ? null : categoryValue);
  };

  // Multi-Selection for Skills (Applicants)
  const toggleSkill = (skillValue) => {
    if (selectedSkills.includes(skillValue)) {
      setSelectedSkills(selectedSkills.filter((s) => s !== skillValue));
    } else {
      setSelectedSkills([...selectedSkills, skillValue]);
    }
  };

  const handlePostChore = async (userId) => {
    if (!cat || !desc.trim() || !budget || !location.trim()) {
      Alert.alert("Missing Info", "Please select a category and fill in description, budget, and location.");
      return false;
    }

    const { error } = await supabase.from("chores").insert([
      {
        category: cat,
        description: desc.trim(),
        budget: parseFloat(budget) || 0,
        location: location.trim(),
        user_id: userId,
      },
    ]);

    if (error) throw error;

    setCat(null);
    setDesc("");
    setBudget("");
    setLocation("");
    return true;
  };

  const handlePostApplicant = async (userId) => {
    if (!applicantName.trim() || selectedSkills.length === 0 || !experience.trim() || !contactInfo.trim()) {
      Alert.alert("Missing Info", "Please complete all applicant fields and select at least one skill.");
      return false;
    }

    // Check for existing application
    const { data: existingApplicant, error: checkError } = await supabase
      .from("applicants")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingApplicant) {
      Alert.alert(
        "Already Submitted",
        "You have already posted an applicant profile. You can update or maintain one application at a time."
      );
      return false;
    }

    const skillsString = selectedSkills.join(", ");

    const { error } = await supabase.from("applicants").insert([
      {
        full_name: applicantName.trim(),
        skills: skillsString,
        experience: experience.trim(),
        contact_info: contactInfo.trim(),
        user_id: userId,
      },
    ]);

    if (error) throw error;

    setSelectedSkills([]);
    setExperience("");
    return true;
  };

  const handlePost = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User session not found. Please log in again.");

      let success = false;
      if (formType === "Chores") {
        success = await handlePostChore(user.id);
      } else {
        success = await handlePostApplicant(user.id);
      }

      if (success) {
        Alert.alert("Success ✨", `${formType === "Chores" ? "Task" : "Application"} is now live!`, [
          {
            text: "OK",
            onPress: () => router.replace("/"),
          },
        ]);
      }
    } catch (e) {
      Alert.alert("Post Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  const bubbleLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["2%", "50%"],
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.header}>
          {formType === "Chores" ? "Add a Chore" : "Apply as Helper"}
        </Text>

        {/* Animated Pill Switcher */}
        <View style={styles.pillContainer}>
          <Animated.View style={[styles.pillBubble, { left: bubbleLeft }]} />

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Chores")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, formType === "Chores" && styles.pillTextActive]}>
              Chores
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.pillButton}
            onPress={() => switchTab("Applicants")}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, formType === "Applicants" && styles.pillTextActive]}>
              Applicants
            </Text>
          </TouchableOpacity>
        </View>

        {/* Dynamic Form Content */}
        {formType === "Chores" ? (
          <>
            {/* Single-Select Category Picker */}
            <View style={styles.pickerBox}>
              <Text style={styles.sectionLabel}>Select Category:</Text>
              <View style={styles.chipContainer}>
                {CATEGORIES.map((item) => {
                  const isSelected = cat === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => selectCategory(item.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {isSelected ? `✓ ${item.label}` : item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="What needs to be done?"
              placeholderTextColor="#8C3A48"
              multiline
              value={desc}
              onChangeText={setDesc}
            />
            <TextInput
              style={styles.input}
              placeholder="Budget (₱)"
              placeholderTextColor="#8C3A48"
              keyboardType="numeric"
              value={budget}
              onChangeText={setBudget}
            />
            <TextInput
              style={styles.input}
              placeholder="Location"
              placeholderTextColor="#8C3A48"
              value={location}
              onChangeText={setLocation}
            />
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#8C3A48"
              value={applicantName}
              onChangeText={setApplicantName}
            />

            {/* Multi-Select Skill Picker */}
            <View style={styles.pickerBox}>
              <Text style={styles.sectionLabel}>Select Skill(s):</Text>
              <View style={styles.chipContainer}>
                {CATEGORIES.map((item) => {
                  const isSelected = selectedSkills.includes(item.value);
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleSkill(item.value)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {isSelected ? `✓ ${item.label}` : item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Relevant Experience / Qualifications"
              placeholderTextColor="#8C3A48"
              multiline
              value={experience}
              onChangeText={setExperience}
            />
            <TextInput
              style={styles.input}
              placeholder="Contact Info (Phone / Email)"
              placeholderTextColor="#8C3A48"
              value={contactInfo}
              onChangeText={setContactInfo}
            />
          </>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handlePost}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {formType === "Chores" ? "POST TASK" : "SUBMIT APPLICATION"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  form: { padding: 20, paddingTop: 40, paddingBottom: 50 },
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

  pickerBox: {
    marginBottom: 16,
    backgroundColor: "#DF8F9C",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#660005",
    marginBottom: 12,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.9)",
  },
  chipSelected: {
    backgroundColor: "#660005",
    borderColor: "#660005",
  },
  chipText: {
    color: "#660005",
    fontSize: 13,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  input: {
    backgroundColor: "#DF8F9C",
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    textAlignVertical: "top",
    color: "#660005",
    fontWeight: "500",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.6)",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  multilineInput: { height: 110 },

  button: {
    backgroundColor: "#660005",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 10,
    elevation: 6,
    shadowColor: "#660005",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: { fontWeight: "bold", fontSize: 18, color: "#FFFFFF" },
});