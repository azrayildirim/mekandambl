import React from 'react';
import { StyleSheet, ActivityIndicator } from 'react-native';
import { Button as RNEButton } from '@rneui/themed';
import type { ButtonProps } from '@rneui/themed';

interface CustomButtonProps extends ButtonProps {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
}

export const Button: React.FC<CustomButtonProps> = ({
  title,
  loading = false,
  variant = 'primary',
  disabled,
  onPress,
  ...props
}) => {
  const getButtonStyle = () => {
    switch (variant) {
      case 'secondary':
        return styles.secondaryButton;
      case 'outline':
        return styles.outlineButton;
      default:
        return styles.primaryButton;
    }
  };

  const getButtonTitleStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineTitle;
      default:
        return styles.buttonTitle;
    }
  };

  return (
    <RNEButton
      title={title}
      onPress={onPress}
      disabled={disabled || loading}
      loading={loading}
      loadingProps={{
        color: variant === 'outline' ? '#0095f6' : '#ffffff',
        size: 'small',
      }}
      buttonStyle={[getButtonStyle(), disabled && styles.disabledButton]}
      titleStyle={getButtonTitleStyle()}
      disabledStyle={styles.disabledButton}
      disabledTitleStyle={styles.disabledTitle}
      
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  primaryButton: {
    backgroundColor: '#1877F2',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  gradientButton:{
    backgroundColor: '#1877F2',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  secondaryButton: {
    backgroundColor: '#405DE6',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#405DE6',
    borderRadius: 8,
    padding: 12,
    minHeight: 48,
  },
  buttonTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  outlineTitle: {
    color: '#405DE6',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  disabledButton: {
    opacity: 0.6,
    backgroundColor: '#E8E8E8',
  },
  disabledTitle: {
    color: '#8E8E8E',
  },
}); 