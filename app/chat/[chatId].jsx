import React, { useState, useEffect, useRef } from "react";
import {
  View,
  TextInput,
  ScrollView,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { useLocalSearchParams, useRouter } from "expo-router";

// ✅ IMPORT SERVICE
import { sendMessage } from "../services/chatService";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const scrollViewRef = useRef();

  // ✅ REAL-TIME MESSAGES LISTENER (unchanged)
  useEffect(() => {
    if (!chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setMessages(msgs);
    });

    return unsubscribe;
  }, [chatId]);

  // ✅ UPDATED SEND MESSAGE (now uses service)
  const handleSend = async () => {
    try {
      await sendMessage(chatId, text);
      setText("");
    } catch (e) {
      console.log("Send error:", e);
    }
  };

  const goBack = () => {
    router.push("/tasks/message");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Chat</Text>

          <View style={{ width: 50 }} />
        </View>

        {/* Messages */}
        <ScrollView
          style={styles.messages}
          ref={scrollViewRef}
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg) => {
            const isMe = msg.sender === auth.currentUser.uid;

            return (
              <View
                key={msg.id}
                style={[
                  styles.messageRow,
                  isMe ? styles.myRow : styles.otherRow,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.myBubble : styles.otherBubble,
                  ]}
                >
                  <Text style={styles.messageText}>
                    {msg.text || ""}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
          />

          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSend}
          >
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F9F9" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },

  backText: {
    fontSize: 16,
    color: "#8FCACA",
    fontWeight: "bold",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  messages: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  myRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },

  bubble: {
    maxWidth: "75%",
    padding: 12,
    borderRadius: 18,
  },

  myBubble: {
    backgroundColor: "#CBAACB",
    borderBottomRightRadius: 5,
  },

  otherBubble: {
    backgroundColor: "#F3B0C3",
    borderBottomLeftRadius: 5,
  },

  messageText: { fontSize: 15, color: "#333" },

  inputContainer: {
    flexDirection: "row",
    padding: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
  },

  input: {
    flex: 1,
    backgroundColor: "#F1F1F1",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  sendButton: {
    marginLeft: 10,
    backgroundColor: "#8FCACA",
    paddingHorizontal: 18,
    borderRadius: 20,
    justifyContent: "center",
  },

  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },
});