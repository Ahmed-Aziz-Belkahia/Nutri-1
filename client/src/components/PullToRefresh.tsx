import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const currentY = useRef(0);
  const isDragging = useRef(false);
  const controls = useAnimation();

  const threshold = 70; // Distance to trigger refresh (standard mobile threshold)
  const maxPull = 150; // Maximum pull distance

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if we're at the top of the page
      if (window.scrollY === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        currentY.current = startY.current;
        isDragging.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging.current || isRefreshing) return;

      currentY.current = e.touches[0].clientY;
      const diff = currentY.current - startY.current;

      // Only allow pulling down when at top
      if (diff > 0 && window.scrollY === 0) {
        // Prevent default scrolling behavior
        e.preventDefault();
        
        // Apply resistance (rubber band effect)
        const resistance = 0.4;
        const distance = Math.min(diff * resistance, maxPull);
        
        setPullDistance(distance);
        controls.start({
          y: distance,
          transition: { type: 'spring', stiffness: 300, damping: 30 }
        });
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging.current) return;
      
      isDragging.current = false;

      // Trigger refresh if pulled past threshold
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        
        // Keep at threshold position during refresh
        controls.start({
          y: threshold,
          transition: { type: 'spring', stiffness: 300, damping: 30 }
        });

        try {
          await onRefresh();
        } finally {
          // Snap back to top
          await controls.start({
            y: 0,
            transition: { type: 'spring', stiffness: 300, damping: 25 }
          });
          
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Snap back without refreshing
        controls.start({
          y: 0,
          transition: { type: 'spring', stiffness: 300, damping: 25 }
        });
        setPullDistance(0);
      }
    };

    // Attach to window for proper mobile behavior
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [controls, disabled, isRefreshing, onRefresh, pullDistance, threshold]);

  // Calculate spinner opacity and rotation based on pull distance
  const progress = Math.min(pullDistance / threshold, 1);
  const spinnerScale = progress * 1.2;
  const spinnerRotation = progress * 360;

  return (
    <>
      {/* Pull to refresh indicator - fixed at top */}
      <div 
        className="fixed top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-[9999]"
        style={{ 
          transform: `translateY(${pullDistance > 0 ? pullDistance - 50 : -50}px)`,
          opacity: pullDistance > 10 ? 1 : 0,
          transition: isDragging.current ? 'none' : 'all 0.3s ease'
        }}
      >
        <motion.div
          animate={{ 
            rotate: isRefreshing ? 360 : spinnerRotation,
            scale: spinnerScale
          }}
          transition={{ 
            rotate: isRefreshing 
              ? { duration: 1, repeat: Infinity, ease: "linear" } 
              : { duration: 0 },
            scale: { type: 'spring', stiffness: 300, damping: 20 }
          }}
          className="w-10 h-10 rounded-full bg-white shadow-xl flex items-center justify-center border border-gray-100"
        >
          <Loader2 className={`w-6 h-6 text-[#0CC5BA] ${isRefreshing ? 'animate-spin' : ''}`} />
        </motion.div>
        
        {/* Pull hint text */}
        {pullDistance > 0 && !isRefreshing && (
          <div 
            className="absolute -bottom-8 text-xs text-gray-500 font-medium"
            style={{ opacity: Math.min(pullDistance / threshold, 1) }}
          >
            {pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
          </div>
        )}
      </div>

      {/* Content with pull animation */}
      <motion.div animate={controls} className="min-h-screen">
        {children}
      </motion.div>
    </>
  );
}
