export type RootStackParamList = {
  Home: undefined;
  SignIn: undefined;
  NearbyPlaces: undefined;
  UserProfileScreen: { userId: string };
  SignUp: undefined;
  Profile: undefined;
  PlaceDetails: { placeId: string };
  Notifications: undefined;
  Messages: undefined;
  ChatRoom: { chatId: string; userId: string };
}; 