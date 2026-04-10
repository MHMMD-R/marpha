import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { disableAppSwitcherProtectionAsync, enableAppSwitcherProtectionAsync, usePreventScreenCapture } from 'expo-screen-capture';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);

  usePreventScreenCapture('global-capture-lock');

  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    void enableAppSwitcherProtectionAsync(0.85).catch(error => {
      console.warn('Failed to enable iOS app switcher protection:', error);
    });

    return () => {
      void disableAppSwitcherProtectionAsync().catch(error => {
        console.warn('Failed to disable iOS app switcher protection:', error);
      });
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const inAuthGroup = segments[0] === 'login';

      if (!user && !inAuthGroup) {
        // Redirect to login if user is not authenticated
        router.replace('/login');
        setInitializing(false);
      } else if (user && inAuthGroup) {
        // Redirect to app if user is authenticated based on role
        try {
          const teacherDoc = await getDoc(doc(db, 'teachers', user.uid));
          if (teacherDoc.exists()) {
             router.replace('/teacher_home');
          } else {
             router.replace('/(tabs)/');
          }
        } catch (error) {
           router.replace('/(tabs)/');
        }
        setInitializing(false);
      } else {
        setInitializing(false);
      }
    });

    return () => unsubscribe();
  }, [segments]);

  if (initializing) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="login" options={{ gestureEnabled: false }} />
          <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
          <Stack.Screen name="teacher_home" options={{ gestureEnabled: false }} />
          <Stack.Screen name="teacher_quizzes" options={{ gestureEnabled: true }} />
          <Stack.Screen name="teacher_lectures" options={{ gestureEnabled: true }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="profile" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
