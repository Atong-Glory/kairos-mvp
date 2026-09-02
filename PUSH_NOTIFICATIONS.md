# Push Notifications Setup Guide

## Overview
KAIRO MVP now includes push notification support using Expo Notifications. Users will receive real-time notifications about:
- New chat messages
- Call sheet updates
- Scene changes and scheduling
- Crew assignment changes
- Budget updates (optional)

## Architecture

### Components
1. **notificationService.ts** - Core notification utilities
   - `initializeNotifications()` - Request permissions and get push token
   - `sendChatNotification()` - Notify about new messages
   - `sendCallSheetNotification()` - Notify about call sheet changes
   - `sendSceneNotification()` - Notify about scene updates
   - `sendCrewNotification()` - Notify about crew changes

2. **NotificationsContext.tsx** - Global state management
   - Manages push token lifecycle
   - Stores token in database
   - Handles notification responses
   - Provides `useNotifications()` hook

3. **App.tsx** - Root integration
   - Wrapped with `<NotificationsProvider>`
   - Initializes on app startup

4. **Database** - Push token storage
   - `users.expo_push_token` - Stores device push token
   - `notification_preferences` - Per-project notification settings

## Setup Steps

### 1. Supabase Database Migration
Run this SQL in the Supabase SQL Editor:

```sql
-- File: supabase/migrations/002_add_push_notifications.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_expo_push_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chat_notifications BOOLEAN DEFAULT TRUE,
  call_sheet_notifications BOOLEAN DEFAULT TRUE,
  scene_notifications BOOLEAN DEFAULT TRUE,
  crew_notifications BOOLEAN DEFAULT TRUE,
  budget_notifications BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, project_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_preferences_own ON notification_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_project ON notification_preferences(user_id, project_id);
```

### 2. Install Dependencies
Already added to `package.json`:
- `expo-notifications` - Local and push notifications
- `expo-device` - Device detection
- `expo-sharing` - File sharing (for PDF export)

Run: `npm install`

### 3. Configure Expo Project

Update `app.json` with notification configuration:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3B82F6"
        }
      ]
    ],
    "ios": {
      "supportsTabletMode": true,
      "infoPlist": {
        "NSLocalizedDescriptionKey": "Allow notifications for production updates"
      }
    }
  }
}
```

### 4. Setup Firebase Cloud Messaging (FCM) for Android

Firebase Cloud Messaging is required for push notifications on Android devices.

**Steps:**
1. Go to https://console.firebase.google.com
2. Create a new project or select existing one
3. Add an Android app to the project
4. Download the `google-services.json` file
5. Place it in the root of the Expo project
6. In Expo, enable Firebase Cloud Messaging:

```bash
eas update --branch production
```

Or build with EAS:
```bash
eas build --platform android --profile production
```

### 5. Setup APNs for iOS (Apple Push Notification service)

For iOS, you need to configure Apple Push Notification service (APNs):

1. Go to Apple Developer Console: https://developer.apple.com/account
2. Create an App ID for your KAIRO project
3. Enable Push Notifications capability
4. Create a p8 certificate for APNs
5. Configure in Expo Project Settings

### 6. Testing Notifications

#### Local Testing (Development)
```typescript
import { sendTestNotification } from './src/services/notificationService';

// In a component or hook
const handleTestNotification = async () => {
  await sendTestNotification();
};
```

#### Using Expo Notifications API
Test push notifications directly:

```bash
# Install Expo CLI
npm install -g expo-cli

# Send test notification
expo send:notifications --publicUrl YOUR_PUBLIC_URL
```

## Usage Examples

### Send Chat Notification
```typescript
import { sendChatNotification } from './src/services/notificationService';

// In TeamChat.tsx when new message arrives
const onNewMessage = async (senderName: string, message: string) => {
  await sendChatNotification(senderName, message);
};
```

### Send Call Sheet Update Notification
```typescript
import { sendCallSheetNotification } from './src/services/notificationService';

// In CallSheetView.tsx when sheet is updated
const onCallSheetUpdate = async (sceneNumber: string, location: string) => {
  await sendCallSheetNotification(sceneNumber, location);
};
```

### Send Scene Notification
```typescript
import { sendSceneNotification } from './src/services/notificationService';

// In SceneManager.tsx
const onSceneCreated = async (sceneNumber: string) => {
  await sendSceneNotification(sceneNumber, 'created');
};

const onSceneScheduled = async (sceneNumber: string) => {
  await sendSceneNotification(sceneNumber, 'scheduled');
};
```

### Use Notifications Hook
```typescript
import { useNotifications } from './src/context/NotificationsContext';

