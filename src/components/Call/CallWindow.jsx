import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { callService } from '@/services/callService'
import { userService } from '@/services/userService'
import toast from 'react-hot-toast'
import './CallWindow.css'

export default function CallWindow({ call, onEndCall }) {
  const [duration, setDuration] = useState(0)
  const [otherUserInfo, setOtherUserInfo] = useState(null)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [callQuality, setCallQuality] = useState('Good signal')
  const durationInterval = useRef(null)
  const [connectionReady, setConnectionReady] = useState(false)
  const [connectionMessage, setConnectionMessage] = useState('Connecting...')

  // Initialize call connection
  useEffect(() => {
    const initializeCall = async () => {
      try {
        console.log('📞 Initializing call for:', call.id)
        
        // Request microphone access
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
          console.log('✅ Microphone access granted')
          stream.getTracks().forEach(track => track.stop()) // Stop immediately, just checking permission
        } catch (error) {
          toast.error('Microphone permission denied. Please allow microphone access.')
          return
        }

        // Simulate connection establishment
        setConnectionMessage('Establishing connection...')
        
        // Connection established after 2 seconds
        const connectionTimer = setTimeout(async () => {
          setConnectionReady(true)
          setConnectionMessage('Connected')
          toast.success('Connected! 🎤')
          console.log('✅ Call connection established')
          
          // Note: acceptCall is now called in MainApp.handleAcceptCall
          // when user clicks the Accept button, not here
        }, 2000)

        return () => clearTimeout(connectionTimer)
      } catch (error) {
        console.error('Error initializing call:', error)
        toast.error('Failed to initialize call')
      }
    }

    initializeCall()
  }, [call])

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
        const { data: { user } } = await supabase.auth.getUser()
        const otherUserId = call.initiator_id === user.id ? call.recipient_id : call.initiator_id

        const result = await userService.getUserProfile(otherUserId)
        if (result.success) {
          setOtherUserInfo(result.data)
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      }
    }

    if (call) {
      fetchOtherUserInfo()
    }
  }, [call])

  const handleEndCall = async () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current)
    }

    const result = await callService.endCall(call.id, duration)
    if (result.success) {
      toast.success('Call ended')
      onEndCall(call)
    }
  }

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled)
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
    </div>
  )
}
