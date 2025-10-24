import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { supabase } from '@/lib/supabase';

export function useWebRTC(callId, userId, peerId, isInitiator) {
  const peerRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const callRef = useRef(null);
  const channelRef = useRef(null);
  const sessionIdRef = useRef(null);

  // Generate unique session ID on mount
  if (!sessionIdRef.current) {
    sessionIdRef.current = `${userId}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🆔 Generated session ID:', sessionIdRef.current);
  }

  // Get local media stream
  useEffect(() => {
    async function getLocalStream() {
      try {
        console.log('🎤 Requesting media access...');
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        console.log('✅ Media stream obtained');
        setLocalStream(stream);
      } catch (err) {
        console.error('❌ Media access error:', err);
        alert('Please allow access to camera and microphone');
      }
    }

    getLocalStream();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  // Setup PeerJS connection
  useEffect(() => {
    if (!localStream || !callId || !userId || !peerId) {
      console.log('⏳ Waiting for:', { localStream: !!localStream, callId, userId, peerId });
      return;
    }

    let isActive = true;

    const setupPeer = async () => {
      if (!isActive) return;
      
      try {
        console.log('🔧 Creating PeerJS connection...');

        // Create Peer instance (PeerJS handles WebRTC signaling internally)
        const peer = new Peer(sessionIdRef.current, {
          host: '0.peerjs.com',
          secure: true,
          port: 443,
          path: '/',
        });

        if (!isActive) return;
        peerRef.current = peer;

        peer.on('open', () => {
          console.log('✅ PeerJS connected, ID:', sessionIdRef.current);
          if (isActive) setConnectionState('ready');
        });

        peer.on('error', (err) => {
          console.error('❌ Peer error:', err);
          if (isActive) setConnectionState('error');
        });

        // If initiator, make the call
        if (isInitiator) {
          console.log('📞 Initiating call to:', peerId);
          if (isActive) setConnectionState('connecting');

          const call = peer.call(peerId, localStream);
          callRef.current = call;

          call.on('stream', (remoteStream) => {
            console.log('🎬 Received remote stream');
            if (isActive) {
              setRemoteStream(remoteStream);
              setConnectionState('connected');
            }
          });

          call.on('close', () => {
            console.log('📵 Call closed');
            if (isActive) setConnectionState('disconnected');
          });

          call.on('error', (err) => {
            console.error('❌ Call error:', err);
            if (isActive) setConnectionState('error');
          });
        } else {
          // Receiver - wait for incoming call
          console.log('📞 Waiting for incoming call...');
          if (isActive) setConnectionState('waiting');

          peer.on('call', (call) => {
            console.log('📞 Incoming call from:', call.peer);
            if (isActive) setConnectionState('connecting');

            // Answer the call
            call.answer(localStream);
            callRef.current = call;

            call.on('stream', (remoteStream) => {
              console.log('🎬 Received remote stream');
              if (isActive) {
                setRemoteStream(remoteStream);
                setConnectionState('connected');
              }
            });

            call.on('close', () => {
              console.log('📵 Call closed');
              if (isActive) setConnectionState('disconnected');
            });

            call.on('error', (err) => {
              console.error('❌ Call error:', err);
              if (isActive) setConnectionState('error');
            });
          });
        }

        console.log('✅ Peer setup complete');
      } catch (error) {
        console.error('❌ Setup error:', error);
        if (isActive) setConnectionState('error');
      }
    };

    setupPeer();

    return () => {
      console.log('🧹 Cleaning up peer...');
      isActive = false;
      try {
        if (callRef.current) {
          callRef.current.close();
        }
        if (peerRef.current) {
          peerRef.current.disconnect();
          peerRef.current.destroy();
        }
      } catch (err) {
        console.error('Error during cleanup:', err);
      }
    };
  }, [localStream, callId, userId, peerId, isInitiator]);

  return {
    localStream,
    remoteStream,
    connectionState,
    peer: peerRef.current,
  };
}
