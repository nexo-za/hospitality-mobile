import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '../api';
import createTaggedLogger from '../utils/appLogger';

const log = createTaggedLogger('PushNotificationService');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

class PushNotificationService {
  private pushToken: string | null = null;
  private notificationListener: Notifications.Subscription | null = null;
  private responseListener: Notifications.Subscription | null = null;
  private onNotificationTap: ((data: Record<string, any>) => void) | null = null;

  async initialize(
    onTap?: (data: Record<string, any>) => void,
  ): Promise<string | null> {
    this.onNotificationTap = onTap ?? null;

    const token = await this.registerForPushNotifications();
    if (token) {
      this.pushToken = token;
      await this.registerTokenWithApi(token);
    }

    this.notificationListener =
      Notifications.addNotificationReceivedListener((notification) => {
        log.debug('Notification received in foreground', notification.request.content);
      });

    this.responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data ?? {};
        log.info('Notification tapped', data);
        this.onNotificationTap?.(data as Record<string, any>);
      });

    if (Platform.OS === 'android') {
      try {
        await this.setupAndroidChannels();
      } catch (err) {
        log.warn('Failed to setup Android notification channels', err);
      }
    }

    return token;
  }

  async teardown(): Promise<void> {
    this.notificationListener?.remove();
    this.responseListener?.remove();
    if (this.pushToken) {
      await this.unregisterTokenFromApi(this.pushToken);
    }
    this.pushToken = null;
  }

  // ── Registration ────────────────────────────────────────────────────────

  private async registerForPushNotifications(): Promise<string | null> {
    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        log.warn('Push notification permission not granted');
        return null;
      }

      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        Constants.easConfig?.projectId;

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      log.info('Push token obtained', tokenResponse.data);
      return tokenResponse.data;
    } catch (error) {
      log.error('Failed to get push token', error);
      return null;
    }
  }

  private async registerTokenWithApi(token: string): Promise<void> {
    try {
      await api.post('hospitality/push-tokens', {
        pushToken: token,
        platform: Platform.OS,
      });
      log.info('Push token registered with API');
    } catch (error) {
      log.error('Failed to register push token with API', error);
    }
  }

  private async unregisterTokenFromApi(token: string): Promise<void> {
    try {
      await api.delete(`hospitality/push-tokens/${encodeURIComponent(token)}`);
      log.info('Push token unregistered from API');
    } catch (error) {
      log.error('Failed to unregister push token from API', error);
    }
  }

  // ── Android channels ────────────────────────────────────────────────────

  private async setupAndroidChannels(): Promise<void> {
    await Notifications.setNotificationChannelAsync('critical', {
      name: 'Critical Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    await Notifications.setNotificationChannelAsync('high', {
      name: 'Important',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // ── Accessors ───────────────────────────────────────────────────────────

  getToken(): string | null {
    return this.pushToken;
  }
}

export default new PushNotificationService();
