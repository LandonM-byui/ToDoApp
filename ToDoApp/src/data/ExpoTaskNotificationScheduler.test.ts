import * as Notifications from 'expo-notifications';
import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';
import { ExpoTaskNotificationScheduler } from './ExpoTaskNotificationScheduler';

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  IosAuthorizationStatus: { AUTHORIZED: 2, PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { TIME_INTERVAL: 'timeInterval' },
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
}));

const grantedPermission = { granted: true, status: 'granted' } as Notifications.NotificationPermissionsStatus;

describe('ExpoTaskNotificationScheduler', () => {
  const scheduler = new ExpoTaskNotificationScheduler();

  beforeEach(() => {
    jest.clearAllMocks();
    setRuntime('ios', null);
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(grantedPermission);
    jest.mocked(Notifications.setNotificationChannelAsync).mockResolvedValue({} as never);
  });

  it('skips notifications in Android Expo Go', async () => {
    setRuntime('android', AppOwnership.Expo);

    const notificationId = await scheduler.scheduleCompletion('Read a chapter', 30);

    expect(notificationId).toBeNull();
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('schedules a completion alert containing the task name', async () => {
    jest.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('notification-1');

    const notificationId = await scheduler.scheduleCompletion('Read a chapter', 61);

    expect(notificationId).toBe('notification-1');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'To Do List',
        body: 'The task Read a chapter has been completed.',
        data: { taskName: 'Read a chapter' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 61,
        channelId: 'task-completion',
      },
    });
  });

  it('requests permission when notifications have not been authorized', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      status: 'undetermined',
    } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(grantedPermission);
    jest.mocked(Notifications.scheduleNotificationAsync).mockResolvedValue('notification-2');

    await scheduler.scheduleCompletion('Read a chapter', 30);

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });

  it('does not schedule an alert when permission is denied', async () => {
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
      granted: false,
      status: 'denied',
    } as Notifications.NotificationPermissionsStatus);
    jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue({
      granted: false,
      status: 'denied',
    } as Notifications.NotificationPermissionsStatus);

    const notificationId = await scheduler.scheduleCompletion('Read a chapter', 30);

    expect(notificationId).toBeNull();
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('cancels an alert when the timer is paused', async () => {
    await scheduler.cancelCompletion('notification-1');

    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notification-1');
  });
});

function setRuntime(platform: string, appOwnership: AppOwnership | null): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value: platform });
  Object.defineProperty(Constants, 'appOwnership', {
    configurable: true,
    value: appOwnership,
  });
}
