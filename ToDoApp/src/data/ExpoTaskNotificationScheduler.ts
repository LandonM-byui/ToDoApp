import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';
import type * as Notifications from 'expo-notifications';
import type { TaskNotificationScheduler } from '../domain/TaskNotificationScheduler';

let notificationHandlerConfigured = false;

export class ExpoTaskNotificationScheduler implements TaskNotificationScheduler {
  async scheduleCompletion(taskName: string, remainingSeconds: number): Promise<string | null> {
    if (Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo) {
      return null;
    }

    const notifications = await loadNotifications();

    await notifications.setNotificationChannelAsync('task-completion', {
      name: 'Task completion',
      importance: notifications.AndroidImportance.HIGH,
    });

    let permission = await notifications.getPermissionsAsync();
    if (!hasNotificationPermission(permission, notifications)) {
      permission = await notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: false, allowSound: true },
      });
    }

    if (!hasNotificationPermission(permission, notifications)) {
      return null;
    }

    return notifications.scheduleNotificationAsync({
      content: {
        title: 'To Do List',
        body: `The task ${taskName} has been completed.`,
        data: { taskName },
      },
      trigger: {
        type: notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.ceil(remainingSeconds)),
        channelId: 'task-completion',
      },
    });
  }

  async cancelCompletion(notificationId: string): Promise<void> {
    if (isAndroidExpoGo()) {
      return;
    }

    const notifications = await loadNotifications();
    await notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

function isAndroidExpoGo(): boolean {
  return Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo;
}

async function loadNotifications(): Promise<typeof import('expo-notifications')> {
  const notifications = require('expo-notifications') as typeof import('expo-notifications');
  if (!notificationHandlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationHandlerConfigured = true;
  }
  return notifications;
}

function hasNotificationPermission(
  permission: Notifications.NotificationPermissionsStatus,
  notifications: typeof import('expo-notifications'),
): boolean {
  return (
    permission.granted ||
    permission.ios?.status === notifications.IosAuthorizationStatus.AUTHORIZED ||
    permission.ios?.status === notifications.IosAuthorizationStatus.PROVISIONAL
  );
}
