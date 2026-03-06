import React, { useState, useEffect } from "react";
import { SafeAreaView, ScrollView, View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, onSnapshot, query, orderBy, doc, getDoc } from "firebase/firestore";
import { useRouter } from "expo-router";

export default function MessagePreview() {
  const router = useRouter();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(collection(db, "chats"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, async snap => {
      const allChats = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const previews = await Promise.all(
        allChats.map(async chat => {

          if (!Array.isArray(chat.participants)) return null;

          const otherId = chat.participants.find(
            uid => uid !== auth.currentUser.uid
          );

          if (!otherId) return null;

          const userDoc = await getDoc(doc(db, "users", otherId));

          return {
            chatId: chat.id,
            userName: userDoc.exists()
              ? userDoc.data().name
              : "User",

            profilePic: userDoc.exists()
              ? userDoc.data().profilePic || null
              : null,

            lastMessage:
              chat.messages?.[chat.messages.length - 1]?.text ||
              "No messages yet",

            timestamp:
              chat.messages?.[chat.messages.length - 1]?.timestamp?.toDate?.() ||
              chat.createdAt?.toDate?.() ||
              new Date()
          };
        })
      );

      setChats(previews.filter(Boolean));
    });

    return unsubscribe;
  }, []);

  const openChat = (chatId, userName) => {
    router.push({
      pathname: `/chat/${chatId}`,
      params: { userName }
    });
  };

  const formatTime = date => {
    return `${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Chats</Text>

      <ScrollView contentContainerStyle={{ padding: 10 }}>
        {chats.map(chat => (
          <TouchableOpacity
            key={chat.chatId}
            style={styles.chatCard}
            onPress={() => openChat(chat.chatId, chat.userName)}
          >
            {chat.profilePic ? (
              <Image
                source={{ uri: chat.profilePic }}
                style={styles.profilePic}
              />
            ) : (
              <View style={[styles.profilePic, { backgroundColor: "#EEE" }]} />
            )}

            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={styles.chatHeader}>
                <Text style={styles.userName}>{chat.userName}</Text>
                <Text style={styles.timestamp}>
                  {formatTime(chat.timestamp)}
                </Text>
              </View>

              <Text style={styles.lastMessage} numberOfLines={1}>
                {chat.lastMessage}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F7F7"
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "center"
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#CBAACB",
    borderRadius: 10,
    marginBottom: 10
  },

  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between"
  },

  userName: {
    fontWeight: "bold",
    fontSize: 16
  },

  timestamp: {
    fontSize: 12,
    color: "#555"
  },

  lastMessage: {
    fontSize: 14,
    color: "#333"
  }
});