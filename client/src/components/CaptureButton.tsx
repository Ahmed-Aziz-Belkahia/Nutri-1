import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface CaptureButtonProps {
  isAnalyzing: boolean;
  onCapture: () => void;
}

const CaptureButton: React.FC<CaptureButtonProps> = ({ isAnalyzing, onCapture }) => {
  if (isAnalyzing) {
    return (
      <div className="px-6 py-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center space-x-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#0E95A7]" />
        <span className="text-sm font-medium text-gray-800">Analyzing food...</span>
      </div>
    );
  }

  return (
    <motion.button
      className="w-20 h-20 relative focus:outline-none"
      whileTap={{ scale: 0.95 }}
      onClick={onCapture}
      disabled={isAnalyzing}
    >
      <div className="absolute inset-0 rounded-full bg-white shadow-lg"></div>
      
      {/* Outer ring for visual effect */}
      <div className="absolute -inset-2 rounded-full border-2 border-white/50 opacity-50"></div>
    </motion.button>
  );
};

export default CaptureButton;