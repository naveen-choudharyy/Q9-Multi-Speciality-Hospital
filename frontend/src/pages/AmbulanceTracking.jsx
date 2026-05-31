import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Phone, Clock, Navigation, MapPin } from 'lucide-react';

export default function AmbulanceTracking() {
  const [socket, setSocket] = useState(null);
  const [ambulanceData, setAmbulanceData] = useState(null);
  const [arrivalMessage, setArrivalMessage] = useState('');
  const [trackingActive, setTrackingActive] = useState(false);

  useEffect(() => {
    // Connect to websocket gateway
    const socketClient = io(SOCKET_URL);
    setSocket(socketClient);

    socketClient.on('connect', () => {
      console.log('Socket connected on tracking page');
      // Join tracking room
      socketClient.emit('join-room', 'ambulance_tracking');
    });

    socketClient.on('ambulance-location-update', (data) => {
      setAmbulanceData(data);
      setTrackingActive(true);
    });

    socketClient.on('ambulance-arrival', (data) => {
      setArrivalMessage(data.message);
      setTrackingActive(false);
    });

    return () => {
      socketClient.disconnect();
    };
  }, []);

  const triggerSimulation = () => {
    if (!socket) return;
    setArrivalMessage('');
    setAmbulanceData(null);
    socket.emit('start-ambulance-simulation');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Title */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent flex items-center space-x-2">
              <Navigation className="w-8 h-8 text-red-500 animate-pulse" />
              <span>Real-Time Ambulance Dispatch</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Socket.IO WebSockets stream live ambulance GPS coordinates directly to your browser panel.
            </p>
          </div>
          <button
            onClick={triggerSimulation}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-500/20 text-sm transition"
          >
            Dispatch Ambulance Simulation
          </button>
        </div>

        {arrivalMessage && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-center font-bold text-sm">
            🎉 {arrivalMessage}
          </div>
        )}

        {/* Layout split: Map and Driver stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Simulated Map Visualizer Grid */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[400px] flex flex-col justify-between shadow-md relative">
            {/* Grid overlay map representation */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35"></div>

            {/* Hospital location point */}
            <div className="absolute top-[80%] left-[50%] -translate-x-1/2 -translate-y-1/2 text-center z-10">
              <div className="p-2.5 bg-blue-600 rounded-full inline-block border border-blue-400 animate-bounce">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-[10px] font-black bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-blue-400 block mt-1 uppercase">Q9 HOSPITAL</span>
            </div>

            {/* Simulated Ambulance location point */}
            {ambulanceData && trackingActive && (
              <motion.div 
                animate={{ 
                  // Shift position based on lat/lng coordinate offset simulated route progress
                  x: `${(ambulanceData.position.lng - 77.5746) * 1000 - 30}px`,
                  y: `${(12.9916 - ambulanceData.position.lat) * 2000 + 40}px`
                }}
                transition={{ duration: 1 }}
                className="absolute z-20"
              >
                <div className="p-2.5 bg-red-600 rounded-full inline-block border border-red-400 ring-4 ring-red-500/20">
                  <Navigation className="w-5 h-5 text-white transform rotate-45" />
                </div>
                <span className="text-[10px] font-black bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-red-400 block mt-1 uppercase">AMBULANCE</span>
              </motion.div>
            )}

            {/* Background elements */}
            {!trackingActive && !arrivalMessage && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 z-10">
                <AlertCircle className="w-12 h-12 text-slate-700" />
                <div>
                  <h4 className="font-bold text-sm text-slate-400">Ready to Dispatch</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-[250px] mx-auto">
                    Click dispatch ambulance to start streaming simulated GPS feeds.
                  </p>
                </div>
              </div>
            )}
            
            <div className="bg-slate-950 p-4 border-t border-slate-850 z-10 flex justify-between items-center text-xs text-slate-500">
              <span>LATITUDE / LONGITUDE SIMULATOR</span>
              <span>GRID SYSTEM</span>
            </div>
          </div>

          {/* Side status panel */}
          <div className="lg:col-span-1 space-y-6">
            
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md space-y-6">
              <h3 className="text-lg font-bold text-slate-200 border-b border-slate-800 pb-3">Active Dispatch details</h3>

              {ambulanceData ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">AMBULANCE UNIT</span>
                    <p className="text-base font-black text-slate-200">{ambulanceData.ambulanceId}</p>
                  </div>

                  <div className="space-y-1 border-t border-slate-850 pt-3">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">PARAMEDICAL DISPATCHER</span>
                    <p className="text-sm font-semibold text-slate-300 flex items-center space-x-1.5">
                      <span>{ambulanceData.driverName}</span>
                    </p>
                    <span className="text-xs text-slate-400 flex items-center space-x-1 mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{ambulanceData.phone}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">ETA</span>
                      <p className="text-lg font-black text-red-400 mt-1 flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{ambulanceData.eta}</span>
                      </p>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <span className="text-[9px] text-slate-500 font-bold block uppercase">COORDINATES</span>
                      <p className="text-[10px] font-mono text-slate-300 mt-2 truncate">
                        {ambulanceData.position.lat.toFixed(4)}, {ambulanceData.position.lng.toFixed(4)}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-500">No active tracking dispatch feed. Click 'Dispatch Ambulance' to start stream.</p>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
