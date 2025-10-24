import React, { useState } from 'react'
import './MessageInput.css'

export default function MessageInput({ onSendMessage }) {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) return

    setLoading(true)
    try {
      await onSendMessage(message)
      setMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="message-input-container">
      <div className="input-wrapper">
        <textarea
          className="message-input"
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          rows="1"
        />
        <button
          className="send-button"
          onClick={handleSend}
          disabled={!message.trim() || loading}
          title="Send message (Enter)"
        >
          {loading ? '⏳' : '➤'}
        </button>
      </div>
    </div>
  )
}
