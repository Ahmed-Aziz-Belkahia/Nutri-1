import React from 'react';
import { motion } from 'framer-motion';

interface CircularButtonTealProps {
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  borderColor?: string;
}

const CircularButtonTeal: React.FC<CircularButtonTealProps> = ({ 
  onClick, 
  size = 'md', 
  className = '',
  borderColor = '#0CC5BA'
}) => {
  // Determine dimensions based on size
  let dimensions = '';
  let borderWidth = '';
  
  switch (size) {
    case 'sm':
      dimensions = 'w-12 h-12';
      borderWidth = 'border-2';
      break;
    case 'lg':
      dimensions = 'w-20 h-20';
      borderWidth = 'border-4';
      break;
    case 'md':
    default:
      dimensions = 'w-16 h-16';
      borderWidth = 'border-3';
      break;
  }

  return (
    <motion.button
      className={`relative ${dimensions} ${className}`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div 
        className={`absolute inset-0 rounded-full ${borderWidth} border-[#0CC5BA]`}
        style={{ 
          background: 'transparent'
        }}
      ></div>
    </motion.button>
  );
};

export default CircularButtonTeal;