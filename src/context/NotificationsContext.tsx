import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
  initializeNotifications,
  setNotificationHandler,
  onNotificationResponse,
  configureAndroidChannels,
} from '../services/notificationService';
import Toast from 'react-native-toast-message';

interface NotificationsContextType {
  expoPushToken: string | null;
  loading: boolean;
  isNotificationsEnabled: boolean;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
  lastNotification: Notifications.Notification | null;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | null>(null);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);

  /**
   * Initialize notifications on mount
   */
  useEffect(() => {
    (async () => {
      try {
        // Configure Android notification channels
        await configureAndroidChannels();

        // Set the default notification handler
        setNotificationHandler();

        // Try to initialize and get push token
        const token = await initializeNotifications();
        if (token) {
          setExpoPushToken(token);
          setIsNotificationsEnabled(true);

          // Store token in database for this user
          if (user) {
            const { error } = await supabase
              .from('users')
              .update({ expo_push_token: token })
              .eq('id', user.id);

            if (error) {
              console.error('Error saving push token:', error);
            } else {
              console.log('Push token saved to database');
            }
          }
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
        Toast.show({
          type: 'error',
          text1: 'Notifications Error',
          text2: 'Could not initialize push notifications',
          duration: 3000,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  /**
   * Listen for notification responses
   */
  useEffect(() => {
    const subscription = onNotificationResponse((response) => {
      setLastNotification(response.notification);

      // Handle notification tap based on type
      const data = response.notification.request.content.data;
      if (data?.type === 'chat' && data?.action === 'open_chat') {
        // Navigate to chat screen
        console.log('Open chat notification tapped');
      } else if (data?.type === 'call_sheet' && data?.action === 'open_call_sheet') {
        // Navigate to call sheet screen
        console.log('Open call sheet notification tapped');
      } else if (data?.type === 'scene' && data?.action === 'open_scene') {
        // Navigate to scene screen
        console.log('Open scene notification tapped');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  /**
   * Enable notifications
   */
  const enableNotifications = async () => {
    try {
      setLoading(true);
      const token = await initializeNotifications();
      if (token) {
        setExpoPushToken(token);
        setIsNotificationsEnabled(true);

        if (user) {
          await supabase
            .from('users')
            .update({ expo_push_token: token })
            .eq('id', user.id);
        }

        Toast.show({
          type: 'success',
          text1: 'Notifications Enabled',
          text2: 'You will now receive push notifications',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not enable notifications',
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Disable notifications
   */
  const disableNotifications = async () => {
    try {
      setLoading(true);
      setExpoPushToken(null);
      setIsNotificationsEnabled(false);

      if (user) {
        await supabase
          .from('users')
          .update({ expo_push_token: null })
          .eq('id', user.id);
      }

      Toast.show({
        type: 'success',
        text1: 'Notifications Disabled',
        text2: 'You will no longer receive push notifications',
        duration: 2000,
      });
    } catch (error) {
      console.error('Error disabling notifications:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not disable notifications',
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <NotificationsContext.Provider
      value={{
        expoPushToken,
        loading,
        isNotificationsEnabled,
        enableNotifications,
        disableNotifications,
        lastNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

/**
 * Hook to use notifications context
 */
export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationsProvider');
  }
  return context;
};
