import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { messageService } from '@/services/messageService'
import { userService } from '@/services/userService'
import toast from 'react-hot-toast'
import ConversationItem from './ConversationItem'
import './ConversationList.css'

export default function ConversationList({ selectedId, onSelectConversation }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userProfiles, setUserProfiles] = useState({})
  const [currentUser, setCurrentUser] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchUsers, setSearchUsers] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      fetchConversations()
      subscribeToMessages()
    }
  }, [currentUser])

  // Listen for messages being marked as read
  useEffect(() => {
    const handleMarkAsReadComplete = () => {
      fetchConversations()
    }
    
    window.addEventListener('markAsReadComplete', handleMarkAsReadComplete)
    return () => window.removeEventListener('markAsReadComplete', handleMarkAsReadComplete)
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      // Get all messages for current user
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (msgError) throw msgError

      // Group messages by conversation
      const conversationMap = {}
      messages.forEach(msg => {
        const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
        if (!conversationMap[otherUserId]) {
          conversationMap[otherUserId] = {
            userId: otherUserId,
            lastMessage: msg,
            messages: [msg],
            unreadCount: 0
          }
        }
        if (msg.recipient_id === user.id && !msg.is_read) {
          conversationMap[otherUserId].unreadCount++
        }
      })

      // Also fetch contacts to show conversations without messages
      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', user.id)
        .eq('blocked', false)

      if (contactError) throw contactError

      // Add contacts to conversation map (if not already there from messages)
      contacts.forEach(contact => {
        if (!conversationMap[contact.contact_id]) {
          conversationMap[contact.contact_id] = {
            userId: contact.contact_id,
            lastMessage: null,
            messages: [],
            unreadCount: 0
          }
        }
      })

      const convList = Object.values(conversationMap)
        .sort((a, b) => {
          if (!a.lastMessage && b.lastMessage) return 1
          if (a.lastMessage && !b.lastMessage) return -1
          if (!a.lastMessage && !b.lastMessage) return 0
          return new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
        })

      // Fetch user profiles for all conversations
      const userIds = Object.keys(conversationMap)
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('*')
          .in('id', userIds)

        const profileMap = {}
        profiles.forEach(p => {
          profileMap[p.id] = p
        })
        setUserProfiles(profileMap)
      }

      setConversations(convList)
    } catch (error) {
      console.error('Error fetching conversations:', error)
      toast.error('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    const { data: subscription } = supabase
      .channel('messages_all')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          fetchConversations()
        }
      )
      .subscribe()

    return subscription
  }

  const filteredConversations = conversations.filter(conv => {
    const profile = userProfiles[conv.userId]
    if (!profile) return false
    return (
      profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleSearchUsers = async (term) => {
    setSearchInput(term)
    if (!term.trim()) {
      setSearchUsers([])
      return
    }

    setSearchLoading(true)
    const result = await userService.searchUsers(term)
    if (result.success) {
      setSearchUsers(result.data || [])
    } else {
      toast.error('Failed to search users')
    }
    setSearchLoading(false)
  }

  const handleAddContact = async (userId) => {
    try {
      const result = await userService.addContact(userId)
      if (result.success) {
        toast.success('Contact added!')
        setShowAddModal(false)
        setSearchInput('')
        setSearchUsers([])
        fetchConversations()
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return <div className="conversation-list loading">Loading chats...</div>
  }

  return (
    <div className="conversation-list">
      {/* Search Bar */}
      <div className="search-box">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button 
          className="add-contact-btn" 
          onClick={() => setShowAddModal(true)}
          title="Add new contact"
        >
          ➕
        </button>
      </div>

      {/* Conversations */}
      <div className="conversations">
        {filteredConversations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <p>No conversations yet</p>
            <small>Click ➕ to add a contact</small>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <ConversationItem
              key={conv.userId}
              conversation={conv}
              profile={userProfiles[conv.userId]}
              isSelected={selectedId === conv.userId}
              onClick={() => onSelectConversation(conv)}
            />
          ))
        )}
      </div>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Contact</h2>
              <button 
                className="close-btn" 
                onClick={() => setShowAddModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchInput}
                onChange={(e) => handleSearchUsers(e.target.value)}
                className="search-users-input"
                autoFocus
              />

              {searchLoading ? (
                <div className="search-results">
                  <p className="loading-text">Searching...</p>
                </div>
              ) : searchInput.trim() === '' ? (
                <div className="search-results">
                  <p className="hint-text">Start typing to search for users</p>
                </div>
              ) : searchUsers.length === 0 ? (
                <div className="search-results">
                  <p className="no-results-text">No users found</p>
                </div>
              ) : (
                <div className="search-results">
                  {searchUsers.map(user => (
                    <div key={user.id} className="user-item">
                      <div className="user-info">
                        <div className="user-avatar">{user.full_name?.charAt(0) || '👤'}</div>
                        <div>
                          <p className="user-name">{user.full_name || 'Unnamed'}</p>
                          <p className="user-email">{user.email}</p>
                        </div>
                      </div>
                      <button
                        className="add-btn"
                        onClick={() => handleAddContact(user.id)}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
