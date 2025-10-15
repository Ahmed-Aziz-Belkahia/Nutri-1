import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  disabled?: boolean;
}

export default function PullToRefresh({ onRefresh, children, disabled = false }: PullToRefreshProps) {
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();

  const threshold = 80; // Distance to trigger refresh
  const maxPull = 120; // Maximum pull distance

  useEffect(() => {
    const container = containerRef.current;
    if (!container || disabled) return;

    let isTouching = false;
    let startScrollTop = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start if we're at the top of the scroll
      if (container.scrollTop === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        startScrollTop = container.scrollTop;
        isTouching = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTouching || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      // Only pull down if at top and pulling down
      if (diff > 0 && container.scrollTop === 0) {
        e.preventDefault();
        setIsPulling(true);
        
        // Apply easing to pull distance
        const easedDiff = Math.min(diff * 0.5, maxPull);
        setPullDistance(easedDiff);
        
        controls.start({
          y: easedDiff,
          transition: { duration: 0 }
        });
      }
    };

    const handleTouchEnd = async () => {
      if (!isTouching) return;
      
      isTouching = false;
      setIsPulling(false);

      if (pullDistance >= threshold && !isRefreshing) {
        // Trigger refresh
        setIsRefreshing(true);
        
        // Animate to refresh position
        await controls.start({
          y: threshold,
          transition: { duration: 0.2 }
        });

        try {
          await onRefresh();
        } finally {
          // Animate back
          await controls.start({
            y: 0,
            transition: { duration: 0.3 }
          });
          
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        // Snap back
        controls.start({
          y: 0,
          transition: { duration: 0.3 }
        });
        setPullDistance(0);
      }
    };

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [controls, disabled, isRefreshing, onRefresh, pullDistance, threshold]);

  const spinnerOpacity = Math.min(pullDistance / threshold, 1);
  const spinnerRotation = (pullDistance / threshold) * 180;

  return (
    <div 
      ref={containerRef}
      className="relative h-full overflow-y-auto overscroll-none"
      style={{ 
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y'
      }}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center pointer-events-none z-50"
        style={{ 
          height: `${Math.max(pullDistance, 0)}px`,
          opacity: spinnerOpacity
        }}
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ 
            scale: spinnerOpacity,
            rotate: isRefreshing ? 360 : spinnerRotation
          }}
          transition={{ 
            rotate: isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : { duration: 0 }
          }}
          className="w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center"
        >
          <Loader2 className="w-5 h-5 text-[#0CC5BA]" />
        </motion.div>
      </div>

      {/* Content */}
      <motion.div animate={controls}>
        {children}
      </motion.div>
    </div>
  );
}
