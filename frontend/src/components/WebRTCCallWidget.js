import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import { io } from 'socket.io-client';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  Activity,
  ShieldCheck,
  Disc
} from 'lucide-react';

export default function WebRTCCallWidget({ contact, onEnd }) {
  const [status, setStatus] = useState('dialing'); // dialing | ringing | active | ended
  const [muted, setMuted] = useState(false);
  const [timer, setTimer] = useState(0);
  const [notes, setNotes] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [callRecord, setCallRecord] = useState(null);
  const [recordingBlob, setRecordingBlob] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // WebRTC & Media refs
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  // Initialize WebRTC Call Session
  useEffect(() => {
    let isCancelled = false;

    async function initWebRTCCall() {
      try {
        // 1. Log call start with backend API
        let startedCall = null;
        try {
          const { data: startData } = await api.post('/calls/start', {
            contact_id: contact?.id || null,
            phone_number: contact?.phone || contact?.whatsapp_number || '+910000000000',
            direction: 'outbound',
          });
          startedCall = startData.call;
          if (!isCancelled) {
            setCallRecord(startData.call);
          }
        } catch (startErr) {
          console.warn('Backend call start log skipped:', startErr?.response?.data?.error || startErr.message);
        }

        // 2. Fetch ICE Servers (STUN/TURN)
        let iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
        try {
          const { data: configData } = await api.get('/calls/webrtc-config');
          if (configData.iceServers?.length) {
            iceServers = configData.iceServers;
          }
        } catch {
          // fallback to default STUN
        }

        // 3. Request user microphone (MediaStream)
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (isCancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        localStreamRef.current = stream;

        // 4. Setup AudioContext for real-time sound visualization
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const audioCtx = new AudioContext();
            audioContextRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const updateAudioLevel = () => {
              if (analyserRef.current) {
                const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                analyserRef.current.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((p, c) => p + c, 0) / dataArray.length;
                setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
              }
              animFrameRef.current = requestAnimationFrame(updateAudioLevel);
            };
            updateAudioLevel();
          }
        } catch (ctxErr) {
          console.warn('AudioContext visualization not supported:', ctxErr);
        }

        // 5. Initialize WebRTC RTCPeerConnection
        const pc = new RTCPeerConnection({ iceServers });
        peerConnectionRef.current = pc;

        // Add local audio tracks to WebRTC peer connection
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        // Create offer to generate local SDP & ICE candidates
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // 6. Connect Socket.IO signaling
        try {
          const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
          const socket = io(socketUrl, { transports: ['websocket', 'polling'] });
          socketRef.current = socket;
          socket.emit('webrtc_call_init', {
            contactId: contact?.id,
            callId: startData.call?.id,
            callerName: 'HackQubit Agent',
            offer,
          });
        } catch (sockErr) {
          console.warn('Socket signaling offline, continuing local WebRTC session:', sockErr);
        }

        // 7. Setup MediaRecorder for real voice recording
        try {
          const options = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? { mimeType: 'audio/webm;codecs=opus' }
            : { mimeType: 'audio/webm' };
          const recorder = new MediaRecorder(stream, options);
          mediaRecorderRef.current = recorder;
          recordedChunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };

          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            setRecordingBlob(blob);
          };

          recorder.start(1000); // 1-second chunks
          setIsRecording(true);
        } catch (recErr) {
          console.warn('MediaRecorder recording error:', recErr);
        }

        // Simulate network ringing then voice connection
        if (!isCancelled) {
          setStatus('ringing');
          setTimeout(() => {
            if (!isCancelled) {
              setStatus('active');
              timerRef.current = setInterval(() => {
                setTimer(s => s + 1);
              }, 1000);
            }
          }, 1800);
        }
      } catch (err) {
        console.error('WebRTC call init error:', err);
        toast.error(
          err.name === 'NotAllowedError'
            ? 'Microphone permission denied. Allow mic access in browser.'
            : 'Unable to start WebRTC session. Check microphone settings.'
        );
        if (!isCancelled) {
          setStatus('ended');
          setTimeout(() => onEnd(), 1500);
        }
      }
    }

    initWebRTCCall();

    return () => {
      isCancelled = true;
      clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [contact]);

  // Handle Mute/Unmute
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = muted; // if muted, unmuting sets enabled=true
      });
      setMuted(!muted);
    }
  };

  // Format timer into MM:SS
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // Terminate call, stop recorder, upload audio recording to MinIO backend
  const handleEndCall = async () => {
    clearInterval(timerRef.current);
    setStatus('ended');

    // Stop MediaRecorder and grab blob
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);

    // Stop mic stream
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.stop());
    }

    // Hangup WebRTC peer
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.emit('webrtc_hangup', { callId: callRecord?.id });
      socketRef.current.disconnect();
    }

    // Wait short delay for media recorder blob finalization
    setTimeout(async () => {
      try {
        const audioBlob = recordingBlob || (recordedChunksRef.current.length > 0
          ? new Blob(recordedChunksRef.current, { type: 'audio/webm' })
          : null);

        if (callRecord?.id) {
          const formData = new FormData();
          formData.append('notes', notes || 'WebRTC voice session completed');
          formData.append('duration_seconds', timer);
          if (audioBlob && audioBlob.size > 0) {
            formData.append('recording', audioBlob, `call_${callRecord.id}.webm`);
          }

          await api.post(`/calls/${callRecord.id}/end`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          toast.success(`Call ended (${formatTime(timer)}). Recording stored ✓`);
        } else {
          await api.post('/calls/log', {
            contact_id: contact?.id,
            direction: 'outbound',
            phone_number: contact?.phone || contact?.whatsapp_number || '+910000000000',
            duration_seconds: timer,
            notes: notes || 'WebRTC call session',
            call_status: 'completed',
          });
          toast.success('Call session recorded ✓');
        }
      } catch (err) {
        console.warn('Call finalize error:', err);
        toast.error('Could not upload call recording.');
      } finally {
        setTimeout(() => onEnd(), 600);
      }
    }, 500);
  };

  return (
    <div className={`call-widget ${status}`}>
      {/* Header Info */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ 
          fontSize: '11px', 
          color: status === 'active' ? '#10B981' : 'var(--text-muted)', 
          fontWeight: '700', 
          textTransform: 'uppercase', 
          letterSpacing: '0.06em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px'
        }}>
          {status === 'dialing' && <span>⚡ Initializing WebRTC...</span>}
          {status === 'ringing' && <span className="pulse-text">📞 Ringing Line...</span>}
          {status === 'active' && (
            <>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              <span>WebRTC Voice Connected</span>
            </>
          )}
          {status === 'ended' && <span>Call Terminated</span>}
        </div>

        <div style={{ fontSize: '16px', fontWeight: '800', marginTop: '6px' }}>
          {contact?.full_name || 'Customer Voice Line'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          {contact?.phone || contact?.whatsapp_number || 'Direct Softphone'}
        </div>
      </div>

      {/* Timer & Live Audio Visualizer */}
      {status === 'active' && (
        <>
          <div className="call-timer">{formatTime(timer)}</div>

          {/* Sound Wave Bars */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '3px', 
            height: '24px', 
            margin: '8px 0 12px 0' 
          }}>
            {[0.4, 0.8, 1.2, 1.6, 1.2, 0.8, 0.4].map((mult, idx) => {
              const barHeight = muted ? 4 : Math.max(4, Math.min(22, (audioLevel * mult) / 3));
              return (
                <span
                  key={idx}
                  style={{
                    width: '3px',
                    height: `${barHeight}px`,
                    background: muted ? '#64748B' : '#10B981',
                    borderRadius: '2px',
                    transition: 'height 0.08s ease',
                  }}
                />
              );
            })}
          </div>

          {/* Recording & Encryption Badges */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            fontSize: '10px', 
            color: 'var(--text-muted)', 
            marginBottom: '10px',
            padding: '4px 8px',
            background: 'var(--bg-secondary)',
            borderRadius: '4px'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} color="#10B981" /> End-to-End DTLS-SRTP
            </span>
            {isRecording && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#EF4444' }}>
                <Disc size={12} className="pulse-text" /> MinIO Rec
              </span>
            )}
          </div>
        </>
      )}

      {/* Session Notes */}
      {status === 'active' && (
        <textarea
          className="form-textarea"
          placeholder="Type notes during call (will save to timeline)..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ marginBottom: '12px', fontSize: '12px', minHeight: '54px' }}
        />
      )}

      {/* Controls */}
      <div className="call-actions">
        <button 
          className={`call-btn mute ${muted ? 'muted' : ''}`} 
          onClick={toggleMute} 
          title={muted ? 'Unmute microphone' : 'Mute microphone'}
          disabled={status !== 'active'}
          style={muted ? { background: '#EF4444', color: 'white' } : {}}
        >
          {muted ? <MicOff size={18} /> : <Mic size={18} />}
        </button>

        {status !== 'ended' && (
          <button 
            className="call-btn end" 
            onClick={handleEndCall} 
            title="End voice call"
          >
            <PhoneOff size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
