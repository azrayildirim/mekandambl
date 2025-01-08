import { collection, query, where, orderBy, addDoc, onSnapshot, doc, updateDoc, arrayUnion, getDoc, setDoc, increment, serverTimestamp, getDocs } from 'firebase/firestore';
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
    where('chatId', '==', chatId)
  );

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      } as Message);
    });
    messages.sort((a, b) => b.createdAt - a.createdAt);
    callback(messages);
  }, (error) => {
    console.error('Error in messages snapshot:', error);
  });
};

// Sohbetleri gerçek zamanlı dinle
export const subscribeToChats = (userId: string, callback: (chats: Chat[]) => void) => {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(q, async (snapshot) => {
    try {
      const chats: Chat[] = [];
      
      // Her bir chat dokümanı için
      for (const docSnapshot of snapshot.docs) {
        const chatData = docSnapshot.data();
        // Diğer kullanıcının ID'sini bul
        const otherUserId = chatData.participants.find((id: string) => id !== userId);
        
        if (otherUserId) {
          try {
            // Kullanıcı bilgilerini getir
            const userDocRef = doc(db, 'users', otherUserId);
            const userDocSnap = await getDoc(userDocRef);
            const userData = userDocSnap.data();

            if (userDocSnap.exists()) {
              chats.push({
                id: docSnapshot.id,
                participants: chatData.participants,
                lastMessage: chatData.lastMessage || null,
                unreadCount: chatData.unreadCount || 0,
                otherUser: {
                  id: otherUserId,
                  name: userData?.name || 'İsimsiz Kullanıcı',
                  photoURL: userData?.photoURL || null
                }
              });
            }
          } catch (userError) {
            console.error('Error fetching user data:', userError);
          }
        }
      }

      // Tarihe göre sırala
      chats.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt || 0;
        const timeB = b.lastMessage?.createdAt || 0;
        return timeB - timeA;
      });

      callback(chats);
    } catch (error) {
      console.error('Error in chats snapshot:', error);
    }
  }, (error) => {
    console.error('Snapshot listener error:', error);
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

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);

    // Okunmamış mesaj sayısını sıfırla
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      unreadCount: 0
    });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    throw error;
  }
}; 