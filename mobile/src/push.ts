import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { registerPushToken } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushResult = { token: string | null; problem: string | null };

/** Ask permission, get this phone's push token and tell the server about it. Never throws. */
export async function enablePush(): Promise<PushResult> {
  try {
    if (Platform.OS === 'web') return { token: null, problem: 'Alerts to the phone work in the Android and iPhone app.' };
    if (!Device.isDevice) return { token: null, problem: 'Push alerts need a real phone, not an emulator.' };
    if (Platform.OS === 'android') {
      // Android 13+ shows the permission prompt only after a channel exists.
      await Notifications.setNotificationChannelAsync('alerts', {
        name: 'Fight alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 300, 200, 300],
      });
    }
    const current = await Notifications.getPermissionsAsync();
    let granted = current.granted;
    if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return { token: null, problem: 'Notifications are turned off for CampusGuard. Turn them on in the phone settings.' };
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return { token: null, problem: 'Push is not set up in this build yet (missing EAS project id).' };
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(data, Platform.OS);
    return { token: data, problem: null };
  } catch (error) {
    return { token: null, problem: error instanceof Error ? error.message : 'Could not turn on alerts.' };
  }
}
