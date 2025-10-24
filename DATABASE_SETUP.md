# 📊 ChatFlow Database Setup Guide

## Step-by-Step Setup Instructions

### STEP 1: Go to Supabase SQL Editor

1. Log in to your Supabase project
2. Go to **SQL Editor** (left sidebar)
3. Click **+ New Query**

### STEP 2: Copy & Run the Schema

1. Open `DATABASE_SCHEMA.sql` in your project
2. Copy all the SQL code
3. Paste it into the Supabase SQL Editor
4. Click **RUN** (or press Ctrl+Enter)

**Expected Result:** ✅ All tables created successfully with no errors

---

## Database Tables Overview

### 1. **user_profiles** 
Stores user information and status

```sql
Columns:
  id              - UUID (from auth.users)
  email           - TEXT UNIQUE
  full_name       - TEXT
  avatar_url      - TEXT
  status          - TEXT (online, offline, away, busy)
  last_seen_at    - TIMESTAMP
  created_at      - TIMESTAMP
  updated_at      - TIMESTAMP
```

**Indexes:** email, status

---

### 2. **messages**
Stores one-to-one chat messages

```sql
Columns:
  id              - BIGSERIAL PRIMARY KEY
  sender_id       - UUID (references auth.users)
  recipient_id    - UUID (references auth.users)
  content         - TEXT
  attachment_url  - TEXT
  is_read         - BOOLEAN
  read_at         - TIMESTAMP
  created_at      - TIMESTAMP
  updated_at      - TIMESTAMP
```

**Indexes:** sender_id, recipient_id, conversation, created_at, is_read

---

### 3. **call_sessions**
Stores call information

```sql
Columns:
  id              - BIGSERIAL PRIMARY KEY
  initiator_id    - UUID
  recipient_id    - UUID
  call_type       - TEXT (voice, video, screen_share)
  status          - TEXT (initiating, ringing, active, ended, missed, declined)
  started_at      - TIMESTAMP
  ended_at        - TIMESTAMP
  duration_seconds - INTEGER
  is_missed       - BOOLEAN
  created_at      - TIMESTAMP
  updated_at      - TIMESTAMP
```

**Indexes:** initiator_id, recipient_id, status, created_at, type

---

### 4. **call_participants**
Stores info about who participated in group calls

```sql
Columns:
  id                  - BIGSERIAL PRIMARY KEY
  call_id             - BIGINT (references call_sessions)
  user_id             - UUID (references auth.users)
  joined_at           - TIMESTAMP
  left_at             - TIMESTAMP
  video_enabled       - BOOLEAN
  audio_enabled       - BOOLEAN
  is_screen_sharing   - BOOLEAN
  connection_quality  - TEXT (excellent, good, fair, poor)
  created_at          - TIMESTAMP
```

**Indexes:** call_id, user_id, is_screen_sharing

---

### 5. **call_history**
Stores historical call data for analytics

```sql
Columns:
  id              - BIGSERIAL PRIMARY KEY
  call_id         - BIGINT (references call_sessions)
  initiator_id    - UUID
  recipient_id    - UUID
  call_type       - TEXT
  duration_seconds - INTEGER
  status          - TEXT
  quality_rating  - INTEGER (1-5)
  notes           - TEXT
  created_at      - TIMESTAMP
```

**Indexes:** initiator_id, recipient_id, created_at

---

### 6. **contacts**
Stores user contacts and favorites

```sql
Columns:
  id              - BIGSERIAL PRIMARY KEY
  user_id         - UUID
  contact_id      - UUID
  nickname        - TEXT
  is_favorite     - BOOLEAN
  blocked         - BOOLEAN
  created_at      - TIMESTAMP
  
CONSTRAINTS:
  - UNIQUE(user_id, contact_id)
  - user_id != contact_id
```

**Indexes:** user_id, contact_id, is_favorite, blocked

---

### 7. **notifications**
Stores user notifications

```sql
Columns:
  id              - BIGSERIAL PRIMARY KEY
  user_id         - UUID
  from_user_id    - UUID
  type            - TEXT (message, call, call_missed, call_ended)
  content         - TEXT
  data            - JSONB
  is_read         - BOOLEAN
  created_at      - TIMESTAMP
```

**Indexes:** user_id, is_read, created_at

---

## Row Level Security (RLS) Policies

All tables have RLS enabled. Each user can only access their own data:

