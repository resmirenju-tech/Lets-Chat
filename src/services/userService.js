import { supabase } from '@/lib/supabase'

// ============================================
// USER SERVICE
// Handles user profile and contact management
// ============================================

export const userService = {
  // Get current user profile
  async getCurrentProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If profile doesn't exist, create one
      if (error && error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert([{
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || '',
            status: 'online',
          }])
          .select()
          .single()

        if (createError) throw createError
        return { success: true, data: newProfile }
      }

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching current profile:', error)
      return { success: false, error: error.message }
    }
  },

  // Get user profile by ID
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return { success: false, error: error.message }
    }
  },

  // Update user profile
  async updateProfile(updates) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error updating profile:', error)
      return { success: false, error: error.message }
    }
  },

  // Upload profile photo
  async uploadProfilePhoto(file) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file')
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB')
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage (bucket is now public)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const avatarUrl = data.publicUrl

      // Update profile with avatar URL
      const { data: profileData, error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) throw updateError

      return { success: true, avatar_url: avatarUrl, data: profileData }
    } catch (error) {
      console.error('Error uploading profile photo:', error)
      return { success: false, error: error.message || 'Failed to upload photo' }
    }
  },

  // Get all users except current
  async getAllUsers() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('id', user.id)
        .order('full_name', { ascending: true })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching all users:', error)
      return { success: false, error: error.message }
    }
  },

  // Update user status (online, offline, away, busy)
  async updateUserStatus(status) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('user_profiles')
        .update({ status, last_seen_at: new Date() })
        .eq('id', user.id)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error updating user status:', error)
      return { success: false, error: error.message }
    }
  },

  // Add a contact
  async addContact(contactId, nickname = null) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Check if contact already exists
      const { data: existingContact, error: checkError } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .single()

      if (existingContact) {
        return { success: false, error: 'This contact is already added' }
      }

      // If not found (expected), proceed with insert
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert([
          {
            user_id: user.id,
            contact_id: contactId,
            nickname,
          },
        ])
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error adding contact:', error)
      return { success: false, error: error.message }
    }
  },

  // Remove a contact
  async removeContact(contactId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('user_id', user.id)
        .eq('contact_id', contactId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      console.error('Error removing contact:', error)
      return { success: false, error: error.message }
    }
  },

  // Get all contacts
  async getContacts() {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('contacts')
        .select('*, contact:contact_id(id, email, full_name, avatar_url, status)')
        .eq('user_id', user.id)
        .eq('blocked', false)
        .order('is_favorite', { ascending: false })

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error fetching contacts:', error)
      return { success: false, error: error.message }
    }
  },

  // Mark contact as favorite
  async markFavorite(contactId, isFavorite) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('contacts')
        .update({ is_favorite: isFavorite })
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error marking favorite:', error)
      return { success: false, error: error.message }
    }
  },

  // Block a contact
  async blockContact(contactId, blocked = true) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('contacts')
        .update({ blocked })
        .eq('user_id', user.id)
        .eq('contact_id', contactId)
        .select()

      if (error) throw error
      return { success: true, data: data[0] }
    } catch (error) {
      console.error('Error blocking contact:', error)
      return { success: false, error: error.message }
    }
  },

  // Check if contact exists
  async contactExists(contactId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { count, error } = await supabase
        .from('contacts')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('contact_id', contactId)

      if (error) throw error
      return { success: true, exists: count > 0 }
    } catch (error) {
      console.error('Error checking contact:', error)
      return { success: false, exists: false }
    }
  },

  // Search users by email or name
  async searchUsers(searchTerm) {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .neq('id', user.id)
        .or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
        .limit(10)

      if (error) throw error
      return { success: true, data }
    } catch (error) {
      console.error('Error searching users:', error)
      return { success: false, error: error.message }
    }
  },

  // Subscribe to profile updates
  subscribeToProfile(userId, callback) {
    const { data: subscription } = supabase
      .channel(`profile:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new)
        }
      )
      .subscribe()

    return subscription
  },

  // Unsubscribe from updates
  async unsubscribe(subscription) {
    if (subscription) {
      await supabase.removeChannel(subscription)
    }
  },
}
