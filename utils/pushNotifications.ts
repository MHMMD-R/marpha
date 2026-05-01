import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const PUSH_DIAG_PREFIX = '[PushDiag][PushUtils]';

export type PushPermissionStatus = Notifications.PermissionStatus | 'undetermined';

export function maskPushToken(token: string | undefined | null) {
  if (!token) return token;
  if (token.length <= 20) return token;
  return `${token.slice(0, 12)}...${token.slice(-8)}`;
}

function pushLog(event: string, data?: unknown) {
  if (data === undefined) {
    console.log(`${PUSH_DIAG_PREFIX} ${event}`);
    return;
  }
  console.log(`${PUSH_DIAG_PREFIX} ${event}`, data);
}

function pushError(event: string, error: unknown) {
  console.error(`${PUSH_DIAG_PREFIX} ${event}`, error);
}

export async function configureNotificationChannelAsync() {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Marpha notifications',
      description: 'General notifications from the app',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0d4a3a',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
    pushLog('android_channel_configured', { channelId: 'default' });
  } catch (error) {
    pushError('android_channel_config_failed', error);
  }
}

export async function getNotificationPermissionStatusAsync(): Promise<PushPermissionStatus> {
  try {
    const permissionInfo = await Notifications.getPermissionsAsync();
    return permissionInfo.status;
  } catch (error) {
    pushError('permissions_read_failed', error);
    return 'undetermined';
  }
}

function resolveProjectId() {
  const fromEasConfig = Constants?.easConfig?.projectId ?? null;
  const fromExpoConfig = Constants?.expoConfig?.extra?.eas?.projectId ?? null;
  const fromManifest2 = (Constants as any)?.manifest2?.extra?.expoClient?.extra?.eas?.projectId;
  const fromLegacyManifest = (Constants as any)?.manifest?.extra?.eas?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? null;
  const projectId =
    fromEasConfig ||
    fromExpoConfig ||
    fromManifest2 ||
    fromLegacyManifest ||
    fromEnv;

  return {
    projectId,
    sources: {
      fromEasConfig,
      fromExpoConfig,
      fromManifest2: fromManifest2 ?? null,
      fromLegacyManifest: fromLegacyManifest ?? null,
      fromEnv,
    },
  };
}

export async function requestPushTokenAsync(): Promise<{
  permissionStatus: PushPermissionStatus;
  token?: string;
}> {
  let token: string | undefined;
  let finalStatus: PushPermissionStatus = 'undetermined';

  pushLog('register_start', {
    platform: Platform.OS,
    isDevice: Device.isDevice,
    appOwnership: Constants.appOwnership,
  });

  await configureNotificationChannelAsync();

  if (!Device.isDevice) {
    pushLog('not_physical_device_abort');
    return { permissionStatus: finalStatus, token };
  }

  const permissionInfo = await Notifications.getPermissionsAsync();
  const { status: existingStatus } = permissionInfo;
  pushLog('permissions_existing', permissionInfo);
  finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const requestResult = await Notifications.requestPermissionsAsync();
    finalStatus = requestResult.status;
    pushLog('permissions_requested', requestResult);
  }

  if (finalStatus !== 'granted') {
    pushLog('permission_denied_abort', { finalStatus });
    return { permissionStatus: finalStatus, token };
  }

  if (Platform.OS === 'android') {
    try {
      const nativeToken = await Notifications.getDevicePushTokenAsync();
      pushLog('native_device_push_token_obtained', {
        tokenType: nativeToken.type,
        token: maskPushToken(String(nativeToken.data)),
      });
    } catch (error) {
      pushError('native_device_push_token_failed', error);
    }
  }

  try {
    const projectConfig = resolveProjectId();
    const projectId = projectConfig.projectId;
    pushLog('project_id_resolution', projectConfig);

    if (!projectId) {
      pushLog('project_id_missing_abort');
      return { permissionStatus: finalStatus, token };
    }

    const pushTokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    token = pushTokenData.data;
    pushLog('expo_push_token_obtained', { token: maskPushToken(token) });
  } catch (error: any) {
    pushError('expo_push_token_failed', {
      message: error?.message || 'unknown_error',
      code: error?.code,
      stack: error?.stack,
      raw: error,
    });
  }

  pushLog('register_complete', { token: maskPushToken(token), permissionStatus: finalStatus });
  return { permissionStatus: finalStatus, token };
}
