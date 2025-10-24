import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { callService } from '@/services/callService'
import { userService } from '@/services/userService'
import toast from 'react-hot-toast'
import './Calls.css'

export default function Calls() {
  const [recentCalls, setRecentCalls] = useState([])
  const [favoriteCalls, setFavoriteCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [userProfiles, setUserProfiles] = useState({})
  const [currentUser, setCurrentUser] = useState(null)
  const [favorites, setFavorites] = useState(new Set())
  const [missedCallCounts, setMissedCallCounts] = useState({})

  useEffect(() => {
    getCurrentUser()
  }, [])

  useEffect(() => {
    if (currentUser) {
      // Load favorites first
      (async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser()
          const { data: favContacts } = await supabase
            .from('contacts')
            .select('contact_id')
            .eq('user_id', user.id)
            .eq('is_favorite', true)

          console.log('⭐ Favorite contacts loaded:', favContacts?.length || 0)
          
          const favSet = new Set(favContacts?.map(c => c.contact_id) || [])
          setFavorites(favSet)
          
          // Then fetch calls
          await fetchCalls()
        } catch (error) {
          console.error('Error in init:', error)
        }
      })()
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return

    let isActive = true

    // Subscribe to call session updates
    const channel = supabase
      .channel(`calls_updates_${currentUser.id}`)
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'call_sessions',
          filter: `or(initiator_id=eq.${currentUser.id},recipient_id=eq.${currentUser.id})`
        },
        async (payload) => {
          console.log('📞 Call session updated:', payload.new)
          // Refresh calls when a call status changes
          if (isActive) {
            await fetchCalls()
          }
        }
      )
      .subscribe((status) => {
        console.log('📞 Realtime subscription status:', status)
      })

    return () => {
      isActive = false
      channel.unsubscribe()
    }
  }, [currentUser])

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    } catch (error) {
      console.error('Error getting current user:', error)
    }
  }

  const loadFavorites = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: favContacts } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', user.id)
        .eq('is_favorite', true)

      console.log('⭐ Favorite contacts loaded:', favContacts?.length || 0)
      
      const favSet = new Set(favContacts?.map(c => c.contact_id) || [])
      setFavorites(favSet)
    } catch (error) {
      console.error('Error loading favorites:', error)
    }
  }

  const fetchCalls = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      console.log('🔍 Fetching calls for user:', user.id)

      // Fetch call history filtered by current user - using OR filter at database level
      const { data: callHistory, error: allError } = await supabase
        .from('call_history')
        .select('*')
        .or(`initiator_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (allError) throw allError

      console.log('📞 Calls for current user:', callHistory?.length || 0)

      // Transform call history for display
      const calls = callHistory?.map(call => ({
        id: call.id,
        callId: call.call_id,
        contactId: call.initiator_id === user.id ? call.recipient_id : call.initiator_id,
        type: call.initiator_id === user.id ? 'outgoing' : 'incoming',
        duration: call.duration_seconds || 0,
        timestamp: new Date(call.created_at),
        missed: call.status === 'missed',
        status: call.status,
      })) || []

      console.log('✅ Transformed calls:', calls.length)

      // Calculate missed call counts per contact
      const missedCounts = {}
      calls.forEach(call => {
        if (call.missed && call.type === 'incoming') {
          missedCounts[call.contactId] = (missedCounts[call.contactId] || 0) + 1
        }
      })
      setMissedCallCounts(missedCounts)

      // Fetch user profiles for all contacts
      const contactIds = [...new Set(calls.map(c => c.contactId))]
      console.log('👥 Fetching profiles for contacts:', contactIds.length)
      
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .in('id', contactIds)

      if (profileError) {
        console.error('Error fetching profiles:', profileError)
      } else {
        console.log('✅ Profiles fetched:', profiles?.length || 0)
      }

      const profileMap = {}
      profiles?.forEach(p => {
        profileMap[p.id] = p
      })

      setUserProfiles(profileMap)

      // Separate favorites and recent
      const fav = calls.filter(c => favorites.has(c.contactId))
      const recent = calls.filter(c => !favorites.has(c.contactId))

      console.log('⭐ Favorites:', fav.length, 'Recent:', recent.length)

      setFavoriteCalls(fav.slice(0, 5)) // Show top 5 favorites
      setRecentCalls(calls) // Show all in recent (will be filtered by UI)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching calls:', error)
      toast.error('Failed to load call history')
      setLoading(false)
    }
  }

  const toggleFavorite = async (contactId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const isFav = favorites.has(contactId)

      const { error } = await supabase
        .from('contacts')
        .update({ is_favorite: !isFav })
        .eq('user_id', user.id)
        .eq('contact_id', contactId)

      if (error) throw error

      const newFavs = new Set(favorites)
      if (isFav) {
        newFavs.delete(contactId)
        toast.success('Removed from favorites')
      } else {
        newFavs.add(contactId)
        toast.success('Added to favorites')
      }
      setFavorites(newFavs)
      fetchCalls()
    } catch (error) {
      console.error('Error toggling favorite:', error)
      toast.error('Failed to update favorite')
    }
  }

  const handleContactClick = (contactId) => {
    // Clear missed calls count for this contact
    const newMissedCounts = { ...missedCallCounts }
    delete newMissedCounts[contactId]
    setMissedCallCounts(newMissedCounts)
  }

  // Generate demo call history for testing
  const generateDemoCallHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Current user:', user?.id)
      if (!user) throw new Error('Not authenticated')

      // Get some contacts to use
      const { data: contacts, error: contactsError } = await supabase
        .from('contacts')
        .select('contact_id')
        .eq('user_id', user.id)
        .limit(3)

      console.log('📞 Contacts fetched:', contacts?.length || 0, 'Error:', contactsError)

      if (!contacts || contacts.length === 0) {
        toast.error('Add some contacts first to generate call history')
        return
      }

      const contactIds = contacts.map(c => c.contact_id)
      console.log('📋 Contact IDs:', contactIds)
      
      const statuses = ['active', 'missed', 'declined']
      const callTypes = ['voice', 'video']
      const now = new Date()

      // Generate 5 demo calls
      const demoCalls = []
      const errors = []
      
      for (let i = 0; i < 5; i++) {
        const contactId = contactIds[i % contactIds.length]
        const status = statuses[i % statuses.length]
        const callType = callTypes[i % callTypes.length]
        const duration = status === 'missed' ? 0 : Math.floor(Math.random() * 300) + 30

        console.log(`🔄 Creating call ${i + 1}: status=${status}, type=${callType}`)

        // Create call session first
        const { data: callSession, error: sessionError } = await supabase
          .from('call_sessions')
          .insert({
            initiator_id: user.id,
            recipient_id: contactId,
            call_type: callType,
            status: status,
            started_at: new Date(now.getTime() - (i + 1) * 3600000).toISOString(),
            ended_at: status !== 'missed' ? new Date(now.getTime() - (i + 1) * 3600000 + duration * 1000).toISOString() : null,
            duration_seconds: duration,
          })
          .select()
          .single()

        if (sessionError) {
          console.error('❌ Error creating call session:', sessionError)
          errors.push(sessionError.message)
          continue
        }

        console.log('✅ Call session created:', callSession.id)

        // Create call history entry
        const { error: historyError } = await supabase
          .from('call_history')
          .insert({
            call_id: callSession.id,
            initiator_id: user.id,
            recipient_id: contactId,
            call_type: callType,
            duration_seconds: duration,
            status: status,
          })

        if (historyError) {
          console.error('❌ Error creating call history:', historyError)
          errors.push(historyError.message)
        } else {
          console.log('✅ Call history entry created')
          demoCalls.push(callSession)
        }
      }

      console.log(`📊 Summary: Created ${demoCalls.length}/5 calls, ${errors.length} errors`)
      if (errors.length > 0) {
        console.error('Errors:', errors)
      }

      toast.success(`Created ${demoCalls.length} demo calls!`)
      
      // Refresh the calls list
      setTimeout(() => {
        fetchCalls()
      }, 500)
    } catch (error) {
      console.error('Error generating demo calls:', error)
      toast.error('Failed to generate demo calls: ' + error.message)
    }
  }

  const formatTime = (date) => {
    try {
      // Convert to IST by adding 5 hours 30 minutes
      const istDate = new Date(new Date(date).getTime() + (5.5 * 60 * 60 * 1000))
      const now = new Date()
      const istNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000))
      
      const diff = istNow - istDate

      // Less than 1 minute
      if (diff < 60000) return 'Just now'

      // Less than 1 hour
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000)
        return `${minutes}m ago`
      }

      // Less than 1 day
      if (diff < 86400000) {
        // Format as HH:MM PM/AM in IST
        const hours = istDate.getHours()
        const minutes = istDate.getMinutes()
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        const displayMinutes = minutes.toString().padStart(2, '0')
        return `${displayHours.toString().padStart(2, '0')}:${displayMinutes} ${ampm}`
      }

      // Yesterday
      if (diff < 172800000) {
        return 'Yesterday'
      }

      // Format date
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[istDate.getMonth()]
      const day = istDate.getDate()
      return `${month} ${day}`
    } catch (e) {
      return 'Unknown'
    }
  }

  const formatDuration = (seconds) => {
    if (seconds === 0) return 'No connection'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  const getCallIcon = (type, status) => {
    if (status === 'missed') return '📵' // Missed call
    if (status === 'declined') return '❌' // Rejected/Declined call
    if (type === 'incoming') return '📥' // Incoming
    return '📤' // Outgoing
  }

  const getCallColor = (type, status) => {
    if (status === 'missed') return '#ff6b6b' // Red for missed
    if (status === 'declined') return '#ff6b6b' // Red for rejected
    if (type === 'incoming') return '#31a24c' // Green for incoming
    return '#667eea' // Blue for outgoing
  }

  const getCallStatusText = (type, status, duration) => {
    if (status === 'missed') return 'Missed call'
    if (status === 'declined') return 'Call declined'
    if (type === 'incoming') return `Received • ${formatDuration(duration)}`
    return `Outgoing • ${formatDuration(duration)}`
  }

  const renderCallItem = (call, showFavBtn = false) => {
    const profile = userProfiles[call.contactId]
    if (!profile) return null

    const handleCallClick = async () => {
      try {
        const result = await callService.initiateCall(call.contactId, 'voice')
        if (result.success) {
          toast.success('Call initiated...')
        } else {
          toast.error('Failed to initiate call: ' + result.error)
        }
      } catch (error) {
        toast.error('Error: ' + error.message)
      }
    }

    return (
      <div key={call.id} className={`call-item ${call.missed ? 'missed' : ''}`} onClick={() => handleContactClick(call.contactId)}>
        <div className="call-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} />
          ) : (
            <div className="avatar-placeholder">
              {profile.full_name?.charAt(0) || '👤'}
            </div>
          )}
        </div>

        <div className="call-info">
          <div className="call-header">
            <p className="call-name">{profile.full_name || profile.email}</p>
            <p className="call-time">{formatTime(call.timestamp)}</p>
          </div>
          <div className="call-details">
            <span 
              className="call-type-icon"
              style={{ color: getCallColor(call.type, call.status) }}
            >
              {getCallIcon(call.type, call.status)}
            </span>
            <p className="call-status">
              {getCallStatusText(call.type, call.status, call.duration)}
            </p>
          </div>
        </div>

        <div className="call-actions">
          {showFavBtn && (
            <button 
              className={`call-btn fav-btn ${favorites.has(call.contactId) ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(call.contactId)
              }}
              title="Add to favorites"
            >
              ⭐
            </button>
          )}
          <button 
            className="call-btn call-btn-phone" 
            title="Call"
            onClick={(e) => {
              e.stopPropagation()
              handleCallClick()
            }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
        </div>
      </div>
    )
  }

  const renderFavoriteCard = (call) => {
    const profile = userProfiles[call.contactId]
    if (!profile) return null

    const handleVoiceCall = async () => {
      try {
        const result = await callService.initiateCall(call.contactId, 'voice')
        if (result.success) {
          toast.success('Call initiated...')
        } else {
          toast.error('Failed to initiate call: ' + result.error)
        }
      } catch (error) {
        toast.error('Error: ' + error.message)
      }
    }

    const handleVideoCall = async () => {
      try {
        const result = await callService.initiateCall(call.contactId, 'video')
        if (result.success) {
          toast.success('Video call initiated...')
        } else {
          toast.error('Failed to initiate video call: ' + result.error)
        }
      } catch (error) {
        toast.error('Error: ' + error.message)
      }
    }

    return (
      <div key={call.id} className="favorite-card">
        <div className="favorite-avatar">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} />
          ) : (
            <div className="avatar-placeholder">
              {profile.full_name?.charAt(0) || '👤'}
            </div>
          )}
          <div className="favorite-actions">
            <button 
              className="fav-action-btn phone" 
              title="Call"
              onClick={handleVoiceCall}
            >
              ☎️
            </button>
            <button 
              className="fav-action-btn video" 
              title="Video call"
              onClick={handleVideoCall}
            >
              📹
            </button>
          </div>
        </div>
        <p className="favorite-name">{profile.full_name || profile.email}</p>
      </div>
    )
  }

  if (loading) {
    return <div className="calls-loading">Loading calls...</div>
  }

  const nonFavoriteCalls = recentCalls.filter(c => !favorites.has(c.contactId))
  const hasAnyCalls = favoriteCalls.length > 0 || nonFavoriteCalls.length > 0 || recentCalls.length > 0

  return (
    <div className="calls-container">
      <div className="calls-header">
        <h1>Calls</h1>
        <button className="calls-header-btn" title="New call">
          ☎️
        </button>
      </div>

      <div className="calls-search">
        <input 
          type="text" 
          placeholder="Search or start a new call"
          className="calls-search-input"
        />
      </div>

      {!hasAnyCalls ? (
        <div className="calls-empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon">
              <svg viewBox="0 0 200 200" width="120" height="120">
                <circle cx="100" cy="100" r="95" fill="none" stroke="#e8e8e8" strokeWidth="2"/>
                <path d="M 70 110 Q 100 130 130 110" stroke="#999" strokeWidth="3" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
            
            <div className="action-buttons">
              <button className="action-button start-call">
                <span className="action-icon">📹</span>
                <span className="action-label">Start call</span>
              </button>
              <button className="action-button new-link">
                <span className="action-icon">🔗</span>
                <span className="action-label">New call link</span>
              </button>
              <button className="action-button call-number">
                <span className="action-icon">📞</span>
                <span className="action-label">Call a number</span>
              </button>
              <button className="action-button debug-btn" onClick={generateDemoCallHistory}>
                <span className="action-icon">🧪</span>
                <span className="action-label">Generate Demo Calls</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Favorites Section */}
          {favoriteCalls.length > 0 && (
            <div className="calls-section">
              <h2 className="section-title">Favorites</h2>
              <div className="calls-list">
                {favoriteCalls.map(call => renderFavoriteCard(call))}
              </div>
              {favoriteCalls.length < favorites.size && (
                <button className="more-btn">More</button>
              )}
            </div>
          )}

          {/* Recent Calls Section */}
          {nonFavoriteCalls.length > 0 && (
            <div className="calls-section">
              <h2 className="section-title">Recent</h2>
              <div className="calls-list">
                {nonFavoriteCalls.map(call => renderCallItem(call, true))}
              </div>
            </div>
          )}

          {/* If no non-favorite calls, show all calls for better visibility */}
          {nonFavoriteCalls.length === 0 && recentCalls.length > 0 && (
            <div className="calls-section">
              <h2 className="section-title">All Calls</h2>
              <div className="calls-list">
                {recentCalls.map(call => renderCallItem(call, true))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
