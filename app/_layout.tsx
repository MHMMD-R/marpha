import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Platform, ActivityIndicator, View, StyleSheet, I18nManager } from 'react-native';
import 'react-native-reanimated';

// Force RTL layout for Arabic
if (!I18nManager.isRTL) {
  try {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  } catch (e) {
    // ignore
  }
}

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { auth, db } from '../firebase';
// @ts-ignore
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { GlobalAlertProvider } from '../components/CustomAlert';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);
  const pushToken = usePushNotifications();


  useEffect(() => {
    if (Platform.OS !== 'ios') {
      return;
    }

    // void enableAppSwitcherProtectionAsync(0.85).catch(error => {
    //   console.warn('Failed to enable iOS app switcher protection:', error);
    // });
    //
    // return () => {
    //   void disableAppSwitcherProtectionAsync().catch(error => {
    //     console.warn('Failed to disable iOS app switcher protection:', error);
    //   });
    // };
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(undefined);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // 1. Single Firebase Auth listener independent of navigation
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Automatically update user document with the push token
  useEffect(() => {
    if (currentUser && pushToken) {
      const saveTokenToDb = async () => {
        try {
          const teacherRef = doc(db, 'teachers', currentUser.uid);
          const teacherDoc = await getDoc(teacherRef);
          if (teacherDoc.exists()) {
            await setDoc(teacherRef, { expoPushToken: pushToken }, { merge: true });
          } else {
            const studentRef = doc(db, 'students', currentUser.uid);
            const studentDoc = await getDoc(studentRef);
            if (studentDoc.exists()) {
              await setDoc(studentRef, { expoPushToken: pushToken }, { merge: true });
            }
          }
        } catch (error) {
          console.error('Error saving push token', error);
        }
      };
      saveTokenToDb();
    }
  }, [pushToken, currentUser]);

  // 2. Reactive Routing logic separated from Auth Listener
  useEffect(() => {
    if (!isAuthReady) return; // Wait until firebase checks indexed db

    const inAuthGroup = segments[0] === 'login';

    if (!currentUser && !inAuthGroup) {
      // Redirect to login if user is not authenticated
      router.replace('/login');
    } else if (currentUser && inAuthGroup) {
      // If user is logged in, but on the login page (or navigating to it), calculate role and route them
      const routeAuthenticatedUser = async () => {
        try {
          const teacherDoc = await getDoc(doc(db, 'teachers', currentUser.uid));
          if (teacherDoc.exists()) {
            router.replace('/teacher_home');
          } else {
            const studentDoc = await getDoc(doc(db, 'students', currentUser.uid));
            if (studentDoc.exists() && studentDoc.data().isSetupComplete === false) {
              router.replace('/setup');
            } else {
              router.replace('/(tabs)');
            }
          }
        } catch (error) {
          router.replace('/(tabs)');
        }
      };
      
      routeAuthenticatedUser();
    }
  }, [currentUser, isAuthReady, segments]);

  const isNavigatingAwayFromLogin = isAuthReady && currentUser && segments[0] === 'login';

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
        {(!isAuthReady || isNavigatingAwayFromLogin) && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colorScheme === 'dark' ? '#000' : '#fff', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <ActivityIndicator size="large" color="#12453D" />
          </View>
        )}
        <GlobalAlertProvider />
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
