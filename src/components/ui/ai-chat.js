"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Paperclip, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIChatCard({ className }) {
    const [messages, setMessages] = useState([
        { role: "assistant", content: "👋 Hi! am Pragathi. I'm here to get you set up for your mock interview. To start, could you please tell me your full name?" },
    ]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const messagesContainerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Generate floating particles data once
    const [particles, setParticles] = useState([]);

    useEffect(() => {
        setParticles(
            Array.from({ length: 20 }).map((_, i) => ({
                id: i,
                left: `${Math.random() * 100}%`,
                xStart: Math.random() * 200 - 100,
                xEnd: Math.random() * 200 - 100,
                duration: 5 + Math.random() * 3,
                delay: i * 0.5,
            }))
        );
    }, []);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            const { scrollHeight, clientHeight } = messagesContainerRef.current;
            messagesContainerRef.current.scrollTo({
                top: scrollHeight - clientHeight,
                behavior: 'smooth'
            });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = { role: "user", content: input };
        setMessages([...messages, userMessage]);
        setInput("");
        setIsTyping(true);

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage]
                })
            });

            const data = await response.json();

            if (data.redirectUrl) {
                setMessages((prev) => [...prev, {
                    role: "assistant",
                    content: "Great! I've collected everything. Click below to start your interview.",
                    actionLink: data.redirectUrl
                }]);
            } else {
                setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
            }

        } catch (error) {
            console.error('Error sending message:', error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
        } finally {
            setIsTyping(false);
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

                setIsTyping(true);
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
            setIsTyping(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className={cn("ai-chat-outer", className)}>
            {/* Animated Outer Border */}
            <motion.div
                className="ai-chat-animated-border"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Inner Card */}
            <div className="ai-chat-card">
                {/* Inner Animated Background */}
                <motion.div
                    className="ai-chat-bg-gradient"
                    animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                />

                {/* Floating Particles */}
                {particles.map((particle) => (
                    <motion.div
                        key={particle.id}
                        className="ai-chat-particle"
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
                <div className="ai-chat-header">
                    <h2>👋 Welcome</h2>
                </div>

                {/* Messages */}
                <div className="ai-chat-messages" ref={messagesContainerRef}>
                    <AnimatePresence>
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className={cn(
                                    "ai-chat-message",
                                    msg.role === "assistant" ? "ai-message" : "user-message"
                                )}
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
                    </AnimatePresence>

                    {/* AI Typing Indicator */}
                    {isTyping && (
                        <motion.div
                            className="ai-chat-typing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0, 1, 0.6, 1] }}
                            transition={{ repeat: Infinity, duration: 1.2 }}
                        >
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                            <span className="typing-dot"></span>
                        </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="ai-chat-input-area">
                    {/* Hidden file input */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,image/*"
                    />

                    {/* Attachment button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading || isTyping}
                        className="ai-chat-attach-btn"
                        title="Upload Resume"
                    >
                        {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
                    </button>

                    <input
                        className="ai-chat-input"
                        placeholder="Type a message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        disabled={isTyping}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                        className="ai-chat-send-btn"
                    >
                        <Send size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
