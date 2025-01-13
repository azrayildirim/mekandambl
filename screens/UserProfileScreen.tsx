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
import { followUser, unfollowUser, checkFollowStatus, getFollowCounts, sendFollowRequest, checkFollowRequestStatus } from '../services/followService';

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
  const [visitedPlaces, setVisitedPlaces] = useState<Place[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });
  const [isRequestPending, setIsRequestPending] = useState(false);

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

    loadUserProfile();
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

  useEffect(() => {
    const loadFollowStatus = async () => {
      if (auth.currentUser && userId !== auth.currentUser.uid) {
        const [followStatus, requestStatus] = await Promise.all([
          checkFollowStatus(auth.currentUser.uid, userId),
          checkFollowRequestStatus(auth.currentUser.uid, userId)
        ]);
        setIsFollowing(followStatus);
        setIsRequestPending(requestStatus);
      }
    };

    const loadFollowCounts = async () => {
      const counts = await getFollowCounts(userId);
      setFollowCounts(counts);
    };

    loadFollowStatus();
    loadFollowCounts();
  }, [userId]);

  const handleFollowPress = async () => {
    if (!auth.currentUser) {
      navigation.navigate('SignIn');
      return;
    }

    try {
      if (isFollowing) {
        await unfollowUser(auth.currentUser.uid, userId);
        setIsFollowing(false);
      } else {
        await sendFollowRequest(auth.currentUser.uid, userId);
        setIsRequestPending(true);
      }
      const newCounts = await getFollowCounts(userId);
      setFollowCounts(newCounts);
    } catch (error) {
      console.error('Follow action failed:', error);
    }
  };

  const canSeeVisitedPlaces = () => {
    if (auth.currentUser?.uid === userId) return true;
    return isFollowing;
  };

  const renderFollowButton = () => {
    if (isFollowing) {
      return (
        <TouchableOpacity
          style={[styles.followButton, styles.followingButton]}
          onPress={handleFollowPress}
        >
          <Ionicons name="checkmark-circle" size={20} color="white" />
          <Text style={styles.followButtonText}>Takip Ediliyor</Text>
        </TouchableOpacity>
      );
    } else if (isRequestPending) {
      return (
        <TouchableOpacity
          style={[styles.followButton, styles.pendingButton]}
          disabled={true}
        >
          <Ionicons name="time" size={20} color="white" />
          <Text style={styles.followButtonText}>İstek Gönderildi</Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          style={styles.followButton}
          onPress={handleFollowPress}
        >
          <Ionicons name="add-circle-outline" size={20} color="white" />
          <Text style={styles.followButtonText}>Takip Et</Text>
        </TouchableOpacity>
      );
    }
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
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{visitedPlaces.length}</Text>
            <Text style={styles.statLabel}>Mekan</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followCounts.followers}</Text>
            <Text style={styles.statLabel}>Takipçi</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{followCounts.following}</Text>
            <Text style={styles.statLabel}>Takip</Text>
          </View>
        </View>

        {userId !== auth.currentUser?.uid && renderFollowButton()}

        <Text style={styles.status}>{userProfile.status}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gittiği Mekanlar</Text>
        {!canSeeVisitedPlaces() ? (
          <View style={styles.privateContent}>
            <Ionicons name="lock-closed" size={24} color="#666" />
            <Text style={styles.privateText}>
              Bu kullanıcının gittiği mekanları görmek için takip etmeniz gerekiyor
            </Text>
            {!isFollowing && userId !== auth.currentUser?.uid && (
              <TouchableOpacity
                style={styles.followButtonSmall}
                onPress={handleFollowPress}
              >
                <Text style={styles.followButtonTextSmall}>Takip Et</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : visitedPlaces.length > 0 ? (
          visitedPlaces.map(place => (
            <TouchableOpacity
              key={place.id}
              style={styles.placeItem}
              onPress={() => navigation.navigate('PlaceDetails', { placeId: place.id })}
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
    backgroundColor: '#fff',
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#8A2BE2',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: 16,
    marginVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  followButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8A2BE2',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  followingButton: {
    backgroundColor: '#4CAF50',
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  status: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
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
  privateContent: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginTop: 8,
  },
  privateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  followButtonSmall: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  followButtonTextSmall: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#FFA500',
  },
}); 