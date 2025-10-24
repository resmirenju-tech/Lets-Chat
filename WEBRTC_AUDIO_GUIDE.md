# 🎙️ WebRTC Audio Implementation Guide

## Overview
This document explains the WebRTC audio streaming implementation for ChatFlow Voice Calls using `simple-peer` library and Supabase Realtime for signaling.

## 🏗️ Architecture

### WebRTC Flow
```
User A                          User B
  │                              │
  ├─ Create Peer (Initiator)     │
  ├─ Generate SDP Offer ────────→│ Create Peer (Non-Initiator)
  │                          Receive Offer
  │                          Generate Answer
  │←─────────────────── SDP Answer
  │
  ├─ Exchange ICE Candidates ◄──→ ICE Candidates
  │
  └─ Audio Stream Connected ◄──→ Audio Stream Connected
```

### Components

#### 1. **webrtcService.js** (`src/services/webrtcService.js`)
Central service for WebRTC peer connection management:
- `initializeLocalStream()` - Request microphone access
- `createPeerConnection(callId, isInitiator)` - Create peer connection
- `subscribeToSignals(callId, onSignal)` - Listen for SDP offers/answers
- `addSignal(signal)` - Process incoming signals
- `sendSignal(signal)` - Send SDP offers/answers via Supabase
- `toggleAudio(enabled)` - Mute/unmute audio
- `getConnectionStats()` - Monitor connection quality
- `cleanup()` - Clean up all resources

#### 2. **Updated CallWindow.jsx**
Now integrates WebRTC:
- Requests microphone on call start
- Sets up peer connection based on caller/recipient role
- Shows "Connecting..." while establishing connection
- Shows "Connected" when audio streams are ready
- Monitors connection quality
- Properly cleans up on call end

## 🔄 Call Audio Flow

### 1. **User A Initiates Call**
```
1. Clicks ☎️ button
2. CallService creates call session (status: 'ringing')
3. CallModal appears for User B
4. User B accepts call
5. CallService updates status to 'active'
6. CallWindow opens for both users
7. WebRTC initialization starts...
```

### 2. **WebRTC Setup (User A - Initiator)**
```
1. Request microphone access
2. Create SimplePeer with initiator: true
3. Generate SDP Offer
4. Send Offer to User B via Supabase Realtime channel
5. Receive Answer from User B
6. Process Answer in addSignal()
7. Exchange ICE candidates
8. When remote stream arrives → play audio
```

### 3. **WebRTC Setup (User B - Non-Initiator)**
```
1. Request microphone access
2. Create SimplePeer with initiator: false
3. Receive SDP Offer from User A
4. Process Offer in addSignal()
5. Generate SDP Answer
6. Send Answer to User A via Supabase Realtime
7. Exchange ICE candidates
8. When remote stream arrives → play audio
```

### 4. **Audio Streaming**
```
- User A's microphone → local stream → WebRTC → sent to User B
- User B's microphone → local stream → WebRTC → sent to User A
- Received streams → played via Audio() element
- Echo cancellation, noise suppression, auto gain control enabled
```

## 🎯 Key Features

✅ **Automatic Microphone Access** - Requests on call start
✅ **Echo Cancellation** - Prevents feedback loops
✅ **Noise Suppression** - Cleans up background noise
✅ **Auto Gain Control** - Normalizes audio levels
✅ **ICE Candidates** - Handles NAT traversal
✅ **STUN Servers** - Google's public STUN servers for NAT
✅ **Connection Quality** - Monitors packets lost
✅ **Mute/Unmute** - Toggle audio on/off
✅ **Clean Cleanup** - Stops all streams on call end

## 📊 Connection Quality Monitoring

The WebRTC service monitors:
- **Bytes Received** - Total data downloaded
- **Bytes Sent** - Total data uploaded  
- **Packets Lost** - Indicates poor connection
- **Jitter** - Network instability

Quality Status:
- ✅ **Good** - Packets lost < 50
- ⚠️ **Poor** - Packets lost > 50

## 🔐 Signaling via Supabase Realtime

### Signal Channel Format
```javascript
channel: `webrtc_signal_${callId}`
event: 'webrtc_signal'
payload: {
  from_user_id: "user-id",
  signal: {
    type: "offer" | "answer" | "candidate",
    sdp?: "...",  // For offer/answer
    candidate?: {...}  // For ICE
  }
}
```

