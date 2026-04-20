import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export const sendMessage = async (chatId, text) => {
  if (!text.trim()) return;

  return addDoc(collection(db, "chats", chatId, "messages"), {
    text,
    sender: auth.currentUser.uid,
    createdAt: serverTimestamp(),
  });
};