import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/use-auth';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'text' | 'quick-reply' | 'card';
}

interface QuickAction {
  label: string;
  icon: string;
  message: string;
}

// Animated typing dots component
const TypingIndicator = () => (
  <motion.div 
    className="flex items-center gap-1 px-4 py-3"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
  >
    <div className="flex items-center gap-1 bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-emerald-400 rounded-full"
          animate={{
            y: [0, -6, 0],
            opacity: [0.5, 1, 0.5]
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  </motion.div>
);

// Floating bubble component
const FloatingBubble = ({ 
  onClick, 
  unreadCount, 
  isOpen 
}: { 
  onClick: () => void; 
  unreadCount: number;
  isOpen: boolean;
}) => {
  const handleClick = () => {
    // Trigger haptic feedback on mobile if available
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
    onClick();
  };

  return (
    <motion.button
      onClick={handleClick}
      aria-label="Open AI Nutrition Coach chat"
      className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)',
        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.4)'
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      animate={{
        scale: isOpen ? 0 : 1,
        opacity: isOpen ? 0 : 1
    }}
    transition={{ type: "spring", stiffness: 400, damping: 20 }}
  >
    {/* Breathing animation overlay */}
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)'
      }}
      animate={{
        scale: [1, 1.05, 1],
        opacity: [0.3, 0.5, 0.3]
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
    
    {/* AI Icon */}
    <motion.svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className="relative z-10"
      animate={{
        rotate: [0, 5, -5, 0]
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2Z"
        fill="white"
        fillOpacity="0.2"
      />
      <path
        d="M12 6C9.79 6 8 7.79 8 10V11C8 11.55 8.45 12 9 12H15C15.55 12 16 11.55 16 11V10C16 7.79 14.21 6 12 6Z"
        fill="white"
      />
      <circle cx="10" cy="9" r="1" fill="#10B981" />
      <circle cx="14" cy="9" r="1" fill="#10B981" />
      <path
        d="M9 14C9 14 10 16 12 16C14 16 15 14 15 14"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 16V18"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9 18H15"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </motion.svg>
    
    {/* Unread badge */}
    <AnimatePresence>
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </motion.div>
      )}
    </AnimatePresence>
  </motion.button>
  );
};

