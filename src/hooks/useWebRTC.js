import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { supabase } from '@/lib/supabase';

export function useWebRTC(callId, userId, peerId, isInitiator, callType = 'voice') {
  const peerRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [connectionState, setConnectionState] = useState('disconnected');
  const callRef = useRef(null);
  const channelRef = useRef(null);
  const [actualPeerId, setActualPeerId] = useState(peerId);

  // Get local media stream
  useEffect(() => {
    async function getLocalStream() {
      try {
        console.log('🎤 Requesting media access...');
        
        // Different constraints for voice vs video
        const constraints = callType === 'video' 
          ? {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
            }
          : {
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media stream obtained');
        setLocalStream(stream);
      } catch (err) {
        console.error('❌ Media access error:', err);
        if (err.name === 'NotAllowedError') {
          alert('📹 Camera/microphone permission denied.\n\n1. Check browser settings\n2. Try in normal mode (not Incognito)\n3. Make sure camera/mic aren\'t blocked');
        } else if (err.name === 'NotFoundError') {
          alert('❌ No camera/microphone found on your device');
        } else {
          alert('❌ Media access error: ' + err.message);
        }
      }
    }

    getLocalStream();

    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, [callType]);

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
        const peer = new Peer(userId, {
          host: '0.peerjs.com',
          secure: true,
          port: 443,
          path: '/',
        });

        if (!isActive) return;
        peerRef.current = peer;

        peer.on('open', () => {
          console.log('✅ PeerJS connected, ID:', userId);
          if (isActive) setConnectionState('ready');
          
          // Broadcast our PeerJS ID via Supabase so the other user knows who to call
          const signalChannel = supabase.channel(`call:${callId}`)
          signalChannel
            .send({
              type: 'broadcast',
              event: 'peer_id',
              payload: {
                userId: userId,
                peerJSId: userId,
                isInitiator: isInitiator
              }
            })
            .then(() => console.log('📡 PeerJS ID broadcast'))
            .catch(err => console.error('❌ Error broadcasting PeerJS ID:', err))
        });

        peer.on('error', (err) => {
          console.error('❌ Peer error:', err);
          if (isActive) setConnectionState('error');
        });

        // If initiator, make the call
        if (isInitiator) {
          console.log('📞 Initiating call to:', peerId);
          console.log('   Initiator ID:', userId);
          console.log('   Local stream:', localStream ? '✅ ready' : '❌ missing');
          if (isActive) setConnectionState('connecting');

          // Wait a bit for receiver to connect to PeerJS
          const callAttempt = () => {
            try {
              const call = peer.call(peerId, localStream);
              console.log('📱 peer.call() executed');
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
            } catch (err) {
              console.error('❌ Error making call:', err);
              if (isActive) setConnectionState('error');
            }
          };

          // Try calling immediately, but also retry after 2 seconds in case receiver isn't ready
          callAttempt();
          const retryTimer = setTimeout(callAttempt, 2000);

          return () => clearTimeout(retryTimer);
        } else {
          // Receiver - wait for incoming call
          console.log('📞 Waiting for incoming call...');
          if (isActive) setConnectionState('waiting');

          peer.on('call', (call) => {
            console.log('📞 Incoming call from:', call.peer);
            console.log('📞 Answering call with stream:', localStream ? '✅' : '❌');
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
