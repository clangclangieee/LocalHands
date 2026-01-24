import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from "react-native";

export default function Home() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Your Chores</Text>

      <View style={styles.card}>
        <View style={styles.userRow}>
          <Image
            source={{ uri: "https://i.pinimg.com/736x/d0/64/d5/d064d5297876fa933c2bd8d3ff4443df.jpg" }}
            style={styles.profilePic}
          />
          <Text style={styles.user}>
            Belen <Text style={styles.time}>1 day ago</Text>
          </Text>
        </View>
        <Text style={styles.title}>Tech Help</Text>
        <Text>Need help with my phone… sige siya restart…</Text>
        <Text style={styles.pay}>₱200</Text>
        <Text style={styles.date}>When: 01/18/2026</Text>

        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.userRow}>
          <Image
            source={{ uri: "https://i.pinimg.com/736x/83/a8/4a/83a84a3bc2fe16068655bcf49f2e769e.jpg" }}
            style={styles.profilePic}
          />
          <Text style={styles.user}>
            Charlotte <Text style={styles.time}>a week ago</Text>
          </Text>
        </View>
        <Text style={styles.title}>Laundry</Text>
        <Text>2 baskets of clothes</Text>
        <Text style={styles.pay}>₱300</Text>
        <Text style={styles.date}>When: 01/18/2026</Text>

        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.userRow}>
          <Image
            source={{ uri: "https://i.pinimg.com/736x/47/01/d6/4701d68b290c99514ca3e7822dbf3592.jpg" }}
            style={styles.profilePic}
          />
          <Text style={styles.user}>
            HakunaMatata <Text style={styles.time}>1 hour ago</Text>
          </Text>
        </View>
        <Text style={styles.title}>Yard Work</Text>
        <Text>Cleaned my lawn, went over yard</Text>
        <Text style={styles.pay}>₱400</Text>
        <Text style={styles.date}>When: 01/18/2026</Text>

        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#E6F7F7",
    padding: 15,
  },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 30,
    marginTop: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: "#FFF",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  user: {
    fontWeight: "bold",
    fontSize: 16,
  },
  time: {
    fontWeight: "normal",
    color: "#888",
    fontSize: 12,
  },
  title: {
    fontWeight: "bold",
    marginTop: 5,
    fontSize: 18,
  },
  pay: {
    marginTop: 5,
    fontWeight: "bold",
  },
  date: {
    marginTop: 3,
    color: "#555",
    fontSize: 12,
  },
  applyButton: {
    marginTop: 10,
    backgroundColor: "#8FCACA",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 16,
  },
});
