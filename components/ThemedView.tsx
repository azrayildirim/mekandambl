import { View } from 'react-native';
import useThemeColor from '../hooks/useThemeColor';

export const ThemedView = ({ style, ...props }) => {
  const backgroundColor = useThemeColor('background');
  return <View style={[{ backgroundColor }, style]} {...props} />;
};
