import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { auth } from '../config/firebase';
import { Chat, subscribeToChats } from '../services/messageService';
import { Ionicons } from '@expo/vector-icons';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function MessagesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToChats(
      auth.currentUser.uid,
      (updatedChats) => {
        setChats(updatedChats);
      }
    );

    return () => unsubscribe();
  }, []);

  const renderChat = ({ item: chat }: { item: Chat }) => {
    const otherUser = chat.otherUser;
    const isUnread = chat.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, isUnread && styles.unreadChat]}
        onPress={() => navigation.navigate('ChatRoom', { chatId: chat.id, userId: otherUser.id })}
      >
        <Image
          source={{ uri: otherUser.photoURL || undefined }}
          style={styles.userPhoto}
          defaultSource={require('../assets/images/default-avatar.png')}
        />
        <View style={styles.chatContent}>
          <Text style={styles.userName}>{otherUser.name}</Text>
          {chat.lastMessage && (
            <Text style={styles.lastMessage} numberOfLines={1}>
              {chat.lastMessage.text}
            </Text>
          )}
        </View>
        {isUnread && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{chat.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={chats}
        renderItem={renderChat}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={48} color="#666" />
            <Text style={styles.emptyText}>Henüz mesajınız yok</Text>
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
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    alignItems: 'center',
  },
  unreadChat: {
    backgroundColor: '#f8f4ff',
  },
  userPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  chatContent: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#8A2BE2',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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