// Message bubble component
const MessageBubble = ({ message, isLast }: { message: Message; isLast: boolean }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <motion.div 
          className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mr-2 flex-shrink-0"
          animate={isLast ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          <span className="text-white text-sm">🥗</span>
        </motion.div>
      )}
      
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl ${
          isUser
            ? 'bg-emerald-500 text-white rounded-br-sm'
            : 'bg-white/10 backdrop-blur-sm text-white rounded-bl-sm'
        }`}
        style={{
          boxShadow: isUser 
            ? '0 2px 10px rgba(16, 185, 129, 0.3)'
            : '0 2px 10px rgba(0, 0, 0, 0.1)'
        }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-emerald-100' : 'text-white/50'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
};

// Quick action buttons
const QuickActions = ({ 
  actions, 
  onSelect 
}: { 
  actions: QuickAction[]; 
  onSelect: (message: string) => void;
}) => (
  <motion.div 
    className="flex flex-wrap gap-2 px-4 pb-3"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.2 }}
  >
    {actions.map((action, index) => (
      <motion.button
        key={index}
        onClick={() => onSelect(action.message)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium hover:bg-white/20 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 * index }}
      >
        <span>{action.icon}</span>
        <span>{action.label}</span>
      </motion.button>
    ))}
  </motion.div>
);

// Main Chat Component
export const AINutritionCoach: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Quick actions based on current context
  const quickActions: QuickAction[] = [
    { label: t('aiCoach.quickActions.logMeal', 'Log meal'), icon: '🍽️', message: t('aiCoach.messages.logMeal', 'I want to log a meal') },
    { label: t('aiCoach.quickActions.todayProgress', "Today's progress"), icon: '📊', message: t('aiCoach.messages.todayProgress', "What's my progress today?") },
    { label: t('aiCoach.quickActions.mealIdeas', 'Meal ideas'), icon: '💡', message: t('aiCoach.messages.mealIdeas', 'Give me some meal suggestions') },
    { label: t('aiCoach.quickActions.nutritionTip', 'Nutrition tip'), icon: '🎓', message: t('aiCoach.messages.nutritionTip', 'Share a nutrition tip with me') },
  ];
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);
  
  // Initial greeting when first opened
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (isOpen && messages.length === 0 && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const greeting = getTimeBasedGreeting();
      addAssistantMessage(greeting);
    }
  }, [isOpen, messages.length]);
  
  // Clear unread when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);
  
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    const userName = user?.email?.split('@')[0] || '';
    
    if (hour < 12) {
      return t('aiCoach.greetings.morning', `Good morning${userName ? `, ${userName}` : ''}! 🌅 Ready to start your healthy day? I'm here to help with anything nutrition-related.`);
    } else if (hour < 17) {
      return t('aiCoach.greetings.afternoon', `Good afternoon${userName ? `, ${userName}` : ''}! ☀️ How can I help with your nutrition goals today?`);
    } else {
      return t('aiCoach.greetings.evening', `Good evening${userName ? `, ${userName}` : ''}! 🌙 Let's review your day or plan for tomorrow. What would you like to know?`);
    }
  };
  
  const addAssistantMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };
  
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isTyping) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsTyping(true);
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      // Build conversation history from messages (excluding the new user message that hasn't been processed yet)
      const conversationHistory = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-10) // Keep last 10 messages for context
        .map(m => ({ role: m.role, content: m.content }));
      
      const response = await fetch('/api/ai-coach/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          message: content.trim().slice(0, 2000), // Enforce max length on client too
          language: i18n.language,
          conversationHistory
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      const data = await response.json();
      
      // Simulate typing delay for natural feel (based on response length)
      const typingDelay = Math.min(Math.max(data.response.length * 5, 300), 1500);
      await new Promise(resolve => setTimeout(resolve, typingDelay));
      
      addAssistantMessage(data.response);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('AI Coach error:', error);
      
      // Check if it was a timeout/abort
      if (error instanceof Error && error.name === 'AbortError') {
        addAssistantMessage(t('aiCoach.errors.timeout', "The request took too long. Please try again with a shorter message. ⏱️"));
      } else {
        addAssistantMessage(t('aiCoach.errors.generic', "Sorry, I'm having trouble connecting right now. Please try again in a moment. 🙏"));
      }
    } finally {
      setIsTyping(false);
    }
  }, [i18n.language, t, messages, isTyping]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      // Blur input to dismiss keyboard on mobile
      inputRef.current?.blur();
      sendMessage(inputValue);
    }
  };
  
  const handleQuickAction = (message: string) => {
    // Blur input to dismiss keyboard on mobile
    inputRef.current?.blur();
    sendMessage(message);
  };

  return (
    <>
      {/* Floating Bubble */}
      <FloatingBubble 
        onClick={() => setIsOpen(true)} 
        unreadCount={unreadCount}
        isOpen={isOpen}
      />
      
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Chat Container */}
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] flex flex-col"
              style={{
                background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.98) 0%, rgba(17, 24, 39, 0.99) 100%)',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.3)'
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"
                    animate={{ 
                      boxShadow: ['0 0 0 0 rgba(16, 185, 129, 0.4)', '0 0 0 8px rgba(16, 185, 129, 0)', '0 0 0 0 rgba(16, 185, 129, 0)']
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <span className="text-lg">🥗</span>
                  </motion.div>
                  <div>
                    <h3 className="text-white font-semibold">
                      {t('aiCoach.title', 'NutriAI Coach')}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <motion.div 
                        className="w-2 h-2 rounded-full bg-emerald-400"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-xs text-white/60">
                        {t('aiCoach.status', 'Online • Ready to help')}
                      </span>
                    </div>
                  </div>
                </div>
                
                <motion.button
                  onClick={() => setIsOpen(false)}
                  aria-label={t('aiCoach.close', 'Close chat')}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
              
              {/* Messages Area */}
              <div 
                className="flex-1 overflow-y-auto px-4 py-4 min-h-[300px] max-h-[50vh]"
                role="log"
                aria-live="polite"
                aria-label={t('aiCoach.messagesArea', 'Chat messages')}
              >
                {messages.map((message, index) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message} 
                    isLast={index === messages.length - 1}
                  />
                ))}
                
                {isTyping && <TypingIndicator />}
                
                <div ref={messagesEndRef} />
              </div>
              
              {/* Quick Actions */}
              {messages.length <= 1 && !isTyping && (
                <QuickActions actions={quickActions} onSelect={handleQuickAction} />
              )}
              
              {/* Input Area - with safe area for iOS */}
              <form 
                onSubmit={handleSubmit}
                className="px-4 pt-3 border-t border-white/10"
                style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={t('aiCoach.placeholder', 'Ask me anything about nutrition...')}
                      className="w-full px-4 py-3 rounded-full bg-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      disabled={isTyping}
                    />
                  </div>
                  
                  <motion.button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="w-11 h-11 rounded-full bg-emerald-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AINutritionCoach;
