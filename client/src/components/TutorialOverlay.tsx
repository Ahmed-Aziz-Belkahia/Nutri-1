import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete?: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // For development: Always show tutorial when entering dashboard
    setShowTutorial(true);
  }, []);

  const handleClose = () => {
    setShowTutorial(false);
    onComplete?.();
  };

  return (
    <AnimatePresence>
      {showTutorial && (
        <>
          {/* Dark overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[100]"
            onClick={handleClose}
          />
          
          {/* Spotlight for + button */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed bottom-[52px] right-[20px] z-[101]"
            style={{
              pointerEvents: 'none'
            }}
          >
            {/* Spotlight circle */}
            <div className="absolute -inset-8 rounded-full bg-transparent" 
              style={{
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                pointerEvents: 'none'
              }}
            />
            
            {/* Pulsing ring animation */}
            <motion.div
              className="absolute -inset-4 rounded-full border-4 border-white/50"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.8, 0, 0.8],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.div>
          
          {/* Tutorial message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ delay: 0.3 }}
            className="fixed bottom-[140px] left-1/2 transform -translate-x-1/2 z-[102] max-w-[280px] text-center"
          >
            <div className="bg-white rounded-2xl p-4 shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Start Tracking Your Meals
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Tap the + button to log your first meal and begin your journey to better nutrition!
              </p>
              <Button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl"
              >
                Got it!
              </Button>
            </div>
            
            {/* Arrow pointing to + button */}
            <svg
              className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-8 h-8 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2 L6 8 L10 8 L10 16 L14 16 L14 8 L18 8 Z" transform="rotate(180 12 12)" />
            </svg>
          </motion.div>
          
          {/* Skip button */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.5 }}
            onClick={handleClose}
            className="fixed top-4 right-4 z-[102] p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>
        </>
      )}
    </AnimatePresence>
  );
}