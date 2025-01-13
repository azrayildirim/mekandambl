import { collection, getDocs, query as firestoreQuery, where, GeoPoint, DocumentData, addDoc, onSnapshot, doc, getDoc, updateDoc, arrayUnion, setDoc, orderBy, serverTimestamp as firestoreTimestamp } from 'firebase/firestore';
import { ref, get, set, serverTimestamp, query as databaseQuery, orderByChild, startAt, update } from 'firebase/database';
import { db, database } from '../config/firebase';
import { Place, Review, User } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sabitleri export et
export const PLACES_COLLECTION = 'places';
export const LAST_CONFIRM_KEY = 'lastPlaceConfirm';
export const ACTIVE_PLACE_KEY = 'activePlaceId';
export const CONFIRM_COOLDOWN = 30 * 60 * 1000; // 30 dakika
export const VISITS_COLLECTION = 'placeVisits';

interface VisitData {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  photoURL: string | null;
  placeId: string;
}

export const getNearbyPlaces = async (userLocation: { latitude: number; longitude: number }) => {
  try {
    const placesRef = collection(db, PLACES_COLLECTION);
    const placesSnapshot = await getDocs(placesRef);
    
    const places: Place[] = [];
    
    placesSnapshot.forEach((doc) => {
      const data = doc.data();
      const location = data.location as GeoPoint;
      
      places.push({
        id: doc.id,
        name: data.name,
        coordinate: {
          latitude: location.latitude,
          longitude: location.longitude
        },
        description: data.description,
        rating: data.rating,
        address: data.address,
        openingHours: data.openingHours,
        photos: data.photos || [],
        reviews: data.reviews || [],
        users: data.activeUsers || []
      });
    });

    return places;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    throw error;
  }
};

// Gerçek zamanlı mekan güncellemeleri için
export const subscribePlaces = (
  onPlacesUpdate: (places: Place[]) => void,
  onError: (error: Error) => void
) => {
  const placesRef = collection(db, PLACES_COLLECTION);
  
  return onSnapshot(
    placesRef,
    (snapshot) => {
      const places: Place[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const location = data.location as GeoPoint;
        
        places.push({
          id: doc.id,
          name: data.name,
          coordinate: {
            latitude: location.latitude,
            longitude: location.longitude
          },
          description: data.description,
          rating: data.rating,
          address: data.address,
          openingHours: data.openingHours,
          photos: data.photos || [],
          reviews: data.reviews || [],
          users: data.activeUsers || []
        });
      });
      onPlacesUpdate(places);
    },
    onError
  );
};

export const getPlaceDetails = async (placeId: string): Promise<Place> => {
  try {
    // Firestore'dan mekan bilgilerini al
    const placeDoc = await getDoc(doc(db, 'places', placeId));
    if (!placeDoc.exists()) {
      throw new Error('Place not found');
    }
    
    const data = placeDoc.data();
    const location = data.location as GeoPoint;

    // Realtime Database'den aktif kullanıcıları al
    const activeUsersRef = ref(database, `places/${placeId}/activeUsers`);
    const activeUsersSnapshot = await get(activeUsersRef);
    const activeUsers: any[] = [];

    if (activeUsersSnapshot.exists()) {
      const activeUserIds = Object.keys(activeUsersSnapshot.val());
      
      // Her aktif kullanıcının durumunu kontrol et
      const userPromises = activeUserIds.map(async (userId) => {
        // Önce auth durumunu kontrol et
        const userStatusRef = ref(database, `status/${userId}`);
        const userStatusSnapshot = await get(userStatusRef);
        
        // Kullanıcı çevrimiçi değilse veya status verisi yoksa, null döndür
        if (!userStatusSnapshot.exists() || !userStatusSnapshot.val().isOnline) {
          // Kullanıcıyı mekan listesinden kaldır
          await set(ref(database, `places/${placeId}/activeUsers/${userId}`), null);
          return null;
        }

        // Kullanıcı bilgilerini Firestore'dan al
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          return {
            id: userId,
            name: userData.name || 'İsimsiz Kullanıcı',
            photoURL: userData.photoURL || null,
            isOnline: true
          };
        }
        return null;
      });

      const users = await Promise.all(userPromises);
      activeUsers.push(...users.filter(user => user !== null));
    }
    
    return {
      id: placeDoc.id,
      name: data.name,
      coordinate: {
        latitude: location.latitude,
        longitude: location.longitude
      },
      description: data.description,
      rating: data.rating,
      address: data.address,
      photos: data.photos || [],
      reviews: data.reviews || [],
      users: activeUsers,
      openingHours: data.openingHours
    };
  } catch (error) {
    console.error('Error fetching place details:', error);
    throw error;
  }
};

