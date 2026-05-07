import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';

SplashScreen.preventAutoHideAsync().catch(() => {});

import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
import { getDeviceId } from '../utils/deviceId';
import { Platform, ActivityIndicator, View, StyleSheet, I18nManager, Alert } from 'react-native';
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
import {
  NotificationProfileRole,
  getNotificationProfileRef,
  isNotificationsEnabled,
  resolveNotificationProfile,
} from '../utils/notificationProfile';
import { maskPushToken } from '../utils/pushNotifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

const PUSH_DIAG_PREFIX = '[PushDiag][RootLayout]';

function logPush(event: string, data?: unknown) {
  if (data === undefined) {
    console.log(`${PUSH_DIAG_PREFIX} ${event}`);
    return;
  }
  console.log(`${PUSH_DIAG_PREFIX} ${event}`, data);
}

function logPushError(event: string, error: unknown) {
  console.error(`${PUSH_DIAG_PREFIX} ${event}`, error);
}

type AccountRole = 'teacher' | 'student';

const TEACHER_ONLY_SEGMENTS = new Set([
  'teacher_home',
  'teacher_lectures',
  'teacher_quizzes',
  'manage_playlist',
  'submissions',
]);

const STUDENT_ONLY_SEGMENTS = new Set([
  '(tabs)',
  'setup',
  'terms',
  'subject',
  'quiz',
]);

