import React from 'react';
import { motion } from 'framer-motion';

interface CircularButtonWhiteProps {
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const CircularButtonWhite: React.FC<CircularButtonWhiteProps> = ({ 
  onClick, 
  size = 'md', 
  className = '' 
}) => {
  // Determine dimensions based on size
  let dimensions = '';
  let borderWidth = '';
  
  switch (size) {
    case 'sm':
      dimensions = 'w-12 h-12';
      borderWidth = 'border-[3px]';
      break;
    case 'lg':
      dimensions = 'w-20 h-20';
      borderWidth = 'border-[6px]';
      break;
    case 'md':
    default:
      dimensions = 'w-16 h-16';
      borderWidth = 'border-[5px]';
      break;
  }

  return (
    <motion.button
      className={`relative ${dimensions} ${className}`}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
    >
      <div className={`absolute inset-0 rounded-full bg-white shadow-lg`}></div>
    </motion.button>
  );
};

export default CircularButtonWhite;