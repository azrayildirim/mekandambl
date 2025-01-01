import { ref, onValue, set, onDisconnect, serverTimestamp, doc, updateDoc } from 'firebase/database';
import { database } from '../config/firebase';
import { db } from '../config/firebase';

interface PresenceData {
  isOnline: boolean;
  lastSeen: number;
  currentPlace?: {
    id: string;
    name: string;
  };
}

export const setupPresence = (userId: string) => {
  const userStatusRef = ref(database, `/status/${userId}`);
  
  // Çevrimiçi durumunu ayarla
  const isOfflineData: PresenceData = {
    isOnline: false,
    lastSeen: serverTimestamp() as number,
  };
  
  const isOnlineData: PresenceData = {
    isOnline: true,
    lastSeen: serverTimestamp() as number,
  };

  // Bağlantı durumunu dinle
  const connectedRef = ref(database, '.info/connected');
  
  onValue(connectedRef, (snapshot) => {
    if (snapshot.val() === false) {
      return;
    }

    // Kullanıcı çıkış yaptığında veya bağlantı koptuğunda
    onDisconnect(userStatusRef)
      .set(isOfflineData)
      .then(() => {
        // Kullanıcı bağlandığında
        set(userStatusRef, isOnlineData);
      });
  });

  return userStatusRef;
};

export const updateUserPlace = async (
  userId: string, 
  placeData: { id: string; name: string; } | null
) => {
  const userStatusRef = ref(database, `/status/${userId}`);
  
  if (placeData) {
    await set(userStatusRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
      currentPlace: placeData
    });
  } else {
    // Mekandan çıkış yapıldığında
    await set(userStatusRef, {
      isOnline: true,
      lastSeen: serverTimestamp(),
      currentPlace: null
    });
  }
};

export const subscribeToUserPresence = (
  userId: string,
  onUpdate: (data: PresenceData) => void
) => {
  const userStatusRef = ref(database, `/status/${userId}`);
  
  return onValue(userStatusRef, (snapshot) => {
    const data = snapshot.val() as PresenceData;
    onUpdate(data);
  });
};

export const cleanupUserPresence = async (userId: string) => {
  try {
    const userStatusRef = ref(database, `status/${userId}`);
    const userPlaceRef = ref(database, `userPlaces/${userId}`);
    
    // Status ve mekan bilgilerini temizle
    await set(userStatusRef, null);
    await set(userPlaceRef, null);
    
    // Firestore'daki aktif mekan bilgisini temizle
    const userDoc = doc(db, 'users', userId);
    await updateDoc(userDoc, {
      activePlace: null,
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error('Error cleaning up user presence:', error);
    throw error;
  }
}; 