const getPushNotificationRoute = (data: any) => {
  const route = typeof data?.route === 'string' ? data.route : '';
  const lectureId = typeof data?.lectureId === 'string' ? data.lectureId : '';
  const quizId = typeof data?.quizId === 'string' ? data.quizId : '';
  const chatUserId = typeof data?.chatUserId === 'string' ? data.chatUserId : '';
  const groupId = typeof data?.groupId === 'string' ? data.groupId : '';

  if (lectureId) return { pathname: '/video/[id]', params: { id: lectureId } };
  if (quizId) return { pathname: '/quiz/[id]', params: { id: quizId } };
  if (chatUserId) return { pathname: '/chat/[id]', params: { id: chatUserId, name: data.chatName || 'رسائل' } };
  if (groupId) return { pathname: '/group/[id]', params: { id: groupId, name: data.groupName || 'مجموعة النقاش' } };
  if (route === 'lectures') return '/(tabs)/lectures';
  if (route === 'quizzes') return '/(tabs)/quizzes';
  if (route === 'subjects') return '/(tabs)/subjects';
  if (route === 'notification') return '/(tabs)/notifications';
  return null;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);
  const [notificationPrefLoaded, setNotificationPrefLoaded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationProfileRole, setNotificationProfileRole] = useState<NotificationProfileRole | null>(null);
  const { expoPushToken: pushToken, permissionStatus: pushPermissionStatus } = usePushNotifications(
    notificationPrefLoaded && notificationsEnabled
  );

  // 0. Video Splash Screen logic
  const [isVideoSplashFinished, setIsVideoSplashFinished] = useState(false);
  const player = useVideoPlayer(require('../assets/videos/splash.mp4'), p => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    // Hide static OS splash screen instantly so video is visible
    SplashScreen.hideAsync().catch(() => {});
    // Default the whole app to portrait; video fullscreen unlocks to landscape on demand.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  useEffect(() => {
    const s = player.addListener('playToEnd', () => {
      setIsVideoSplashFinished(true);
    });
    return () => s.remove();
  }, [player]);


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
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isSetupValidated, setIsSetupValidated] = useState(false);
  const localSessionId = useRef<string | null>(null);
  const handledNotificationResponseId = useRef<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | undefined;
    let cancelled = false;

    if (!currentUser?.uid) {
      setNotificationProfileRole(null);
      setNotificationsEnabled(false);
      setNotificationPrefLoaded(false);
      return;
    }

    setNotificationPrefLoaded(false);

    const attachProfileListener = async () => {
      try {
        const profile = await resolveNotificationProfile(currentUser.uid);
        if (cancelled) {
          return;
        }

        if (!profile) {
          setNotificationProfileRole(null);
          setNotificationsEnabled(true);
          setNotificationPrefLoaded(true);
          logPush('notification_pref_profile_missing', { uid: currentUser.uid });
          return;
        }

        setNotificationProfileRole(profile.role);
        unsubscribeProfile = onSnapshot(
          profile.ref,
          (snapshot) => {
            const data = snapshot.data() || {};
            const nextEnabled = isNotificationsEnabled(data);
            setNotificationsEnabled(nextEnabled);
            setNotificationPrefLoaded(true);
            logPush('notification_pref_snapshot', {
              uid: currentUser.uid,
              role: profile.role,
              enabled: nextEnabled,
              permissionStatus: data.notificationsPermissionStatus ?? null,
              hasToken: Boolean(data.expoPushToken),
            });
          },
          (error) => {
            logPushError('notification_pref_snapshot_failed', error);
            setNotificationPrefLoaded(true);
          }
        );
      } catch (error) {
        logPushError('notification_pref_load_failed', error);
        if (!cancelled) {
          setNotificationsEnabled(true);
          setNotificationPrefLoaded(true);
        }
      }
    };

    attachProfileListener();

    return () => {
      cancelled = true;
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, [currentUser?.uid]);

  useEffect(() => {
    // Reset validation when user changes
    setIsSetupValidated(false);
    setAccountRole(null);
  }, [currentUser?.uid]);

  useEffect(() => {
    logPush('layout_mounted');
    return () => {
      logPush('layout_unmounted');
    };
  }, []);

  // Concurrent session check for students
  useEffect(() => {
    if (!currentUser) {
      localSessionId.current = null;
      return;
    }

    const studentRef = doc(db, 'students', currentUser.uid);
    const unsub = onSnapshot(studentRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const serverSessionId = data.activeSessionId;

        if (!localSessionId.current) {
          // Initialize our local session tracking with the first value we see
          localSessionId.current = serverSessionId;
        } else if (serverSessionId && serverSessionId !== localSessionId.current) {
          // Session ID changed on the server, meaning another device logged in
          Alert.alert('تنبيه الأمان', 'تم تسجيل الدخول من جهاز آخر. سيتم تسجيل الخروج.');
          auth.signOut();
        }
      }
    });

    return () => unsub();
  }, [currentUser]);

  // 1. Single Firebase Auth listener independent of navigation
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      logPush('auth_state_changed', {
        uid: user?.uid ?? null,
        email: user?.email ?? null,
      });
      setCurrentUser(user);
      setIsAuthReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const openNotificationTarget = (response: Notifications.NotificationResponse) => {
      const identifier = response.notification.request.identifier;
      if (handledNotificationResponseId.current === identifier) {
        return;
      }
      handledNotificationResponseId.current = identifier;

      const route = getPushNotificationRoute(response.notification.request.content.data);
      if (!route) {
        return;
      }

      setTimeout(() => {
        router.push(route as any);
      }, 250);
    };

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const triggerType = (notification.request.trigger as any)?.type ?? 'unknown';
      logPush('notification_received_foreground', {
        identifier: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        data: notification.request.content.data,
        triggerType,
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      logPush('notification_response_received', {
        actionIdentifier: response.actionIdentifier,
        identifier: response.notification.request.identifier,
        title: response.notification.request.content.title,
        data: response.notification.request.content.data,
      });
      openNotificationTarget(response);
    });

    Notifications.getLastNotificationResponseAsync()
      .then((lastResponse) => {
        if (!lastResponse) {
          logPush('last_notification_response_none');
          return;
        }

        logPush('last_notification_response_found', {
          actionIdentifier: lastResponse.actionIdentifier,
          identifier: lastResponse.notification.request.identifier,
          title: lastResponse.notification.request.content.title,
          data: lastResponse.notification.request.content.data,
        });
        openNotificationTarget(lastResponse);
      })
      .catch((error) => {
        logPushError('last_notification_response_failed', error);
      });

    return () => {
      receivedSub.remove();
      responseSub.remove();
      logPush('notification_listeners_removed');
    };
  }, [router]);

  useEffect(() => {
    logPush('push_token_state_changed', {
      enabled: notificationsEnabled,
      permissionStatus: pushPermissionStatus,
      hasToken: Boolean(pushToken),
      tokenPreview: maskPushToken(pushToken),
    });
  }, [notificationsEnabled, pushPermissionStatus, pushToken]);

  // Automatically update user document with the push token while notifications are enabled.
  useEffect(() => {
    if (!currentUser) {
      logPush('token_save_skipped_no_user');
      return;
    }
    if (!notificationPrefLoaded) {
      logPush('token_save_skipped_pref_not_loaded', { uid: currentUser.uid });
      return;
    }
    if (!notificationProfileRole) {
      logPush('token_save_skipped_no_profile_role', { uid: currentUser.uid });
      return;
    }
    if (!notificationsEnabled) {
      logPush('token_save_skipped_notifications_disabled', { uid: currentUser.uid });
      return;
    }
    if (!pushToken) {
      logPush('token_save_skipped_no_token', { uid: currentUser.uid });
      return;
    }

    const saveTokenToDb = async () => {
      try {
        const tokenPayload = {
          notificationsEnabled: true,
          notificationsPermissionStatus: pushPermissionStatus,
          expoPushToken: pushToken,
          expoPushTokenPlatform: Platform.OS,
          expoPushTokenUpdatedAt: new Date().toISOString(),
        };

        logPush('token_save_attempt', {
          uid: currentUser.uid,
          tokenPayload,
        });

        const profileRef = getNotificationProfileRef(notificationProfileRole, currentUser.uid);
        await setDoc(profileRef, tokenPayload, { merge: true });
        logPush('token_saved_profile', {
          uid: currentUser.uid,
          role: notificationProfileRole,
        });
      } catch (error) {
        logPushError('token_save_failed', error);
      }
    };
    saveTokenToDb();
  }, [
    currentUser,
    notificationPrefLoaded,
    notificationProfileRole,
    notificationsEnabled,
    pushPermissionStatus,
    pushToken,
  ]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    if (!notificationPrefLoaded || !notificationProfileRole) {
      return;
    }
    if (notificationsEnabled) {
      return;
    }

    const clearTokenFromDb = async () => {
      try {
        const profileRef = getNotificationProfileRef(notificationProfileRole, currentUser.uid);
        const tokenPayload: Record<string, unknown> = {
          notificationsEnabled: false,
          expoPushToken: null,
          expoPushTokenPlatform: Platform.OS,
          expoPushTokenUpdatedAt: new Date().toISOString(),
        };
        if (pushPermissionStatus !== 'undetermined') {
          tokenPayload.notificationsPermissionStatus = pushPermissionStatus;
        }

        await setDoc(profileRef, tokenPayload, { merge: true });
        logPush('token_cleared_profile', {
          uid: currentUser.uid,
          role: notificationProfileRole,
        });
      } catch (error) {
        logPushError('token_clear_failed', error);
      }
    };

    clearTokenFromDb();
  }, [
    currentUser,
    notificationPrefLoaded,
    notificationProfileRole,
    notificationsEnabled,
    pushPermissionStatus,
  ]);

  useEffect(() => {
    if (!isAuthReady) return;

    const currentSegment = segments[0] ?? '';
    const inAuthGroup = currentSegment === 'login' || currentSegment === 'privacy' || currentSegment === 'terms';
    const inSetup = currentSegment === 'setup';
    const inTerms = currentSegment === 'terms';
    const inTeacherOnlyRoute = TEACHER_ONLY_SEGMENTS.has(currentSegment);
    const inStudentOnlyRoute = STUDENT_ONLY_SEGMENTS.has(currentSegment);
    const roleRouteMismatch =
      (accountRole === 'teacher' && inStudentOnlyRoute) ||
      (accountRole === 'student' && inTeacherOnlyRoute);

    // 1. Handle Unauthenticated users
    if (!currentUser) {
      if (!inAuthGroup) {
        logPush('routing_redirect_login', { segment: segments[0] ?? null });
        router.replace('/login');
      }
      return;
    }

    // 2. Handle Authenticated users - ensure setup is complete
    if (!isSetupValidated || inAuthGroup || roleRouteMismatch) {
      const validateUserAndRoute = async () => {
        try {
          // Check teachers first
          const teacherDoc = await getDoc(doc(db, 'teachers', currentUser.uid));
          if (teacherDoc.exists()) {
            setAccountRole('teacher');
            setIsSetupValidated(true);
            if (inAuthGroup || inStudentOnlyRoute) {
              logPush('routing_teacher_home', { uid: currentUser.uid });
              router.replace('/teacher_home');
            }
            return;
          }

          // Check students
          const studentDoc = await getDoc(doc(db, 'students', currentUser.uid));
          if (studentDoc.exists()) {
            const data = studentDoc.data();
            
            // SECURITY: Check device binding before routing
            const deviceId = await getDeviceId();
            
            if (data.boundDeviceId && data.boundDeviceId !== deviceId) {
              // Device mismatch! Do not route.
              logPush('routing_blocked_device_mismatch', { uid: currentUser.uid });
              if (!inAuthGroup) {
                // If they are not on the login screen, force them out
                auth.signOut();
              }
              return;
            }

            if (!data.boundDeviceId) {
              // Admin reset the binding, or this is a legacy account's first open
              // Auto-bind to this device to prevent the account from remaining unbound
              await updateDoc(doc(db, 'students', currentUser.uid), {
                boundDeviceId: deviceId,
                boundDeviceOS: Platform.OS,
                boundAt: new Date().toISOString(),
              });
            }

            setAccountRole('student');
            setIsSetupValidated(true);
            
            if (data.isSetupComplete === false) {
              if (!inSetup) {
                logPush('routing_setup', { uid: currentUser.uid });
                router.replace('/setup');
              }
            } else if (!data.termsAccepted) {
              // Setup complete but terms not accepted yet
              if (!inTerms && !inSetup) {
                logPush('routing_terms', { uid: currentUser.uid });
                router.replace('/terms');
              }
            } else {
              // Setup is complete and terms accepted
              if (inAuthGroup || inSetup || inTerms || inTeacherOnlyRoute) {
                logPush('routing_tabs', { uid: currentUser.uid });
                router.replace('/(tabs)');
              }
            }
          } else {
            // Profile missing - might be a new sign up that crashed?
            // Fallback to login if no profile exists
            logPush('routing_no_profile_found', { uid: currentUser.uid });
            // Don't validate if no profile yet, maybe they need to sign up
          }
        } catch (error) {
          logPushError('routing_validation_failed', error);
        }
      };
      
      validateUserAndRoute();
    }
  }, [currentUser, isAuthReady, segments, isSetupValidated, accountRole, router]);

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
          <Stack.Screen name="privacy" options={{ headerShown: false, animation: 'slide_from_bottom' }} />
          <Stack.Screen name="terms" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack>
        {(!isAuthReady || isNavigatingAwayFromLogin) && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colorScheme === 'dark' ? '#000' : '#fff', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
            <ActivityIndicator size="large" color="#12453D" />
          </View>
        )}
        
        {/* Modern Video Splash Overlay */}
        {!isVideoSplashFinished && (
          <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#12453D', zIndex: 100000 }}>
             <VideoView player={player} style={StyleSheet.absoluteFillObject} contentFit="cover" nativeControls={false} />
          </View>
        )}

        <GlobalAlertProvider />
        <StatusBar style="auto" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
