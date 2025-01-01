import { ref, push, onValue, off, set, serverTimestamp } from 'firebase/database';
import { database } from '../config/firebase';
import { Message, ChatRoom } from '../types/chat';

export const createChatRoomId = (userId1: string, userId2: string) => {
  return [userId1, userId2].sort().join('_');
};

export const sendMessage = async (
  senderId: string,
  receiverId: string,
  text: string
): Promise<void> => {
  try {
    const roomId = createChatRoomId(senderId, receiverId);
    console.log('Creating message in room:', roomId);
    
    const messageRef = ref(database, `chats/${roomId}/messages`);
    
    const newMessage: Omit<Message, 'id'> = {
      senderId,
      receiverId,
      text,
      timestamp: Date.now(),
    };
    
    console.log('Saving message:', newMessage);
    const newMessageRef = await push(messageRef, newMessage);
    console.log('Message saved with ID:', newMessageRef.key);

    // Update last message in chat room
    const roomRef = ref(database, `chats/${roomId}`);
    await set(roomRef, {
      participants: [senderId, receiverId],
      lastMessage: newMessage,
      lastMessageTime: serverTimestamp(),
    }, { merge: true });
    console.log('Chat room updated successfully');

  } catch (error) {
    console.error('Error in sendMessage:', error);
    throw error;
  }
};

export const subscribeToMessages = (
  roomId: string,
  callback: (messages: Message[]) => void
) => {
  console.log('Subscribing to messages in room:', roomId);
  const messagesRef = ref(database, `chats/${roomId}/messages`);
  
  onValue(messagesRef, (snapshot) => {
    console.log('Received message update:', snapshot.val());
    const messages: Message[] = [];
    snapshot.forEach((childSnapshot) => {
      messages.push({
        id: childSnapshot.key as string,
        ...childSnapshot.val(),
      });
    });
    const sortedMessages = messages.sort((a, b) => a.timestamp - b.timestamp);
    console.log('Processed messages:', sortedMessages);
    callback(sortedMessages);
  });

  return () => {
    console.log('Unsubscribing from messages in room:', roomId);
    off(messagesRef);
  };
}; 