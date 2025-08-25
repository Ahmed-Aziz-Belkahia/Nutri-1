import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
            className="fixed inset-0 bg-black/70 z-[10000]"
            onClick={handleClose}
          />
          
          {/* Spotlight for + button */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="fixed z-[10001]"
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
        </>
      )}
    </AnimatePresence>
  );
}