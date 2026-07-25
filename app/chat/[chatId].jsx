import React, { useState, useEffect, useRef } from "react";
import {
  View, TextInput, ScrollView, Text, TouchableOpacity, SafeAreaView,
  StyleSheet, KeyboardAvoidingView, Platform, Modal, Image,
} from "react-native";
import { supabase } from "../../supabaseConfig";
import { useLocalSearchParams, useRouter } from "expo-router";
import { sendMessage } from "../../services/chatService";

export default function ChatScreen() {
  const { chatId } = useLocalSearchParams();
  const router = useRouter();
  
  // All hooks are at the top level
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

  const isSameDay = (d1, d2) => new Date(d1).toDateString() === new Date(d2).toDateString();

  useEffect(() => {
  if (!chatId) return;

  let channel;

  // 1. Initial data fetching
  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const parts = chatId.split('_');
    const recipientId = parts.length > 1 
      ? (parts[0] === user?.id ? parts[1] : parts[0]) 
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

  // 2. Setup Realtime Channel safely
  const setupSubscription = async () => {
    // Remove any stale channel with this name before creating a new one
    const channelName = `chat-room-${chatId}`;
    const existingChannel = supabase.getChannels().find(ch => ch.topic === `realtime:${channelName}`);
    if (existingChannel) {
      await supabase.removeChannel(existingChannel);
    }

    // Attach listeners FIRST, then subscribe
    channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes", 
        { event: "*", schema: "public", table: "messages", filter: `chat_id=eq.${chatId}` }, 
        (payload) => {
          if (payload.eventType === 'INSERT') setMessages(prev => [...prev, payload.new]);
          if (payload.eventType === 'UPDATE') setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
          if (payload.eventType === 'DELETE') setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();
  };

  setupSubscription();

  // 3. Cleanup on component unmount
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
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push("/tasks/message")} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {recipient.avatar && <Image source={{ uri: recipient.avatar }} style={styles.avatar} />}
            <Text style={styles.headerTitle} numberOfLines={1}>{recipient.name}</Text>
          </View>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={styles.messages} ref={scrollViewRef} onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}>
          {messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const showDate = index === 0 || !isSameDay(messages[index - 1].created_at, msg.created_at);
            const dateLabel = new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' });

            return (
              <View key={msg.id}>
                {showDate && <Text style={styles.dateHeader}>{dateLabel}</Text>}
                <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
                  {isMe && (
                    <TouchableOpacity onPress={() => { setSelectedMessage(msg); setMenuModalVisible(true); setIsConfirmingDelete(false); }} style={styles.menuButton}>
                      <Text style={styles.menuText}>⋮</Text>
                    </TouchableOpacity>
                  )}
                  <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    <Text style={styles.messageText}>{msg.text}</Text>
                    <Text style={styles.timestamp} numberOfLines={1}>{time}</Text>
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
              <TextInput style={styles.modalInput} value={editValue} onChangeText={setEditValue} multiline />
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit}><Text style={{fontWeight:'bold', color:'#660005'}}>Save Changes</Text></TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Action Menu & Confirm Modal */}
        <Modal visible={menuModalVisible} animationType="fade" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {!isConfirmingDelete ? (
                <>
                  <Text style={styles.modalTitle}>Options</Text>
                  <TouchableOpacity style={styles.optionButton} onPress={() => { setEditingMessage(selectedMessage); setEditValue(selectedMessage.text); setMenuModalVisible(false); setEditModalVisible(true); }}>
                    <Text>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.optionButton} onPress={() => setIsConfirmingDelete(true)}>
                    <Text style={{color: 'red'}}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{marginTop: 10}} onPress={() => setMenuModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Confirm Delete</Text>
                  <Text style={{marginBottom: 20}}>Are you sure you want to delete this message? This cannot be undone.</Text>
                  <View style={styles.modalButtons}>
                    <TouchableOpacity onPress={() => setIsConfirmingDelete(false)}><Text>No</Text></TouchableOpacity>
                    <TouchableOpacity onPress={handleDelete}><Text style={{fontWeight:'bold', color:'red'}}>Yes, Delete</Text></TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Type a message..." value={text} onChangeText={setText} multiline={true} numberOfLines={4} />
          <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFF" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? 40 : 10, paddingBottom: 15, borderBottomWidth: 1, borderColor: "#eee", backgroundColor: "#DF8F9C" },
  headerCenter: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  backButton: { padding: 5 },
  backText: { fontSize: 16, color: "#660005", fontWeight: "bold" },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  messages: { flex: 1, paddingHorizontal: 10, paddingTop: 10 },
  messageRow: { flexDirection: "row", marginBottom: 10, alignItems: 'center' },
  myRow: { justifyContent: "flex-end" },
  otherRow: { justifyContent: "flex-start" },
  menuButton: { padding: 5, marginRight: 5 },
  menuText: { fontSize: 20, color: '#aaa', fontWeight: 'bold' },
  bubble: { maxWidth: "80%", minWidth: 80, padding: 12, paddingBottom: 25, borderRadius: 18 },
  myBubble: { backgroundColor: "#DF8F9C", borderBottomRightRadius: 5 },
  otherBubble: { backgroundColor: "#660005", borderBottomLeftRadius: 5 },
  messageText: { fontSize: 15, color: "#FFFF", marginBottom: 2 },
  timestamp: { fontSize: 10, color: "#FFFF", position: 'absolute', bottom: 8, right: 12, width: 60, textAlign: 'right' },
  dateHeader: { textAlign: 'center', fontSize: 12, color: '#888', marginVertical: 15, fontWeight: 'bold' },
  inputContainer: { flexDirection: "row", padding: 10, borderTopWidth: 1, borderColor: "#eee", backgroundColor: "#DF8F9C" },
  input: { flex: 1, backgroundColor: "#FFFF", borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, minHeight: 40, maxHeight: 100 },
  sendButton: { marginLeft: 10, backgroundColor: "#660005", paddingHorizontal: 18, borderRadius: 20, justifyContent: "center" },
  sendText: { color: "#FFFF", fontWeight: "bold" },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#FFFF', padding: 20, borderRadius: 15, width: '80%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 20, minHeight: 80 },
  optionButton: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' }
});