import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import { db, auth } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
  where,
  getDocs,
  limit,
} from "firebase/firestore";

import { useRouter } from "expo-router";

export default function MessagePreview() {
  const router = useRouter();
  const [chats, setChats] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "chats"),
      where("users", "array-contains", auth.currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snap) => {
      const allChats = snap.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      const previews = await Promise.all(
        allChats.map(async (chat) => {
          if (!Array.isArray(chat.users)) return null;

          const otherId = chat.users.find(
            (uid) => uid !== auth.currentUser.uid
          );
          if (!otherId) return null;

          const userDoc = await getDoc(doc(db, "users", otherId));

          const messagesRef = collection(
            db,
            "chats",
            chat.id,
            "messages"
          );

          const lastMsgQuery = query(
            messagesRef,
            orderBy("createdAt", "desc"),
            limit(1)
          );

          const msgSnap = await getDocs(lastMsgQuery);

          let lastMessage = "No messages yet";
          let timestamp =
            chat.createdAt?.toDate?.() || new Date();

          if (!msgSnap.empty) {
            const msgData = msgSnap.docs[0].data();
            lastMessage = msgData.text || "No message";
            timestamp =
              msgData.createdAt?.toDate?.() || timestamp;
          }

          return {
            chatId: chat.id,
            userName: userDoc.exists()
              ? userDoc.data().name
              : "User",
            profilePic: userDoc.exists()
              ? userDoc.data().profilePic || null
              : null,
            lastMessage,
            timestamp,
          };
        })
      );

      const uniqueChats = previews
        .filter(Boolean)
        .filter(
          (chat, index, self) =>
            index === self.findIndex((c) => c.chatId === chat.chatId)
        );

      setChats(uniqueChats);
    });

    return unsubscribe;
  }, []);

  const openChat = (chatId) => {
    router.push(`/chat/${chatId}`);
  };

  const deleteChat = (chatId) => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "chats", chatId));
            } catch (e) {
              Alert.alert("Error", e.message);
            }
          },
        },
      ]
    );
  };

  const formatTime = (date) =>
    `${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Chats</Text>

      <ScrollView contentContainerStyle={{ padding: 10 }}>
        {chats.map((chat) => (
          <View key={chat.chatId} style={styles.chatCard}>

            {/* LEFT SIDE - OPEN CHAT */}
            <TouchableOpacity
              style={styles.chatLeft}
              onPress={() => openChat(chat.chatId)}
              activeOpacity={0.7}
            >
              <Image
                source={
                  chat.profilePic
                    ? { uri: chat.profilePic }
                    : require("../../assets/default-avatar.png")
                }
                style={styles.profilePic}
              />

              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={styles.chatHeader}>
                  <Text style={styles.userName}>
                    {chat.userName}
                  </Text>
                  <Text style={styles.timestamp}>
                    {formatTime(chat.timestamp)}
                  </Text>
                </View>

                <Text
                  style={styles.lastMessage}
                  numberOfLines={1}
                >
                  {chat.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>

            {/* RIGHT SIDE - DELETE */}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteChat(chat.chatId)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>

          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#E6F7F7",
  },

  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "center",
  },

  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "#CBAACB",
    borderRadius: 10,
    marginBottom: 10,
  },

  chatLeft: {
    flexDirection: "row",
    flex: 1,
    alignItems: "center",
  },

  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },

  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  userName: {
    fontWeight: "bold",
    fontSize: 16,
  },

  timestamp: {
    fontSize: 12,
    color: "#555",
  },

  lastMessage: {
    fontSize: 14,
    color: "#333",
  },

  deleteBtn: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },

  deleteText: {
    color: "#FF3333",
    fontWeight: "bold",
  },
});