import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { callService } from '@/services/callService'
import { userService } from '@/services/userService'
import { useWebRTC } from '@/hooks/useWebRTC'
import toast from 'react-hot-toast'
import './CallWindow.css'

export default function CallWindow({ call, onEndCall }) {
  const [duration, setDuration] = useState(0)
  const [otherUserInfo, setOtherUserInfo] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const durationInterval = useRef(null)
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)

  console.log('📞 CallWindow rendered with call:', call?.id)

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        console.log('👤 Current user:', user?.id)
        setCurrentUser(user)
      } catch (error) {
        console.error('❌ Error getting current user:', error)
      }
    }
    getCurrentUser()
  }, [])

  // Determine initiator and peer ID
  const isInitiator = call?.initiator_id === currentUser?.id
  const peerId = isInitiator ? call?.recipient_id : call?.initiator_id

  console.log('🔍 Call Role Check:')
  console.log('   currentUser.id:', currentUser?.id)
  console.log('   call.initiator_id:', call?.initiator_id)
  console.log('   call.recipient_id:', call?.recipient_id)
  console.log('   isInitiator:', isInitiator)
  console.log('   peerId (who to call):', peerId)

  // Only setup WebRTC if we have currentUser
  const shouldSetupWebRTC = !!currentUser?.id && !!call?.id && !!peerId

  // Setup WebRTC
  const { localStream, remoteStream, connectionState } = useWebRTC(
    shouldSetupWebRTC ? call.id : null,
    shouldSetupWebRTC ? currentUser.id : null,
    shouldSetupWebRTC ? peerId : null,
    isInitiator
  )

  // Display local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      console.log('📹 Setting local video stream')
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Display remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      console.log('📹 Setting remote video stream')
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

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
        if (!peerId) return
        const result = await userService.getUserProfile(peerId)
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
  }, [call?.id, peerId])

  const handleEndCall = async () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
    }

    // Stop all media tracks
    localStream?.getTracks().forEach(track => track.stop())
    remoteStream?.getTracks().forEach(track => track.stop())

    const result = await callService.endCall(call.id, duration)
    if (result.success) {
      toast.success('Call ended')
      onEndCall(call)
    }
  }

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled)
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
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

        {/* Video container */}
        <div className="call-video-container">
          {/* Remote video (large) */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="call-remote-video"
          />

          {/* Local video (small PIP) */}
          <div className="call-local-pip">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="call-local-video"
            />
          </div>
        </div>

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
                {connectionState === 'connected' ? '🟢 Connected' : `⏳ ${connectionState}`}
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
            disabled={connectionState !== 'connected'}
          >
            {audioEnabled ? '🎤' : '🔇'}
          </button>

          <button
            className="control-btn speaker-btn"
            title="Speakerphone"
            disabled={connectionState !== 'connected'}
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
          <span className="signal-strength">📶 {connectionState}</span>
        </div>
      </div>
    </div>
  )
}
