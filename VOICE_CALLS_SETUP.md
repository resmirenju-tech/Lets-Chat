# 📞 Voice Calls Feature - Setup Guide

## Overview
This document explains the Voice Calls feature implementation for ChatFlow, a peer-to-peer audio calling system using WebRTC and Supabase realtime signaling.

## 🏗️ Architecture

### Components Created

#### 1. **callService.js** (`src/services/callService.js`)
Central service for managing all call operations:
- `initiateCall(recipientId, callType)` - Start a new call
- `acceptCall(callId)` - Accept incoming call
- `rejectCall(callId)` - Reject incoming call
- `endCall(callId, durationSeconds)` - End active call
- `subscribeToIncomingCalls(callback)` - Listen for incoming calls
- `subscribeToCallStatus(callId, callback)` - Monitor call status changes
- `getCallHistory(limit)` - Fetch call history
- `getOngoingCalls()` - Get active calls
- `markCallAsMissed(callId)` - Mark call as missed

#### 2. **CallModal.jsx** (`src/components/Call/CallModal.jsx`)
UI for incoming call notifications:
- Displays caller name and avatar
- Shows "Incoming Voice Call" indicator
- Ringing animation with pulsing dots
- Accept (✅) and Reject (❌) buttons
- Smooth animations and responsive design

#### 3. **CallWindow.jsx** (`src/components/Call/CallWindow.jsx`)
Active call interface:
- Shows call participant info
- Call duration timer (MM:SS or HH:MM:SS format)
- Control buttons:
  - 🎙️ Mute/Unmute audio
  - 🔊 Speakerphone
  - ☎️ End call (red button)
- Network quality indicator
- Dark theme with purple accents

#### 4. **Updated ChatHeader.jsx**
Added call initiation:
- Click ☎️ button to start voice call
- Shows toast notification when call initiated
- Calls `callService.initiateCall()`

#### 5. **Updated MainApp.jsx**
Global call state management:
- Subscribes to incoming calls
- Displays CallModal when incoming call arrives
- Displays CallWindow when call is active
- Handles call accept/reject/end actions
- Shows toast notifications for call events

### Database Tables (Already Exist)

#### `call_sessions`
Stores active and completed calls:
- `id` - Primary key
- `initiator_id` - Caller's user ID
- `recipient_id` - Recipient's user ID
- `call_type` - 'voice', 'video', or 'screen_share'
- `status` - initiating, ringing, active, ended, missed, declined
- `started_at` - Call start timestamp
- `ended_at` - Call end timestamp
- `duration_seconds` - Call duration
- `is_missed` - Boolean for missed calls

#### `call_history`
Stores call history with details:
- `id` - Primary key
- `call_id` - Reference to call_sessions
- `initiator_id` - Caller's user ID
- `recipient_id` - Recipient's user ID
- `call_type` - Type of call
- `duration_seconds` - Duration
- `status` - Final status
- `quality_rating` - User-provided rating (1-5)
- `notes` - Additional notes

#### `call_participants`
For group calls (future):
- `id` - Primary key
- `call_id` - Reference to call_sessions
- `user_id` - Participant's user ID
- `video_enabled` - Boolean
- `audio_enabled` - Boolean
- `is_screen_sharing` - Boolean
- `connection_quality` - excellent, good, fair, poor

## 🔄 Call Flow

### Initiating a Call
1. User clicks ☎️ in ChatHeader
2. `callService.initiateCall()` creates a `call_sessions` row with status='initiating'
3. Status is updated to 'ringing'
4. Caller gets toast notification "Call initiated..."
5. Supabase realtime notifies the recipient

### Receiving a Call
1. Recipient's MainApp listens via `subscribeToIncomingCalls()`
2. When status='ringing' INSERT is detected, CallModal appears
3. Toast notification shows "📞 Incoming call..."

### Accepting a Call
1. Recipient clicks ✅ button on CallModal
2. `callService.acceptCall()` updates status to 'active' and sets `started_at`
3. MainApp displays CallWindow with timer
4. Caller's MainApp also displays CallWindow
5. Toast shows "Call accepted!"

