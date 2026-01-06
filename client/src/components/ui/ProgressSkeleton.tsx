import { motion } from 'framer-motion';

export function ProgressSkeleton() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="relative w-12 h-12">
          <motion.div 
            className="absolute inset-0 rounded-full border-3 border-gray-200"
          />
          <motion.div 
            className="absolute inset-0 rounded-full border-3 border-t-[#0CC5BA] border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        </div>
      </motion.div>
    </div>
  );
}