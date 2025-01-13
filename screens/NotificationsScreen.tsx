import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { getNotifications, NotificationType, markNotificationAsRead } from '../services/notificationService';
import { auth } from '../config/firebase';
import { useNavigation } from '@react-navigation/native';
import { acceptFollowRequest, rejectFollowRequest } from '../services/followService';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    if (!auth.currentUser) return;
    try {
      const notifs = await getNotifications(auth.currentUser.uid);
      console.log('Loaded notifications:', notifs); // Debug log
      setNotifications(notifs);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowRequest = async (notification, accept) => {
    try {
      console.log('Handling follow request:', { notification, accept }); // Debug log
      if (accept) {
        await acceptFollowRequest(notification.fromUserId, notification.toUserId);
      } else {
        await rejectFollowRequest(notification.fromUserId, notification.toUserId);
      }
      await markNotificationAsRead(notification.id);
      await loadNotifications(); // Bildirimleri yenile
    } catch (error) {
      console.error('Error handling follow request:', error);
    }
  };

  const renderNotification = ({ item }) => {
    console.log('Rendering notification:', item); // Debug log

    const isFollowRequest = item.type === NotificationType.FOLLOW_REQUEST;
    const isPending = item.data?.status === 'pending';
    
    return (
      <View style={[styles.notificationItem, !item.read && styles.unreadNotification]}>
        <Image
          source={
            item.data?.fromUserPhoto 
              ? { uri: item.data.fromUserPhoto }
              : require('../assets/images/default-avatar.png')
          }
          style={styles.userPhoto}
        />
        <View style={styles.notificationContent}>
          <ThemedText style={styles.notificationText}>
            <ThemedText style={styles.userName}>
              {item.data?.fromUserName || 'Bir kullanıcı'}
            </ThemedText>
            {isFollowRequest ? ' seni takip etmek istiyor' : ' seni takip etmeye başladı'}
          </ThemedText>
          
          {isFollowRequest && isPending && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleFollowRequest(item, true)}
              >
                <ThemedText style={styles.buttonText}>Kabul Et</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleFollowRequest(item, false)}
              >
                <ThemedText style={styles.buttonText}>Reddet</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          
          <ThemedText style={styles.timeText}>
            {item.createdAt?.toLocaleDateString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </ThemedText>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="notifications-off" size={48} color="#666" />
        <ThemedText style={styles.emptyText}>Henüz bildiriminiz yok</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        onRefresh={loadNotifications}
        refreshing={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  userPhoto: {
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
    marginBottom: 8,
  },
  userName: {
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#FF5252',
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  unreadNotification: {
    backgroundColor: '#f0f0ff',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
}); 