import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Dimensions, Alert, Image, Text, Modal, Button, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { CustomCallout } from '../components/CustomCallout';
import { useAuth } from '../hooks/useAuth';
import { Message } from '../types/chat';
import { sendMessage, subscribeToMessages, createChatRoomId } from '../utils/chat';

interface Person {
  id: string;
  name: string;
  status: string;
  avatar: string;
  allowMessages: boolean;
}

interface Place {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
  people: Person[];
}

const nightModeMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#746855' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#242f3e' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#263c3f' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#6b9a76' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#38414e' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#212a37' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#9ca5b3' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#746855' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1f2835' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f3d19c' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#2f3948' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d59563' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#17263c' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#515c6d' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#17263c' }],
  },
];

const NearbyPlacesMap: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isChatModalVisible, setIsChatModalVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Hata', 'Konum izni gerekli');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);

      const nearbyPlaces: Place[] = [
        {
          id: '1',
          coordinate: {
            latitude: currentLocation.coords.latitude + 0.001,
            longitude: currentLocation.coords.longitude + 0.001,
          },
          title: 'Mekan 1',
          description: 'Açıklama 1',
          people: [
            { 
              id: '1', 
              name: 'Ahmet', 
              status: 'Aktif',
              avatar: 'https://i.pravatar.cc/100?img=1',
              allowMessages: true
            },
            { 
              id: '2', 
              name: 'Mehmet', 
              status: 'Meşgul',
              avatar: 'https://i.pravatar.cc/100?img=2',
              allowMessages: false
            },
            { 
              id: '3', 
              name: 'Ayşe', 
              status: 'Aktif',
              avatar: 'https://i.pravatar.cc/100?img=3',
              allowMessages: true
            },
          ]
        },
      ];
      setPlaces(nearbyPlaces);
    })();
  }, []);

  useEffect(() => {
    if (selectedPerson && user) {
      const roomId = createChatRoomId(user.uid, selectedPerson.id);
      const unsubscribe = subscribeToMessages(roomId, (newMessages) => {
        setMessages(newMessages);
      });
      
      return () => unsubscribe();
    }
  }, [selectedPerson, user]);

  const handleSendMessage = async () => {
    console.log('handleSendMessage çağrıldı');
    console.log('user:', user);
    console.log('selectedPerson:', selectedPerson);
    console.log('message:', message);

    if (!message.trim() || !user || !selectedPerson) {
      console.log('Validation failed:', { 
        hasMessage: !!message.trim(), 
        hasUser: !!user, 
        hasPerson: !!selectedPerson 
      });
      return;
    }
    
    try {
      console.log('Sending message...');
      console.log('Room ID:', createChatRoomId(user.uid, selectedPerson.id));
      await sendMessage(user.uid, selectedPerson.id, message.trim());
      console.log('Message sent successfully');
      setMessage('');
    } catch (error) {
      console.error('Message send error:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi');
    }
  };

  if (!location) {
    return <View style={styles.container} />;
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={nightModeMapStyle}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={() => setSelectedPlace(null)}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title="Benim Konumum"
        />

        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinate}
            onPress={() => setSelectedPlace(place)}
          >
            <Image 
              source={require('../assets/images/MapPin.png')}
              style={styles.markerImage}
            />
          </Marker>
        ))}
      </MapView>

      {selectedPlace && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarContent}>
            <Text style={styles.bottomBarTitle}>{selectedPlace.title}</Text>
            <Text style={styles.bottomBarDescription}>{selectedPlace.description}</Text>
            <View style={styles.peopleList}>
              {selectedPlace.people.map((person) => (
                <View key={person.id} style={styles.personItem}>
                  <View style={styles.personInfo}>
                    <Image
                      source={{ uri: person.avatar }}
                      style={styles.avatar}
                    />
                    <View style={styles.nameAndStatus}>
                      <Text style={styles.personName}>{person.name}</Text>
                      <View style={[
                        styles.statusDot, 
                        { backgroundColor: person.status === 'Aktif' ? '#4CAF50' : '#FFC107' }
                      ]} />
                    </View>
                  </View>
                  <View style={styles.personActions}>
                    <Text style={styles.personStatus}>{person.status}</Text>
                    {person.allowMessages && (
                      <TouchableOpacity
                        style={styles.messageButton}
                        onPress={() => {
                          setSelectedPerson(person);
                          setIsChatModalVisible(true);
                        }}
                      >
                        <Text style={styles.messageButtonText}>Mesaj</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.bottomBarButtons}>
              <Button title="Yol Tarifi Al" onPress={() => {}} />
              <Button title="Detaylar" onPress={() => {}} />
            </View>
          </View>
        </View>
      )}

      {selectedPerson && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={isChatModalVisible}
          onRequestClose={() => {
            setIsChatModalVisible(false);
            setSelectedPerson(null);
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.chatContainer}>
              <View style={styles.chatHeader}>
                <View style={styles.chatHeaderInfo}>
                  <Image
                    source={{ uri: selectedPerson.avatar }}
                    style={styles.chatAvatar}
                  />
                  <Text style={styles.chatHeaderName}>{selectedPerson.name}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setIsChatModalVisible(false);
                    setSelectedPerson(null);
                  }}
                >
                  <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.chatMessages}>
                <ScrollView
                  contentContainerStyle={styles.messagesScrollContent}
                  ref={(ref) => {
                    if (ref) {
                      ref.scrollToEnd({animated: true});
                    }
                  }}
                >
                  {messages.length === 0 ? (
                    <Text style={styles.placeholderText}>Henüz mesaj yok</Text>
                  ) : (
                    messages.map((msg) => (
                      <View
                        key={msg.id}
                        style={[
                          styles.messageContainer,
                          msg.senderId === user?.uid ? styles.sentMessage : styles.receivedMessage
                        ]}
                      >
                        <Text style={[
                          styles.messageText,
                          msg.senderId === user?.uid ? styles.sentMessageText : styles.receivedMessageText
                        ]}>
                          {msg.text}
                        </Text>
                        <Text style={[
                          styles.messageTime,
                          msg.senderId === user?.uid ? styles.sentMessageTime : styles.receivedMessageTime
                        ]}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </Text>
                      </View>
                    ))
                  )}
                </ScrollView>
              </View>
              
              <View style={styles.chatInputContainer}>
                <TextInput
                  style={styles.chatInput}
                  placeholder="Mesajınızı yazın..."
                  value={message}
                  onChangeText={setMessage}
                  multiline
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handleSendMessage}
                >
                  <Text style={styles.sendButtonText}>Gönder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  userMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
  },
  userHalo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    position: 'absolute',
  },
  placeMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerImage: {
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  calloutContainer: {
    padding: 10,
    minWidth: 120,
    backgroundColor: 'white',
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomBarContent: {
    padding: 20,
  },
  bottomBarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  bottomBarDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  bottomBarButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  peopleList: {
    marginVertical: 12,
  },
  personItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  personName: {
    fontSize: 16,
    marginRight: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  personStatus: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  nameAndStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  personActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  messageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '80%',
    padding: 20,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  chatHeaderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    padding: 8,
  },
  chatMessages: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#F7F7F7',
  },
  messagesScrollContent: {
    flexGrow: 1,
    paddingVertical: 16,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
    marginLeft: '20%',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    marginRight: '20%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  sentMessageText: {
    color: '#FFFFFF',
  },
  receivedMessageText: {
    color: '#1F2937',
  },
  messageTime: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  sentMessageTime: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  receivedMessageTime: {
    color: '#6B7280',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 20,
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 15,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default NearbyPlacesMap;

