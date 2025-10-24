import React from 'react'
import './Message.css'

export default function Message({ message, isSender }) {
  const time = (() => {
    try {
      const date = new Date(message.created_at)
      
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
      console.error('Time formatting error:', e)
      return '00:00 AM'
    }
  })()

  return (
    <div className={`message-wrapper ${isSender ? 'sent' : 'received'}`}>
      <div className="message-bubble">
        <p className="message-content">{message.content}</p>
        <span className="message-time">
          {time}
          {isSender && (
            <span className="read-indicator">
              {message.is_read ? '✓✓' : '✓'}
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
