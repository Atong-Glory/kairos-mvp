-- Add push notification support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS expo_push_token VARCHAR(255);

-- Add index for quick token lookup (useful for sending notifications)
CREATE INDEX IF NOT EXISTS idx_users_expo_push_token ON users(expo_push_token) WHERE expo_push_token IS NOT NULL;

-- Table for tracking notification preferences per project
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  
  -- Notification type preferences
  chat_notifications BOOLEAN DEFAULT TRUE,
  call_sheet_notifications BOOLEAN DEFAULT TRUE,
  scene_notifications BOOLEAN DEFAULT TRUE,
  crew_notifications BOOLEAN DEFAULT TRUE,
  budget_notifications BOOLEAN DEFAULT FALSE,
  
  -- Timing preferences (quiet hours)
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, project_id)
);

-- Enable RLS on notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view/edit their own notification preferences
CREATE POLICY notification_preferences_own ON notification_preferences
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_project ON notification_preferences(user_id, project_id);
