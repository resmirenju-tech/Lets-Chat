import { supabase } from '@/lib/supabase'

class WebRTCService {
  constructor() {
    this.peerConnection = null
    this.localStream = null
    this.remoteStream = null
    this.callId = null
    this.signalingChannel = null
    this.iceCandidateQueue = []
  }

  // Initialize local audio stream
  async initializeLocalStream() {
    try {
      console.log('🎤 Requesting microphone access...')
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })
      console.log('✅ Microphone access granted')
      return { success: true, stream: this.localStream }
    } catch (error) {
      console.error('❌ Microphone access denied:', error)
      return { 
        success: false, 
        error: error.name === 'NotAllowedError' 
          ? 'Microphone permission denied. Please allow access in browser settings.'
          : 'Failed to access microphone: ' + error.message 
      }
    }
  }

  // Stop local stream
  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop()
      })
      this.localStream = null
    }
  }

  // Create peer connection using native WebRTC
  async createPeerConnection(callId, isInitiator = true) {
    try {
      if (!callId) {
        throw new Error('callId is required')
      }

      this.callId = callId
      console.log('📞 Setting callId:', callId)

      // Initialize local stream if not already done
      if (!this.localStream) {
        const result = await this.initializeLocalStream()
        if (!result.success) {
          return result
        }
      }

      console.log('🔌 Creating RTCPeerConnection...')

      // Create RTCPeerConnection
      const configuration = {
        iceServers: [
          { urls: ['stun:stun.l.google.com:19302'] },
          { urls: ['stun:stun1.l.google.com:19302'] },
        ],
      }

      this.peerConnection = new RTCPeerConnection(configuration)
      console.log('✅ RTCPeerConnection created')

      // Add local tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream)
        console.log('📤 Added local track:', track.kind)
      })

      // Handle ICE candidates
      this.peerConnection.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
          console.log('🧊 New ICE candidate')
          this.sendSignal({
            type: 'candidate',
            candidate: event.candidate,
          })
        }
      })

      // Handle connection state changes
      this.peerConnection.addEventListener('connectionstatechange', () => {
        console.log('🔌 Connection state:', this.peerConnection.connectionState)
      })

      // Handle ICE connection state changes
      this.peerConnection.addEventListener('iceconnectionstatechange', () => {
        console.log('❄️ ICE connection state:', this.peerConnection.iceConnectionState)
      })

      // Handle remote stream
      this.peerConnection.addEventListener('track', (event) => {
        console.log('📥 Received remote track:', event.track.kind)
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream()
        }
        this.remoteStream.addTrack(event.track)
        this.playRemoteAudio(this.remoteStream)
      })

      // Create and send offer if initiator
      if (isInitiator) {
        console.log('📤 Creating SDP offer (initiator)...')
        const offer = await this.peerConnection.createOffer()
        await this.peerConnection.setLocalDescription(offer)
        console.log('✅ Local description set, sending offer')
        this.sendSignal({
          type: 'offer',
          sdp: this.peerConnection.localDescription.sdp,
        })
      }

      console.log('✅ Peer connection setup complete')
      return { success: true }
    } catch (error) {
      console.error('Error creating peer connection:', error)
      return { success: false, error: error.message }
    }
  }

  // Send signal via Supabase realtime
  async sendSignal(signal) {
    try {
      if (!this.callId) {
        throw new Error('callId not set')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      console.log('📤 Sending signal via channel:', `webrtc_signal_${this.callId}`, 'Type:', signal.type)

      // Send signal through realtime channel
      await supabase
        .channel(`webrtc_signal_${this.callId}`)
        .send('broadcast', {
          event: 'webrtc_signal',
          payload: {
            from_user_id: user.id,
            signal: signal,
          },
        })

      console.log('✅ Signal sent successfully')
    } catch (error) {
      console.error('Error sending signal:', error)
    }
  }

  // Listen for signals from remote peer
  subscribeToSignals(callId, onSignal) {
    try {
      console.log('👂 Subscribing to WebRTC signals on channel:', `webrtc_signal_${callId}`)
      this.signalingChannel = supabase
        .channel(`webrtc_signal_${callId}`)
        .on('broadcast', { event: 'webrtc_signal' }, (payload) => {
          console.log('📥 Received signal:', payload.payload.signal.type)
          onSignal(payload.payload.signal)
        })
        .subscribe((status) => {
          console.log('Signal channel status:', status)
        })

      return this.signalingChannel
    } catch (error) {
      console.error('Error subscribing to signals:', error)
      return null
    }
  }

  // Handle incoming signal
  async addSignal(signal) {
    try {
      if (!this.peerConnection) {
        console.error('❌ Peer connection not initialized')
        throw new Error('Peer connection not initialized')
      }

      console.log('📨 Processing signal:', signal.type)

      if (signal.type === 'offer') {
        console.log('📥 Received offer, creating answer...')
        const offer = new RTCSessionDescription({
          type: 'offer',
          sdp: signal.sdp,
        })
        await this.peerConnection.setRemoteDescription(offer)
        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)
        console.log('✅ Answer created and sent')
        this.sendSignal({
          type: 'answer',
          sdp: this.peerConnection.localDescription.sdp,
        })
      } else if (signal.type === 'answer') {
        console.log('📥 Received answer')
        const answer = new RTCSessionDescription({
          type: 'answer',
          sdp: signal.sdp,
        })
        await this.peerConnection.setRemoteDescription(answer)
        console.log('✅ Remote description set')
      } else if (signal.type === 'candidate' && signal.candidate) {
        console.log('🧊 Adding ICE candidate')
        try {
          const candidate = new RTCIceCandidate(signal.candidate)
          await this.peerConnection.addIceCandidate(candidate)
          console.log('✅ ICE candidate added')
        } catch (error) {
          console.warn('⚠️ Error adding ICE candidate:', error)
        }
      }
    } catch (error) {
      console.error('❌ Error processing signal:', error)
    }
  }

  // Play remote audio
  playRemoteAudio(stream) {
    try {
      console.log('🔊 Playing remote audio...')
      // Create audio element to play remote stream
      const audio = new Audio()
      audio.srcObject = stream
      audio.play().catch(error => {
        console.error('Error playing remote audio:', error)
      })

      // Store reference for cleanup
      this.remoteAudio = audio
    } catch (error) {
      console.error('Error playing remote audio:', error)
    }
  }

  // Get connection stats
  async getConnectionStats() {
    try {
      if (!this.peerConnection) {
        return null
      }

      const stats = await this.peerConnection.getStats()
      let audioStats = {
        bytesReceived: 0,
        bytesSent: 0,
        packetsLost: 0,
        jitter: 0,
      }

      stats.forEach(report => {
        if (report.type === 'inbound-rtp' && report.kind === 'audio') {
          audioStats.bytesReceived = report.bytesReceived
          audioStats.packetsLost = report.packetsLost || 0
          audioStats.jitter = report.jitter || 0
        }
        if (report.type === 'outbound-rtp' && report.kind === 'audio') {
          audioStats.bytesSent = report.bytesSent
        }
      })

      return audioStats
    } catch (error) {
      console.error('Error getting connection stats:', error)
      return null
    }
  }

  // Toggle audio
  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled
      })
      console.log(`🎤 Audio ${enabled ? 'enabled' : 'muted'}`)
      return true
    }
    return false
  }

  // Check if audio is enabled
  isAudioEnabled() {
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks()
      return audioTracks.length > 0 && audioTracks[0].enabled
    }
    return false
  }

  // Clean up resources
  cleanup() {
    console.log('🧹 Cleaning up WebRTC resources...')

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Stop local stream
    this.stopLocalStream()

    // Stop remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop())
      this.remoteStream = null
    }

    // Stop remote audio playback
    if (this.remoteAudio) {
      this.remoteAudio.pause()
      this.remoteAudio.srcObject = null
      this.remoteAudio = null
    }

    // Unsubscribe from signaling channel
    if (this.signalingChannel) {
      this.signalingChannel.unsubscribe()
      this.signalingChannel = null
    }

    console.log('✅ Cleanup complete')
  }
}

export const webrtcService = new WebRTCService()
