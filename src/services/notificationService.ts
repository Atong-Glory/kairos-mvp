import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Initialize notifications and request permissions
 */
export async function initializeNotifications(): Promise<string | null> {
  try {
    // Only request permissions on physical devices
    if (!Device.isDevice) {
      console.log('Notifications must be tested on a real device');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the push token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: 'your-expo-project-id', // Will be auto-filled by Expo
    });

    console.log('Push Token:', token.data);
    return token.data;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return null;
  }
}

/**
 * Set default notification handler
 */
export function setNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // Customize notification behavior here
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      };
    },
  });
}

/**
 * Listen for foreground notifications
 */
export function onForegroundNotification(
  callback: (notification: Notifications.Notification) => void
): () => void {
  return Notifications.addNotificationResponseReceivedListener((response) => {
    callback(response.notification);
  });
}

/**
 * Listen for notification taps (when app is in background/closed)
 */
export function onNotificationResponse(
  callback: (response: Notifications.NotificationResponse) => void
): () => void {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Send local test notification
 */
export async function sendTestNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎬 KAIRO',
        body: 'This is a test notification',
        data: { type: 'test' },
      },
      trigger: { seconds: 2 },
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}

/**
 * Send notification about new chat message
 */
export async function sendChatNotification(senderName: string, preview: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `💬 Message from ${senderName}`,
        body: preview.substring(0, 100),
        data: { type: 'chat', action: 'open_chat' },
      },
      trigger: { seconds: 1 },
    });
  } catch (error) {
    console.error('Error sending chat notification:', error);
  }
}

/**
 * Send notification about call sheet update
 */
export async function sendCallSheetNotification(sceneNumber: string, location: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '📋 Call Sheet Updated',
        body: `Scene ${sceneNumber} at ${location} - Check the updated call sheet`,
        data: { type: 'call_sheet', scene: sceneNumber, action: 'open_call_sheet' },
      },
      trigger: { seconds: 1 },
    });
  } catch (error) {
    console.error('Error sending call sheet notification:', error);
  }
}

/**
 * Send notification about scene changes
 */
export async function sendSceneNotification(sceneNumber: string, changeType: 'created' | 'updated' | 'scheduled') {
  const messages = {
    created: `New scene ${sceneNumber} added to project`,
    updated: `Scene ${sceneNumber} has been updated`,
    scheduled: `Scene ${sceneNumber} scheduled for today!`,
  };

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🎬 Scene Update',
        body: messages[changeType],
        data: { type: 'scene', sceneNumber, action: 'open_scene' },
      },
      trigger: { seconds: 1 },
    });
  } catch (error) {
    console.error('Error sending scene notification:', error);
  }
}

/**
 * Send notification about crew changes
 */
export async function sendCrewNotification(crewName: string, role: string, action: 'added' | 'removed' | 'changed') {
  const messages = {
    added: `${crewName} has been added as ${role}`,
    removed: `${crewName} (${role}) has been removed`,
    changed: `${crewName}'s role changed to ${role}`,
  };

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '👥 Crew Update',
        body: messages[action],
        data: { type: 'crew', crewName, action: 'open_roles' },
      },
      trigger: { seconds: 1 },
    });
  } catch (error) {
    console.error('Error sending crew notification:', error);
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications() {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
}

/**
 * Configure notification channels for Android
 */
export async function configureAndroidChannels() {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#3B82F6',
      });

      await Notifications.setNotificationChannelAsync('call_sheet', {
        name: 'Call Sheet Updates',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
      });

      await Notifications.setNotificationChannelAsync('production', {
        name: 'Production Updates',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#3B82F6',
      });
    } catch (error) {
      console.error('Error configuring Android notification channels:', error);
    }
  }
}
