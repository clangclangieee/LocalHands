import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { router } from "expo-router";

export default function Landing() {
  return (
    <View style={styles.container}>
      {/* App Name */}
      <Text style={styles.title}>LocalHands</Text>

      {/* Image */}
      <Image
        source={require("../assets/landing.png")}
        style={styles.image}
        resizeMode="contain"
      />

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        Get your chores done by trusted locals
      </Text>

      {/* Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.buttonText}>Let’s get started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4F0F0",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  image: {
    width: 300,
    height: 300,
    marginBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 20,
  },
  button: {
    backgroundColor: "#8FCACA",
    paddingHorizontal: 45,
    paddingVertical: 20,
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
