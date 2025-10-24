-- ============================================
-- ChatFlow Database Schema
-- Created for Supabase PostgreSQL
-- ============================================

-- ============================================
-- 1. USER PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  status TEXT CHECK (status IN ('online', 'offline', 'away', 'busy')),
  last_seen_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);

-- ============================================
-- 2. MESSAGES TABLE (For 1-on-1 chats)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id BIGSERIAL PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for message queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(sender_id, recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- ============================================
-- 3. CALL SESSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS call_sessions (
  id BIGSERIAL PRIMARY KEY,
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL CHECK (call_type IN ('voice', 'video', 'screen_share')),
  status TEXT CHECK (status IN ('initiating', 'ringing', 'active', 'ended', 'missed', 'declined')),
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  is_missed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for call queries
CREATE INDEX IF NOT EXISTS idx_calls_initiator ON call_sessions(initiator_id);
CREATE INDEX IF NOT EXISTS idx_calls_recipient ON call_sessions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON call_sessions(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON call_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_calls_type ON call_sessions(call_type);

-- ============================================
-- 4. CALL PARTICIPANTS TABLE (For group calls)
-- ============================================
CREATE TABLE IF NOT EXISTS call_participants (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  video_enabled BOOLEAN DEFAULT TRUE,
  audio_enabled BOOLEAN DEFAULT TRUE,
  is_screen_sharing BOOLEAN DEFAULT FALSE,
  connection_quality TEXT CHECK (connection_quality IN ('excellent', 'good', 'fair', 'poor')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for participant queries
CREATE INDEX IF NOT EXISTS idx_participants_call ON call_participants(call_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON call_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_screen_share ON call_participants(is_screen_sharing);

-- ============================================
-- 5. CALL HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS call_history (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  call_type TEXT NOT NULL,
  duration_seconds INTEGER,
  status TEXT NOT NULL,
  event_type TEXT CHECK (event_type IN ('call_started', 'call_ended', 'call_missed', 'call_declined')) DEFAULT 'call_started',
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  notes TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for history queries
CREATE INDEX IF NOT EXISTS idx_history_initiator ON call_history(initiator_id);
CREATE INDEX IF NOT EXISTS idx_history_recipient ON call_history(recipient_id);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON call_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_event_type ON call_history(event_type);

-- ============================================
-- 6. CONTACTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS contacts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT,
  is_favorite BOOLEAN DEFAULT FALSE,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_id),
  CHECK (user_id != contact_id)
);

-- Create indexes for contact queries
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact ON contacts(contact_id);
CREATE INDEX IF NOT EXISTS idx_contacts_favorite ON contacts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_contacts_blocked ON contacts(blocked);

-- ============================================
-- 7. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('message', 'call', 'call_missed', 'call_ended')),
  content TEXT,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USER PROFILES RLS POLICIES
-- ============================================

-- Users can view all profiles
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- System can insert profiles during signup
CREATE POLICY "System can create profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);

-- ============================================
-- MESSAGES RLS POLICIES
-- ============================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
  );

-- Users can insert messages they send
CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update their own messages
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Users can update is_read status on messages they received
CREATE POLICY "Users can mark received messages as read" ON messages
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = sender_id);

-- ============================================
-- CALL SESSIONS RLS POLICIES
-- ============================================

-- Users can view calls they're involved in
CREATE POLICY "Users can view own calls" ON call_sessions
  FOR SELECT USING (
    auth.uid() = initiator_id OR auth.uid() = recipient_id
  );

-- Users can create calls (initiate)
CREATE POLICY "Users can initiate calls" ON call_sessions
  FOR INSERT WITH CHECK (auth.uid() = initiator_id OR auth.uid() = recipient_id);

-- Users can update calls they're involved in
CREATE POLICY "Users can update own calls" ON call_sessions
  FOR UPDATE USING (
    auth.uid() = initiator_id OR auth.uid() = recipient_id
  );

-- ============================================
-- CALL PARTICIPANTS RLS POLICIES
-- ============================================

-- Users can view participants in calls they're in
CREATE POLICY "Users can view call participants" ON call_participants
  FOR SELECT USING (true);

-- Users can add themselves to calls
CREATE POLICY "Users can join calls" ON call_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own participation
CREATE POLICY "Users can update own participation" ON call_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- CALL HISTORY RLS POLICIES
-- ============================================

-- Users can view their own call history
CREATE POLICY "Users can view own call history" ON call_history
  FOR SELECT USING (
    auth.uid() = initiator_id OR auth.uid() = recipient_id
  );

-- System can insert call history (for triggers)
CREATE POLICY "System can insert call history" ON call_history
  FOR INSERT WITH CHECK (true);

-- Users can update is_read status on their own received calls
CREATE POLICY "Users can update own call history" ON call_history
  FOR UPDATE USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

-- ============================================
-- CONTACTS RLS POLICIES
-- ============================================

-- Users can view their own contacts
CREATE POLICY "Users can view own contacts" ON contacts
  FOR SELECT USING (auth.uid() = user_id);

-- Users can add contacts
CREATE POLICY "Users can add contacts" ON contacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own contacts
CREATE POLICY "Users can update own contacts" ON contacts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can remove contacts
CREATE POLICY "Users can remove contacts" ON contacts
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- NOTIFICATIONS RLS POLICIES
-- ============================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, status)
  VALUES (new.id, new.email, COALESCE(new.user_metadata->>'full_name', ''), 'online');
  RETURN new;
EXCEPTION WHEN others THEN
  RAISE WARNING 'Error creating user profile: %', SQLERRM;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on auth signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update user status
CREATE OR REPLACE FUNCTION update_user_status(user_id UUID, new_status TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_profiles
  SET status = new_status, updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update message read status
CREATE OR REPLACE FUNCTION mark_messages_as_read(sender_id UUID, recipient_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE messages
  SET is_read = TRUE, read_at = NOW()
  WHERE sender_id = sender_id AND recipient_id = recipient_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- REALTIME CONFIGURATION
-- ============================================

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for call_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE call_sessions;

-- Enable realtime for call_participants
ALTER PUBLICATION supabase_realtime ADD TABLE call_participants;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for user_profiles
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- View for conversations (one-to-one chats)
CREATE OR REPLACE VIEW conversations AS
SELECT
  CASE
    WHEN m.sender_id = auth.uid() THEN m.recipient_id
    ELSE m.sender_id
  END AS other_user_id,
  MAX(m.created_at) AS last_message_at,
  COUNT(CASE WHEN m.is_read = FALSE AND m.recipient_id = auth.uid() THEN 1 END) AS unread_count
FROM messages m
WHERE m.sender_id = auth.uid() OR m.recipient_id = auth.uid()
GROUP BY other_user_id
ORDER BY last_message_at DESC;

-- View for recent calls
CREATE OR REPLACE VIEW recent_calls AS
SELECT
  cs.id,
  cs.initiator_id,
  cs.recipient_id,
  cs.call_type,
  cs.status,
  cs.duration_seconds,
  cs.created_at,
  up1.full_name AS initiator_name,
  up2.full_name AS recipient_name
FROM call_sessions cs
LEFT JOIN user_profiles up1 ON cs.initiator_id = up1.id
LEFT JOIN user_profiles up2 ON cs.recipient_id = up2.id
ORDER BY cs.created_at DESC;

-- ============================================
-- END OF SCHEMA
-- ============================================

-- ============================================
-- STORAGE BUCKET POLICIES (Run in Supabase SQL Editor)
-- ============================================

-- Note: Execute these commands in Supabase SQL Editor after creating 'avatars' bucket

-- Allow authenticated users to upload files to their own folder
-- INSERT INTO storage.objects (bucket_id, name, owner_id, owner, metadata) 
-- requires proper bucket setup

-- For avatars bucket, use these SQL commands in Supabase:
-- 1. Create the bucket (via UI or CLI)
-- 2. Run these policies:

-- DROP POLICY IF EXISTS "Allow users to upload avatars" ON storage.objects;
-- CREATE POLICY "Allow users to upload avatars" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'avatars' AND
--   (auth.uid())::text = (storage.foldername(name))[1]
-- );

-- DROP POLICY IF EXISTS "Allow users to read avatars" ON storage.objects;
-- CREATE POLICY "Allow users to read avatars" ON storage.objects
-- FOR SELECT USING (bucket_id = 'avatars');

-- DROP POLICY IF EXISTS "Allow users to update own avatars" ON storage.objects;
-- CREATE POLICY "Allow users to update own avatars" ON storage.objects
-- FOR UPDATE USING (
--   bucket_id = 'avatars' AND
--   (auth.uid())::text = (storage.foldername(name))[1]
-- );

-- For simplicity, you can also make the bucket PUBLIC via UI
