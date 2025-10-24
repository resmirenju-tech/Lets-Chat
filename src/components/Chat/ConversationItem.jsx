import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import './ConversationItem.css'

export default function ConversationItem({ conversation, profile, isSelected, onClick }) {
  if (!profile) return null

  const lastMessagePreview = conversation.lastMessage 
    ? conversation.lastMessage.content.substring(0, 50)
    : 'No messages yet'
    
  const lastMessageTime = conversation.lastMessage
    ? (() => {
        try {
          const date = new Date(conversation.lastMessage.created_at)
          
          // Get the hours and minutes
          let hours = date.getHours()
          let mins = date.getMinutes()
          
          // Add 5 hours 30 minutes to convert UTC to IST
          mins += 30
          if (mins >= 60) {
            hours += 1
            mins -= 60
          }
          
          hours += 5
          if (hours >= 24) {
            hours -= 24
          }
          
          // Convert to 12-hour format
          const period = hours >= 12 ? 'PM' : 'AM'
          const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours)
          const displayMins = String(mins).padStart(2, '0')
          
          return `${displayHour}:${displayMins} ${period}`
        } catch (e) {
          return ''
        }
      })()
    : ''

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return '#31a24c'
      case 'away':
        return '#fca103'
      case 'busy':
        return '#e74c3c'
      default:
        return '#999'
    }
  }

  return (
    <div
      className={`conversation-item ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="conversation-avatar">
        <div className="avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} />
          ) : (
            <div className="avatar-initials">
              {profile.full_name?.charAt(0) || profile.email.charAt(0)}
            </div>
          )}
        </div>
        {/* Online Status */}
        {profile.status === 'online' && <div className="online-indicator" />}
      </div>

      {/* Conversation Info */}
      <div className="conversation-info">
        <div className="conversation-header">
          <h3 className="conversation-name">{profile.full_name || profile.email}</h3>
          <span className="message-time">{lastMessageTime}</span>
        </div>
        <div className="conversation-preview">
          <p className="last-message">{lastMessagePreview}</p>
          {conversation.unreadCount > 0 && (
            <span className="unread-badge">{conversation.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  )
}
