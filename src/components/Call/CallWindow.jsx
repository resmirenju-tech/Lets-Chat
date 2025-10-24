import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { callService } from '@/services/callService'
import { userService } from '@/services/userService'
import { webrtcService } from '@/services/webrtcService'
import toast from 'react-hot-toast'
import './CallWindow.css'

export default function CallWindow({ call, onEndCall }) {
  const [duration, setDuration] = useState(0)
  const [otherUserInfo, setOtherUserInfo] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [callQuality, setCallQuality] = useState('Good signal')
  const [currentUser, setCurrentUser] = useState(null)
  const durationInterval = useRef(null)
  const [connectionReady, setConnectionReady] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('Connecting...')
  const remoteAudioRef = useRef(null)
  const signalChannelRef = useRef(null)

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()
  }, [])

  // Initialize WebRTC connection
  useEffect(() => {
    if (!call || !currentUser) {
      console.log('⏳ Waiting for call and user data...')
      return
    }

    let isActive = true

    const initializeWebRTC = async () => {
      try {
        console.log('📞 Initializing WebRTC for call:', call?.id)
        
        if (!call?.id || !call?.initiator_id || !call?.recipient_id) {
          console.error('❌ Missing required call data')
          return
        }

        // Determine if user is initiator
        const isInitiator = call.initiator_id === currentUser.id
        const otherUserId = isInitiator ? call.recipient_id : call.initiator_id

        console.log('👤 Initiator:', isInitiator, 'Other user:', otherUserId)

        // Create peer connection
        await webrtcService.createPeer(
          otherUserId,
          isInitiator,
          currentUser.id,
          call.id
        )

        if (!isActive) return

        // Setup event listeners
        webrtcService.on('stream', (remoteStream) => {
          console.log('🎵 Playing remote stream')
          if (isActive) playRemoteStream(remoteStream)
        })

        webrtcService.on('error', (error) => {
          console.error('❌ WebRTC error:', error)
          if (isActive) toast.error('Connection error: ' + error.message)
        })

        webrtcService.on('close', () => {
          console.log('📵 Peer connection closed')
          if (isActive) {
            setConnectionReady(false)
            setConnectionMessage('Connection lost')
          }
        })

        // Subscribe to signals from remote peer
        signalChannelRef.current = webrtcService.subscribeToSignals(
          call.id,
          (payload) => {
            console.log('📬 Received signal payload:', payload)
            const { from, to, data } = payload
            
            // Only process signals meant for us
            if (to === currentUser.id && from === otherUserId) {
              webrtcService.handleSignal(from, data)
            }
          }
        )

        // Set connection ready
        if (isActive) {
          setConnectionReady(true)
          setConnectionMessage('Connected')
          toast.success('Connected! 🎤')
          console.log('✅ WebRTC initialized successfully')
        }
      } catch (error) {
        console.error('Error initializing WebRTC:', error)
        if (isActive) {
          toast.error('Failed to initialize connection: ' + error.message)
          setConnectionMessage('Connection failed')
        }
      }
    }

    initializeWebRTC()

    return () => {
      isActive = false
      if (signalChannelRef.current) {
        signalChannelRef.current.unsubscribe()
      }
      webrtcService.closeAll()
    }
  }, [call?.id, currentUser?.id])

  // Start timer
  useEffect(() => {
    durationInterval.current = setInterval(() => {
      setDuration(prev => prev + 1)
    }, 1000)

    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current)
      }
    }
  }, [])

  // Fetch other user info
  useEffect(() => {
    const fetchOtherUserInfo = async () => {
      try {
        if (!call?.initiator_id || !call?.recipient_id) {
          console.warn('⚠️ Call data incomplete, cannot fetch user info')
          return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const otherUserId = call.initiator_id === user.id ? call.recipient_id : call.initiator_id

        const result = await userService.getUserProfile(otherUserId)
        if (result.success) {
          setOtherUserInfo(result.data)
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      }
    }

    if (call?.id) {
      fetchOtherUserInfo()
    }
  }, [call?.id, call?.initiator_id, call?.recipient_id])

  // Play remote audio stream
  const playRemoteStream = (remoteStream) => {
    try {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream
        remoteAudioRef.current.play().catch(err => {
          console.warn('Could not auto-play remote stream:', err)
          // Try to play with user gesture requirement
          remoteAudioRef.current.play()
        })
        console.log('🔊 Remote stream playing')
      }
    } catch (error) {
      console.error('Error playing remote stream:', error)
    }
  }

  const handleEndCall = async () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
    }
    
    webrtcService.stopLocalStream()
    webrtcService.closeAll()

    const result = await callService.endCall(call.id, duration)
    if (result.success) {
      toast.success('Call ended')
      onEndCall(call)
    }
  }

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled)
    if (webrtcService.localStream) {
      webrtcService.localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled
      })
    }
    toast.success(audioEnabled ? 'Muted 🔇' : 'Unmuted 🎤')
  }

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="call-window-overlay">
      <div className="call-window">
        {/* Background */}
        <div className="call-window-bg"></div>

        {/* Header */}
        <div className="call-window-header">
          <div className="call-window-user-info">
            <div className="call-window-avatar-wrapper">
              {otherUserInfo?.avatar_url ? (
                <img src={otherUserInfo.avatar_url} alt={otherUserInfo.full_name} />
              ) : (
                <div className="call-window-avatar-placeholder">
                  {otherUserInfo?.full_name?.charAt(0) || '?'}
                </div>
              )}
              <div className="call-status-indicator"></div>
            </div>
            <div>
              <h3 className="call-window-name">{otherUserInfo?.full_name || 'User'}</h3>
              <p className="call-window-status">
                {connectionReady ? '🟢 Connected' : `⏳ ${connectionMessage}`}
              </p>
            </div>
          </div>
        </div>

        {/* Duration Timer */}
        <div className="call-duration-display">
          <div className="timer">{formatDuration(duration)}</div>
        </div>

        {/* Controls */}
        <div className="call-controls">
          <button
            className={`control-btn ${audioEnabled ? 'enabled' : 'disabled'}`}
            onClick={handleToggleAudio}
            title={audioEnabled ? 'Mute' : 'Unmute'}
            disabled={!connectionReady}
          >
            {audioEnabled ? '🎤' : '🔇'}
          </button>

          <button
            className="control-btn speaker-btn"
            title="Speakerphone"
            disabled={!connectionReady}
          >
            🔊
          </button>

          <button
            className="control-btn end-call-btn"
            onClick={handleEndCall}
            title="End call"
          >
            ☎️
          </button>
        </div>

        {/* Network Info */}
        <div className="call-network-info">
          <span className="signal-strength">📶 {callQuality}</span>
        </div>
      </div>
      {/* Hidden audio element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay={true} />
    </div>
  )
}