### user_profiles
- ✅ View all profiles (public)
- ✅ Update own profile
- ✅ Insert own profile

### messages
- ✅ View messages you sent or received
- ✅ Send messages (insert)
- ✅ Update/delete your own messages

### call_sessions
- ✅ View calls you initiated or received
- ✅ Initiate calls (insert)
- ✅ Update calls you're in

### call_participants
- ✅ View all participants (for transparency)
- ✅ Join calls
- ✅ Update your own participation

### contacts
- ✅ View your own contacts
- ✅ Add contacts
- ✅ Update/remove contacts

### notifications
- ✅ View your own notifications
- ✅ Mark notifications as read

---

## Realtime Configuration

The following tables are configured for real-time updates:

- ✅ messages (real-time chat)
- ✅ call_sessions (real-time call status)
- ✅ call_participants (real-time participant updates)
- ✅ notifications (real-time notifications)
- ✅ user_profiles (real-time status updates)

---

## Triggers & Functions

### 1. **handle_new_user()**
Automatically creates a user profile when someone signs up

```sql
Trigger: on_auth_user_created
Event: AFTER INSERT on auth.users
Action: Creates row in user_profiles
```

### 2. **update_user_status()**
Updates a user's online status

```sql
Usage: SELECT update_user_status(user_id, 'online')
```

### 3. **mark_messages_as_read()**
Marks messages as read and updates read_at timestamp

```sql
Usage: SELECT mark_messages_as_read(sender_id, recipient_id)
```

---

## Views (Pre-built Queries)

### 1. **conversations**
Shows one-to-one chat conversations with unread counts

```sql
SELECT * FROM conversations;

Returns:
  other_user_id    - The user you're chatting with
  last_message_at  - When the last message was sent
  unread_count     - How many unread messages
```

### 2. **recent_calls**
Shows recent calls with user names

```sql
SELECT * FROM recent_calls;

Returns:
  id               - Call ID
  initiator_name   - Who started the call
  recipient_name   - Who received the call
  call_type        - voice, video, screen_share
  status           - Call status
  duration_seconds - How long the call lasted
  created_at       - When the call was made
```

---

## Testing the Setup

### Test 1: Create a Test User
```sql
-- Go to Auth → Users and create a test user manually
-- Email: test@example.com
-- Password: Test123!
```

### Test 2: Check User Profile Created
```sql
SELECT * FROM user_profiles WHERE email = 'test@example.com';
```

**Expected:** One row with the user's email

### Test 3: Send a Test Message
```sql
INSERT INTO messages (sender_id, recipient_id, content)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1 OFFSET 1),
  'Test message'
);
```

### Test 4: Check RLS is Working
```sql
-- This should only show messages the current user sent or received
SELECT * FROM messages;
```

---

## Common Issues & Solutions

### ❌ "Realtime table already exists"
**Solution:** This is fine, the schema uses `ALTER PUBLICATION` which adds tables if not present

### ❌ "Users can't see data they created"
**Solution:** Make sure RLS policies were created. Check:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### ❌ "Foreign key constraint failed"
**Solution:** Make sure auth.users table exists and is populated with test users

### ❌ "Trigger not executing"
**Solution:** Verify auth is configured properly in Supabase. The trigger automatically creates profiles on new signups.

---

## Next Steps

1. ✅ Run the SQL schema (DATABASE_SCHEMA.sql)
2. ✅ Test the tables with sample data
3. ✅ Verify RLS policies work correctly
4. ⏳ Build messaging UI (coming next)
5. ⏳ Build signaling server (coming next)
6. ⏳ Build WebRTC call features (coming next)

---

## SQL Quick Reference

### Get all users except current
```sql
SELECT * FROM user_profiles 
WHERE id != auth.uid()
ORDER BY full_name;
```

### Get unread message count
```sql
SELECT COUNT(*) FROM messages
WHERE recipient_id = auth.uid() AND is_read = FALSE;
```

### Get conversation list
```sql
SELECT * FROM conversations;
```

### Get recent calls
```sql
SELECT * FROM recent_calls LIMIT 10;
```

### Update user status
```sql
SELECT update_user_status(auth.uid(), 'online');
```

### Mark messages as read
```sql
SELECT mark_messages_as_read(
  (SELECT id FROM auth.users LIMIT 1),
  auth.uid()
);
```

---

**Database setup is complete! Ready to build the messaging system.** 🚀