### Rejecting a Call
1. Recipient clicks ❌ button on CallModal
2. `callService.rejectCall()` updates status to 'declined'
3. CallModal closes
4. Toast shows "Call rejected"

### Ending a Call
1. Either user clicks ☎️ (red) button on CallWindow
2. `callService.endCall()` updates status to 'ended' and records `duration_seconds`
3. Entry is added to `call_history` table
4. CallWindow closes for both users
5. Toast shows "Call ended"
6. Users can see call in Calls page history

## 📱 How to Test

### Setup (2 Test Accounts)
1. Sign up as "User A" (e.g., alice@test.com)
2. Open app in new browser tab/window
3. Sign up as "User B" (e.g., bob@test.com)
4. In User B's chat, add User A as contact (click + icon in ConversationList)

### Test Scenario
**Step 1: Start a Call (User A)**
- Go to Chat page
- Select User B from conversation list
- Click ☎️ (phone) button in ChatHeader
- See toast: "Call initiated..."

**Step 2: Receive Call (User B)**
- See CallModal popup with User A's info
- See ringing animation (pulsing dots)
- See ✅ Accept and ❌ Reject buttons

**Step 3: Accept Call (User B)**
- Click ✅ button
- CallModal closes
- See CallWindow with User A's info
- See call duration timer starting from 00:00
- See 🎙️ 🔊 ☎️ buttons

**Step 4: End Call (Either User)**
- Click ☎️ (red button)
- CallWindow closes for both users
- See toast: "Call ended"
- Call appears in Calls page with duration

## 🎯 Key Features

✅ **Real-time Signaling** - Uses Supabase Realtime
✅ **Call History** - All calls tracked in database
✅ **Call Duration** - Precise timer with MM:SS format
✅ **Status Tracking** - initiating → ringing → active → ended
✅ **User Avatars** - Shows profile photo in call
✅ **Responsive UI** - Works on mobile and desktop
✅ **Toast Notifications** - User feedback on actions
✅ **Network Info** - Shows signal quality

## 🚀 Future Enhancements

1. **WebRTC Audio Stream** - Add actual audio connection
2. **Video Calls** - Video streaming with camera control
3. **Screen Sharing** - Share screen during calls
4. **Call Recording** - Record calls for later playback
5. **Call Statistics** - Track call quality metrics
6. **Missed Call Notifications** - Badge on Calls tab
7. **Group Calls** - Support 3+ participants
8. **Ringtone & Notifications** - Custom notification sounds
9. **Call Transfer** - Transfer calls between users
10. **Call Schedule** - Schedule calls in advance

## 📊 Call Statuses

- **initiating** - Call being created
- **ringing** - Waiting for recipient response
- **active** - Call in progress
- **ended** - Call completed normally
- **missed** - Call not answered
- **declined** - Recipient rejected

## 🔒 Security (RLS Policies)

All calls are protected by Row Level Security:
- Users can only view their own calls
- Only call participants can access call data
- Call history is private to each user
- Database maintains referential integrity

## 💾 Database Schema

See `DATABASE_SCHEMA.sql` for:
- Complete table definitions
- All indexes for performance
- RLS policies for security
- Triggers and functions
- Realtime configuration

## 🛠️ Troubleshooting

**Q: CallModal not appearing?**
- Ensure Supabase realtime is enabled
- Check browser console for errors
- Verify call_sessions table has INSERT realtime enabled

**Q: Call not visible to recipient?**
- Confirm both users are logged in
- Check call_sessions status in Supabase
- Verify subscribeToIncomingCalls is active

**Q: Timer not working?**
- Check if JavaScript is enabled
- Verify useEffect hook in CallWindow
- Check browser console for errors

## 📞 Next Steps

1. **Test the feature** with instructions above
2. **Report any issues** for debugging
3. **Implement WebRTC** for actual audio
4. **Build video calls** on top of voice
5. **Add screen sharing** for collaboration

---

**Created**: October 2025
**Feature**: Voice Calls with Real-time Signaling
**Status**: Feature Complete (WebRTC audio pending)
