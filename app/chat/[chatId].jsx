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
  Modal,
  Image,
} from "react-native";
import { supabase } from "../../supabaseConfig";
import { useLocalSearchParams, useRouter } from "expo-router";
import { sendMessage } from "../../services/chatService";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [recipient, setRecipient] = useState({ name: "Loading...", avatar: null });

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editValue, setEditValue] = useState("");

  const scrollViewRef = useRef();

  const isSameDay = (d1, d2) =>
    new Date(d1).toDateString() === new Date(d2).toDateString();

  useEffect(() => {
    if (!chatId) return;

    let channel;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const parts = chatId.split("_");
      const recipientId =
        parts.length > 1
          ? parts[0] === user?.id
            ? parts[1]
            : parts[0]
          : chatId;

      const { data: chatData, error } = await supabase
        .from("profiles")
        .select("name, profile_pic")
        .eq("id", recipientId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else if (chatData) {
        setRecipient({ name: chatData.name, avatar: chatData.profile_pic });
      }
    };

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true });
      if (error) console.log(error);
      else setMessages(data || []);
    };

    init();
    fetchMessages();

    const setupSubscription = async () => {
      const channelName = `chat-room-${chatId}`;
      const existingChannel = supabase
        .getChannels()
        .find((ch) => ch.topic === `realtime:${channelName}`);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` },
          (payload) => {
            if (payload.eventType === "INSERT") setMessages((prev) => [...prev, payload.new]);
            if (payload.eventType === "UPDATE") setMessages((prev) => prev.map((m) => (m.id === payload.new.id ? payload.new : m)));
            if (payload.eventType === "DELETE") setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [chatId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    await sendMessage(chatId, text.trim());
    setText("");
  };

  const handleSaveEdit = async () => {
    if (!editValue.trim()) return;
    await supabase.from("messages").update({ text: editValue.trim() }).eq("id", editingMessage.id);
    setEditModalVisible(false);
    setEditingMessage(null);
  };

  const handleDelete = async () => {
    await supabase.from("messages").delete().eq("id", selectedMessage.id);
    setIsConfirmingDelete(false);
    setMenuModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "android" ? 20 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/tasks/message")} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            {recipient.avatar ? (
              <Image source={{ uri: recipient.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
            )}
            <Text style={styles.headerTitle} numberOfLines={1}>
              {recipient.name}
            </Text>
          </View>

          <View style={{ width: 60 }} />
        </View>

        {/* Message Stream */}
        <ScrollView
          style={styles.messages}
          ref={scrollViewRef}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
        >
          {messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            const time = new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            const showDate =
              index === 0 || !isSameDay(messages[index - 1].created_at, msg.created_at);
            const dateLabel = new Date(msg.created_at).toLocaleDateString([], {
              month: "short",
              day: "numeric",
            });

            return (
              <View key={msg.id}>
                {showDate && <Text style={styles.dateHeader}>{dateLabel}</Text>}
                <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
                  {isMe && (
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedMessage(msg);
                        setMenuModalVisible(true);
                        setIsConfirmingDelete(false);
                      }}
                      style={styles.menuButton}
                    >
                      <Text style={styles.menuText}>⋮</Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.otherMessageText]}>
                      {msg.text}
                    </Text>
                    <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.otherTimestamp]} numberOfLines={1}>
                      {time}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Edit Modal */}
        <Modal visible={editModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Message</Text>
              <TextInput
                style={styles.modalInput}
                value={editValue}
                onChangeText={setEditValue}
                multiline
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveEdit}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Options / Action Menu Modal */}
        <Modal visible={menuModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {!isConfirmingDelete ? (
                <>
                  <Text style={styles.modalTitle}>Message Options</Text>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => {
                      setEditingMessage(selectedMessage);
                      setEditValue(selectedMessage.text);
                      setMenuModalVisible(false);
                      setEditModalVisible(true);
                    }}
                  >
                    <Text style={styles.optionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.optionButton}
                    onPress={() => setIsConfirmingDelete(true)}
                  >
                    <Text style={[styles.optionText, { color: "#D9534F" }]}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.optionButton, { borderBottomWidth: 0 }]}
                    onPress={() => setMenuModalVisible(false)}
                  >
                    <Text style={[styles.optionText, { color: "#888888" }]}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Confirm Delete</Text>
                  <Text style={styles.confirmText}>
                    Are you sure you want to delete this message? This action cannot be undone.
                  </Text>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity
                      style={styles.modalCancelBtn}
                      onPress={() => setIsConfirmingDelete(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalDeleteBtn} onPress={handleDelete}>
                      <Text style={styles.deleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Input Dock */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#888888"
            value={text}
            onChangeText={setText}
            multiline={true}
          />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend} activeOpacity={0.8}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "android" ? 40 : 10,
    paddingBottom: 15,
    backgroundColor: "#DF8F9C",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerCenter: { flexDirection: "row", alignItems: "center", flex: 1, justifyContent: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  backButton: { padding: 5 },
  backText: { fontSize: 16, color: "#660005", fontWeight: "bold" },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#660005" },

  messages: { flex: 1, paddingHorizontal: 15, paddingTop: 10 },
  messageRow: { flexDirection: "row", marginBottom: 12, alignItems: "center" },
  myRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },

  menuButton: { paddingHorizontal: 8, paddingVertical: 4, marginRight: 2 },
  menuText: { fontSize: 18, color: "#AAAAAA", fontWeight: "bold" },

  bubble: {
    maxWidth: "78%",
    minWidth: 90,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 22,
    borderRadius: 16,
  },
  myBubble: { backgroundColor: "#DF8F9C", borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: "#660005", borderBottomLeftRadius: 4 },

  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: "#660005" },
  otherMessageText: { color: "#FFFFFF" },

  timestamp: { fontSize: 10, position: "absolute", bottom: 6, right: 10 },
  myTimestamp: { color: "#660005", opacity: 0.7 },
  otherTimestamp: { color: "#FFFFFF", opacity: 0.7 },

  dateHeader: {
    textAlign: "center",
    fontSize: 12,
    color: "#888888",
    marginVertical: 12,
    fontWeight: "bold",
  },

  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#DF8F9C",
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    maxHeight: 100,
    fontSize: 15,
    color: "#333333",
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: "#660005",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 14 },

  modalOverlay: {
    flex: 1,
    justify: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    width: "82%",
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#660005", marginBottom: 15, textAlign: "center" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
    minHeight: 80,
    fontSize: 15,
    color: "#333333",
  },
  confirmText: { fontSize: 14, color: "#555555", marginBottom: 20, lineHeight: 20, textAlign: "center" },

  optionButton: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    alignItems: "center",
  },
  optionText: { fontSize: 16, fontWeight: "600", color: "#333333" },

  modalButtons: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#EEEEEE",
    alignItems: "center",
  },
  cancelBtnText: { color: "#555555", fontWeight: "bold" },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#660005",
    alignItems: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "bold" },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#D9534F",
    alignItems: "center",
  },
  deleteBtnText: { color: "#FFFFFF", fontWeight: "bold" },
});