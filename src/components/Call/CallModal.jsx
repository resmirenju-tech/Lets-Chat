import React, { useState, useEffect, useRef } from 'react'
import { callService } from '@/services/callService'
import { userService } from '@/services/userService'
import { supabase } from '@/lib/supabase'
import './CallModal.css'

export default function CallModal({ call, onAccept, onReject }) {
  const [callerInfo, setCallerInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [buttonLoading, setButtonLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isAccepted, setIsAccepted] = useState(false) // 🎯 Track if call was accepted
  const audioRef = useRef(null)
  const timeoutRef = useRef(null)
  const timerRef = useRef(null)
  const audioContextRef = useRef(null)
  const oscillatorsRef = useRef([])

  useEffect(() => {
    // Play ringing sound on mount
    playRingingSound()
    
    // Start auto-disconnect timer (30 seconds)
    startAutoDisconnectTimer()

    return () => {
      stopRingingSound()
      clearAutoDisconnectTimer()
    }
  }, [])

  const startAutoDisconnectTimer = () => {
    // Countdown timer
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Auto-reject when time is up
          handleAutoReject()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const clearAutoDisconnectTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }

  const handleAutoReject = async () => {
    try {
      // Don't auto-reject if user already accepted the call
      if (isAccepted) {
        console.log('ℹ️ Call already accepted, skipping auto-reject')
        return
      }

      clearAutoDisconnectTimer()
      stopRingingSound()
      console.log('⏱️ Auto-rejecting call due to no response:', call.id)
      
      // Mark the call as missed in call_sessions
      const missedResult = await callService.markCallAsMissed(call.id)
      if (missedResult.success) {
        console.log('✅ Call marked as missed in sessions')
      }
      
      // Record in call history as missed (insert only, no duplicate check needed since never accepted)
      const { data: callData } = await supabase
        .from('call_sessions')
        .select('*')
        .eq('id', call.id)
        .single()

      if (callData) {
        // Check if history entry already exists (in case of race condition)
        const { data: existingHistory } = await supabase
          .from('call_history')
          .select('id')
          .eq('call_id', call.id)
          .maybeSingle()
        
        if (!existingHistory) {
          // Only insert if not already in history
          await supabase
            .from('call_history')
            .insert([
              {
                call_id: call.id,
                initiator_id: callData.initiator_id,
                recipient_id: callData.recipient_id,
                call_type: callData.call_type,
                duration_seconds: 0,
                status: 'missed',
                event_type: 'call_missed', // 🎯 CALL MISSED EVENT
              },
            ])
          console.log('✅ Missed call recorded in history')
        }
      }

      console.log('✅ Call marked as missed')
      onReject(call)
    } catch (error) {
      console.error('Error auto-rejecting call:', error)
    }
  }

  const playRingingSound = () => {
    try {
      // Create audio context
      const audioContext = new (window.AudioContext || window.webkitAudioContext)()
      audioContextRef.current = audioContext
      
      // Resume audio context (required for user interaction in modern browsers)
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(err => console.error('AudioContext resume failed:', err))
      }
      
      // Create initial tone
      createRingTone(audioContext)
      
      // Loop the ringing every 400ms (vintage "tring tring" rhythm)
      const intervalId = setInterval(() => {
        if (audioContextRef.current && audioContextRef.current.state === 'running') {
          createRingTone(audioContextRef.current)
        }
      }, 400)
      
      timeoutRef.current = intervalId
    } catch (error) {
      console.error('Error playing ringing sound:', error)
    }
  }

  const createRingTone = (audioContext) => {
    try {
      // Classic vintage "tring tring" ringtone - old telephone sound
      // Uses two alternating frequencies to create the iconic bell-like effect
      const tones = [
        { freq: 800, startTime: 0, duration: 0.15 },       // High "tring"
        { freq: 600, startTime: 0.2, duration: 0.15 }      // Low "tring"
      ]

      tones.forEach(({ freq, startTime, duration }) => {
        const osc = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        osc.connect(gainNode)
        gainNode.connect(audioContext.destination)

        osc.frequency.setValueAtTime(freq, audioContext.currentTime + startTime)
        osc.type = 'sine'

        // Sharp attack, sustained middle, quick decay (like old bell)
        gainNode.gain.setValueAtTime(0, audioContext.currentTime + startTime)
        gainNode.gain.linearRampToValueAtTime(0.25, audioContext.currentTime + startTime + 0.01) // Quick attack
        gainNode.gain.setValueAtTime(0.25, audioContext.currentTime + startTime + duration - 0.03)
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + startTime + duration)

        osc.start(audioContext.currentTime + startTime)
        osc.stop(audioContext.currentTime + startTime + duration)

        oscillatorsRef.current.push(osc)
      })
    } catch (error) {
      console.error('Error creating ring tone:', error)
    }
  }

  const stopRingingSound = () => {
    try {
      // Stop all oscillators
      oscillatorsRef.current.forEach(osc => {
        try {
          osc.stop()
          osc.disconnect()
        } catch (e) {
          // Oscillator already stopped
        }
      })
      oscillatorsRef.current = []
      
      // Clear interval
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current)
        timeoutRef.current = null
      }
      
      // Close audio context
      if (audioContextRef.current && audioContextRef.current.state === 'running') {
        audioContextRef.current.close()
        audioContextRef.current = null
      }
      
      console.log('🔇 Sound stopped')
    } catch (error) {
      console.error('Error stopping sound:', error)
    }
  }

  useEffect(() => {
    const fetchCallerInfo = async () => {
      try {
        const result = await userService.getUserProfile(call.initiator_id)
        if (result.success) {
          setCallerInfo(result.data)
        }
      } catch (error) {
        console.error('Error fetching caller info:', error)
      } finally {
        setLoading(false)
      }
    }

    if (call) {
      fetchCallerInfo()
    }
  }, [call])

  const handleAccept = async () => {
    try {
      setButtonLoading(true)
      setIsAccepted(true) // 🎯 Mark as accepted to prevent auto-reject
      clearAutoDisconnectTimer()
      stopRingingSound()
      
      // Resume audio context on user interaction
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }
      
      console.log('📞 User clicked accept:', call.id)
      // Don't call acceptCall here - it's now called in MainApp.handleAcceptCall
      // This prevents duplicate entries in call_history
      onAccept(call)
    } catch (error) {
      console.error('Error accepting call:', error)
    } finally {
      setButtonLoading(false)
    }
  }

  const handleReject = async () => {
    try {
      setButtonLoading(true)
      clearAutoDisconnectTimer()
      stopRingingSound()
      console.log('❌ Rejecting call:', call.id)
      const result = await callService.rejectCall(call.id)
      console.log('✅ Reject result:', result)
      if (result.success) {
        onReject(call)
      } else {
        console.error('Failed to reject call:', result.error)
      }
    } catch (error) {
      console.error('Error rejecting call:', error)
    } finally {
      setButtonLoading(false)
    }
  }

  if (!call || loading) {
    return null
  }

  return (
    <div className="call-modal-overlay">
      <div className="call-modal">
        {/* Background Animation */}
        <div className="call-modal-bg"></div>

        {/* Caller Avatar */}
        <div className="call-modal-avatar-wrapper">
          {callerInfo?.avatar_url ? (
            <img src={callerInfo.avatar_url} alt={callerInfo.full_name} className="call-modal-avatar" />
          ) : (
            <div className="call-modal-avatar-placeholder">
              {callerInfo?.full_name?.charAt(0) || '?'}
            </div>
          )}
        </div>

        {/* Caller Name */}
        <h2 className="call-modal-name">{callerInfo?.full_name || 'Unknown Caller'}</h2>

        {/* Call Type */}
        <p className="call-modal-type">🎙️ Incoming Voice Call</p>

        {/* Timer Display */}
        <p className="call-modal-timer">Hanging up in {timeLeft}s</p>

        {/* Ringing Indicator */}
        <div className="call-modal-ringing">
          <div className="pulse"></div>
          <div className="pulse"></div>
          <div className="pulse"></div>
        </div>

        {/* Action Buttons */}
        <div className="call-modal-buttons">
          <button 
            className="btn-reject" 
            onClick={handleReject} 
            title="Reject call"
            disabled={buttonLoading}
          >
            <svg viewBox="0 0 24 24" width="48" height="48" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          <button 
            className="btn-accept" 
            onClick={handleAccept} 
            title="Accept call"
            disabled={buttonLoading}
          >
            <svg viewBox="0 0 24 24" width="48" height="48" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
        </div>
      </div>
      <audio ref={audioRef} />
    </div>
  )
}
