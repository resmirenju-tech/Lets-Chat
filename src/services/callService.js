import { supabase } from '@/lib/supabase'

class CallService {
  // Initiate a voice call
  async initiateCall(recipientId, callType = 'voice') {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      console.log('📞 Initiating call:', {
        initiator: user.id,
        recipient: recipientId,
        type: callType,
      })

      // Create call session
      const { data, error } = await supabase
        .from('call_sessions')
        .insert({
          initiator_id: user.id,
          recipient_id: recipientId,
          call_type: callType,
          status: 'initiating',
        })
        .select()
        .single()

      if (error) throw error

      console.log('✅ Call created:', data)

      // Update status to ringing
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ status: 'ringing' })
        .eq('id', data.id)

      if (updateError) throw updateError

      console.log('🔔 Call status updated to ringing, ID:', data.id)

      return { success: true, call: data }
    } catch (error) {
      console.error('Error initiating call:', error)
      return { success: false, error: error.message }
    }
  }

  // Accept incoming call
  async acceptCall(callId) {
    try {
      // Get call details
      const { data: callData, error: fetchError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', callId)
        .single()

      if (fetchError) throw fetchError

      // Update call status to active
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', callId)

      if (updateError) throw updateError

      // Create call history entry when CALL STARTS
      const { error: historyError } = await supabase
        .from('call_history')
        .insert({
          call_id: callId,
          initiator_id: callData.initiator_id,
          recipient_id: callData.recipient_id,
          call_type: callData.call_type,
          duration_seconds: 0,
          status: 'active',
          event_type: 'call_started', // 🎯 CALL START EVENT
        })

      if (historyError) {
        console.error('Warning: Could not record in call history:', historyError)
      }

      console.log('✅ Call accepted and call_started event recorded')
      return { success: true }
    } catch (error) {
      console.error('Error accepting call:', error)
      return { success: false, error: error.message }
    }
  }

  // Reject or decline call
  async rejectCall(callId) {
    try {
      // Get call details first
      const { data: callData, error: fetchError } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', callId)
        .single()

      if (fetchError) throw fetchError

      // Update call status to declined
      const { error: updateError } = await supabase
        .from('call_sessions')
        .update({ status: 'declined' })
        .eq('id', callId)

      if (updateError) throw updateError

      // Check if call history entry already exists
      const { data: existingHistory, error: checkError } = await supabase
        .from('call_history')
        .select('id')
        .eq('call_id', callId)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') throw checkError

      if (!existingHistory) {
        // Create new row if it doesn't exist
        await supabase
          .from('call_history')
          .insert([
            {
              call_id: callId,
              initiator_id: callData.initiator_id,
              recipient_id: callData.recipient_id,
              call_type: callData.call_type,
              duration_seconds: 0,
              status: 'declined',
              event_type: 'call_declined', // 🎯 CALL DECLINED EVENT
            },
          ])
        
        console.log('✅ Call rejected and recorded in history')
      } else {
        // Update existing row
        await supabase
          .from('call_history')
          .update({ status: 'declined', event_type: 'call_declined' })
          .eq('call_id', callId)
        
        console.log('✅ Call history updated to declined')
      }

      return { success: true }
    } catch (error) {
      console.error('Error rejecting call:', error)
      return { success: false, error: error.message }
    }
  }

  // End call
  async endCall(callId, durationSeconds) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update call session
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq('id', callId)

      if (error) throw error

      // Get call details for history
      const { data: callData } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', callId)
        .single()

      // Ensure ONE call history entry exists (insert only if it doesn't exist)
      if (callData) {
        const { data: existingHistory, error: checkError } = await supabase
          .from('call_history')
          .select('id')
          .eq('call_id', callId)
          .maybeSingle()

        if (checkError && checkError.code !== 'PGRST116') throw checkError

        if (!existingHistory) {
          // Create new row if it doesn't exist
          await supabase.from('call_history').insert({
            call_id: callId,
            initiator_id: callData.initiator_id,
            recipient_id: callData.recipient_id,
            call_type: callData.call_type,
            duration_seconds: durationSeconds,
            status: 'ended',
            event_type: 'call_ended', // 🎯 CALL ENDED EVENT
          })
          console.log('✅ New call history entry created for ended call')
        } else {
          // Update existing row
          await supabase
            .from('call_history')
            .update({
              duration_seconds: durationSeconds,
              status: 'ended',
              event_type: 'call_ended', // 🎯 CALL ENDED EVENT
            })
            .eq('call_id', callId)
          
          console.log('✅ Call history updated with end status and duration')
        }
      }

      return { success: true }
    } catch (error) {
      console.error('Error ending call:', error)
      return { success: false, error: error.message }
    }
  }

  // Subscribe to incoming calls for current user
  subscribeToIncomingCalls(callback) {
    try {
      const subscription = supabase
        .channel('call_sessions_changes')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_sessions' }, async (payload) => {
          console.log('📞 New call detected (INSERT):', payload)
          if (payload.new.status === 'ringing') {
            try {
              const { data: { user } } = await supabase.auth.getUser()
              console.log('Current user:', user?.id, 'Call for:', payload.new.recipient_id)
              if (user && payload.new.recipient_id === user.id) {
                console.log('✅ Incoming call for this user!')
                callback(payload.new)
              }
            } catch (error) {
              console.error('Error in call subscription:', error)
            }
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions' }, async (payload) => {
          console.log('📞 Call updated (UPDATE):', payload)
          if (payload.new.status === 'ringing') {
            try {
              const { data: { user } } = await supabase.auth.getUser()
              console.log('Current user:', user?.id, 'Call for:', payload.new.recipient_id)
              if (user && payload.new.recipient_id === user.id) {
                console.log('✅ Incoming call for this user (via UPDATE)!')
                callback(payload.new)
              }
            } catch (error) {
              console.error('Error in call subscription:', error)
            }
          }
        })
        .subscribe((status) => {
          console.log('Subscription status:', status)
        })

      return subscription
    } catch (error) {
      console.error('Error subscribing to calls:', error)
      return null
    }
  }

  // Subscribe to call status changes
  subscribeToCallStatus(callId, callback) {
    try {
      const subscription = supabase
        .channel(`call_status_${callId}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'call_sessions' }, (payload) => {
          if (payload.new.id === callId) {
            callback(payload.new)
          }
        })
        .subscribe()

      return subscription
    } catch (error) {
      console.error('Error subscribing to call status:', error)
      return null
    }
  }

  // Get call history for user
  async getCallHistory(limit = 20) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('call_history')
        .select(`
          *,
          initiator:initiator_id(full_name, avatar_url),
          recipient:recipient_id(full_name, avatar_url)
        `)
        .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching call history:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  // Get ongoing calls
  async getOngoingCalls() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data, error } = await supabase
        .from('call_sessions')
        .select('*')
        .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .in('status', ['initiating', 'ringing', 'active'])

      if (error) throw error

      return { success: true, data }
    } catch (error) {
      console.error('Error fetching ongoing calls:', error)
      return { success: false, error: error.message, data: [] }
    }
  }

  // Mark call as missed
  async markCallAsMissed(callId) {
    try {
      const { error } = await supabase
        .from('call_sessions')
        .update({
          status: 'missed',
          is_missed: true,
        })
        .eq('id', callId)

      if (error) throw error

      return { success: true }
    } catch (error) {
      console.error('Error marking call as missed:', error)
      return { success: false, error: error.message }
    }
  }
}

export const callService = new CallService()
