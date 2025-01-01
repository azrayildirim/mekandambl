import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, TextInput, Alert, ScrollView } from 'react-native';
import { auth } from '../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateProfile } from 'firebase/auth';
import { uploadImage } from '../services/storageService';
import { updateUser } from '../services/userService';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateActivePlaceUsers, ACTIVE_PLACE_KEY, LAST_CONFIRM_KEY } from '../services/placesService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Menu, MenuItem } from 'react-native-material-menu';

//profil sayfası için
type RootStackParamList = {
  NearbyPlaces: undefined;
  PlaceDetails: {
    place: VisitedPlace;
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface VisitedPlace {
  id: string;
  name: string;
  address?: string;
  rating?: number;
  photos: string[];
}

// Gittiği mekanları getiren fonksiyon
const getVisitedPlaces = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const visitedPlaceIds = userDoc.data()?.visitedPlaces || [];
  
  const places = await Promise.all(
    visitedPlaceIds.map(async (placeId: string) => {
      const placeDoc = await getDoc(doc(db, 'places', placeId));
      return {
        id: placeDoc.id,
        ...placeDoc.data()
      };
    })
  );
  
  return places;
};

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const user = auth.currentUser;
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    displayName: user?.displayName || '',
    status: 'Merhaba! Mekanda kullanıyorum.',
    photoURL: user?.photoURL || ''
  });
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    if (auth.currentUser) {
      getVisitedPlaces(auth.currentUser.uid)
        .then(places => setVisitedPlaces(places))
        .catch(error => console.error('Error fetching visited places:', error));
    }
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Hata', 'Fotoğraf erişim izni gerekli');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setUserData(prev => ({ ...prev, photoURL: result.assets[0].uri }));
    }
  };

  const handleSave = async () => {
    try {
      let photoURL = userData.photoURL;
      
      // Eğer yeni fotoğraf seçildiyse yükle
      if (userData.photoURL && userData.photoURL !== user?.photoURL) {
        photoURL = await uploadImage(userData.photoURL, 'profile-photos');
      }

      // Firebase Auth profilini güncelle
      await updateProfile(auth.currentUser!, {
        displayName: userData.displayName,
        photoURL
      });

      // Firestore'daki kullanıcı bilgilerini güncelle
      await updateUser(user!.uid, {
        name: userData.displayName,
        photoURL,
        status: userData.status
      });

      setIsEditing(false);
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu');
    }
  };

  const handleSignOut = async () => {
    try {
      // Aktif mekan varsa çıkış yap
      const activePlaceId = await AsyncStorage.getItem(ACTIVE_PLACE_KEY);
      if (activePlaceId && auth.currentUser) {
        await updateActivePlaceUsers(activePlaceId, auth.currentUser.uid, false);
        await AsyncStorage.removeItem(ACTIVE_PLACE_KEY);
        await AsyncStorage.removeItem(LAST_CONFIRM_KEY);
      }

      // Firebase'den çıkış yap
      await auth.signOut();
      navigation.navigate('NearbyPlaces');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity 
        style={styles.menuButton}
        onPress={() => setMenuVisible(true)}
      >
        <Menu
          visible={menuVisible}
          onRequestClose={() => setMenuVisible(false)}
          anchor={
            <Ionicons name="menu" size={32} color="#8A2BE2" />
          }
        >
          <MenuItem 
            onPress={() => {
              setMenuVisible(false);
              setIsEditing(true);
            }}
          >
            <Ionicons name="pencil" size={20} color="#333" />
            <Text style={styles.menuItemText}>Profili Düzenle</Text>
          </MenuItem>
          <MenuItem 
            onPress={() => {
              setMenuVisible(false);
              handleSignOut();
            }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4444" />
            <Text style={[styles.menuItemText, { color: '#FF4444' }]}>
              Çıkış Yap
            </Text>
          </MenuItem>
        </Menu>
      </TouchableOpacity>

      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickImage} disabled={!isEditing}>
          {userData.photoURL ? (
            <Image source={{ uri: userData.photoURL }} style={styles.profilePhoto} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.initials}>
                {userData.displayName?.charAt(0) || 'U'}
              </Text>
            </View>
          )}
          {isEditing && (
            <View style={styles.editPhotoOverlay}>
              <Ionicons name="camera" size={24} color="white" />
            </View>
          )}
        </TouchableOpacity>

        {isEditing ? (
          <TextInput
            style={styles.nameInput}
            value={userData.displayName}
            onChangeText={(text) => setUserData(prev => ({ ...prev, displayName: text }))}
            placeholder="İsminizi girin"
          />
        ) : (
          <Text style={styles.name}>{userData.displayName || 'Kullanıcı'}</Text>
        )}
        
        <Text style={styles.email}>{user?.email}</Text>

        {isEditing && (
          <TextInput
            style={styles.statusInput}
            value={userData.status}
            onChangeText={(text) => setUserData(prev => ({ ...prev, status: text }))}
            placeholder="Durumunuzu yazın"
            multiline
          />
        )}
      </View>

      {isEditing ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.cancelButton]} 
            onPress={() => setIsEditing(false)}
          >
            <Text style={styles.buttonText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.button, styles.saveButton]} 
            onPress={handleSave}
          >
            <Text style={styles.buttonText}>Kaydet</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gittiğim Mekanlar</Text>
        {visitedPlaces.length > 0 ? (
          visitedPlaces.map(place => (
            <View key={place.id} style={styles.placeItem}>
              <Image 
                source={{ uri: place.photos[0] }}
                style={styles.placePhoto}
              />
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress}>{place.address}</Text>
                <View style={styles.ratingContainer}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons 
                      key={i}
                      name={i < (place.rating || 0) ? "star" : "star-outline"}
                      size={16}
                      color="#FFD700"
                    />
                  ))}
                  <Text style={styles.ratingText}>
                    {place.rating ? place.rating.toFixed(1) : 'Değerlendirilmemiş'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.visitButton}
                onPress={() => navigation.navigate('PlaceDetails', { place })}
              >
                <Ionicons name="arrow-forward" size={24} color="white" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Henüz hiç mekana gitmediniz.</Text>
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
  profileHeader: {
    alignItems: 'center',
    marginTop: 60,
    paddingHorizontal: 20,
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8A2BE2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  editPhotoOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 0,
    backgroundColor: '#8A2BE2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: 48,
    color: 'white',
    fontWeight: 'bold',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    width: '80%',
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  statusInput: {
    width: '80%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#666',
  },
  saveButton: {
    backgroundColor: '#8A2BE2',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    backgroundColor: '#FF4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    marginBottom: 20,
  },
  signOutText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  placeItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
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
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  visitButton: {
    backgroundColor: '#8A2BE2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    padding: 12,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 8,
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  settingsButton: {
    padding: 8,
  },
}); 