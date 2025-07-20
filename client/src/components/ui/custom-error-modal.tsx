import React from "react";
import { X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  suggestion?: string;
}

export function ErrorModal({ isOpen, onClose, title, message, suggestion }: ErrorModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-xl border border-gray-700"
          >
            {/* Enhanced glow effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0E95A7]/10 via-transparent to-transparent pointer-events-none opacity-70"></div>
            
            {/* Close button */}
            <button 
              onClick={onClose} 
              className="absolute right-4 top-4 rounded-full p-1.5 bg-gray-800/90 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors border border-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
            
            {/* Icon and content */}
            <div className="flex items-start space-x-5 relative">
              <div className="flex-shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-red-500/20 to-red-800/30 border border-red-500/30 shadow-lg shadow-red-500/10">
                  <AlertCircle className="h-7 w-7 text-red-400" />
                </div>
              </div>
              
              <div className="flex-1 pt-0.5">
                <h3 className="text-xl font-semibold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">{title}</h3>
                <p className="mt-3 text-sm text-gray-300 leading-relaxed">{message}</p>
                
                {suggestion && (
                  <div className="mt-4 p-3 rounded-lg bg-gray-800/70 border border-gray-700">
                    <p className="text-sm text-gray-300">
                      <span className="font-medium text-[#0E95A7]">Suggestion:</span> {suggestion}
                    </p>
                  </div>
                )}
                
                {/* Action button */}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-[#0E95A7] to-[#1E6F7D] px-4 py-3 text-sm font-medium text-white shadow-md shadow-[#0E95A7]/20 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[#0E95A7]/50 focus:ring-offset-1 focus:ring-offset-gray-800 border border-[#0E95A7]/30 transition-all"
                  >
                    Okay, got it
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}