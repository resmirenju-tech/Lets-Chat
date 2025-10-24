import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import Message from './Message'
import './MessageList.css'

export default function MessageList({ messages, currentUserId }) {
  const groupedByDate = messages.reduce((acc, msg) => {
    try {
      const date = new Date(msg.created_at)
      
      // Get date values
      let day = date.getDate()
      let month = date.getMonth()
      let year = date.getFullYear()
      
      // Get hours to check if we need to increment day for IST
      let hours = date.getHours()
      let mins = date.getMinutes()
      
      // Add 5 hours 30 minutes to check IST date
      mins += 30
      if (mins >= 60) {
        hours += 1
        mins -= 60
      }
      hours += 5
      
      // If hours overflow, increment the day
      if (hours >= 24) {
        day += 1
        // Handle month/year overflow
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        if (day > daysInMonth) {
          day = 1
          month += 1
          if (month > 11) {
            month = 0
            year += 1
          }
        }
      }
      
      // Format date as "22 Oct 2025"
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const dateStr = `${day} ${months[month]} ${year}`
      
      if (!acc[dateStr]) acc[dateStr] = []
      acc[dateStr].push(msg)
    } catch (e) {
      console.error('Date parsing error:', e)
    }
    return acc
  }, {})

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-messages">
          <div className="empty-icon">💬</div>
          <p>No messages yet</p>
          <small>Start the conversation</small>
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, msgs]) => (
          <div key={date}>
            <div className="date-separator">
              <span>{date}</span>
            </div>
            {msgs.map((msg) => (
              <Message
                key={msg.id}
                message={msg}
                isSender={msg.sender_id === currentUserId}
              />
            ))}
          </div>
        ))
      )}
    </div>
  )
}
