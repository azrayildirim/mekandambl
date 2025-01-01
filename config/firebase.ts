import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA3eY0DMyihRQvNHicACbg9gZpekkqH2uc",
  authDomain: "mekandavt.firebaseapp.com",
  databaseURL: "https://mekandavt-default-rtdb.firebaseio.com",
  projectId: "mekandavt",
  storageBucket: "mekandavt.firebasestorage.app",
  messagingSenderId: "195208398416",
  appId: "1:195208398416:web:aa30901cc3b8ef82977355",
  measurementId: "G-PP717KRBZG"
};

// Firebase'i başlat
const app = initializeApp(firebaseConfig);

// Firebase servislerini başlat
const auth = getAuth(app);
const db = getFirestore(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { auth, db, database, storage };