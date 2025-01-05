import { collection, query, where, orderBy, addDoc, onSnapshot, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: number;
  };
  unreadCount: number;
  otherUser: {
    id: string;
    name: string;
    photoURL: string | null;
  };
}

// Yeni mesaj gönder
export const sendMessage = async (senderId: string, receiverId: string, text: string) => {
  try {
    // Sohbet ID'sini oluştur (küçük ID önce)
    const chatId = [senderId, receiverId].sort().join('_');
    
    // Önce sohbetin var olup olmadığını kontrol et
    const chatRef = doc(db, 'chats', chatId);
    const chatDoc = await getDoc(chatRef);

    // Sohbet yoksa yeni sohbet oluştur
    if (!chatDoc.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        participants: [senderId, receiverId],
        createdAt: serverTimestamp(),
        lastMessage: {
          text,
          senderId,
          createdAt: serverTimestamp()
        },
        unreadCount: 1
      });
    } else {
      // Sohbet varsa son mesajı güncelle
      await updateDoc(chatRef, {
        lastMessage: {
          text,
          senderId,
          createdAt: serverTimestamp()
        },
        unreadCount: increment(1)
      });
    }

    // Mesajı ekle
    await addDoc(collection(db, 'messages'), {
      chatId,
      senderId,
      receiverId,
      text,
      createdAt: serverTimestamp(),
      read: false
    });

  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

// Mesajları gerçek zamanlı dinle
export const subscribeToMessages = (chatId: string, callback: (messages: Message[]) => void) => {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('chatId', '==', chatId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      } as Message);
    });
    callback(messages);
  });
};

// Sohbetleri gerçek zamanlı dinle
export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('lastMessage.createdAt', 'desc')
  );

  return onSnapshot(q, async (snapshot) => {
    const chats: Chat[] = [];
    for (const doc of snapshot.docs) {
      const chatData = doc.data();
      const otherUserId = chatData.participants.find((id: string) => id !== userId);
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      const userData = userDoc.data();

      chats.push({
        id: doc.id,
        participants: chatData.participants,
        lastMessage: chatData.lastMessage,
        unreadCount: chatData.unreadCount || 0,
        otherUser: {
          id: otherUserId,
          name: userData?.name || 'İsimsiz Kullanıcı',
          photoURL: userData?.photoURL || null
        }
      } as Chat);
    }
    callback(chats);
  });
};

// Mesajları okundu olarak işaretle
export const markMessagesAsRead = async (chatId: string, userId: string) => {
  try {
    const messagesRef = collection(db, 'messages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      where('receiverId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDoc(q);
    const batch = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(batch);

    // Okunmamış mesaj sayısını sıfırla
    await updateDoc(doc(db, 'chats', chatId), {
      unreadCount: 0
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}; 