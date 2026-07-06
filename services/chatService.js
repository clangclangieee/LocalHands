import { supabase } from "../supabaseConfig";

/**
 * Inserts a new chat message into the public.messages table
 * @param {string} chatId - The shared compound chat key (userA_userB)
 * @param {string} text - The clear text message string content
 */
export const sendMessage = async (chatId, text) => {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("No authenticated session available.");

    // Mapped precisely to your schema column: sender_id
    const { data, error } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId, 
        sender_id: user.id, // Fixed from 'sender' to 'sender_id'
        text: text       
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Critical error in sendMessage service processing:", err.message);
    throw err;
  }
};