import { collection, doc, getDoc, getDocs, query, where, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { sendFollowRequestNotification, sendFollowAcceptNotification } from './notificationService';

// Kullanıcıyı takip et
export const followUser = async (followerId: string, followingId: string) => {
  try {
    // Takip eden kullanıcının following listesine ekle
    const followerRef = doc(db, 'users', followerId);
    await updateDoc(followerRef, {
      following: arrayUnion(followingId)
    });

    // Takip edilen kullanıcının followers listesine ekle
    const followingRef = doc(db, 'users', followingId);
    await updateDoc(followingRef, {
      followers: arrayUnion(followerId)
    });

    return true;
  } catch (error) {
    console.error('Error following user:', error);
    throw error;
  }
};

// Kullanıcıyı takipten çık
export const unfollowUser = async (followerId: string, followingId: string) => {
  try {
    // Takip eden kullanıcının following listesinden çıkar
    const followerRef = doc(db, 'users', followerId);
    await updateDoc(followerRef, {
      following: arrayRemove(followingId)
    });

    // Takip edilen kullanıcının followers listesinden çıkar
    const followingRef = doc(db, 'users', followingId);
    await updateDoc(followingRef, {
      followers: arrayRemove(followerId)
    });

    return true;
  } catch (error) {
    console.error('Error unfollowing user:', error);
    throw error;
  }
};

// Takipçileri getir
export const getFollowers = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const followers = userDoc.data()?.followers || [];

    const followerUsers = await Promise.all(
      followers.map(async (followerId: string) => {
        const followerDoc = await getDoc(doc(db, 'users', followerId));
        const followerData = followerDoc.data();
        return {
          id: followerId,
          name: followerData?.name || 'İsimsiz Kullanıcı',
          photoURL: followerData?.photoURL || null,
          isOnline: followerData?.isOnline || false
        };
      })
    );

    return followerUsers;
  } catch (error) {
    console.error('Error getting followers:', error);
    throw error;
  }
};

// Takip edilenleri getir
export const getFollowing = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const following = userDoc.data()?.following || [];

    const followingUsers = await Promise.all(
      following.map(async (followingId: string) => {
        const followingDoc = await getDoc(doc(db, 'users', followingId));
        const followingData = followingDoc.data();
        return {
          id: followingId,
          name: followingData?.name || 'İsimsiz Kullanıcı',
          photoURL: followingData?.photoURL || null,
          isOnline: followingData?.isOnline || false
        };
      })
    );

    return followingUsers;
  } catch (error) {
    console.error('Error getting following:', error);
    throw error;
  }
};

// Takip durumunu kontrol et
export const checkFollowStatus = async (followerId: string, followingId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', followerId));
    const following = userDoc.data()?.following || [];
    return following.includes(followingId);
  } catch (error) {
    console.error('Error checking follow status:', error);
    throw error;
  }
};

// Takipçi ve takip edilen sayılarını getir
export const getFollowCounts = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();
    return {
      followers: (userData?.followers || []).length,
      following: (userData?.following || []).length
    };
  } catch (error) {
    console.error('Error getting follow counts:', error);
    throw error;
  }
};

// Takip isteği gönder
export const sendFollowRequest = async (followerId: string, followingId: string) => {
  try {
    console.log('Sending follow request...', { followerId, followingId }); // Debug log 1

    // Önce mevcut durumu kontrol et
    const userDoc = await getDoc(doc(db, 'users', followingId));
    const userData = userDoc.data();
    const followRequests = userData?.followRequests || [];

    console.log('Current follow requests:', followRequests); // Debug log 2

    if (followRequests.includes(followerId)) {
      console.log('Follow request already exists'); // Debug log 3
      return false;
    }

    // Takip isteğini kaydet
    const followingRef = doc(db, 'users', followingId);
    await updateDoc(followingRef, {
      followRequests: arrayUnion(followerId)
    });

    console.log('Follow request saved to user document'); // Debug log 4

    // Bildirim gönder
    await sendFollowRequestNotification(followerId, followingId);
    console.log('Notification sent successfully'); // Debug log 5

    return true;
  } catch (error) {
    console.error('Error sending follow request:', error);
    throw error;
  }
};

// Takip isteğini kabul et
export const acceptFollowRequest = async (followerId: string, followingId: string) => {
  try {
    // İsteği kaldır ve takipçi olarak ekle
    const followingRef = doc(db, 'users', followingId);
    await updateDoc(followingRef, {
      followRequests: arrayRemove(followerId),
      followers: arrayUnion(followerId)
    });

    // Takip edilen kişinin following listesine ekle
    const followerRef = doc(db, 'users', followerId);
    await updateDoc(followerRef, {
      following: arrayUnion(followingId)
    });

    // Kabul bildirimi gönder
    await sendFollowAcceptNotification(followingId, followerId);

    return true;
  } catch (error) {
    console.error('Error accepting follow request:', error);
    throw error;
  }
};

// Takip isteğini reddet
export const rejectFollowRequest = async (followerId: string, followingId: string) => {
  try {
    const followingRef = doc(db, 'users', followingId);
    await updateDoc(followingRef, {
      followRequests: arrayRemove(followerId)
    });

    return true;
  } catch (error) {
    console.error('Error rejecting follow request:', error);
    throw error;
  }
};

// Takip isteği durumunu kontrol et
export const checkFollowRequestStatus = async (followerId: string, followingId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', followingId));
    const followRequests = userDoc.data()?.followRequests || [];
    return followRequests.includes(followerId);
  } catch (error) {
    console.error('Error checking follow request status:', error);
    throw error;
  }
};

// Bekleyen takip isteklerini getir
export const getPendingFollowRequests = async (userId: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const followRequests = userDoc.data()?.followRequests || [];

    const requestUsers = await Promise.all(
      followRequests.map(async (requesterId: string) => {
        const requesterDoc = await getDoc(doc(db, 'users', requesterId));
        const requesterData = requesterDoc.data();
        return {
          id: requesterId,
          name: requesterData?.name || 'İsimsiz Kullanıcı',
          photoURL: requesterData?.photoURL || null
        };
      })
    );

    return requestUsers;
  } catch (error) {
    console.error('Error getting follow requests:', error);
    throw error;
  }
}; 