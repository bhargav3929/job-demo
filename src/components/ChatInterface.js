'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { Send, Paperclip, Bot, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GenerativeMountainScene from '@/components/ui/mountain-scene';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 Hi! I'm your onboarding assistant. I'm here to get you set up for your mock interview. To start, could you please tell me your full name?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      const data = await response.json();

      if (data.redirectUrl) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Great! I've collected everything. Click below to start your interview.`,
          actionLink: data.redirectUrl
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    setMessages(prev => [...prev, { role: 'user', content: `[Uploading ${file.name}...]` }]);

    try {
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (uploadData.fileUrl) {
        const hiddenContent = `[User uploaded resume: ${uploadData.fileUrl}]`;

        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'user', content: `📄 Uploaded resume: ${file.name}` };
          return newMsgs;
        });

        setIsLoading(true);
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: hiddenContent }]
          })
        });
        const data = await response.json();

        if (data.redirectUrl) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Received your resume! I have everything now.`,
            actionLink: data.redirectUrl
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        }

      } else {
        throw new Error('Upload failed: No URL returned');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Failed to process the file. Please try uploading again." }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Generate floating particles
  const particles = Array.from({ length: 20 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: i * 0.5,
    duration: 5 + Math.random() * 3,
    xStart: Math.random() * 200 - 100,
    xEnd: Math.random() * 200 - 100,
  }));

  return (
    <div className="chat-wrapper">
      <Suspense fallback={<div className="mountain-background-fallback" />}>
        <GenerativeMountainScene />
      </Suspense>

      {/* Outer container with animated border */}
      <div className="glass-container-outer">
        {/* Animated rotating border */}
        <motion.div
          className="animated-border"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />

        {/* Inner card */}
        <div className="glass-container">
          {/* Animated background gradient */}
          <motion.div
            className="animated-bg-gradient"
            animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />

          {/* Floating Particles */}
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="floating-particle"
              animate={{
                y: ["0%", "-140%"],
                x: [particle.xStart, particle.xEnd],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: particle.duration,
                repeat: Infinity,
                delay: particle.delay,
                ease: "easeInOut",
              }}
              style={{ left: particle.left }}
            />
          ))}

          {/* Header */}
          <header className="chat-header">
            <div className="header-icon">
              <Bot size={24} />
            </div>
            <div className="header-content">
              <h1>🤖 AI Assistant</h1>
              <div className="status-row">
                <div className="chat-status"></div>
                <span>Online</span>
              </div>
            </div>
          </header>

          {/* Messages */}
          <div className="chat-messages">
            <AnimatePresence>
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`message ${msg.role === 'assistant' ? 'bot' : 'user'}`}
                >
                  {msg.content}
                  {msg.actionLink && (
                    <div className="action-link-container">
                      <a href={msg.actionLink} className="action-link">
                        Start Interview →
                      </a>
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0.6, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="message bot typing-indicator"
                >
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                  <span className="typing-dot"></span>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            <form
              className="input-wrapper"
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,image/*"
              />
              <button
                type="button"
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isLoading}
                title="Upload Resume"
              >
                {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
              </button>

              <input
                type="text"
                className="chat-input"
                placeholder="Type a message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
              />

              <button
                type="submit"
                className="send-btn"
                disabled={!input.trim() || isLoading}
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