### Signaling Flow
1. User A creates Peer → generates Offer
2. Offer is sent via `supabase.channel().send()`
3. User B receives on `supabase.channel().on()`
4. User B adds signal to peer → generates Answer
5. Answer is sent back
6. ICE candidates exchanged similarly
7. Peer connection established

## 🛠️ How to Test

### Prerequisites
✅ Two test accounts created
✅ Microphone permissions allowed in browser
✅ Both browsers open side-by-side
✅ Network connectivity (both on same or different networks)

### Test Steps

1. **Browser A (User A)**
   - Go to Chat
   - Select User B
   - Click ☎️ phone icon
   - Grant microphone access when prompted

2. **Browser B (User B)**
   - See incoming call modal
   - See caller's name and avatar
   - Click ✅ to accept
   - Grant microphone access when prompted

3. **Both Browsers**
   - See "Connected! 🎤" toast
   - See "⏳ Connecting..." → "🟢 Connected"
   - Speak normally - audio should transmit
   - See call duration timer running

4. **Test Mute**
   - Click 🎙️ button to mute/unmute
   - Other user should hear audio stop/resume

5. **End Call**
   - Click ☎️ (red button) to end
   - Call ends for both users
   - Duration is saved
   - WebRTC resources cleaned up

## 🐛 Troubleshooting

### "Microphone permission denied"
- **Solution**: Allow microphone in browser settings
- Go to site settings → Microphone → Allow
- Refresh page and try again

### "No audio heard"
1. Check console for WebRTC errors (F12 → Console)
2. Verify peer connection status shows "Connected"
3. Check if audio is muted (🔇 icon)
4. Ensure remote stream is received
5. Check browser volume is not muted

### "Call connects but no audio"
- ICE candidates may not be exchanged
- Check STUN servers connectivity
- Try on different network
- Check browser supports WebRTC
- Check for firewall blocking

### "Echo or feedback"
- Echo cancellation is enabled
- Check if both users on same device (test on different devices)
- Check microphone gain levels

### "Choppy or distorted audio"
- Connection quality is poor
- Check network bandwidth
- Move closer to WiFi/router
- Try on wired connection
- Check for other apps using network

## 📈 Connection Stats

Monitor real-time connection quality:
```javascript
const stats = await webrtcService.getConnectionStats()
// Returns:
{
  bytesReceived: 1024000,
  bytesSent: 1024000,
  packetsLost: 5,
  jitter: 0.02
}
```

## 🚀 Future Enhancements

1. **Volume Control** - Adjust microphone and speaker volume
2. **Call Recording** - Record audio for playback
3. **Background Effects** - Virtual backgrounds or sound effects
4. **Network Adaptation** - Auto-adjust audio quality based on connection
5. **Echo Test** - Test microphone before calling
6. **Audio Visualization** - Show sound waves while speaking
7. **Group Audio** - Support 3+ participants
8. **Audio Codec Selection** - Choose opus, G711, etc.

## 📚 SimplePeer API Reference

```javascript
// Create peer
const peer = new SimplePeer({
  initiator: true/false,
  stream: mediaStream,
  config: { iceServers: [...] }
})

// Events
peer.on('signal', data => {})      // Send signal
peer.on('stream', stream => {})    // Receive stream
peer.on('error', error => {})      // Handle error
peer.on('close', () => {})         // Connection closed

// Methods
peer.signal(data)                  // Add signal
peer.addStream(stream)             // Add stream
peer.removeStream(stream)          // Remove stream
peer.destroy()                     // Close connection
peer._pc                           // Access RTCPeerConnection
```

## 📞 Call States

```
INITIATING → RINGING → ACTIVE → ENDED
                ↓
           (WebRTC Setup)
                ↓
         CONNECTED & STREAMING
```

## 🔗 Related Files

- `src/services/webrtcService.js` - WebRTC logic
- `src/components/Call/CallWindow.jsx` - UI integration
- `src/services/callService.js` - Call signaling
- `DATABASE_SCHEMA.sql` - Call tables

---

**Created**: October 2025
**Feature**: WebRTC Audio Streaming
**Status**: Fully Implemented ✅