export const updateActivePlaceUsers = async (placeId: string, userId: string, isEntering: boolean) => {
  try {
    // Kullanıcı ID'si yoksa işlemi iptal et
    if (!userId) {
      console.log('No user ID provided, skipping update');
      return;
    }

    const userStatusRef = ref(database, `places/${placeId}/activeUsers/${userId}`);
    
    if (isEntering) {
      await set(userStatusRef, {
        timestamp: Date.now()
      });
    } else {
      await set(userStatusRef, null);
    }
  } catch (error) {
    console.error('Error updating active users:', error);
    throw error;
  }
};

export const addPlace = async (placeData: Omit<Place, 'id'>) => {
  try {
    const docRef = await addDoc(collection(db, PLACES_COLLECTION), {
      ...placeData,
      location: new GeoPoint(
        placeData.coordinate.latitude,
        placeData.coordinate.longitude
      ),
      createdAt: new Date(),
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding place:', error);
    throw error;
  }
};

// Mesafe hesaplama fonksiyonu (Haversine formülü)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371e3; // Dünya'nın yarıçapı (metre)
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // metre cinsinden mesafe
};

// Kullanıcıları kontrol eden ve güncelleyen fonksiyon
export const updateUserLocation = async (
  userId: string,
  userLocation: { latitude: number; longitude: number }
) => {
  try {
    const lastConfirmStr = await AsyncStorage.getItem(LAST_CONFIRM_KEY);
    const activePlaceId = await AsyncStorage.getItem(ACTIVE_PLACE_KEY);
    const lastConfirmTime = lastConfirmStr ? parseInt(lastConfirmStr) : 0;
    const now = Date.now();

    // Eğer son teyitten bu yana 30 dakika geçmediyse teyit isteme
    if (activePlaceId && (now - lastConfirmTime) < CONFIRM_COOLDOWN) {
      return [];
    }

    const placesRef = collection(db, PLACES_COLLECTION);
    const placesSnapshot = await getDocs(placesRef);
    
    const nearbyPlaces: { id: string; name: string }[] = [];
    const userPlaces: string[] = [];
    
    placesSnapshot.forEach((doc) => {
      const place = doc.data();
      const placeLocation = place.location as GeoPoint;
      
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        placeLocation.latitude,
        placeLocation.longitude
      );

      if (distance <= 100) {
        nearbyPlaces.push({ 
          id: doc.id, 
          name: place.name 
        });
        userPlaces.push(doc.id);
      }
    });

    // Kullanıcı aktif mekandan çıktıysa
    if (activePlaceId && !userPlaces.includes(activePlaceId)) {
      await updateActivePlaceUsers(activePlaceId, userId, false);
      await AsyncStorage.removeItem(ACTIVE_PLACE_KEY);
      await AsyncStorage.removeItem(LAST_CONFIRM_KEY);
    }

    // Eğer kullanıcı bir mekandaysa ve yeni teyit yapıldıysa
    if (userPlaces.length > 0) {
      const placeId = userPlaces[0]; // En yakın mekan
      
      // Kullanıcı bilgilerini al ve ziyaret kaydı oluştur
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();

      // Ziyaret kaydını Firestore'a ekle
      const visitRef = doc(collection(db, VISITS_COLLECTION));
      await setDoc(visitRef, {
        placeId,
        userId,
        userName: userData?.name || 'İsimsiz Kullanıcı',
        photoURL: userData?.photoURL || null,
        timestamp: firestoreTimestamp(),
        visitDate: new Date().toISOString()
      });

      // Kullanıcının visitedPlaces listesini güncelle
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        visitedPlaces: arrayUnion(placeId)
      });

      // Son teyit zamanını güncelle
      await AsyncStorage.setItem(LAST_CONFIRM_KEY, now.toString());
      await AsyncStorage.setItem(ACTIVE_PLACE_KEY, placeId);
    }

    return nearbyPlaces;
  } catch (error) {
    console.error('Error checking nearby places:', error);
    throw error;
  }
};

