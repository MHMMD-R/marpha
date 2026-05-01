import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  PushPermissionStatus,
  maskPushToken,
  requestPushTokenAsync,
} from '../utils/pushNotifications';

const PUSH_DIAG_PREFIX = '[PushDiag][PushHook]';

function pushLog(event: string, data?: unknown) {
  if (data === undefined) {
    console.log(`${PUSH_DIAG_PREFIX} ${event}`);
    return;
  }
  console.log(`${PUSH_DIAG_PREFIX} ${event}`, data);
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const triggerType = (notification.request.trigger as any)?.type ?? 'unknown';
    pushLog('foreground_notification_handler_called', {
      identifier: notification.request.identifier,
      title: notification.request.content.title,
      dataKeys: Object.keys((notification.request.content.data || {}) as Record<string, unknown>),
      triggerType,
    });

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export function usePushNotifications(enabled: boolean) {
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>();
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('undetermined');

  useEffect(() => {
    let isMounted = true;
    pushLog('hook_mounted', {
      platform: Platform.OS,
      isDevice: Device.isDevice,
      appOwnership: Constants.appOwnership,
      enabled,
    });

    if (!enabled) {
      setExpoPushToken(undefined);
      setPermissionStatus('undetermined');
      pushLog('registration_skipped_disabled');

      return () => {
        isMounted = false;
        pushLog('hook_unmounted');
      };
    }

    requestPushTokenAsync().then(({ token, permissionStatus: nextStatus }) => {
      pushLog('register_promise_resolved', {
        token: maskPushToken(token),
        permissionStatus: nextStatus,
      });

      if (!isMounted) {
        return;
      }

      setPermissionStatus(nextStatus);
      setExpoPushToken(token);
    });

    const tokenSubscription = Notifications.addPushTokenListener(({ data }) => {
      setExpoPushToken(data);
      setPermissionStatus(Notifications.PermissionStatus.GRANTED);
      pushLog('token_refreshed', { token: maskPushToken(data) });
    });

    return () => {
      isMounted = false;
      tokenSubscription.remove();
      pushLog('hook_unmounted');
    };
  }, [enabled]);

  useEffect(() => {
    if (!expoPushToken) {
      return;
    }
    pushLog('state_token_updated', { token: maskPushToken(expoPushToken) });
  }, [expoPushToken]);

  return {
    expoPushToken,
    permissionStatus,
  };
}
