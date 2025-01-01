import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { sendFriendRequest, checkFriendshipStatus, acceptFriendRequest, rejectFriendRequest, removeFriend } from '../services/friendshipService';
import { RouteProp } from '@react-navigation/native';
import { getPlaceDetails } from '../services/placesService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

interface UserProfile {
  id: string;
  name: string;
  photoURL: string;
  status: string;
  email: string;
  visitedPlaces: string[];
}

interface FriendshipStatus {
  areFriends: boolean;
  isPending: boolean;
  isRequestSent: boolean;
}

type UserProfileScreenRouteProp = RouteProp<RootStackParamList, 'UserProfileScreen'>;

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Place {
  id: string;
  name: string;
  address?: string;
  photos: string[];
}

export default function UserProfileScreen({ route }: { route: UserProfileScreenRouteProp }) {
  const { userId } = route.params;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>({
    areFriends: false,
    isPending: false,
    isRequestSent: false
  });
  const navigation = useNavigation<NavigationProp>();
  const [visitedPlaces, setVisitedPlaces] = useState<Place[]>([]);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          setUserProfile({
            id: userDoc.id,
            ...userDoc.data() as Omit<UserProfile, 'id'>
          });
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    const loadFriendshipStatus = async () => {
      if (!auth.currentUser) return;
      const status = await checkFriendshipStatus(auth.currentUser.uid, userId);
      setFriendshipStatus(status);
    };

    loadUserProfile();
    loadFriendshipStatus();
  }, [userId]);

  useEffect(() => {
    const loadVisitedPlaces = async () => {
      if (!userProfile?.visitedPlaces) return;
      
      try {
        const places = await Promise.all(
          userProfile.visitedPlaces.map(placeId => getPlaceDetails(placeId))
        );
        setVisitedPlaces(places);
      } catch (error) {
        console.error('Error loading visited places:', error);
      }
    };

    if (userProfile) {
      loadVisitedPlaces();
    }
  }, [userProfile]);

  const handleFriendRequest = async () => {
    if (!auth.currentUser || !userProfile) return;

    try {
      await sendFriendRequest(auth.currentUser.uid, userId);
      setFriendshipStatus(prev => ({
        ...prev,
        isPending: true,
        isRequestSent: true
      }));
      Alert.alert('Başarılı', 'Arkadaşlık isteği gönderildi');
    } catch (error) {
      console.error('Error sending friend request:', error);
      Alert.alert('Hata', 'Arkadaşlık isteği gönderilemedi');
    }
  };

  const handleAcceptRequest = async () => {
    if (!auth.currentUser) return;
    
    try {
      await acceptFriendRequest(auth.currentUser.uid, userId);
      setFriendshipStatus(prev => ({
        ...prev,
        areFriends: true,
        isPending: false
      }));
      Alert.alert('Başarılı', 'Arkadaşlık isteği kabul edildi');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      Alert.alert('Hata', 'İstek kabul edilirken bir hata oluştu');
    }
  };

  const handleRejectRequest = async () => {
    if (!auth.currentUser) return;
    
    try {
      await rejectFriendRequest(auth.currentUser.uid, userId);
      setFriendshipStatus(prev => ({
        ...prev,
        isPending: false
      }));
      Alert.alert('Bilgi', 'Arkadaşlık isteği reddedildi');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      Alert.alert('Hata', 'İstek reddedilirken bir hata oluştu');
    }
  };

  const handleRemoveFriend = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Hata', 'Oturum açmanız gerekiyor');
      return;
    }
    
    Alert.alert(
      'Arkadaşı Sil',
      'Bu kişiyi arkadaş listenizden silmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFriend(currentUser.uid, userId);
              setFriendshipStatus(prev => ({
                ...prev,
                areFriends: false
              }));
            } catch (error) {
              console.error('Error removing friend:', error);
              Alert.alert('Hata', 'Arkadaş silinirken bir hata oluştu');
            }
          }
        }
      ]
    );
  };

  if (!userProfile) {
    return (
      <View style={styles.centerContainer}>
        <Text>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={{ uri: userProfile.photoURL || undefined }}
          style={styles.profilePhoto}
          defaultSource={require('../assets/images/default-avatar.png')}
        />
        <Text style={styles.name}>{userProfile.name}</Text>
        <Text style={styles.status}>{userProfile.status}</Text>

        {auth.currentUser?.uid !== userId && (
          <View style={styles.friendshipButtons}>
            {friendshipStatus.areFriends ? (
              <TouchableOpacity 
                style={[styles.friendButton, styles.friendButtonActive]}
                onPress={handleRemoveFriend}
              >
                <Ionicons name="people" size={24} color="white" />
                <Text style={styles.friendButtonText}>Arkadaşsınız</Text>
              </TouchableOpacity>
            ) : friendshipStatus.isPending && !friendshipStatus.isRequestSent ? (
              <View style={styles.requestButtons}>
                <TouchableOpacity 
                  style={[styles.friendButton, styles.acceptButton]}
                  onPress={handleAcceptRequest}
                >
                  <Ionicons name="checkmark" size={24} color="white" />
                  <Text style={styles.friendButtonText}>Kabul Et</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.friendButton, styles.rejectButton]}
                  onPress={handleRejectRequest}
                >
                  <Ionicons name="close" size={24} color="white" />
                  <Text style={styles.friendButtonText}>Reddet</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.friendButton, friendshipStatus.isRequestSent && styles.friendButtonPending]}
                onPress={handleFriendRequest}
                disabled={friendshipStatus.isRequestSent}
              >
                <Ionicons 
                  name={friendshipStatus.isRequestSent ? "time" : "person-add"}
                  size={24} 
                  color="white" 
                />
                <Text style={styles.friendButtonText}>
                  {friendshipStatus.isRequestSent ? 'İstek Gönderildi' : 'Arkadaş Ekle'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gittiği Mekanlar</Text>
        {visitedPlaces.length > 0 ? (
          visitedPlaces.map(place => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeItem}
              onPress={() => navigation.navigate('PlaceDetails', { place })}
            >
              <Image 
                source={{ uri: place.photos[0] }} 
                style={styles.placePhoto}
              />
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                {place.address && (
                  <Text style={styles.placeAddress}>{place.address}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>Henüz hiç mekana gitmemiş.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  friendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8A2BE2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 16,
  },
  friendButtonActive: {
    backgroundColor: '#4CAF50',
  },
  friendButtonPending: {
    backgroundColor: '#FFA500',
  },
  friendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  placePhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
    color: '#666',
  },
  placeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  friendshipButtons: {
    marginTop: 16,
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF5252',
  },
}); 