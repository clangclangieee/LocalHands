import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";

// Friends data with profile images
const friendsData = {
  Karl: "https://i.pinimg.com/736x/ea/1c/06/ea1c06737ff473631776adaeb8a1f21f.jpg",
  MakasarilingIsda: "https://i.pinimg.com/736x/85/54/ba/8554ba20ea5ee05429de18d832a33726.jpg",
  Belen: "https://i.pinimg.com/736x/d0/64/d5/d064d5297876fa933c2bd8d3ff4443df.jpg",
  WeBearBears: "https://i.pinimg.com/736x/31/4f/33/314f3388f7da810b7cb2cfd00faa1c15.jpg",
  Felixia: "https://i.pinimg.com/736x/2d/c1/d8/2dc1d839e486aad7a9028f8afbb86685.jpg",
  MamiLovesPandesal: "https://i.pinimg.com/1200x/81/fb/02/81fb02013b09451f8bb893363737178e.jpg",
  Bibble: "https://i.pinimg.com/736x/98/a2/4c/98a24c89af2561c879abe63c8c1f17a2.jpg",
  SussyChicky: "https://i.pinimg.com/736x/39/9a/39/399a39dc09ef5e1e9299bf3cca5537d8.jpg",
};

// Chat conversations for each friend
const chatData = {
  Karl: [
    { id: "1", text: "Mana ang imong gipa buhat miss", isMine: false },
    { id: "2", text: "Thank you so much!", isMine: true },
    { id: "3", text: "No problem po", isMine: false },
  ],
  MakasarilingIsda: [
    { id: "1", text: "Hello po, magpaguna unta ko", isMine: true },
    { id: "2", text: "Available raba ka?", isMine: true },
    { id: "3", text: "Available rako miss, when man?", isMine: false },
    { id: "4", text: "Maybe this weekend?", isMine: true },
    { id: "5", text: "Okay ra mga 1 lang?", isMine: false },
  ],
  Belen: [
    { id: "1", text: "Dae mo restart gihapon...", isMine: false },
    { id: "2", text: "Gi try nimo og pang delete te?", isMine: true },
    { id: "3", text: "👍", isMine: false },
    { id: "4", text: "Okay na dae...Thank you", isMine: false },
  ],
  WeBearBears: [
    { id: "1", text: "Hey! Are you free today?", isMine: false },
    { id: "2", text: "Yes! What's up?", isMine: true },
    { id: "3", text: "Can you help me with my presentaion please?", isMine: false },
  ],
  Felixia: [         
    { id: "1", text: "Hi Felixia! Long time no talk", isMine: true },
    { id: "2", text: "I know right! How have you been?", isMine: false },
    { id: "3", text: "All good! Miss you!", isMine: true },
  ],
  MamiLovesPandesal: [
    { id: "1", text: "Hi!", isMine: false },
    { id: "2", text: "Do you have time tomorrow?", isMine: false },
    { id: "3", text: "I need help with my code", isMine: false },
    { id: "4", text: "Hello!", isMine: true },
    { id: "5", text: "Wait let me check my schedule", isMine: true },
    { id: "6", text: "Okay po", isMine: false },
    { id: "7", text: "Yes po i have time", isMine: true },
  ],
  Bibble: [
    { id: "1", text: "What's new with you?", isMine: true },
    { id: "2", text: "World Domination", isMine: false },
    { id: "3", text: "Mood", isMine: true },
  ],
  SussyChicky: [
    { id: "1", text: "Hey! Can we talk?", isMine: false },
    { id: "2", text: "Of course! What's on your mind?", isMine: true },
    { id: "3", text: "Siya", isMine: false },
  ],
};

export default function ChatScreen() {
  const { name } = useLocalSearchParams();
  const router = useRouter();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState(chatData[name] || [
    { id: "1", text: "Hello!", isMine: false },
    { id: "2", text: "Hi! How can I help?", isMine: true },
  ]);

  const sendMessage = () => {
    if (!message.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: message,
        isMine: true,
      },
    ]);

    setMessage("");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={26} color="#333" />
        </Pressable>

        <Image
          source={{ uri: friendsData[name] || "https://i.pinimg.com/736x/ea/1c/06/ea1c06737ff473631776adaeb8a1f21f.jpg" }}
          style={styles.headerImage}
        />

        <Text style={styles.headerTitle}>{name}</Text>
      </View>

      {/* Messages */}
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesContainer}
        renderItem={({ item }) => (
          <View
            style={[
              styles.messageBubble,
              item.isMine ? styles.myBubble : styles.otherBubble,
            ]}
          >
            <Text style={styles.messageText}>{item.text}</Text>
          </View>
        )}
      />

      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          style={styles.input}
        />

        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <Ionicons name="send" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#D4F0F0",
  },

  /* Header */
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#FFC5BF",
  },
  headerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  /* Messages */
  messagesContainer: {
    padding: 15,
  },
  messageBubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 15,
    marginBottom: 10,
  },
  myBubble: {
    backgroundColor: "#F3B0C3",
    alignSelf: "flex-end",
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: "#CBAACB",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 14,
    color: "#333",
  },

  /* Input */
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F1F1F1",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  sendButton: {
    backgroundColor: "#25B7D3",
    padding: 10,
    borderRadius: 20,
  },
});
