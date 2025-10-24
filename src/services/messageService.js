import { supabase } from '@/lib/supabase'

// ============================================
// MESSAGE SERVICE
// Handles all messaging operations
// ============================================

export const messageService = {
  // Send a message
  async sendMessage(recipientId, content, attachmentUrl = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            sender_id: user.id,
            recipient_id: recipientId,
            content,
            attachment_url: attachmentUrl,
          },
        ])
        .select()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error sending message:', error)
      return { success: false, error: error.message }
    }
  },

  // Get messages for a conversation
  async getConversation(otherUserId, limit = 50) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return { success: true, data: data.reverse() }
    } catch (error) {
      console.error('Error fetching conversation:', error)
      return { success: false, error: error.message }
    }
  },

  // Get all conversations with unread counts
  async getConversations() {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching conversations:', error)
      return { success: false, error: error.message }
    }
  },

  // Mark messages as read
  async markMessagesAsRead(senderId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Update messages to mark as read
      const { data, error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', senderId)
        .eq('recipient_id', user.id)
        .eq('is_read', false)
        .select('id')

      if (error) {
        console.error('Error marking messages as read:', error)
        throw error
      }

      return { success: true }
    } catch (error) {
      console.error('Error marking messages as read:', error)
      return { success: false, error: error.message }
    }
  },

  // Get unread message count
  async getUnreadCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact' })
        .eq('recipient_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      return { success: true, count: count || 0 }
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return { success: false, count: 0 }
    }
  },

  // Delete a message
  async deleteMessage(messageId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', user.id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error deleting message:', error)
      return { success: false, error: error.message }
    }
  },

  // Edit a message
  async editMessage(messageId, newContent) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('messages')
        .update({ content: newContent, updated_at: new Date() })
        .eq('id', messageId)
        .eq('sender_id', user.id)
        .select()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error editing message:', error)
      return { success: false, error: error.message }
    }
  },

  // Subscribe to new messages in a conversation
  subscribeToMessages(senderId, recipientId, callback) {
    const { data: subscription } = supabase
      .channel(`messages:${senderId}-${recipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `or(and(sender_id=eq.${senderId},recipient_id=eq.${recipientId}),and(sender_id=eq.${recipientId},recipient_id=eq.${senderId}))`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return subscription
  },

  // Subscribe to message updates (edits, deletes)
  subscribeToMessageUpdates(callback) {
    const { data: subscription } = supabase
      .channel('messages:updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          callback(payload)
        }
      )
      .subscribe()

    return subscription
  },

  // Subscribe to user status changes
  subscribeToUserStatus(callback) {
    const { data: subscription } = supabase
      .channel('user_profiles:updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return subscription
  },

  // Unsubscribe from a channel
  async unsubscribe(subscription) {
    if (subscription) {
      await supabase.removeChannel(subscription)
    }
  },
}
