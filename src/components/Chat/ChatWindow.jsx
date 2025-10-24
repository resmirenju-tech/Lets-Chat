import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { messageService } from '@/services/messageService'
import toast from 'react-hot-toast'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import MessageInput from './MessageInput'
import './ChatWindow.css'

export default function ChatWindow({ conversation, onBack, onCallInitiated }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const messagesEndRef = useRef(null)
  const subscriptionRef = useRef(null)

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser && conversation) {
      fetchMessages()
      markAsRead()
    }
  }, [conversation, currentUser])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${conversation.userId}),and(sender_id.eq.${conversation.userId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })

      if (error) throw error
      setMessages(data || [])

      // Subscribe to new messages
      subscribeToMessages()
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast.error('Failed to load messages')
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        return
      }

      subscriptionRef.current = supabase
        .channel(`messages:${user.id}-${conversation.userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `or(and(sender_id=eq.${user.id},recipient_id=eq.${conversation.userId}),and(sender_id=eq.${conversation.userId},recipient_id=eq.${user.id}))`,
          },
          (payload) => {
            setMessages(prev => [...prev, payload.new])
            scrollToBottom()
          }
        )
        .subscribe()
    } catch (error) {
      console.error('Error subscribing to messages:', error)
    }
  }

  const markAsRead = async () => {
    try {
      const result = await messageService.markMessagesAsRead(conversation.userId)
      
      if (result.success) {
        // Trigger conversations refresh via event
        setTimeout(() => {
          window.dispatchEvent(new Event('markAsReadComplete'))
        }, 200)
      } else {
        console.error('Failed to mark messages as read:', result.error)
        return
      }
      
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (messageText) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            recipient_id: conversation.userId,
            content: messageText,
          },
        ])

      if (error) throw error
      
      // Small delay to ensure message is saved
      setTimeout(() => {
        fetchMessages()
      }, 300)
      
      toast.success('Message sent', { icon: '✓' })
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    }
  }

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [])

  if (loading) {
    return <div className="chat-window">Loading messages...</div>
  }

  return (
    <div className="chat-window">
      <ChatHeader conversation={conversation} onBack={onBack} onCallInitiated={onCallInitiated} />
      <MessageList messages={messages} currentUserId={currentUser?.id} />
      <div ref={messagesEndRef} />
      <MessageInput onSendMessage={handleSendMessage} />
    </div>
  )
}
