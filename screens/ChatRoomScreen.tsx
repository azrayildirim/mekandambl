import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import { Message, subscribeToMessages, sendMessage, markMessagesAsRead } from '../services/messageService';
import { auth, db } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';

type ChatRoomRouteProp = RouteProp<RootStackParamList, 'ChatRoom'>;

const formatMessageTime = (timestamp: any) => {
  if (timestamp?.seconds) {
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  if (timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  return '';
};

export default function ChatRoomScreen() {
  const route = useRoute<ChatRoomRouteProp>();
  const navigation = useNavigation();
  const { chatId, userId } = route.params;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<{
    name: string;
    photoURL: string | null;
  } | null>(null);

  // Diğer kullanıcının bilgilerini al
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setOtherUser({
            name: userData.name,
            photoURL: userData.photoURL
          });
          // Header'ı güncelle
          navigation.setOptions({
            headerTitle: () => (
              <View style={styles.headerTitle}>
                <Image 
                  source={{ uri: userData.photoURL || undefined }}
                  style={styles.headerPhoto}
                  defaultSource={require('../assets/images/default-avatar.png')}
                />
                <Text style={styles.headerName}>{userData.name}</Text>
              </View>
            )
          });
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };
    loadUserData();
  }, [userId]);

  useEffect(() => {
    const unsubscribe = subscribeToMessages(chatId, (updatedMessages) => {
      setMessages(updatedMessages);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    if (!auth.currentUser || !chatId) return;

    const unreadMessages = messages.filter(
      msg => msg.senderId !== auth.currentUser?.uid && !msg.read
    );

    if (unreadMessages.length > 0) {
      markMessagesAsRead(chatId, auth.currentUser.uid);
    }
  }, [messages, chatId]);

  const handleSend = async () => {
    if (!newMessage.trim() || !auth.currentUser) return;

    try {
      await sendMessage(auth.currentUser.uid, userId, newMessage.trim());
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        inverted
        renderItem={({ item }) => (
          <View style={[
            styles.messageContainer,
            item.senderId === auth.currentUser?.uid ? styles.sentMessage : styles.receivedMessage
          ]}>
            <Text style={[
              styles.messageText,
              item.senderId === auth.currentUser?.uid ? styles.sentMessageText : styles.receivedMessageText
            ]}>
              {item.text}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={styles.messageTime}>
                {formatMessageTime(item.createdAt)}
              </Text>
              {item.senderId === auth.currentUser?.uid && (
                <View style={styles.checkContainer}>
                  <Ionicons 
                    name="checkmark" 
                    size={16} 
                    color={item.read ? "#FFB6C1" : "#fff"}
                    style={[styles.checkmark, styles.firstCheck]}
                  />
                  {item.read && (
                    <Ionicons 
                      name="checkmark" 
                      size={16} 
                      color="#FFB6C1"
                      style={[styles.checkmark, styles.secondCheck]}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        )}
        keyExtractor={item => item.id}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Mesajınızı yazın..."
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton} 
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Ionicons name="send" size={24} color="#8A2BE2" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageContainer: {
    margin: 8,
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#8A2BE2',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#666',
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerPhoto: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  headerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sentMessageText: {
    color: '#fff',
  },
  receivedMessageText: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginRight: 4,
  },
  checkContainer: {
    flexDirection: 'row',
    width: 16,
    height: 16,
    marginLeft: 2,
    position: 'relative',
  },
  checkmark: {
    position: 'absolute',
  },
  firstCheck: {
    left: 0,
  },
  secondCheck: {
    left: -4,
  },
}); 