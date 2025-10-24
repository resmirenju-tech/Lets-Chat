import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { callService } from '@/services/callService'
import Chat from '@/pages/Chat'
import Calls from '@/pages/Calls'
import Profile from '@/pages/Profile'
import Settings from '@/pages/Settings'
import CallModal from '@/components/Call/CallModal'
import CallWindow from '@/components/Call/CallWindow'
import './MainApp.css'

export default function MainApp() {
  const [activeTab, setActiveTab] = useState('chat')
  const [incomingCall, setIncomingCall] = useState(null)
  const [activeCall, setActiveCall] = useState(null)
  const [missedCallCount, setMissedCallCount] = useState(0)
  const navigate = useNavigate()

  // Subscribe to incoming calls
  useEffect(() => {
    console.log('🔔 Setting up incoming calls subscription...')
    const subscription = callService.subscribeToIncomingCalls((call) => {
      console.log('🎉 Incoming call received in MainApp:', call)
      toast('📞 Incoming call...', {
        duration: 30000,
        icon: '📞',
      })
      setIncomingCall(call)
    })

    return () => {
      if (subscription) {
        console.log('Unsubscribing from calls')
        subscription.unsubscribe()
      }
    }
  }, [])

  // Subscribe to active call status
  useEffect(() => {
    if (!activeCall) return

    const subscription = callService.subscribeToCallStatus(activeCall.id, (updatedCall) => {
      if (updatedCall.status === 'ended' || updatedCall.status === 'declined' || updatedCall.status === 'missed') {
        setActiveCall(null)
      } else {
        setActiveCall(updatedCall)
      }
    })

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [activeCall])

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast.success('Logged out successfully')
      navigate('/login')
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleAcceptCall = async (call) => {
    try {
      console.log('📞 User accepted call, calling callService.acceptCall...')
      // First, accept the call in the service (creates call_started history entry)
      const result = await callService.acceptCall(call.id)
      
      if (result.success) {
        console.log('✅ Call accepted in service')
        // Then clear the modal and show the CallWindow
        setIncomingCall(null)
        setActiveCall(call)
        toast.success('Call accepted!')
      } else {
        console.error('❌ Failed to accept call:', result.error)
        toast.error('Failed to accept call: ' + result.error)
      }
    } catch (error) {
      console.error('Error accepting call:', error)
      toast.error('Error: ' + error.message)
    }
  }

  const handleRejectCall = (call) => {
    setIncomingCall(null)
    toast('Call rejected', { icon: '❌' })
  }

  const handleEndCall = (call) => {
    setActiveCall(null)
    toast.success('Call ended')
  }

  // Fetch total missed calls count
  const fetchMissedCallsCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: missedCalls, error } = await supabase
        .from('call_history')
        .select('id')
        .eq('recipient_id', user.id)
        .eq('status', 'missed')
        .eq('is_read', false)

      if (error) throw error

      const count = missedCalls?.length || 0
      setMissedCallCount(count)
      console.log('📞 Total unread missed calls:', count)
    } catch (error) {
      console.error('Error fetching missed calls count:', error)
    }
  }

  // Load missed calls count on mount
  useEffect(() => {
    fetchMissedCallsCount()
  }, [])

  // Subscribe to call history changes to update count
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) return

        const channel = supabase
          .channel(`missed_calls_${user.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'call_history',
              filter: `recipient_id=eq.${user.id}`
            },
            async (payload) => {
              console.log('📞 Call history updated:', payload)
              // Only fetch if we're not on the calls tab
              if (activeTab !== 'calls') {
                await fetchMissedCallsCount()
              }
            }
          )
          .subscribe()

        return () => {
          channel.unsubscribe()
        }
      } catch (error) {
        console.error('Error setting up realtime subscription:', error)
      }
    })()
  }, [activeTab])

  // Clear missed calls count when clicking Calls tab
  const handleCallsTabClick = async () => {
    setActiveTab('calls')
    setMissedCallCount(0)
    // Mark all missed calls as read in the database
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Current user:', user?.id)
      
      if (user) {
        console.log('🔍 Fetching unread missed calls before update...')
        const { data: beforeUpdate, error: fetchError } = await supabase
          .from('call_history')
          .select('id, status, is_read, recipient_id')
          .eq('recipient_id', user.id)
          .eq('status', 'missed')
          .eq('is_read', false)
        
        console.log('📊 Before update - Unread missed calls:', beforeUpdate?.length || 0, beforeUpdate)
        
        const { data: updateData, error: updateError } = await supabase
          .from('call_history')
          .update({ is_read: true })
          .eq('recipient_id', user.id)
          .eq('status', 'missed')
          .eq('is_read', false)
          .select()
        
        if (updateError) {
          console.error('❌ Error updating database:', updateError)
        } else {
          console.log('✅ Updated records:', updateData?.length || 0, updateData)
        }
        
        console.log('🔍 Fetching unread missed calls after update...')
        const { data: afterUpdate } = await supabase
          .from('call_history')
          .select('id, status, is_read')
          .eq('recipient_id', user.id)
          .eq('status', 'missed')
          .eq('is_read', false)
        
        console.log('📊 After update - Remaining unread missed calls:', afterUpdate?.length || 0)
      }
    } catch (error) {
      console.error('Error marking missed calls as read:', error)
    }
  }

  return (
    <div className="main-app">
      {/* Call Modal for incoming calls */}
      {incomingCall && (
        <CallModal 
          call={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Call Window for active calls */}
      {activeCall && (
        <CallWindow 
          call={activeCall}
          onEndCall={handleEndCall}
        />
      )}

      {/* Sidebar Navigation */}
      <div className="app-sidebar">
        <div className="sidebar-buttons">
          <button
            className={`sidebar-btn ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            title="Chat"
          >
            💬
          </button>
          <button
            className={`sidebar-btn calls-btn ${activeTab === 'calls' ? 'active' : ''}`}
            onClick={handleCallsTabClick}
            title="Calls"
          >
            {missedCallCount > 0 && (
              <span className="call-badge">{missedCallCount}</span>
            )}
            <span className="call-phone-icon">
              <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </span>
          </button>
          <button
            className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
            title="Profile"
          >
            👤
          </button>
          <button
            className={`sidebar-btn ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="app-content">
        {activeTab === 'chat' && <Chat />}
        {activeTab === 'calls' && <Calls />}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'settings' && <Settings />}
      </div>
    </div>
  )
}