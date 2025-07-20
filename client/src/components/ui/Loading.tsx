import { motion } from 'framer-motion';

export function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center min-h-screen bg-white z-[9999]" style={{backgroundColor: "#FFFFFF", position: 'fixed', width: '100%', height: '100%', top: 0, left: 0, right: 0, bottom: 0}}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="p-8 text-center bg-white rounded-lg shadow-lg"
        style={{backgroundColor: "#FFFFFF"}}
      >
        <div className="relative w-20 h-20 mx-auto mb-6">
          <motion.div 
            className="w-20 h-20 rounded-full border-4 border-[#0CC5BA]/10"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1.5, 
              repeat: Infinity, 
              ease: "linear"
            }}
          />
          <motion.div 
            className="absolute top-0 left-0 w-20 h-20 rounded-full border-4 border-t-[#0CC5BA] border-r-transparent border-b-transparent border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 0.7, 
              repeat: Infinity, 
              ease: "linear" 
            }}
          />
        </div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-gray-600 font-medium text-lg"
        >
          Loading...
        </motion.p>
      </motion.div>
    </div>
  );
}

export function SmallLoading() {
  return (
    <div className="flex items-center justify-center p-4 bg-white rounded-md shadow-sm" style={{backgroundColor: "#FFFFFF", position: 'relative', zIndex: 9999}}>
      <div className="relative w-10 h-10">
        <motion.div 
          className="w-10 h-10 rounded-full border-2 border-[#0CC5BA]/10"
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            ease: "linear"
          }}
        />
        <motion.div 
          className="absolute top-0 left-0 w-10 h-10 rounded-full border-2 border-t-[#0CC5BA] border-r-transparent border-b-transparent border-l-transparent"
          animate={{ rotate: 360 }}
          transition={{ 
            duration: 0.7, 
            repeat: Infinity, 
            ease: "linear" 
          }}
        />
      </div>
    </div>
  );
}