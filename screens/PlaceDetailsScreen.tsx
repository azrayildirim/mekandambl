import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Image, 
  TouchableOpacity, 
  Dimensions, 
  Alert, 
  ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { addVisitedPlace, getPlaceDetails } from '../services/placesService';
import { auth, db } from '../config/firebase';
import { getDoc, doc } from 'firebase/firestore';
import * as Location from 'expo-location';
import { RootStackParamList } from '../types/navigation';
import { ref, onValue } from 'firebase/database';
import { database } from '../config/firebase';

type PlaceDetailsRouteProp = RouteProp<RootStackParamList, 'PlaceDetails'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  date: string;
}

interface Place {
  id: string;
  name: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  description?: string;
  rating?: number;
  address?: string;
  openingHours?: string;
  photos: string[];
  reviews: Review[];
  users: Array<{
    id: string;
    name: string;
    photoURL: string;
  }>;
}

export default function PlaceDetailsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<PlaceDetailsRouteProp>();
  const { placeId } = route.params;
  const [place, setPlace] = useState<Place | null>(null);
  const [isVisited, setIsVisited] = useState(false);
  const [isNearby, setIsNearby] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeUsers, setActiveUsers] = useState<Array<{
    id: string;
    name: string;
    photoURL: string;
    isOnline: boolean;
  }>>([]);

  // Mekan bilgilerini yükle
  useEffect(() => {
    const loadPlace = async () => {
      try {
        const placeData = await getPlaceDetails(placeId);
        setPlace(placeData);
      } catch (error) {
        console.error('Error loading place:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadPlace();
  }, [placeId]);

  // Ziyaret durumunu kontrol et
  useEffect(() => {
    if (!place) return;
    
    const checkIfVisited = async () => {
      if (!auth.currentUser) return;
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const visitedPlaces = userDoc.data()?.visitedPlaces || [];
      setIsVisited(visitedPlaces.includes(place.id));
    };
    checkIfVisited();
  }, [place?.id]);

  // Konum kontrolü
  useEffect(() => {
    if (!place) return;

    const checkLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const location = await Location.getCurrentPositionAsync({});
        const distance = calculateDistance(
          location.coords.latitude,
          location.coords.longitude,
          place.coordinate.latitude,
          place.coordinate.longitude
        );

        setIsNearby(distance <= 100);
      } catch (error) {
        console.error('Error checking location:', error);
      }
    };

    checkLocation();
  }, [place?.coordinate]);

  // Aktif kullanıcıları gerçek zamanlı dinle
  useEffect(() => {
    if (!placeId) return;

    // Realtime Database'den aktif kullanıcıları dinle
    const activeUsersRef = ref(database, `places/${placeId}/activeUsers`);
    const unsubscribe = onValue(activeUsersRef, async (snapshot) => {
      try {
        if (!snapshot.exists()) {
          setActiveUsers([]);
          return;
        }

        // Aktif kullanıcı ID'lerini al
        const activeUserIds = Object.keys(snapshot.val());
        
        // Her kullanıcı için Firestore'dan güncel bilgileri al
        const userDocs = await Promise.all(
          activeUserIds.map(userId => 
            getDoc(doc(db, 'users', userId))
          )
        );

        // Kullanıcı bilgilerini birleştir
        const updatedUsers = userDocs
          .filter(doc => doc.exists())
          .map(doc => {
            const userData = doc.data();
            return {
              id: doc.id,
              name: userData.name || 'İsimsiz Kullanıcı',
              photoURL: userData.photoURL || null,
              isOnline: true,
              lastSeen: userData.lastSeen || null
            };
          });

        console.log('Active users updated:', updatedUsers); // Debug için
        setActiveUsers(updatedUsers);
        
      } catch (error) {
        console.error('Error updating active users:', error);
      }
    });

    return () => unsubscribe();
  }, [placeId]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.errorContainer}>
        <Text>Mekan bulunamadı</Text>
      </View>
    );
  }

  // Mesafe hesaplama fonksiyonu (metre cinsinden)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // Dünya'nın yarıçapı (metre)
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Fotoğraf Galerisi */}
        <ScrollView 
          horizontal 
          pagingEnabled 
          showsHorizontalScrollIndicator={false}
          style={styles.photoGallery}
        >
          {place.photos.map((photo, index) => (
            <Image
              key={index}
              source={{ uri: photo }}
              style={styles.galleryImage}
            />
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.content}>
        <View style={styles.titleContainer}>
  <Text style={styles.title}>{place.name}</Text>
  {auth.currentUser && isNearby && (
    <TouchableOpacity 
      style={[
        styles.visitedButton,
        isVisited && styles.visitedButtonDisabled
      ]}
      onPress={async () => {
        if (!auth.currentUser || isVisited) return;
        try {
          await addVisitedPlace(auth.currentUser.uid, place.id);
          setIsVisited(true);
          Alert.alert('Başarılı', 'Mekan gittiğiniz yerler listesine eklendi');
        } catch (error) {
          Alert.alert('Hata', 'Mekan eklenirken bir hata oluştu');
        }
      }}
      disabled={isVisited}
    >
      <Ionicons 
        name={isVisited ? "checkmark-circle" : "add-circle"} 
        size={16} 
        color={isVisited ? "#4CAF50" : "#8A2BE2"} 
      />
      <Text style={[
        styles.buttonText,
        isVisited && styles.buttonTextVisited
      ]}>
        {isVisited ? 'Ziyaret Edildi' : 'Ziyaret Et'}
      </Text>
    </TouchableOpacity>
  )}
</View>
          
          {place.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={24} color="#FFD700" />
              <Text style={styles.rating}>{place.rating}</Text>
            </View>
          )}

          {place.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hakkında</Text>
              <Text style={styles.description}>{place.description}</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bilgiler</Text>
            
            {place.address && (
              <View style={styles.infoRow}>
                <Ionicons name="location" size={24} color="#8A2BE2" />
                <Text style={styles.infoText}>{place.address}</Text>
              </View>
            )}

            {place.openingHours && (
              <View style={styles.infoRow}>
                <Ionicons name="time" size={24} color="#8A2BE2" />
                <Text style={styles.infoText}>{place.openingHours}</Text>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Şu anda Mekanda ({activeUsers.length})
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.usersScroll}
            >
              {activeUsers.map(user => (
                <TouchableOpacity
                  key={user.id}
                  style={styles.userCard}
                  onPress={() => navigation.navigate('UserProfileScreen', { userId: user.id })}
                >
                  <Image 
                    source={{ uri: user.photoURL || undefined }} 
                    style={styles.userPhoto}
                    defaultSource={require('../assets/images/default-avatar.png')}
                  />
                  <Text style={styles.userName}>{user.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fotoğraflar</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.photoPreviewScroll}
            >
              {place.photos.map((photo, index) => (
                <TouchableOpacity 
                  key={index}
                  style={styles.photoPreview}
                >
                  <Image
                    source={{ uri: photo }}
                    style={styles.previewImage}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Yorumlar ({place.reviews?.length || 0})
            </Text>
            {place.reviews?.map(review => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Image 
                    source={{ uri: review.userPhoto }} 
                    style={styles.reviewerPhoto}
                  />
                  <View style={styles.reviewerInfo}>
                    <Text style={styles.reviewerName}>{review.userName}</Text>
                    <Text style={styles.reviewDate}>{review.date}</Text>
                  </View>
                  <View style={styles.reviewRating}>
                    <Ionicons name="star" size={16} color="#FFD700" />
                    <Text style={styles.reviewRatingText}>{review.rating}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
              </View>
            ))}
          </View>

     
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    height: 250,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
 
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  rating: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#444',
    flex: 1,
  },
  usersScroll: {
    marginTop: 10,
  },
  userCard: {
    alignItems: 'center',
    marginRight: 20,
  },
  userPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
  },
  userName: {
    fontSize: 14,
    color: '#666',
  },
  photoGallery: {
    height: 250,
  },
  galleryImage: {
    width: Dimensions.get('window').width,
    height: 250,
    resizeMode: 'cover',
  },
  photoPreviewScroll: {
    marginTop: 10,
  },
  photoPreview: {
    width: 100,
    height: 100,
    marginRight: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  reviewCard: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  reviewerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  reviewRating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 15,
  },
  reviewRatingText: {
    marginLeft: 4,
    fontWeight: '600',
    color: '#333',
  },
  reviewComment: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  visitedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F0E6FF',
  },
  visitedButtonDisabled: {
    backgroundColor: '#E8F5E9',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A2BE2',
    marginLeft: 4,
  },
  buttonTextVisited: {
    color: '#4CAF50',
  },
}); 