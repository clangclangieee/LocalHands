import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";

// Sample messages
const messages = [
  {
    id: 1,
    sender: "Karl",
    text: "No problem po",
    image:
      "https://i.pinimg.com/736x/ea/1c/06/ea1c06737ff473631776adaeb8a1f21f.jpg",
  },
  {
    id: 2,
    sender: "MakasarilingIsda",
    text: "Okay ra mga 1 lang?",
    image:
      "https://i.pinimg.com/736x/85/54/ba/8554ba20ea5ee05429de18d832a33726.jpg",
    isMine: true,
  },
  {
    id: 3,
    sender: "Belen",
    text: "Okay na dae...Thank you",
    image:
      "https://i.pinimg.com/736x/d0/64/d5/d064d5297876fa933c2bd8d3ff4443df.jpg",
  },
  {
    id: 4,
    sender: "MamiLovesPandesal",
    text: "You: Yes po i have time",
    image:
      "https://i.pinimg.com/1200x/81/fb/02/81fb02013b09451f8bb893363737178e.jpg",
    isMine: true,
  },
  {
    id: 5,
    sender: "WeBearBears",
    text: "Can you help me with my presentaion please?",
    image:
      "https://i.pinimg.com/736x/31/4f/33/314f3388f7da810b7cb2cfd00faa1c15.jpg",
  },
];

// Friends list
const friends = [
  {
    id: 1,
    name: "Karl",
    image:
      "https://i.pinimg.com/736x/ea/1c/06/ea1c06737ff473631776adaeb8a1f21f.jpg",
  },
  {
    id: 2,
    name: "MakasarilingIsda",
    image:
      "https://i.pinimg.com/736x/85/54/ba/8554ba20ea5ee05429de18d832a33726.jpg",
  },
  {
    id: 3,
    name: "Belen",
    image:
      "https://i.pinimg.com/736x/d0/64/d5/d064d5297876fa933c2bd8d3ff4443df.jpg",
  },
  {
    id: 4,
    name: "WeBearBears",
    image:
      "https://i.pinimg.com/736x/31/4f/33/314f3388f7da810b7cb2cfd00faa1c15.jpg",
  },
  {
    id: 5,
    name: "Felixia",
    image:
      "https://i.pinimg.com/736x/2d/c1/d8/2dc1d839e486aad7a9028f8afbb86685.jpg",
  },
  {
    id: 6,
    name: "MamiLovesPandesal",
    image:
      "https://i.pinimg.com/1200x/81/fb/02/81fb02013b09451f8bb893363737178e.jpg",
  },
  {
    id: 7,
    name: "Bibble",
    image:
      "https://i.pinimg.com/736x/98/a2/4c/98a24c89af2561c879abe63c8c1f17a2.jpg",
  },
  {
    id: 8,
    name: "SussyChicky",
    image:
      "https://i.pinimg.com/736x/39/9a/39/399a39dc09ef5e1e9299bf3cca5537d8.jpg",
  },
];

export default function Message() {
  const router = useRouter();

  const goToChat = (name) => {
    router.push({
      pathname: "/chat/[name]",
      params: { name },
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Messages</Text>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Friends Row - Horizontal Scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.friendsRow}
        >
          {friends.map((friend) => (
            <Pressable
              key={friend.id}
              style={styles.friend}
              onPress={() => goToChat(friend.name)}
            >
              <Image
                source={{ uri: friend.image }}
                style={styles.friendImage}
              />
              <Text style={styles.friendName} numberOfLines={1}>
                {friend.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Message List */}
        {messages.map((msg) => (
          <Pressable
            key={msg.id}
            onPress={() => goToChat(msg.sender)}
            style={[
              styles.messageContainer,
              msg.isMine
                ? styles.myMessageContainer
                : styles.otherMessageContainer,
            ]}
          >
            <Image source={{ uri: msg.image }} style={styles.profileImage} />
            <View style={{ marginLeft: 15, flex: 1 }}>
              <Text style={styles.senderName}>{msg.sender}</Text>
              <Text style={styles.messageText}>{msg.text}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4F0F0",
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 15,
    textAlign: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  friendsRow: {
    paddingHorizontal: 10,
    paddingBottom: 15,
  },
  friend: {
    alignItems: "center",
    marginRight: 15,
  },
  friendImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#25B7D3",
  },
  friendName: {
    marginTop: 5,
    fontSize: 12,
    maxWidth: 70,
    textAlign: "center",
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    marginBottom: 15,
    marginHorizontal: 10,
  },
  myMessageContainer: {
    backgroundColor: "#F3B0C3",
    borderLeftColor: "#8FCACA",
  },
  otherMessageContainer: {
    backgroundColor: "#CBAACB",
    borderLeftColor: "#FFC5BF",
  },
  senderName: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
    color: "#333",
  },
  messageText: {
    fontSize: 14,
    color: "#555",
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
});
