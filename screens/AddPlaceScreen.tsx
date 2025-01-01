import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { addPlace } from '../services/placesService';
import { uploadImage } from '../services/storageService';

export default function AddPlaceScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [placeData, setPlaceData] = useState({
    name: '',
    description: '',
    address: '',
    openingHours: '',
  });
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Hata', 'Fotoğraf erişim izni gerekli');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSelectedImages([...selectedImages, result.assets[0].uri]);
    }
  };

  const getCurrentLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Hata', 'Konum izni gerekli');
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    setLocation(location);
  };

  const handleSubmit = async () => {
    if (!placeData.name || !location) {
      Alert.alert('Hata', 'Mekan adı ve konum zorunludur');
      return;
    }

    setIsLoading(true);
    try {
      // Önce fotoğrafları yükle
      const uploadPromises = selectedImages.map(uri => uploadImage(uri, 'places'));
      const photoURLs = await Promise.all(uploadPromises);

      // Mekan bilgilerini kaydet
      await addPlace({
        ...placeData,
        coordinate: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
        photos: photoURLs,
        rating: 0,
        reviews: [],
        users: [],
      });

      Alert.alert('Başarılı', 'Mekan başarıyla eklendi', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Error adding place:', error);
      Alert.alert('Hata', 'Mekan eklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Mekan Adı *</Text>
        <TextInput
          style={styles.input}
          value={placeData.name}
          onChangeText={(text) => setPlaceData(prev => ({ ...prev, name: text }))}
          placeholder="Mekan adını girin"
        />

        <Text style={styles.label}>Açıklama</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={placeData.description}
          onChangeText={(text) => setPlaceData(prev => ({ ...prev, description: text }))}
          placeholder="Mekan hakkında açıklama girin"
          multiline
          numberOfLines={4}
        />

        <Text style={styles.label}>Adres</Text>
        <TextInput
          style={styles.input}
          value={placeData.address}
          onChangeText={(text) => setPlaceData(prev => ({ ...prev, address: text }))}
          placeholder="Mekan adresini girin"
        />

        <Text style={styles.label}>Çalışma Saatleri</Text>
        <TextInput
          style={styles.input}
          value={placeData.openingHours}
          onChangeText={(text) => setPlaceData(prev => ({ ...prev, openingHours: text }))}
          placeholder="Örn: 09:00 - 22:00"
        />

        <TouchableOpacity 
          style={styles.locationButton} 
          onPress={getCurrentLocation}
        >
          <Ionicons name="location" size={24} color="white" />
          <Text style={styles.locationButtonText}>
            {location ? 'Konum Alındı' : 'Konumu Al'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.label}>Fotoğraflar</Text>
        <ScrollView 
          horizontal 
          style={styles.imageContainer}
          showsHorizontalScrollIndicator={false}
        >
          {selectedImages.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.image} />
              <TouchableOpacity
                style={styles.removeImage}
                onPress={() => {
                  setSelectedImages(prev => prev.filter((_, i) => i !== index));
                }}
              >
                <Ionicons name="close-circle" size={24} color="red" />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
            <Ionicons name="add" size={40} color="#8A2BE2" />
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity 
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Mekanı Ekle</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  form: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationButton: {
    backgroundColor: '#8A2BE2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  imageWrapper: {
    marginRight: 10,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeImage: {
    position: 'absolute',
    right: -10,
    top: -10,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#8A2BE2',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#8A2BE2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 