export const MyComponent = () => {
  const { isNotificationsEnabled, expoPushToken, enableNotifications, disableNotifications } = useNotifications();

  return (
    <View>
      <Text>Notifications: {isNotificationsEnabled ? 'ON' : 'OFF'}</Text>
      <Button 
        title={isNotificationsEnabled ? 'Disable' : 'Enable'} 
        onPress={isNotificationsEnabled ? disableNotifications : enableNotifications}
      />
    </View>
  );
};
```

## Notification Types

### 1. Chat Notifications
- **Trigger:** New message in TeamChat
- **Title:** "💬 Message from [Name]"
- **Body:** Message preview (first 100 chars)
- **Action:** Opens TeamChat screen
- **Default:** Enabled

### 2. Call Sheet Notifications
- **Trigger:** Call sheet is updated
- **Title:** "📋 Call Sheet Updated"
- **Body:** Scene number and location
- **Action:** Opens CallSheetView
- **Default:** Enabled

### 3. Scene Notifications
- **Trigger:** New scene created, scene updated, or scene scheduled
- **Title:** "🎬 Scene Update"
- **Body:** Specific change message
- **Action:** Opens SceneManager
- **Default:** Enabled

### 4. Crew Notifications
- **Trigger:** Crew member added, removed, or role changed
- **Title:** "👥 Crew Update"
- **Body:** Specific crew change message
- **Action:** Opens RoleManagement
- **Default:** Enabled

### 5. Budget Notifications
- **Trigger:** Budget item added, updated, or deleted
- **Title:** "💰 Budget Update"
- **Body:** Budget change details
- **Default:** Disabled (opt-in)

## User Settings

Users can manage notification preferences via the app settings:

**Per-Project Settings:**
- Enable/disable notification types (chat, call sheet, scene, crew, budget)
- Set quiet hours (time range when no notifications)
- Enable/disable quiet hours

**Global Settings:**
- Toggle all notifications on/off
- View current push token status
- Test notifications

## Troubleshooting

### Notifications Not Appearing
1. Check device has internet connection
2. Verify permissions are granted (check device settings)
3. Ensure push token is stored in database:
   ```sql
   SELECT id, expo_push_token FROM users WHERE id = 'user_id';
   ```
4. Check if notifications are enabled in device settings
5. Check device quiet hours/Do Not Disturb settings

### Push Token Issues
- **Null token:** User hasn't granted permissions. Show permission request dialog.
- **Token changed:** Normal behavior. Token is updated and saved automatically.
- **Old token failing:** Tokens expire. Refresh after 24 hours or on app restart.

### Android Specific
- Verify FCM is configured in Firebase Console
- Check `google-services.json` is in project root
- Verify notification channels are created
- Check Android notification settings for app

### iOS Specific
- Verify APNs certificate is valid
- Check app has notification capability
- Verify bundle ID matches certificate
- Check iOS notification settings

## Advanced Configuration

### Custom Notification Channels (Android)
```typescript
import * as Notifications from 'expo-notifications';

await Notifications.setNotificationChannelAsync('high-priority', {
  name: 'High Priority',
  importance: Notifications.AndroidImportance.MAX,
  vibrationPattern: [0, 250, 250, 250],
  lightColor: '#FF0000',
});
```

### Quiet Hours Implementation
```typescript
// Check if currently in quiet hours
const isInQuietHours = (preferences: NotificationPreference) => {
  if (!preferences.quiet_hours_enabled) return false;
  
  const now = new Date();
  const currentTime = `${now.getHours()}:${now.getMinutes()}`;
  
  return currentTime >= preferences.quiet_hours_start && 
         currentTime <= preferences.quiet_hours_end;
};
```

## Monitoring and Analytics

To track notification engagement:

1. Create `notification_events` table:
```sql
CREATE TABLE notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(50),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  opened_at TIMESTAMP WITH TIME ZONE,
  action_data JSONB
);
```

2. Log events in NotificationsContext:
```typescript
// When notification is sent
await supabase.from('notification_events').insert({
  user_id: user.id,
  type: 'chat',
  sent_at: new Date().toISOString()
});

// When notification is tapped
await supabase.from('notification_events').update({ 
  opened_at: new Date().toISOString() 
}).eq('id', eventId);
```

## References
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification service](https://developer.apple.com/news/a/)
- [Expo EAS Build](https://docs.expo.dev/build/setup/)
