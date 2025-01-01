import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  onClose: () => void;
}

const { height } = Dimensions.get('window');

export default function CustomAlert({ visible, title, message, type, onClose }: CustomAlertProps) {
  const getIconName = () => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'error':
        return 'close-circle';
      case 'info':
        return 'information-circle';
      default:
        return 'information-circle';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'warning':
        return '#FFA500';
      case 'error':
        return '#FF4444';
      case 'info':
        return '#8A2BE2';
      default:
        return '#8A2BE2';
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={styles.overlay}>
        <Animated.View style={styles.alertContainer}>
          <View style={[styles.iconContainer, { backgroundColor: getIconColor() }]}>
            <Ionicons name={getIconName()} size={32} color="white" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: getIconColor() }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Tamam</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 