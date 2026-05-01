import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type BackButtonProps = {
  style?: ViewStyle;
  variant?: 'inline' | 'floating'; // 'inline' inside a header, 'floating' over full-screen content
  onPress?: () => void;
  iconColor?: string;
  bgColor?: string;
};

export function BackButton({ 
  style, 
  variant = 'inline', 
  onPress,
  iconColor = '#FFFFFF',
  bgColor = 'rgba(255,255,255,0.15)'
}: BackButtonProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const isFloating = variant === 'floating';

  return (
    <TouchableOpacity 
      style={[
        styles.btn, 
        { backgroundColor: bgColor },
        isFloating && { 
          position: 'absolute', 
          top: Math.max(insets.top, 16) + 8,
          right: 16, // RTL defaults back button to right side
          zIndex: 100 
        },
        style
      ]} 
      activeOpacity={0.8} 
      onPress={handlePress}
    >
      <Ionicons name="arrow-forward" size={24} color={iconColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
