import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import type { UpdateInfo } from './update';

/** Download the new APK and open Android's installer. Returns an error message, or null when the installer opened. */
export async function downloadAndInstall(update: UpdateInfo, onProgress: (fraction: number) => void): Promise<string | null> {
  if (Platform.OS !== 'android') return 'Updating inside the app works on Android only.';
  try {
    const target = `${FileSystem.cacheDirectory}CampusGuard-${update.version}.apk`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    const download = FileSystem.createDownloadResumable(update.apkUrl, target, {}, ({ totalBytesWritten, totalBytesExpectedToWrite }) => {
      if (totalBytesExpectedToWrite > 0) onProgress(totalBytesWritten / totalBytesExpectedToWrite);
    });
    const result = await download.downloadAsync();
    if (!result || result.status !== 200) return 'The download did not finish. Check your internet and try again.';
    const contentUri = await FileSystem.getContentUriAsync(result.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : 'Could not start the update.';
  }
}
