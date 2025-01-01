import React, { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  Image,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import { GradientButton } from '../components/ui/GradientButton';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      navigation.navigate('NearbyPlaces');
    } catch (err: any) {
      setError('E-posta veya şifre hatalı');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ThemedView style={styles.content}>
        {/* <Image
          source={require('../assets/images/logos.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}

        <ThemedView style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-posta"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Şifre"
            value={formData.password}
            onChangeText={(text) => setFormData({ ...formData, password: text })}
            secureTextEntry
          />

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <GradientButton
            title="Giriş Yap"
            colors={['#405DE6', '#5851DB', '#833AB4']}
            onPress={handleLogin}
            loading={loading}
          />
        </ThemedView>

        <ThemedView style={styles.footer}>
          <ThemedText>Hesabın yok mu? </ThemedText>
          <Pressable onPress={() => navigation.navigate('SignIn')}>
            <ThemedText style={styles.link}>Giriş Yap</ThemedText>
          </Pressable>
        </ThemedView>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  logo: {
    height: 64,
    width: '100%',
    marginBottom: 32,
  },
  form: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dbdbdb',
    borderRadius: 5,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#0095f6',
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#ed4956',
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  link: {
    color: '#0095f6',
    fontWeight: '600',
  },
}); 