import React from 'react';
import { StyleSheet, ImageBackground, TouchableOpacity, Text, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type RootStackParamList = {
  Home: undefined;
  NearbyPlaces: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <ImageBackground 
      source={require('../assets/images/mekandabg.png')}
      style={styles.background}
    >
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('NearbyPlaces')}
      >
        <Text style={styles.buttonText}>KEŞFET</Text>
      </TouchableOpacity>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#8A2BE2',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: SCREEN_HEIGHT * 0.8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});

