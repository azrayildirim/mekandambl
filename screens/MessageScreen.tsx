import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { subscribeToChats } from '../services/messageService';
import { auth } from '../config/firebase';
import { MessageCard } from '../components/MessageCard';
import { RootStackParamList } from '../types/navigation';

interface Message {
  id: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  otherUserId: string;
  otherUserName: string;
  otherUserPhoto: string | null;
  otherUserOnline: boolean;
}

export default function MessageScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = subscribeToChats(auth.currentUser.uid, (chats) => {
      const formattedMessages = chats.map(chat => ({
        id: chat.id,
        lastMessage: chat.lastMessage?.text || '',
        lastMessageTime: chat.lastMessage?.createdAt ? new Date(chat.lastMessage.createdAt) : new Date(),
        unreadCount: chat.unreadCount || 0,
        otherUserId: chat.otherUser.id,
        otherUserName: chat.otherUser.name,
        otherUserPhoto: chat.otherUser.photoURL,
        otherUserOnline: false // Bu değer presence service ile güncellenebilir
      }));
      setMessages(formattedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8A2BE2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageCard
            message={item}
            onPress={() => navigation.navigate('ChatRoom', { 
              chatId: item.id,
              userId: item.otherUserId
            })}
          />
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  }
}); 