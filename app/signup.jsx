import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";

export default function Signup() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Sign Up</Text>

      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace("/tasks")}
          >
            <Text style={styles.buttonText}>SIGN UP</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.link}>Don’t have an account? Login</Text>
    </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#D4F0F0",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 25,
  },
  cardWrapper: {
    width: "100%",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    minHeight: 340,
    backgroundColor: "#CBAACB",
    borderRadius: 20,
    padding: 32,
    justifyContent: "space-between", // ⭐ spreads content vertically
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  form: {
    width: "100%",                 // ⭐ full width
    marginTop: 10,
  },
  input: {
    width: "100%",                 // ⭐ fills card width
    height: 54,                    // ⭐ taller input
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#8FCACA",
    paddingVertical: 18,           // ⭐ taller button
    borderRadius: 16,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  link: {
    marginTop: 24,
    fontSize: 15,
  },
});
