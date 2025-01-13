import React from 'react';
import { TouchableOpacity, View, Image, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';

interface MessageCardProps {
  message: {
    id: string;
    lastMessage: string;
    lastMessageTime: Date;
    unreadCount: number;
    otherUserId: string;
    otherUserName: string;
    otherUserPhoto: string | null;
    otherUserOnline: boolean;
  };
  onPress: () => void;
}

export function MessageCard({ message, onPress }: MessageCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.avatarContainer}>
        <Image
          source={message.otherUserPhoto ? { uri: message.otherUserPhoto } : require('../assets/images/default-avatar.png')}
          style={styles.avatar}
        />
        {message.otherUserOnline && <View style={styles.onlineIndicator} />}
      </View>
      <View style={styles.content}>
        <ThemedText style={styles.name}>{message.otherUserName}</ThemedText>
        <ThemedText style={styles.message} numberOfLines={1}>{message.lastMessage}</ThemedText>
      </View>
      <View style={styles.meta}>
        <ThemedText style={styles.time}>
          {message.lastMessageTime?.toLocaleDateString()}
        </ThemedText>
        {message.unreadCount > 0 && (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>{message.unreadCount}</ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  onlineIndicator: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#fff',
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#666',
  },
  meta: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  badge: {
    backgroundColor: '#8A2BE2',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
}); 