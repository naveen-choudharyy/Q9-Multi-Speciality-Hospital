import React from 'react';
import { Phone, AlertCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function EmergencyBanner() {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="absolute top-20 left-1/2 -translate-x-1/2 z-40 w-full flex justify-center px-4 bg-transparent pointer-events-none font-sans"
      >
        <div className="bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center justify-between gap-6 max-w-lg md:max-w-2xl w-full border border-red-500 hover:bg-red-700 transition-all pointer-events-auto mt-4">
          {/* Left emergency alert */}
          <div className="flex items-center space-x-2 text-xs md:text-sm font-bold">
            <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping flex-shrink-0"></span>
            <AlertCircle className="w-4 h-4 text-white flex-shrink-0" />
            <span className="tracking-wide uppercase text-red-100">24/7 Emergency Ambulance Service:</span>
            <a 
              href="tel:+919257540743" 
              className="hover:underline text-white font-black flex items-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5 inline" />
              <span>+91 9257540743</span>
            </a>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/10 rounded-full transition text-red-100 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}