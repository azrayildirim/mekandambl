import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Alert, Dimensions, Image, Text, ScrollView, TouchableOpacity, Animated, PanResponder, Modal, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import CustomAlert from '../components/CustomAlert';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getNearbyPlaces, subscribePlaces, updateActivePlaceUsers, updateUserLocation, ACTIVE_PLACE_KEY, LAST_CONFIRM_KEY, addVisitedPlace, addPlaceReview } from '../services/placesService';
import { onAuthStateChanged } from 'firebase/auth';
import { setupPresence, updateUserPlace, subscribeToUserPresence } from '../services/presenceService';
import { serverTimestamp } from 'firebase/database';
import { ref, set, onValue } from 'firebase/database';
import { database } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { RootStackParamList } from '../types/navigation';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

interface User {
  id: string;
  name: string;
  photoURL: string;
  status: string;
  lastSeen: string;
  allowMessages: boolean;
  isOnline: boolean;
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
  users: User[];
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  rating: number;
  comment: string;
  date: string;
}

const nightModeMapStyle = [
    {
      elementType: 'geometry',
      stylers: [{ color: '#242f3e' }],
    },
    {
      elementType: 'labels.text.fill',
      stylers: [{ color: '#746855' }],
    },
    {
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#242f3e' }],
    },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#263c3f' }],
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b9a76' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }],
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }],
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#746855' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }],
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }],
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#2f3948' }],
    },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#515c6d' }],
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#17263c' }],
    },
  ];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NearbyPlaces() {
  const navigation = useNavigation<NavigationProp>();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [nearbyPlaces, setNearbyPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const translateX = useRef(new Animated.Value(0)).current;
  const [showPlaceDetails, setShowPlaceDetails] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nearbyPlaceToConfirm, setNearbyPlaceToConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [currentUser, setCurrentUser] = useState<{
    photoURL: string | null;
    displayName: string | null;
  } | null>(null);
  const [rejectedPlaces, setRejectedPlaces] = useState<Set<string>>(new Set());
  const [activePlace, setActivePlace] = useState<string | null>(null);
  const [lastConfirmTime, setLastConfirmTime] = useState<number>(0);
  const CONFIRM_COOLDOWN = 30 * 60 * 1000; // 30 dakika (milisaniye cinsinden)
  const [hasConfirmedOnce, setHasConfirmedOnce] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewData, setReviewData] = useState({
    rating: 0,
    comment: ''
  });
  
  // Pan Responder'ı oluştur
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx > 0) { // Sadece sağa kaydırmaya izin ver
          translateX.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) { // Eğer 50 pikselden fazla kaydırıldıysa
          Animated.timing(translateX, {
            toValue: Dimensions.get('window').width,
            duration: 200,
            useNativeDriver: true
          }).start(() => setSelectedPlace(null));
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true
          }).start();
        }
      }
    })
  ).current;

  // selectedPlace değiştiğinde animasyonu sıfırla
  useEffect(() => {
    if (selectedPlace) {
      translateX.setValue(0);
    }
  }, [selectedPlace]);

  const [alert, setAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'warning' | 'error' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });

  const showAlert = (title: string, message: string, type: 'warning' | 'error' | 'info') => {
    setAlert({
      visible: true,
      title,
      message,
      type
    });
  };

  const handleMessage = (user: User) => {
    if (!auth.currentUser) {
      showAlert(
        'Oturum Gerekli',
        'Mesaj göndermek için mekanda oturum açmalısınız.',
        'warning'
      );
      return;
    }

    if (!user.isOnline) {
      showAlert(
        'Kullanıcı Mekanda Değil',
        'Bu kullanıcı şu anda mekanda bulunmuyor.',
        'info'
      );
      return;
    }

    if (!user.allowMessages) {
      showAlert(
        'Mesajlaşma Kapalı',
        'Bu kullanıcı mesaj almaya kapalı.',
        'error'
      );
      return;
    }

    // Mesajlaşma sayfasına yönlendir
    // navigation.navigate('Chat', { userId: user.id });
  };

  const handleLocationUpdate = async (newLocation: Location.LocationObject) => {
    if (!auth.currentUser) return;

    // Eğer kullanıcı daha önce bir mekana giriş yapmışsa, sadece konum güncellemesi yap
    if (hasConfirmedOnce) {
      try {
        await updateUserLocation(
          auth.currentUser.uid,
          {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          }
        );
      } catch (error) {
        console.error('Error updating location:', error);
      }
      return;
    }

    try {
      const nearbyPlaces = await updateUserLocation(
        auth.currentUser.uid,
        {
          latitude: newLocation.coords.latitude,
          longitude: newLocation.coords.longitude,
        }
      );

      const nextPlace = nearbyPlaces.find(place => 
        !rejectedPlaces.has(place.id) && 
        !nearbyPlaceToConfirm
      );

      if (nextPlace) {
        setNearbyPlaceToConfirm(nextPlace);
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  useEffect(() => {
    let locationSubscription: Location.LocationSubscription;

    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Konum izni reddedildi');
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        // İlk yükleme için mekanları getir
        const places = await getNearbyPlaces({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude
        });
        setNearbyPlaces(places);

        // Gerçek zamanlı güncellemeler için subscribe ol
        const unsubscribe = subscribePlaces(
          (updatedPlaces) => {
            setNearbyPlaces(updatedPlaces);
          },
          (error) => {
            console.error('Realtime update error:', error);
            setError('Mekan güncellemeleri alınamıyor');
          }
        );

        // Konum güncellemelerini dinle
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10,
          },
          (newLocation) => {
            setLocation(newLocation);
            handleLocationUpdate(newLocation);
          }
        );

        // Cleanup function
        return () => {
          unsubscribe();
          if (locationSubscription) {
            locationSubscription.remove();
          }
        };

      } catch (err) {
        console.error('Error:', err);
        setError('Mekanlar yüklenirken bir hata oluştu');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Kullanıcı onayı için Alert göster
  useEffect(() => {
    if (nearbyPlaceToConfirm && auth.currentUser) {
      Alert.alert(
        'Mekan Teyidi',
        `${nearbyPlaceToConfirm.name} mekanında mısınız?`,
        [
          {
            text: 'Hayır',
            style: 'cancel',
            onPress: () => {
              setRejectedPlaces(prev => new Set(prev).add(nearbyPlaceToConfirm.id));
              setNearbyPlaceToConfirm(null);
            }
          },
          {
            text: 'Evet',
            onPress: async () => {
              if (!auth.currentUser) return;

              try {
                await updateUserPlace(auth.currentUser.uid, {
                  id: nearbyPlaceToConfirm.id,
                  name: nearbyPlaceToConfirm.name
                });

                // Firestore'da mekanın aktif kullanıcılar listesini güncelle
                await updateActivePlaceUsers(
                  nearbyPlaceToConfirm.id,
                  auth.currentUser.uid,
                  true
                );

                // AsyncStorage'a kaydet
                await AsyncStorage.setItem(ACTIVE_PLACE_KEY, nearbyPlaceToConfirm.id);
                await AsyncStorage.setItem(LAST_CONFIRM_KEY, Date.now().toString());

                setHasConfirmedOnce(true);
                setNearbyPlaceToConfirm(null);
              } catch (error) {
                console.error('Error updating user presence:', error);
                Alert.alert('Hata', 'Mekan güncellenirken bir hata oluştu');
              }
            }
          }
        ]
      );
    }
  }, [nearbyPlaceToConfirm]);

  // Kullanıcı çıkış yaptığında veya uygulama kapandığında aktif mekanı temizle
  useEffect(() => {
    const handleUserLeave = async () => {
      if (activePlace && auth.currentUser) {
        await updateActivePlaceUsers(activePlace, auth.currentUser.uid, false);
      }
    };

    return () => {
      handleUserLeave();
    };
  }, [activePlace]);

  // Auth state'ini dinle
  useEffect(() => {
    // Auth state değişikliklerini dinle
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        return;
      }

      // Kullanıcı giriş yaptığında
      setCurrentUser({
        photoURL: user.photoURL,
        displayName: user.displayName
      });

      // Presence sistemini başlat
      const userStatusRef = setupPresence(user.uid);

      // Mevcut konumu kullanarak mekan kontrolü yap
      if (location) {
        handleLocationUpdate(location);
      }

      return () => {
        // Cleanup
        set(userStatusRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      };
    });

    return () => {
      unsubscribeAuth();
    };
  }, [location]); // location'ı dependency olarak ekle

  useEffect(() => {
    if (auth.currentUser) {
      // Kullanıcı presence sistemini başlat
      const userStatusRef = setupPresence(auth.currentUser.uid);
      
      return () => {
        // Cleanup
        set(userStatusRef, {
          isOnline: false,
          lastSeen: serverTimestamp()
        });
      };
    }
  }, []);

  const handlePlaceConfirm = async (placeId: string, placeName: string) => {
    if (!auth.currentUser) return;

    try {
      await updateUserPlace(auth.currentUser.uid, { id: placeId, name: placeName });
      // ... diğer işlemler
    } catch (error) {
      console.error('Error updating place:', error);
    }
  };

  const handlePlaceExit = async () => {
    if (!auth.currentUser) return;

    try {
      await updateUserPlace(auth.currentUser.uid, null);
      // ... diğer işlemler
    } catch (error) {
      console.error('Error exiting place:', error);
    }
  };

  // Seçili mekanın aktif kullanıcılarını dinle
  useEffect(() => {
    if (selectedPlace) {
      // RTDB'den aktif kullanıcıları al
      const placeUsersRef = ref(database, `places/${selectedPlace.id}/activeUsers`);
      const unsubscribe = onValue(placeUsersRef, async (snapshot) => {
        const activeUserIds = snapshot.val() || {};
        
        // Her aktif kullanıcının detaylarını Firestore'dan al
        const userPromises = Object.keys(activeUserIds).map(async (userId) => {
          const userDoc = await getDoc(doc(db, 'users', userId));
          const userData = userDoc.data();
          return {
            id: userId,
            name: userData?.name || 'İsimsiz Kullanıcı',
            photoURL: userData?.photoURL || '',
            status: userData?.status || 'Merhaba! Mekanda kullanıyorum.',
            lastSeen: new Date().toISOString(),
            allowMessages: userData?.allowMessages ?? true,
            isOnline: true
          };
        });

        const activeUsers = await Promise.all(userPromises);
        
        // Mekan bilgilerini güncelle
        setSelectedPlace(prev => prev ? {
          ...prev,
          users: activeUsers
        } : null);
      });

      return () => unsubscribe();
    }
  }, [selectedPlace?.id]);

  if (!location) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.messageText}>Konum bilgisi alınamıyor</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#8A2BE2" />
        <Text style={styles.messageText}>Mekanlar yükleniyor...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle" size={32} color="#FF4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setIsLoading(true);
            setError(null);
            // Yeniden yükleme işlemi
          }}
        >
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={nightModeMapStyle}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
        onPress={() => {
          if (selectedPlace) {
            Animated.timing(translateX, {
              toValue: Dimensions.get('window').width,
              duration: 200,
              useNativeDriver: true
            }).start(() => setSelectedPlace(null));
          }
        }}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title="Benim Konumum"
          pinColor="blue"
        />

        {nearbyPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinate}
            onPress={() => setSelectedPlace(place)}
          >
            <View>
              <Image
                source={require('../assets/images/marker.png')}
                style={styles.markerImage}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.topButtonsContainer}>
        {currentUser ? (
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {currentUser.photoURL ? (
              <Image 
                source={{ uri: currentUser.photoURL }} 
                style={styles.profilePhoto}
              />
            ) : (
              <View style={styles.profilePhotoPlaceholder}>
                <Text style={styles.profileInitials}>
                  {currentUser.displayName?.charAt(0) || 'U'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.signUpButton}
            onPress={() => navigation.navigate('SignIn')}
          >
            <Ionicons name="person" size={24} color="#8A2BE2" />
            <Text style={styles.signUpButtonText}>Giriş Yap</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedPlace && (
        <Animated.View 
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateX: translateX }]
            }
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.bottomSheetHeader}>
            <View style={styles.headerLeft}>
              <Text style={styles.placeName}>{selectedPlace.name}</Text>
              <Text style={styles.userCount}>
                {selectedPlace.users.length} kişi burada
              </Text>
            </View>
            <TouchableOpacity 
              style={styles.placeDetailsButton}
              onPress={() => {
                setShowPlaceDetails(false);
                navigation.navigate('PlaceDetails', { place: selectedPlace });
              }}
            >
              <Ionicons name="compass-outline" size={18} color="#8A2BE2" />
              <Text style={styles.placeDetailsText}>Keşfet</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.userList}>
            {selectedPlace?.users.map((user: User) => (
              <View key={user.id} style={styles.userItem}>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('UserProfileScreen', { userId: user.id })}
                >
                  {user.photoURL ? (
                    <Image source={{ uri: user.photoURL }} style={styles.userPhoto} />
                  ) : (
                    <View style={[styles.userPhoto, { backgroundColor: '#8A2BE2', justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                        {user.name?.charAt(0) || 'U'}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.userInfo}>
                  <View style={styles.userHeader}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('UserProfileScreen', { userId: user.id })}
                    >
                      <Text style={styles.userName}>
                        {user.name}
                      </Text>
                    </TouchableOpacity>
                    <View style={[styles.statusDot, { 
                      backgroundColor: user.isOnline ? '#4CAF50' : '#9e9e9e' 
                    }]} />
                  </View>
                  <Text style={styles.userStatus}>{user.status}</Text>
                  <Text style={styles.userLastSeen}>
                    {new Date(user.lastSeen).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>

                <TouchableOpacity 
                  style={[
                    styles.messageButton,
                    (!user.allowMessages || !user.isOnline) && styles.messageButtonDisabled
                  ]}
                  onPress={() => handleMessage(user)}
                  disabled={!user.allowMessages || !user.isOnline}
                >
                  <Ionicons 
                    name="chatbubble-ellipses" 
                    size={24} 
                    color={(!user.allowMessages || !user.isOnline) ? '#9e9e9e' : 'white'} 
                  />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <Modal
        visible={showPlaceDetails}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedPlace?.name}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setSelectedPlace(null)}
              >
                <Ionicons name="close" size={24} color="black" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedPlace?.rating && (
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text style={styles.ratingText}>{selectedPlace.rating}</Text>
                </View>
              )}

              {selectedPlace?.description && (
                <Text style={styles.description}>{selectedPlace.description}</Text>
              )}

              {selectedPlace?.address && (
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#8A2BE2" />
                  <Text style={styles.infoText}>{selectedPlace.address}</Text>
                </View>
              )}

              {selectedPlace?.openingHours && (
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={20} color="#8A2BE2" />
                  <Text style={styles.infoText}>{selectedPlace.openingHours}</Text>
                </View>
              )}

              {auth.currentUser && selectedPlace && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.visitedButton}
                    onPress={async () => {
                      if (!auth.currentUser) return;
                      try {
                        await addVisitedPlace(auth.currentUser.uid, selectedPlace.id);
                        Alert.alert('Başarılı', 'Mekan gittiğiniz yerler listesine eklendi');
                      } catch (error) {
                        Alert.alert('Hata', 'Mekan eklenirken bir hata oluştu');
                      }
                    }}
                  >
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.buttonText}>Mekana Gittim</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.reviewButton}
                    onPress={() => setShowReviewModal(true)}
                  >
                    <Ionicons name="star" size={24} color="white" />
                    <Text style={styles.buttonText}>Yorum Yap</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Yorumlar listesi */}
              <View style={styles.reviewsSection}>
                <Text style={styles.sectionTitle}>Yorumlar</Text>
                {selectedPlace?.reviews.map(review => (
                  <View key={review.id} style={styles.reviewItem}>
                    <Image 
                      source={{ uri: review.userPhoto || undefined }} 
                      style={styles.reviewerPhoto}
                    />
                    <View style={styles.reviewContent}>
                      <Text style={styles.reviewerName}>{review.userName}</Text>
                      <View style={styles.ratingStars}>
                        {[...Array(5)].map((_, i) => (
                          <Ionicons 
                            key={i}
                            name={i < review.rating ? "star" : "star-outline"}
                            size={16}
                            color="#FFD700"
                          />
                        ))}
                      </View>
                      <Text style={styles.reviewText}>{review.comment}</Text>
                      <Text style={styles.reviewDate}>
                        {new Date(review.date).toLocaleDateString('tr-TR')}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        {/* Modal içeriği buraya gelecek */}
      </Modal>

      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={() => setAlert(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '40%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    transform: [{ translateX: 0 }] // Başlangıç pozisyonu
  },
  bottomSheetHeader: {
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  placeDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0e6ff',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: '#e6d5ff',
    elevation: 2,
    shadowColor: '#8A2BE2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  placeDetailsText: {
    color: '#8A2BE2',
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  modalScroll: {
    marginBottom: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 5,
  },
  description: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  placeName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userCount: {
    fontSize: 14,
    color: '#666',
  },
  userList: {
    marginTop: 10,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 10,
  },
  userPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  userStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userLastSeen: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 6,
  },
  messageButton: {
    backgroundColor: '#8A2BE2',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  messageButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  addPlaceButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  messageText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    textAlign: 'center',
    marginHorizontal: 20,
    marginTop: 10,
  },
  retryButton: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#8A2BE2',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  topButtonsContainer: {
    position: 'absolute',
    top: 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  signUpButtonText: {
    color: '#8A2BE2',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  profilePhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profilePhotoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  visitedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A2BE2',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  reviewItem: {
    flexDirection: 'row',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  reviewerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  reviewContent: {
    flex: 1,
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ratingStars: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  reviewDate: {
    fontSize: 12,
    color: '#666',
  },
}); 