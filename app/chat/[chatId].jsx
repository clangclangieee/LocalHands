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
import { doc, updateDoc, arrayUnion, onSnapshot } from "firebase/firestore";

import { useLocalSearchParams } from "expo-router";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const scrollViewRef = useRef();

  useEffect(() => {
    const chatRef = doc(db, "chats", chatId);

    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        setMessages(docSnap.data().messages || []);
      }
    });

    return unsubscribe;
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    const chatRef = doc(db, "chats", chatId);

    await updateDoc(chatRef, {
      messages: arrayUnion({
        text: text,
        sender: auth.currentUser.uid,
        createdAt: new Date(),
      }),
    });

    setText("");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.messages}
          ref={scrollViewRef}
          onContentSizeChange={() =>
            scrollViewRef.current.scrollToEnd({ animated: true })
          }
        >
          {messages.map((msg, index) => {
            const isMe = msg.sender === auth.currentUser.uid;

            return (
              <View
                key={index}
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
                  <Text style={styles.messageText}>{msg.text}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={text}
            onChangeText={setText}
          />

          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9F9F9",
  },

  messages: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 50,
  },

  messageRow: {
    flexDirection: "row",
    marginBottom: 10,
  },

  myRow: {
    justifyContent: "flex-end",
  },

  otherRow: {
    justifyContent: "flex-start",
  },

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

  messageText: {
    fontSize: 15,
    color: "#333",
  },

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