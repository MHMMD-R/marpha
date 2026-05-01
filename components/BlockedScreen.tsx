import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export function BlockedScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="lock-closed" size={80} color="#FF3B30" />
        </View>
        <Text style={styles.title}>الجهاز محظور</Text>
        <Text style={styles.message}>
          تم حظر هذا الجهاز من قبل إدارة المنصة بسبب مخالفة شروط الاستخدام أو مشاركة الحساب.
        </Text>
        <Text style={styles.subMessage}>
          يرجى التواصل مع الدعم الفني لمزيد من المعلومات.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    zIndex: 999999, // Ensure it covers everything
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 30,
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  message: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 16,
  },
  subMessage: {
    fontSize: 14,
    color: '#8A9E99',
    textAlign: 'center',
    lineHeight: 22,
  },
});
