import React, { useState, useEffect } from 'react'
import ConversationList from '@/components/Chat/ConversationList'
import ChatWindow from '@/components/Chat/ChatWindow'
import './Chat.css'

export default function Chat() {
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="chat-container">
      {/* Conversation List */}
      <div className={`conversations-sidebar ${selectedConversation && isMobileView ? 'hidden' : ''}`}>
        <ConversationList 
          selectedId={selectedConversation?.id}
          onSelectConversation={setSelectedConversation}
        />
      </div>

      {/* Chat Window */}
      <div className={`chat-window-wrapper ${!selectedConversation && isMobileView ? 'hidden' : ''}`}>
        {selectedConversation ? (
          <ChatWindow 
            conversation={selectedConversation}
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <div className="chat-placeholder">
            <div className="placeholder-content">
              <div className="placeholder-icon">💬</div>
              <h2>Select a conversation</h2>
              <p>Choose a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
