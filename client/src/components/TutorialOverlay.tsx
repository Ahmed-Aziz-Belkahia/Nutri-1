import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface TutorialOverlayProps {
  onComplete?: () => void;
}

export function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [showTutorial, setShowTutorial] = useState(true);

  useEffect(() => {
    // Always show tutorial on mount
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
            className="fixed z-[101]"
            style={{
              bottom: '36px',
              right: '66px',
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