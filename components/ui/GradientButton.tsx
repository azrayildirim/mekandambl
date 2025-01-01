import React from 'react';
import { Button } from '@rneui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import type { ButtonProps } from '@rneui/themed';
import { StyleSheet } from 'react-native';

interface GradientButtonProps {
  title: string;
  colors: string[];
  onPress: () => void;
  loading?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({ title, colors, onPress, loading }) => {
  return (
    <Button
      title={title}
      loading={loading}
      ViewComponent={LinearGradient}
      linearGradientProps={{
        colors,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 }
      }}
      buttonStyle={styles.button}
      titleStyle={styles.buttonText}
      onPress={onPress}
    />
  );
};

const styles = StyleSheet.create({
  button: {
    padding: 12,
    minHeight: 48,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});