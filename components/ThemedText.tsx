import { Text, TextProps } from 'react-native';
import useThemeColor from '../hooks/useThemeColor';

interface ThemedTextProps extends TextProps {
  style?: TextProps['style'];
}

export const ThemedText: React.FC<ThemedTextProps> = ({ style, ...props }) => {
  const color = useThemeColor('text');
  return <Text style={[{ color }, style]} {...props} />;
};
