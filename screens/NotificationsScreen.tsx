import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Text } from 'react-native';
import { Notification, subscribeToNotifications, markNotificationAsRead } from '../services/notificationService';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { auth } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToNotifications(
      auth.currentUser.uid,
      (updatedNotifications) => {
        setNotifications(updatedNotifications);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleNotificationPress = async (notification: Notification) => {
    // Bildirimi okundu olarak işaretle
    await markNotificationAsRead(notification.id);

    // Bildirim tipine göre yönlendirme yap
    switch (notification.type) {
      case 'FRIEND_REQUEST':
        navigation.navigate('UserProfileScreen', { userId: notification.senderId });
        break;
      case 'PLACE_CHECK_IN':
      case 'PLACE_REVIEW':
        if (notification.data.placeId) {
          navigation.navigate('PlaceDetails', { place: { id: notification.data.placeId } });
        }
        break;
    }
  };

  const renderNotification = ({ item: notification }: { item: Notification }) => {
    const getIcon = () => {
      switch (notification.type) {
        case 'FRIEND_REQUEST':
          return 'person-add';
        case 'PLACE_CHECK_IN':
          return 'location';
        case 'PLACE_REVIEW':
          return 'star';
        default:
          return 'notifications';
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !notification.read && styles.unreadNotification
        ]}
        onPress={() => handleNotificationPress(notification)}
      >
        <Image
          source={{ uri: notification.senderPhoto }}
          style={styles.senderPhoto}
          defaultSource={require('../assets/images/default-avatar.png')}
        />
        <View style={styles.notificationContent}>
          <Text style={styles.notificationText}>
            <Text style={styles.senderName}>{notification.senderName}</Text>
            {' '}
            {notification.data.message}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(notification.createdAt).toLocaleString('tr-TR')}
          </Text>
        </View>
        <Ionicons 
          name={getIcon()} 
          size={24} 
          color="#8A2BE2"
          style={styles.typeIcon}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off" size={48} color="#666" />
            <Text style={styles.emptyText}>Henüz bildiriminiz yok</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  unreadNotification: {
    backgroundColor: '#f8f4ff',
  },
  senderPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  senderName: {
    fontWeight: 'bold',
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
  },
  typeIcon: {
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
}); 