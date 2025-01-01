import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

export interface FriendshipStatus {
  areFriends: boolean;
  isPending: boolean;
  isRequestSent: boolean;
}

export const sendFriendRequest = async (senderId: string, receiverId: string) => {
  try {
    const receiverRef = doc(db, 'users', receiverId);
    await updateDoc(receiverRef, {
      friendRequests: arrayUnion({
        userId: senderId,
        timestamp: new Date().toISOString()
      })
    });

    const senderRef = doc(db, 'users', senderId);
    await updateDoc(senderRef, {
      sentRequests: arrayUnion({
        userId: receiverId,
        timestamp: new Date().toISOString()
      })
    });
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

    // Her iki kullanıcının arkadaş listesini güncelle
    await updateDoc(userRef, {
      friends: arrayUnion(friendId),
      friendRequests: arrayRemove({ userId: friendId })
    });

    await updateDoc(friendRef, {
      friends: arrayUnion(userId),
      sentRequests: arrayRemove({ userId })
    });
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