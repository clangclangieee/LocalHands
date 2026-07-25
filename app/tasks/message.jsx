import React, { useState, useEffect, useRef } from "react";
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
import { supabase } from "../../supabaseConfig";
import { useRouter } from "expo-router";

export default function MessagePreview() {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);

  // Use a ref to store the channel safely
  const channelRef = useRef(null);

  const fetchChats = async (userId) => {
    try {
      // 1. Fetch 'is_read' along with message details
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select(`chat_id, text, created_at, sender_id, is_read`)
        .or(`chat_id.ilike.%${userId}%`)
        .order("created_at", { ascending: false });

      if (messagesError) throw messagesError;

      const chatMap = {};
      const partnerIdsToFetch = new Set();

      messagesData.forEach((msg) => {
        if (msg.chat_id.includes(userId)) {
          if (!chatMap[msg.chat_id]) {
            const ids = msg.chat_id.split("_");
            const partnerId = ids[0] === userId ? ids[1] : ids[0];
            if (partnerId) partnerIdsToFetch.add(partnerId);

            // Determine if the last message is unseen by the current user
            const isUnseen = msg.sender_id !== userId && !msg.is_read;

            chatMap[msg.chat_id] = {
              chatId: msg.chat_id,
              partnerId: partnerId,
              userName: "User",
              profilePic: null,
              lastMessage: msg.text || "",
              timestamp: new Date(msg.created_at),
              isUnseen: isUnseen,
            };
          }
        }
      });

      if (partnerIdsToFetch.size > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, name, profile_pic")
          .in("id", Array.from(partnerIdsToFetch));

        if (profilesData) {
          profilesData.forEach((p) => {
            Object.keys(chatMap).forEach((key) => {
              if (chatMap[key].partnerId === p.id) {
                chatMap[key].userName = p.name;
                chatMap[key].profilePic = p.profile_pic;
              }
            });
          });
        }
      }
      setChats(Object.values(chatMap));
    } catch (err) {
      console.error("Error fetching chats:", err.message);
    }
  };

  useEffect(() => {
    let channel;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Initial fetch
      await fetchChats(user.id);

      // Clean up any lingering channel with this name first
      const channelName = `inbox-live-sync-${user.id}`;
      const existingChannel = supabase
        .getChannels()
        .find((ch) => ch.topic === `realtime:${channelName}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      // Create channel AFTER cleanup
      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages" }, // Listen for INSERT & UPDATE
          () => fetchChats(user.id)
        )
        .subscribe();
    };

    init();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  const openChat = async (chatId) => {
    // Optimistically update UI so it immediately loses italic styling when clicked
    setChats((prev) =>
      prev.map((c) => (c.chatId === chatId ? { ...c, isUnseen: false } : c))
    );

    // Optionally mark messages as read in Supabase when opening the chat
    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("chat_id", chatId)
      .neq("sender_id", currentUserId);

    router.push(`/chat/${chatId}`);
  };

  const deleteChat = (chatId) => {
    Alert.alert("Delete Chat", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          const { error } = await supabase
            .from("messages")
            .delete()
            .eq("chat_id", chatId);
          if (!error) setChats((prev) => prev.filter((c) => c.chatId !== chatId));
        },
      },
    ]);
  };

  const formatTime = (date) => {
    if (!(date instanceof Date) || isNaN(date)) return "00:00";
    return `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Chats</Text>
      <ScrollView contentContainerStyle={{ padding: 10 }}>
        {chats.map((chat) => (
          <View key={chat.chatId} style={styles.chatCard}>
            <TouchableOpacity
              style={styles.chatLeft}
              onPress={() => openChat(chat.chatId)}
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
                  <Text style={styles.userName}>{chat.userName}</Text>
                  <Text style={styles.timestamp}>
                    {formatTime(chat.timestamp)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.lastMessage,
                    chat.isUnseen && styles.unseenMessage, // Apply italic & bold styling if unseen
                  ]}
                  numberOfLines={1}
                >
                  {chat.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteChat(chat.chatId)}
            >
              <Text style={styles.deleteText}>Clear</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFF" },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    marginTop: 40,
    marginBottom: 20,
    textAlign: "center",
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    justify: "space-between",
    padding: 15,
    backgroundColor: "#DF8F9C",
    borderRadius: 10,
    marginBottom: 10,
  },
  chatLeft: { flexDirection: "row", flex: 1, alignItems: "center" },
  profilePic: { width: 50, height: 50, borderRadius: 25 },
  chatHeader: { flexDirection: "row", justifyContent: "space-between" },
  userName: { fontWeight: "bold", fontSize: 16, color: "#FFFF" },
  timestamp: { fontSize: 12, color: "#555" },
  lastMessage: { fontSize: 14, color: "#333" },
  // Style applied specifically to unread messages:
  unseenMessage: { fontStyle: "italic", fontWeight: "bold", color: "#FFFF" },
  deleteBtn: {
    marginLeft: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  deleteText: { color: "#FF3333", fontWeight: "bold" },
});