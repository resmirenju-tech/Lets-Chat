import SimplePeer from 'simple-peer'
import { supabase } from '@/lib/supabase'

class WebRTCService {
  constructor() {
    this.peers = {} // Store peer connections by user ID
    this.peerMetadata = {} // Store metadata (callId, etc) for each peer
    this.localStream = null
    this.signalListeners = {}
  }

  // Initialize local audio stream
  async getLocalStream() {
    try {
      if (this.localStream) return this.localStream

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false, // Audio only for now, ready for video later
      })

      console.log('✅ Local stream obtained:', this.localStream)
      return this.localStream
    } catch (error) {
      console.error('Error getting local stream:', error)
      throw error
    }
  }

  // Create peer connection (initiator = true for caller, false for receiver)
  async createPeer(peerId, initiator, currentUserId, callId) {
    try {
      if (!peerId || !currentUserId || !callId) {
        throw new Error('Missing required parameters: peerId, currentUserId, or callId')
      }

      console.log('🔧 Creating peer...')
      const stream = await this.getLocalStream()
      
      if (!stream) {
        throw new Error('Failed to get local stream')
      }

      const peer = new SimplePeer({
        initiator,
        trickleIce: false,
        stream,
        config: {
          iceServers: [
            { urls: ['stun:stun.l.google.com:19302'] },
            { urls: ['stun:stun1.l.google.com:19302'] },
          ],
        },
      })

      // Handle signal event
      peer.on('signal', (data) => {
        try {
          console.log('📡 Signal generated:', data.type)
          this.sendSignal(peerId, currentUserId, callId, data)
        } catch (err) {
          console.error('Error in signal handler:', err)
        }
      })

      // Handle stream event
      peer.on('stream', (remoteStream) => {
        try {
          console.log('🎵 Received remote stream')
          if (this.signalListeners['stream']) {
            this.signalListeners['stream'](remoteStream, peerId)
          }
        } catch (err) {
          console.error('Error in stream handler:', err)
        }
      })

      // Handle errors
      peer.on('error', (error) => {
        console.error('❌ Peer error:', error?.message || error)
        try {
          if (this.signalListeners['error']) {
            this.signalListeners['error'](error, peerId)
          }
        } catch (err) {
          console.error('Error in error handler:', err)
        }
      })

      // Handle connection close
      peer.on('close', () => {
        try {
          console.log('📵 Peer connection closed')
          if (this.signalListeners['close']) {
            this.signalListeners['close'](peerId)
          }
          delete this.peers[peerId]
        } catch (err) {
          console.error('Error in close handler:', err)
        }
      })

      this.peers[peerId] = peer
      this.peerMetadata[peerId] = { callId, currentUserId, peerId }
      console.log('✅ Peer created and metadata stored')
      return peer
    } catch (error) {
      console.error('❌ createPeer error:', error?.message || error)
      throw error
    }
  }

  // Send signal data via Supabase Realtime
  async sendSignal(peerId, currentUserId, callId, signalData) {
    try {
      const channel = supabase.channel(`signal_${callId}`)

      await channel.send({
        type: 'broadcast',
        event: 'webrtc_signal',
        payload: {
          from: currentUserId,
          to: peerId,
          callId,
          data: signalData,
        },
      })

      console.log('📨 Signal sent to:', peerId)
    } catch (error) {
      console.error('Error sending signal:', error)
    }
  }

  // Subscribe to signal events
  subscribeToSignals(callId, callback) {
    try {
      const channel = supabase.channel(`signal_${callId}`)

      channel.on('broadcast', { event: 'webrtc_signal' }, (payload) => {
        console.log('📬 Received signal:', payload.payload)
        callback(payload.payload)
      })

      channel.subscribe()
      return channel
    } catch (error) {
      console.error('Error subscribing to signals:', error)
      return null
    }
  }

  // Handle received signal data
  handleSignal(peerId, signalData) {
    try {
      const peer = this.peers[peerId]
      if (peer) {
        peer.signal(signalData)
        console.log('✅ Signal processed for peer:', peerId)
      } else {
        console.warn('Peer not found:', peerId)
      }
    } catch (error) {
      console.error('Error handling signal:', error)
    }
  }

  // Add event listener for peer events
  on(event, callback) {
    this.signalListeners[event] = callback
  }

  // Close specific peer connection
  closePeer(peerId) {
    try {
      const peer = this.peers[peerId]
      if (peer) {
        peer.destroy()
        delete this.peers[peerId]
        delete this.peerMetadata[peerId]
        console.log('✅ Peer closed:', peerId)
      }
    } catch (error) {
      console.error('Error closing peer:', error)
    }
  }

  // Close all connections
  closeAll() {
    try {
      Object.keys(this.peers).forEach((peerId) => {
        this.closePeer(peerId)
      })
      console.log('✅ All peers closed')
    } catch (error) {
      console.error('Error closing all peers:', error)
    }
  }

  // Stop local stream
  stopLocalStream() {
    try {
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop())
        this.localStream = null
        console.log('✅ Local stream stopped')
      }
    } catch (error) {
      console.error('Error stopping local stream:', error)
    }
  }
}

export const webrtcService = new WebRTCService()
