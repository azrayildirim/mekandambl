import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Notification {
  id: string;
  type: 'FRIEND_REQUEST' | 'PLACE_CHECK_IN' | 'PLACE_REVIEW';
  senderId: string;
  senderName: string;
  senderPhoto?: string;
  receiverId: string;
  read: boolean;
  createdAt: number;
  data: {
    placeId?: string;
    placeName?: string;
    message?: string;
  };
}

// Bildirim oluştur
export const createNotification = async (notification: Omit<Notification, 'id' | 'createdAt'>) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      ...notification,
      read: false,
      createdAt: Date.now()
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Bildirimleri gerçek zamanlı dinle
export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('receiverId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const notifications: Notification[] = [];
    snapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data()
      } as Notification);
    });
    callback(notifications);
  });
};

// Bildirimi okundu olarak işaretle
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('receiverId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const batch = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(batch);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}; 