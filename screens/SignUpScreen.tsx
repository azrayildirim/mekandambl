import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { createUser } from '../services/userService';
import { uploadImage } from '../services/storageService';

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    email: '',
    password: '',
    name: '',
    photoURL: '',
  });
  const [showPassword, setShowPassword] = useState(false);

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

  const handleSignUp = async () => {
    if (!userData.email || !userData.password || !userData.name) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setIsLoading(true);
    try {
      // Firebase Authentication ile kullanıcı oluştur
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      let photoURL = '';
      if (userData.photoURL) {
        // Profil fotoğrafını yükle
        photoURL = await uploadImage(userData.photoURL, 'profile-photos');
      }

      // Firestore'a kullanıcı bilgilerini kaydet
      await createUser({
        id: userCredential.user.uid,
        email: userData.email,
        name: userData.name,
        photoURL,
        status: 'Merhaba! Mekanda kullanıyorum.',
        lastSeen: new Date().toISOString(),
        allowMessages: true,
      });

      Alert.alert('Başarılı', 'Hesabınız oluşturuldu', [
        { text: 'Tamam', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Error signing up:', error);
      Alert.alert(
        'Hata',
        error.code === 'auth/email-already-in-use'
          ? 'Bu email adresi zaten kullanımda'
          : 'Kayıt olurken bir hata oluştu'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity style={styles.photoButton} onPress={pickImage}>
          {userData.photoURL ? (
            <Image source={{ uri: userData.photoURL }} style={styles.photo} />
          ) : (
            <>
              <Ionicons name="camera" size={32} color="#8A2BE2" />
              <Text style={styles.photoText}>Fotoğraf Ekle</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Ad Soyad</Text>
        <TextInput
          style={styles.input}
          value={userData.name}
          onChangeText={(text) => setUserData(prev => ({ ...prev, name: text }))}
          placeholder="Adınızı ve soyadınızı girin"
        />

        <Text style={styles.label}>E-posta</Text>
        <TextInput
          style={styles.input}
          value={userData.email}
          onChangeText={(text) => setUserData(prev => ({ ...prev, email: text }))}
          placeholder="E-posta adresinizi girin"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Şifre</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            value={userData.password}
            onChangeText={(text) => setUserData(prev => ({ ...prev, password: text }))}
            placeholder="Şifrenizi girin"
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.passwordVisibility}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color="#8A2BE2"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.signUpButton}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signUpButtonText}>Kayıt Ol</Text>
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
  photoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0e6ff',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 30,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  photoText: {
    color: '#8A2BE2',
    marginTop: 8,
    fontSize: 14,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 20,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  passwordVisibility: {
    padding: 12,
  },
  signUpButton: {
    backgroundColor: '#8A2BE2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 