// Kullanıcının gittiği mekanları kaydet
export const addVisitedPlace = async (userId: string, placeId: string) => {
  try {
    // Kullanıcı bilgilerini al
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    // Ziyaret kaydını Firestore'a ekle
    const visitRef = doc(collection(db, VISITS_COLLECTION));
    const timestamp = firestoreTimestamp();
    
    await setDoc(visitRef, {
      placeId,
      userId,
      userName: userData?.name || 'İsimsiz Kullanıcı',
      photoURL: userData?.photoURL || null,
      timestamp,
      visitDate: new Date().toISOString()
    });

    // Kullanıcının visitedPlaces listesini güncelle
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      visitedPlaces: arrayUnion(placeId),
      lastVisitedPlace: {
        placeId,
        timestamp,
        visitDate: new Date().toISOString()
      }
    });

    return true;
  } catch (error) {
    console.error('Error adding visited place:', error);
    throw error;
  }
};

// Son 30 gün ziyaretçilerini getir
export const getRecentVisitors = async (placeId: string) => {
  try {
    const visitsRef = collection(db, VISITS_COLLECTION);
    const visitsQuery = firestoreQuery(
      visitsRef,
      where('placeId', '==', placeId)
    );

    const snapshot = await getDocs(visitsQuery);
    const visitors = new Map();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    snapshot.docs
      .map(doc => ({
        ...doc.data(),
        id: doc.id,
        timestamp: doc.data().timestamp?.toDate() || new Date(doc.data().visitDate)
      } as VisitData))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .forEach(data => {
        if (data.timestamp >= thirtyDaysAgo && !visitors.has(data.userId)) {
          visitors.set(data.userId, {
            id: data.userId,
            name: data.userName,
            photoURL: data.photoURL,
            visitDate: data.timestamp.toLocaleDateString('tr-TR', {
              month: 'long',
              day: 'numeric'
            })
          });
        }
      });

    return Array.from(visitors.values());
  } catch (error) {
    console.error('Error fetching visitors:', error);
    throw error;
  }
};

// Mekana yorum ekle
export const addPlaceReview = async (
  placeId: string, 
  userId: string,
  review: {
    rating: number;
    comment: string;
  }
) => {
  try {
    const placeRef = doc(db, PLACES_COLLECTION, placeId);
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    const newReview = {
      id: `${userId}_${Date.now()}`,
      userId,
      userName: userData?.name || 'İsimsiz Kullanıcı',
      userPhoto: userData?.photoURL || '',
      rating: review.rating,
      comment: review.comment,
      date: new Date().toISOString()
    };

    await updateDoc(placeRef, {
      reviews: arrayUnion(newReview),
      rating: await calculateNewRating(placeId, review.rating)
    });

    return newReview;
  } catch (error) {
    console.error('Error adding review:', error);
    throw error;
  }
};

// Mekanın yeni puanını hesapla
const calculateNewRating = async (placeId: string, newRating: number) => {
  const placeDoc = await getDoc(doc(db, PLACES_COLLECTION, placeId));
  const reviews = placeDoc.data()?.reviews || [];
  const totalRatings = reviews.length;
  const currentRating = placeDoc.data()?.rating || 0;

  return ((currentRating * totalRatings) + newRating) / (totalRatings + 1);
};

export const recordVisit = async (placeId: string, userId: string) => {
  try {
    const visitsRef = ref(database, `places/${placeId}/visits/${userId}`);
    const snapshot = await get(visitsRef);
    
    // Ziyaret kaydını güncelle veya oluştur
    await set(visitsRef, {
      timestamp: Date.now(),
      userId,
      lastVisit: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Ziyaret kaydedilemedi:', error);
    throw error;
  }
}; 