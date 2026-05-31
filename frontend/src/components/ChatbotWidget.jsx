import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, AlertTriangle } from 'lucide-react';
import api from '../services/api';

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! I am your Q9 AI Health Assistant. Ask me about symptoms, scheduling, or basic medical guidance.", sender: "bot" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { text: userMsg, sender: "user" }]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ml/chatbot', { message: userMsg });
      setMessages((prev) => [...prev, { text: response.data.reply, sender: "bot" }]);
    } catch (err) {
      setMessages((prev) => [...prev, { text: "Sorry, I am having trouble connecting to the clinical services. Please try again later.", sender: "bot" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="w-80 md:w-96 h-[450px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-700 p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-2">
                <Bot className="w-6 h-6 text-blue-200" />
                <div>
                  <h4 className="font-semibold text-sm">Clinical Assistant</h4>
                  <span className="text-xs text-blue-200/80">AI Symptom Guidance</span>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-blue-100 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat list */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
              {messages.map((m, idx) => (
                <div key={idx} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                    m.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : m.text.includes("⚠️")
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-none'
                        : 'bg-slate-800 text-slate-200 rounded-tl-none'
                  }`}>
                    {m.text.includes("⚠️") && (
                      <div className="flex items-center space-x-1.5 mb-1 text-red-400 font-semibold">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Emergency Warning</span>
                      </div>
                    )}
                    <p>{m.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 rounded-2xl rounded-tl-none px-4 py-2 text-sm text-slate-400">
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Warning note */}
            <div className="bg-slate-900 border-t border-slate-800/80 p-2 text-[10px] text-slate-500 text-center flex items-center justify-center space-x-1">
              <span>This chatbot does not replace professional medical evaluations.</span>
            </div>

            {/* Footer input */}
            <form onSubmit={handleSend} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-slate-800/70 border border-slate-700/80 rounded-lg px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Ask clinical helper..."
              />
              <button 
                type="submit"
                className="p-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white shadow-md transition"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-full shadow-2xl flex items-center justify-center focus:outline-none ring-4 ring-blue-500/20"
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>
    </div>
  );
}
