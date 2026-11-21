import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type AlertSetup = {
  /** Notifications may be shown (alerts while the app is open or recently used). */
  allowed: boolean;
  /** This phone is registered for alerts that arrive while the app is closed. */
  token: string | null;
  /** Plain-words state for the Account tab. */
  message: string;
};

const WHILE_OPEN = 'Alerts appear while the app is open or was used a moment ago. Alerts to a closed app need a one-time server setup.';

/** Ask permission, then try to register for closed-app alerts. Never throws. */
export async function setupAlerts(): Promise<AlertSetup> {
  try {
    if (Platform.OS === 'web') return { allowed: false, token: null, message: 'Phone alerts work in the Android and iPhone app.' };
    if (Platform.OS === 'android') {
      // Android 13+ asks for permission only once a channel exists.
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Fight alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return { allowed: false, token: null, message: 'Notifications are off for CampusGuard. Turn them on in the phone settings.' };

    if (!Device.isDevice || Platform.OS !== 'android') return { allowed: true, token: null, message: WHILE_OPEN };
    try {
      // The phone's own Firebase token: the website sends alerts to it even when the app is closed.
      const { data } = await Notifications.getDevicePushTokenAsync();
      const token = String(data);
      await registerPushToken(token, 'android');
      return { allowed: true, token, message: 'On. You will be notified of new alerts even when the app is closed.' };
    } catch {
      // No connection or no Firebase in this build: local alerts still work.
      return { allowed: true, token: null, message: WHILE_OPEN };
    }
  } catch (error) {
    return { allowed: false, token: null, message: error instanceof Error ? error.message : 'Could not turn on alerts.' };
  }
}

/** Show a notification on this phone right now. */
export async function showLocalAlert(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', data: { type: 'incident' } },
      trigger: Platform.OS === 'android' ? { channelId: 'alerts' } as any : null,
    });
  } catch {
    /* a failed local alert must never break the screen */
  }
}
