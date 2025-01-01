import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import NearbyPlaces from '../screens/NearbyPlaces';
import SignInScreen from '../screens/SignInScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PlaceDetailsScreen from '../screens/PlaceDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import MessagesScreen from '../screens/MessagesScreen';

const Stack = createStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="NearbyPlaces">
      <Stack.Screen 
        name="NearbyPlaces" 
        component={NearbyPlaces}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="SignIn" 
        component={SignInScreen}
        options={{ title: 'Giriş Yap' }}
      />
      <Stack.Screen 
        name="SignUp" 
        component={SignUpScreen}
        options={{ title: 'Kayıt Ol' }}
      />
      <Stack.Screen 
        name="UserProfileScreen" 
        component={UserProfileScreen}
        options={{
          title: 'Profil',
          headerShown: true,
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="PlaceDetails" component={PlaceDetailsScreen} />
      <Stack.Screen 
        name="Notifications"
        component={NotificationsScreen}
        options={{ 
          title: 'Bildirimler',
          headerShown: true,
          headerBackTitle: 'Geri'
        }}
      />
      <Stack.Screen
        name="Messages"
        component={MessagesScreen}
        options={{ 
          title: 'Mesajlar',
          headerShown: true,
          headerBackTitle: 'Geri'
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator; 