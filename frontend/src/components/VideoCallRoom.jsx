import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Send, MessageSquare, Shield, X } from 'lucide-react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../services/api';

export default function VideoCallRoom({ isOpen, onClose, channelName, userName, userRole }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: 'System', text: 'Secure WebRTC clinical connection initialized.', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  // States to hold streams for React rendering and lifecycle
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const canvasAnimationRef = useRef(null);

  // Configuration for public Google STUN servers
  const peerConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Sync state streams with video DOM elements whenever they mount/unmount or stream changes
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoOff]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isConnected]);

  useEffect(() => {
    if (isOpen) {
      initializeCall();
    }

    return () => {
      destroyCall();
    };
  }, [isOpen]);

  // Fail-safe camera getter with canvas fallback if webcam is locked by another window
  const getLocalHardwareStream = async () => {
    try {
      // 1. Try regular camera and mic capture
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err) {
      console.warn("Primary camera is locked or inaccessible. Trying audio-only with animated canvas fallback...", err);
      try {
        // 2. Try audio-only, creating an animated canvas to act as a placeholder video track
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        const canvasStream = canvas.captureStream(25); // 25 FPS video track
        const combinedTracks = [
          ...audioStream.getAudioTracks(),
          ...canvasStream.getVideoTracks()
        ];
        const combinedStream = new MediaStream(combinedTracks);
        
        // Define localStreamRef.current BEFORE calling draw to avoid immediate return inside draw loop
        localStreamRef.current = combinedStream;

        const draw = () => {
          if (!localStreamRef.current) return;
          // Pulse animation matching Q9 Hospital color theme
          ctx.fillStyle = '#0f172a'; // slate-900
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          ctx.beginPath();
          const pulse = 65 + Math.sin(Date.now() / 200) * 15;
          ctx.arc(canvas.width / 2, canvas.height / 2, pulse, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(37, 99, 235, 0.15)'; // light transparent blue
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(canvas.width / 2, canvas.height / 2, 45, 0, Math.PI * 2);
          ctx.fillStyle = '#2563eb'; // solid blue-600
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 20px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText("Microphone Active", canvas.width / 2, canvas.height / 2 + 110);
          
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px sans-serif';
          ctx.fillText("(Camera active in other tab)", canvas.width / 2, canvas.height / 2 + 140);
          
          canvasAnimationRef.current = requestAnimationFrame(draw);
        };
        draw();
        
        return combinedStream;
      } catch (audioErr) {
        console.warn("Audio access denied. Creating standard fallback visual canvas stream...", audioErr);
        // 3. Complete fallback: silent canvas animation
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        const canvasStream = canvas.captureStream(10);
        
        // Define localStreamRef.current BEFORE calling draw to avoid immediate return inside draw loop
        localStreamRef.current = canvasStream;

        const draw = () => {
          if (!localStreamRef.current) return;
          ctx.fillStyle = '#1e293b'; // slate-800
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText("Device Feeds Blocked", canvas.width / 2, canvas.height / 2);
          ctx.fillStyle = '#64748b';
          ctx.font = '14px sans-serif';
          ctx.fillText("Please grant camera/mic permissions.", canvas.width / 2, canvas.height / 2 + 40);
          
          canvasAnimationRef.current = requestAnimationFrame(draw);
        };
        draw();
        
        return canvasStream;
      }
    }
  };

  // Setup WebRTC and signaling listeners
  const initializeCall = async () => {
    try {
      const stream = await getLocalHardwareStream();
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Initialize Socket.IO connection
      const socket = io(SOCKET_URL);
      socketRef.current = socket;

      // Create WebRTC Peer Connection
      const pc = new RTCPeerConnection(peerConfiguration);
      peerConnectionRef.current = pc;

      // Queue to store incoming ICE candidates before setRemoteDescription runs
      const iceCandidatesQueue = [];

      // Add local tracks to peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle receiving remote tracks
      pc.ontrack = (event) => {
        console.log('Received remote media track stream!');
        setRemoteStream(event.streams[0]);
        setIsConnected(true);
      };

      // Send local ICE candidates to peer
      pc.onicecandidate = (event) => {
        if (event.candidate && socketRef.current) {
          socketRef.current.emit('webrtc-ice-candidate', {
            candidate: event.candidate,
            roomId: channelName
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('ICE Connection state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setIsConnected(true);
        } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
          setIsConnected(false);
          setRemoteStream(null);
        }
      };

      // Socket.IO Handshake Listeners
      socket.on('connect', () => {
        console.log('WebRTC client socket registered. Joining room:', channelName);
        socket.emit('join-room', channelName);
      });

      // Handle real-time peer messages
      socket.on('webrtc-chat', ({ msg }) => {
        console.log('Received chat message:', msg);
        setMessages((prev) => [...prev, msg]);
      });

      // Handle peer leaving explicitly
      socket.on('webrtc-left', () => {
        console.log('Peer left the call.');
        setIsConnected(false);
        setRemoteStream(null);
      });

      // Peer joined -> create and send offer
      socket.on('webrtc-ready', async () => {
        console.log('Peer connected. Initiating WebRTC offer...');
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc-offer', { offer, roomId: channelName });
        } catch (err) {
          console.error('Error generating offer:', err);
        }
      });

      // Received offer -> set remote description, flush queued candidates, and answer
      socket.on('webrtc-offer', async ({ offer }) => {
        console.log('Received remote offer...');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc-answer', { answer, roomId: channelName });

          // Flush queued candidates
          while (iceCandidatesQueue.length > 0) {
            const cand = iceCandidatesQueue.shift();
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch (err) {
          console.error('Error answering offer:', err);
        }
      });

      // Received answer -> set remote description and flush queued candidates
      socket.on('webrtc-answer', async ({ answer }) => {
        console.log('Received remote answer...');
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          
          // Flush queued candidates
          while (iceCandidatesQueue.length > 0) {
            const cand = iceCandidatesQueue.shift();
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          }
        } catch (err) {
          console.error('Error processing answer:', err);
        }
      });

      // Received ICE candidate -> add if remote description set, otherwise queue
      socket.on('webrtc-ice-candidate', async ({ candidate }) => {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            iceCandidatesQueue.push(candidate);
          }
        } catch (err) {
          console.error('Error adding/queuing candidate:', err);
        }
      });

    } catch (err) {
      console.error('Handshake failed:', err);
    }
  };

  const destroyCall = () => {
    setIsConnected(false);
    setLocalStream(null);
    setRemoteStream(null);
    if (canvasAnimationRef.current) {
      cancelAnimationFrame(canvasAnimationRef.current);
    }
    if (socketRef.current) {
      socketRef.current.emit('webrtc-left', { roomId: channelName });
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = {
      sender: userName,
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages((prev) => [...prev, msg]);
    setNewMessage('');

    // Send the message over Socket.IO to the other peer if connected
    if (socketRef.current) {
      socketRef.current.emit('webrtc-chat', { msg, roomId: channelName });
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
      }
      return nextMuted;
    });
  };

  const toggleVideo = () => {
    setIsVideoOff((prev) => {
      const nextVideoOff = !prev;
      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = !nextVideoOff;
        });
      }
      return nextVideoOff;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-4">
      {/* Container */}
      <div className="w-full h-full max-w-7xl bg-slate-950 rounded-[2.5rem] border border-slate-800 overflow-hidden flex flex-col md:flex-row relative shadow-2xl">
        
        {/* Main Call View */}
        <div className="flex-1 relative bg-slate-900 flex items-center justify-center overflow-hidden h-full">
          
          {/* Header */}
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center pointer-events-none">
            <div className="bg-slate-955/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 flex items-center gap-2 pointer-events-auto">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white tracking-wide">
                Secure Room: {channelName}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-950/80 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-500 rounded-2xl transition pointer-events-auto cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Remote stream display panel */}
          <div className="w-full h-full relative bg-slate-955 flex items-center justify-center">
            {isConnected && remoteStream ? (
              <>
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-24 left-6 bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-xl border border-blue-500/30 text-[10px] font-black text-white uppercase tracking-wider z-20">
                  {userRole === 'Doctor' ? 'Patient Feed' : 'Doctor Feed'}
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-650 flex items-center justify-center text-white text-4xl font-extrabold border-4 border-slate-850 shadow-xl shadow-blue-500/10 animate-pulse">
                    {userRole === 'Doctor' ? 'P' : 'Dr'}
                  </div>
                  <span className="absolute bottom-1.5 right-1.5 w-5 h-5 bg-yellow-500 border-4 border-slate-950 rounded-full animate-ping"></span>
                </div>
                <div>
                  <h4 className="text-white font-extrabold text-lg">
                    {userRole === 'Doctor' ? 'Waiting for Patient...' : 'Waiting for Doctor to Join...'}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Signaling server open. Establishing WebRTC handshakes...
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Local camera preview */}
          <div className="absolute bottom-6 right-6 w-40 md:w-56 h-28 md:h-36 bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl z-10">
            {localStream && !isVideoOff ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 space-y-1 bg-slate-950">
                <VideoOff className="w-6 h-6" />
                <span className="text-[10px] font-bold uppercase">Video Muted</span>
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-slate-950/65 px-2 py-0.5 rounded text-[9px] font-extrabold text-white uppercase tracking-wider">
              You
            </div>
          </div>

          {/* Toolbar controllers */}
          <div className="absolute bottom-6 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:w-auto z-20 flex justify-center items-center gap-4 bg-slate-950/85 backdrop-blur-md px-6 py-4 rounded-3xl border border-slate-800/80 shadow-2xl">
            {/* Audio Toggle */}
            <button
              onClick={toggleMute}
              className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                isMuted
                  ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Video Toggle */}
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                isVideoOff
                  ? 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
            </button>

            {/* Chat Toggle */}
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                chatOpen
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* End Call */}
            <button
              onClick={onClose}
              className="p-3.5 bg-red-600 hover:bg-red-700 border border-red-650 rounded-2xl text-white transition hover:scale-105 cursor-pointer shadow-lg shadow-red-600/20"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Sidebar Chat Box */}
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 340 }}
              exit={{ opacity: 0, width: 0 }}
              className="bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 flex flex-col h-1/3 md:h-full justify-between"
            >
              <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Live Call Chat
                </span>
                <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-950/40">
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      m.sender === userName ? 'items-end' : 'items-start'
                    }`}
                  >
                    <span className="text-[10px] text-slate-500 font-bold mb-0.5">
                      {m.sender} • {m.time}
                    </span>
                    <div
                      className={`px-3 py-2 rounded-2xl text-xs max-w-[240px] leading-relaxed break-words ${
                        m.sender === 'System'
                          ? 'bg-slate-900 border border-slate-800 text-slate-400 text-center font-mono font-bold'
                          : m.sender === userName
                          ? 'bg-blue-650 text-white rounded-tr-none'
                          : 'bg-slate-850 text-slate-200 rounded-tl-none border border-slate-800/85'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex gap-2 bg-slate-950">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type message..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
                />
                <button
                  type="submit"
                  className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition shadow shadow-blue-500/10 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
