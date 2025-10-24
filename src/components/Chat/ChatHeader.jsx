import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { callService } from '@/services/callService'
import toast from 'react-hot-toast'
import './ChatHeader.css'

export default function ChatHeader({ conversation, onBack, onCallInitiated }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [conversation])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', conversation.userId)
        .single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitiateCall = async () => {
    try {
      const result = await callService.initiateCall(conversation.userId, 'voice')
      if (result.success) {
        toast.success('Call initiated...')
        if (onCallInitiated) {
          onCallInitiated(result.call)
        }
      } else {
        toast.error('Failed to initiate call: ' + result.error)
      }
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  const handleInitiateVideoCall = async () => {
    try {
      const result = await callService.initiateCall(conversation.userId, 'video')
      if (result.success) {
        toast.success('Video call initiated...')
        if (onCallInitiated) {
          onCallInitiated(result.call)
        }
      } else {
        toast.error('Failed to initiate video call: ' + result.error)
      }
    } catch (error) {
      toast.error('Error: ' + error.message)
    }
  }

  if (loading || !profile) {
    return <div className="chat-header">Loading...</div>
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'online':
        return 'Active now'
      case 'away':
        return 'Away'
      case 'busy':
        return 'Busy'
      default:
        return 'Offline'
    }
  }

  return (
    <div className="chat-header">
      <button className="back-button" onClick={onBack}>
        ← Back
      </button>

      <div className="header-info">
        <div className="header-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} />
          ) : (
            <div className="avatar-initials">
              {profile.full_name?.charAt(0) || profile.email.charAt(0)}
            </div>
          )}
          {profile.status === 'online' && <div className="online-dot" />}
        </div>

        <div className="header-text">
          <h2>{profile.full_name || profile.email}</h2>
          <p className="status-text">{getStatusText(profile.status)}</p>
        </div>
      </div>

      <div className="header-actions">
        <button 
          className="action-button call-btn" 
          title="Voice Call"
          onClick={handleInitiateCall}
        >
          <span className="call-phone-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </span>
        </button>
        <button className="action-button video-btn" title="Video Call" onClick={handleInitiateVideoCall}>
          <span className="call-phone-icon">
            <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 7l-7 5 7 5V7z"></path>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
            </svg>
          </span>
        </button>
        <div className="menu-container">
          <button 
            className="action-button menu-toggle" 
            onClick={() => setShowMenu(!showMenu)}
            title="More options"
          >
            ⋮
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              <button className="menu-item">
                ℹ️ View Profile
              </button>
              <button className="menu-item">
                🔔 Mute Notifications
              </button>
              <button className="menu-item block">
                🚫 Block Contact
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
