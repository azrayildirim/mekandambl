import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface CustomCalloutProps {
  title: string;
  description: string;
}

export const CustomCallout: React.FC<CustomCalloutProps> = ({ title, description }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    width: 150,
  },
  title: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  description: {
    fontSize: 12,
    marginTop: 4,
  },
}); 