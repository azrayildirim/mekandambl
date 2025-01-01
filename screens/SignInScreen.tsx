import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { cleanupUserPresence } from '../services/presenceService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SignInScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [userData, setUserData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!userData.email || !userData.password) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, userData.email, userData.password);
      navigation.goBack();
    } catch (error: any) {
      console.error('Error signing in:', error);
      Alert.alert(
        'Hata',
        error.code === 'auth/user-not-found'
          ? 'Kullanıcı bulunamadı'
          : error.code === 'auth/wrong-password'
          ? 'Hatalı şifre'
          : 'Giriş yapılırken bir hata oluştu'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const userId = auth.currentUser?.uid;
      if (userId) {
        await cleanupUserPresence(userId);
      }
      await auth.signOut();
      navigation.navigate('NearbyPlaces');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.form}>
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
          style={styles.signInButton}
          onPress={handleSignIn}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.signInButtonText}>Giriş Yap</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.signUpButton}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={styles.signUpButtonText}>
            Hesabınız yok mu? Üye olun
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  signInButton: {
    backgroundColor: '#8A2BE2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  signUpButtonText: {
    color: '#8A2BE2',
    fontSize: 16,
  },
}); 