import { collection, addDoc, query, where, orderBy, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export enum NotificationType {
  FOLLOW_REQUEST = 'FOLLOW_REQUEST',
  FOLLOW_ACCEPT = 'FOLLOW_ACCEPT',
  PLACE_VISIT = 'PLACE_VISIT',
  // ... diğer bildirim tipleri
}

interface Notification {
  id: string;
  type: NotificationType;
  fromUserId: string;
  toUserId: string;
  read: boolean;
  createdAt: Date;
  data?: any;
}

// Takip isteği bildirimi gönder
export const sendFollowRequestNotification = async (fromUserId: string, toUserId: string) => {
  try {
    console.log('Sending notification...', { fromUserId, toUserId }); // Debug log 1

    const notificationsRef = collection(db, 'notifications');
    const fromUserDoc = await getDoc(doc(db, 'users', fromUserId));
    const fromUserData = fromUserDoc.data();

    console.log('User data fetched:', fromUserData); // Debug log 2

    const notificationData = {
      type: NotificationType.FOLLOW_REQUEST,
      fromUserId,
      toUserId,
      read: false,
      createdAt: serverTimestamp(),
      data: {
        status: 'pending',
        fromUserName: fromUserData?.name || 'İsimsiz Kullanıcı',
        fromUserPhoto: fromUserData?.photoURL || null
      }
    };

    console.log('Notification data:', notificationData); // Debug log 3

    const docRef = await addDoc(notificationsRef, notificationData);
    console.log('Notification created with ID:', docRef.id); // Debug log 4

    return docRef.id;
  } catch (error) {
    console.error('Error sending follow request notification:', error);
    throw error;
  }
};

// Takip kabul bildirimi gönder
export const sendFollowAcceptNotification = async (fromUserId: string, toUserId: string) => {
  try {
    const notificationsRef = collection(db, 'notifications');
    await addDoc(notificationsRef, {
      type: NotificationType.FOLLOW_ACCEPT,
      fromUserId,
      toUserId,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error sending follow accept notification:', error);
    throw error;
  }
};

// Bildirimleri getir
export const getNotifications = async (userId: string) => {
  try {
    console.log('Fetching notifications for user:', userId); // Debug log 1

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    console.log('Found notifications:', snapshot.size); // Debug log 2

    const notifications = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      console.log('Raw notification data:', data); // Debug log 3

      // Timestamp'i düzgün şekilde dönüştür
      const createdAt = data.createdAt?.toDate?.() || new Date();
      
      notifications.push({
        id: doc.id,
        type: data.type,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        read: data.read || false,
        createdAt,
        data: data.data || {}
      });
    }

    console.log('Processed notifications:', notifications); // Debug log 4
    return notifications;
  } catch (error) {
    console.error('Error getting notifications:', error);
    throw error;
  }
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