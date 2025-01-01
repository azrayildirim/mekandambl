import { doc, setDoc, updateDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { ref, set } from 'firebase/database';
import { db, database } from '../config/firebase';

interface UserData {
  id: string;
  email: string;
  name: string;
  photoURL: string;
  status: string;
  lastSeen: string;
  allowMessages: boolean;
}

// Firestore'da kalıcı kullanıcı verilerini sakla
export const createUser = async (userData: UserData) => {
  try {
    // Firestore'a kalıcı verileri kaydet
    await setDoc(doc(db, 'users', userData.id), {
      email: userData.email,
      name: userData.name,
      photoURL: userData.photoURL,
      status: userData.status,
      allowMessages: userData.allowMessages
    });

    // RTDB'ye online durumu için kayıt ekle
    await set(ref(database, `status/${userData.id}`), {
      isOnline: true,
      lastSeen: new Date().toISOString(),
      currentPlace: null
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Kullanıcı bilgilerini güncelle
export const updateUser = async (userId: string, userData: {
  name?: string;
  photoURL?: string;
  status?: string;
}) => {
  try {
    // Firestore'daki profil bilgilerini güncelle
    await updateDoc(doc(db, 'users', userId), userData);

    // RTDB'deki aktif kullanıcı bilgilerini güncelle
    const userStatusRef = ref(database, `status/${userId}`);
    await set(userStatusRef, {
      ...userData,
      lastSeen: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}; 