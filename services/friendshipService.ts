import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { addNotification } from './notificationService';

export interface FriendshipStatus {
  areFriends: boolean;
  isPending: boolean;
  isRequestSent: boolean;
}

export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  try {
    // Arkadaşlık isteği gönder
    const receiverRef = doc(db, 'users', receiverId);
    await updateDoc(receiverRef, {
      friendRequests: arrayUnion(senderId)
    });

    // Kullanıcı bilgilerini al
    const senderDoc = await getDoc(doc(db, 'users', senderId));
    const senderData = senderDoc.data();

    // Bildirim gönder
    await addNotification({
      userId: receiverId,
      type: 'FRIEND_REQUEST',
      senderId: senderId,
      senderName: senderData?.name || 'İsimsiz Kullanıcı',
      senderPhoto: senderData?.photoURL || null,
      message: 'size arkadaşlık isteği gönderdi',
      read: false,
      createdAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

export const checkFriendshipStatus = async (userId: string, otherUserId: string): Promise<FriendshipStatus> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    return {
      areFriends: userData?.friends?.includes(otherUserId) || false,
      isPending: userData?.friendRequests?.some(req => req.userId === otherUserId) || 
                userData?.sentRequests?.some(req => req.userId === otherUserId) || false,
      isRequestSent: userData?.sentRequests?.some(req => req.userId === otherUserId) || false
    };
  } catch (error) {
    console.error('Error checking friendship status:', error);
    throw error;
  }
};

export const acceptFriendRequest = async (userId: string, friendId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const friendRef = doc(db, 'users', friendId);

    // Kullanıcı bilgilerini al
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    // İsteği kaldır ve arkadaş listesine ekle
    await updateDoc(userRef, {
      friendRequests: arrayRemove(friendId),
      friends: arrayUnion(friendId)
    });

    await updateDoc(friendRef, {
      friends: arrayUnion(userId)
    });

    // Kabul bildirimini gönder
    await addNotification({
      userId: friendId,
      type: 'FRIEND_ACCEPTED',
      senderId: userId,
      senderName: userData?.name || 'İsimsiz Kullanıcı',
      senderPhoto: userData?.photoURL || null,
      message: 'arkadaşlık isteğinizi kabul etti',
      read: false,
      createdAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

export const rejectFriendRequest = async (userId: string, friendId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const friendRef = doc(db, 'users', friendId);

    // İsteği her iki taraftan da kaldır
    await updateDoc(userRef, {
      friendRequests: arrayRemove({ userId: friendId })
    });

    await updateDoc(friendRef, {
      sentRequests: arrayRemove({ userId })
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    throw error;
  }
};

export const removeFriend = async (userId: string, friendId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const friendRef = doc(db, 'users', friendId);

    // Her iki kullanıcının arkadaş listesinden kaldır
    await updateDoc(userRef, {
      friends: arrayRemove(friendId)
    });

    await updateDoc(friendRef, {
      friends: arrayRemove(userId)
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
}; 